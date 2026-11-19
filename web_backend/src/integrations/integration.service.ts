import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Not, Repository } from "typeorm";
import { randomUUID } from "crypto";
import { QueuePublisher } from "../queue/queue.publisher";
import { IntegrationFailure } from "./integration-failure.entity";
import { IntegrationLease } from "./integration-lease.entity";
import { IntegrationSchedule } from "./integration-schedule.entity";
import { IntegrationSubscription } from "./integration-subscription.entity";
import { IntegrationRevision } from "./integration-revision.entity";
import { IntegrationState } from "./integration-state.entity";
import { IntegrationStepProgress } from "./integration-step-progress.entity";
import { IntegrationValue } from "./integration-value.entity";
import { Integration } from "./integration.entity";
import {
  FlowState,
  HookName,
  HOOKS,
  IntegrationError,
  Proposal,
  RevisionRecord,
  accept,
  createFlow,
  markStepDone,
  propose,
  publicOrigin,
  QUEUE_EVENT,
  redactMessage,
  restore,
  saveValues,
  view,
  visibleRevision,
} from "./integration.model";
import { HookHttpInit, ProgramDispatch, runIntegrationHook } from "./integration.runner";
import { decryptSecret, encryptSecret } from "./integration.secrets";

const LEASE_MS = 90_000;

@Injectable()
export class IntegrationService implements OnModuleInit {
  private readonly logger = new Logger(IntegrationService.name);
  private readonly ownerId = `${process.pid}-${randomUUID()}`.slice(0, 64);
  private readonly tasks = new Map<string, { revisionId: string; stop: () => void }>();

  constructor(
    @InjectRepository(Integration)
    private readonly integrations: Repository<Integration>,
    @InjectRepository(IntegrationRevision)
    private readonly revisions: Repository<IntegrationRevision>,
    @InjectRepository(IntegrationValue)
    private readonly values: Repository<IntegrationValue>,
    @InjectRepository(IntegrationState)
    private readonly states: Repository<IntegrationState>,
    @InjectRepository(IntegrationStepProgress)
    private readonly progress: Repository<IntegrationStepProgress>,
    @InjectRepository(IntegrationFailure)
    private readonly failures: Repository<IntegrationFailure>,
    @InjectRepository(IntegrationLease)
    private readonly leases: Repository<IntegrationLease>,
    @InjectRepository(IntegrationSchedule)
    private readonly schedules: Repository<IntegrationSchedule>,
    @InjectRepository(IntegrationSubscription)
    private readonly subscriptions: Repository<IntegrationSubscription>,
    private readonly publisher: QueuePublisher,
  ) {}

  async onModuleInit() {
    try {
      await this.reconcileTasks();
    } catch (error) {
      this.logger.error("Could not start integration tasks", error instanceof Error ? error.stack : error);
    }
  }

  async create(userId: string, name: string) {
    try {
      const state = createFlow({
        id: randomUUID(),
        name,
        userId,
        now: Date.now(),
        revisionId: randomUUID(),
      });
      await this.store(state);
      return view(state, publicOrigin());
    } catch (error) {
      this.rethrow(error);
    }
  }

  async list() {
    const rows = await this.integrations.find({
      where: { deleted: false },
      order: { updatedAt: "DESC" },
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      updatedAt: Number(row.updatedAt),
    }));
  }

  async read(id: string) {
    const state = await this.load(id);
    const presented = view(state, publicOrigin());
    const latestFailure = await this.failures.findOne({
      where: { integrationId: id, hook: Not("log") },
      order: { createdAt: "DESC" },
    });
    return {
      ...presented,
      latestFailure: latestFailure
        ? {
            hook: latestFailure.hook,
            message: latestFailure.message,
            createdAt: Number(latestFailure.createdAt),
          }
        : null,
    };
  }

  async propose(id: string, body: Proposal) {
    return this.mutate(id, (state) => propose(state, body, Date.now(), randomUUID()));
  }

  async save(id: string, values: unknown, stepId?: string) {
    return this.mutate(id, (state) => saveValues(state, values, stepId, Date.now()));
  }

  async markDone(id: string, stepId: string) {
    return this.mutate(id, (state) => markStepDone(state, stepId, Date.now()));
  }

  async acceptDraft(id: string) {
    const state = await this.load(id);
    const result = accept(state, Date.now(), await this.takenPaths(id));
    if (!result.ok && result.reason === "invalid") {
      throw new BadRequestException({ message: result.message });
    }
    await this.store(result.state);
    if (result.ok) {
      const revision = result.state.revisions.find((item) => item.id === result.state.acceptedRevisionId);
      if (revision) await this.syncRuntime(result.state, revision).catch((error) => this.record(
        result.state.id,
        revision.id,
        "register",
        error instanceof Error ? error.message : "The program could not be registered.",
      ));
      await this.reconcileTasks();
    }
    return this.read(id);
  }

  async restoreRevision(id: string, revisionId: string) {
    const presented = await this.mutate(id, async (state) =>
      restore(state, revisionId, Date.now(), await this.takenPaths(id)),
    );
    const state = await this.load(id);
    const revision = state.revisions.find((item) => item.id === state.acceptedRevisionId);
    if (revision) await this.syncRuntime(state, revision).catch((error) => this.record(
      id,
      revision.id,
      "register",
      error instanceof Error ? error.message : "The program could not be registered.",
    ));
    await this.reconcileTasks();
    return presented;
  }

  async tryHook(id: string, hook: string, payload: unknown) {
    if (!HOOKS.includes(hook as HookName)) {
      throw new BadRequestException({ message: "Choose onHttp, onTick, onMessage, onStart, or onCall." });
    }
    const state = await this.load(id);
    const revision = [...state.revisions].reverse().find((item) => item.status === "draft") ?? visibleRevision(state);
    if (!revision) throw new NotFoundException({ message: "That integration was not found." });
    try {
      const value = await this.runRevision(state, revision, hook as HookName, payload).promise;
      return { ok: true, value };
    } catch (error) {
      const message = error instanceof Error ? error.message : "The hook failed.";
      await this.record(state.id, revision.id, hook, message);
      throw new BadRequestException({ message: redactMessage(message) });
    }
  }

  async failuresFor(id: string) {
    await this.load(id);
    const rows = await this.failures.find({
      where: { integrationId: id },
      order: { createdAt: "DESC" },
      take: 50,
    });
    return rows.map((row) => ({
      id: row.id,
      revisionId: row.revisionId,
      hook: row.hook,
      message: row.message,
      createdAt: Number(row.createdAt),
    }));
  }

  async receiveHttp(
    path: string,
    request: { method: string; headers: unknown; query: unknown; body: unknown },
  ) {
    const target = hookTarget(path);
    if (target.connectionId) {
      const state = await this.load(target.connectionId).catch(() => null);
      const revision = state?.revisions.find((item) => item.id === state.acceptedRevisionId) ?? (state ? visibleRevision(state) : null);
      if (!state || !revision) return { status: 404, body: { message: "No integration receives this path." } };
      return this.dispatchRoute(state, revision, request.method, target.routePath, request);
    }
    const row = await this.integrations.findOne({
      where: { inboundPath: target.inbound, deleted: false },
    });
    if (!row?.acceptedRevisionId) {
      return { status: 404, body: { message: "No integration receives this path." } };
    }
    const state = await this.load(row.id);
    const revision = state.revisions.find((item) => item.id === state.acceptedRevisionId);
    if (!revision) return { status: 404, body: { message: "No integration receives this path." } };
    return this.dispatchRoute(state, revision, request.method, target.routePath, request, "onHttp");
  }

  async setConnectionStatus(id: string, text: string) {
    const status = String(text || "").trim();
    if (!status || status.length > 255) {
      throw new BadRequestException({ message: "Status text must be 255 characters or fewer." });
    }
    const row = await this.integrations.findOne({ where: { id, deleted: false } });
    if (!row) throw new NotFoundException({ message: "That integration was not found." });
    await this.integrations.update(id, { status, updatedAt: String(Date.now()) });
    return this.read(id);
  }

  async callRoute(id: string, method: string, path: string, body: unknown) {
    const state = await this.load(id);
    const revision = visibleRevision(state);
    if (!revision) throw new NotFoundException({ message: "That integration was not found." });
    const result = await this.dispatchRoute(state, revision, method, path, {
      method,
      headers: {},
      query: {},
      body,
    });
    if (result.status >= 400) {
      const message = result.body && typeof result.body === "object" && "message" in result.body
        ? String((result.body as { message?: unknown }).message)
        : "The page call failed.";
      throw new BadRequestException({ message });
    }
    return result.body;
  }

  async deliver(data: { integrationId?: string; revisionId?: string; event?: string; payload?: unknown }) {
    if (!data?.integrationId || !data.revisionId) return;
    const state = await this.load(data.integrationId).catch(() => null);
    if (!state) return;
    const revision =
      state.revisions.find((item) => item.id === data.revisionId) ??
      state.revisions.find((item) => item.id === state.acceptedRevisionId);
    if (!revision) return;
    try {
      await this.runRevision(state, revision, { kind: "event", name: String(data.event || "") }, {
        event: data.event,
        payload: data.payload,
      }).promise;
    } catch (error) {
      const message = error instanceof Error ? error.message : "The hook failed.";
      if (message.includes("NO_HOOK")) return;
      await this.record(state.id, revision.id, "onMessage", message);
      throw error;
    }
  }

  async runDueTicks(now = Date.now()) {
    const due = await this.integrations
      .createQueryBuilder("integration")
      .where("integration.accepted_revision_id is not null")
      .andWhere("integration.deleted = false")
      .andWhere("integration.next_run_at is not null")
      .andWhere("integration.next_run_at <= :now", { now: String(now) })
      .getMany();
    for (const row of due) {
      const state = await this.load(row.id);
      const revision = state.revisions.find((item) => item.id === state.acceptedRevisionId);
      const every = revision?.capabilities.tickEverySeconds;
      if (!revision || !every) {
        await this.integrations.update(row.id, { nextRunAt: null });
        continue;
      }
      try {
        await this.runRevision(state, revision, "onTick", null).promise;
      } catch (error) {
        const message = error instanceof Error ? error.message : "The tick failed.";
        await this.record(row.id, revision.id, "onTick", message);
      }
      await this.integrations.update(row.id, { nextRunAt: String(now + every * 1000) });
    }
    await this.runDueSchedules(now);
  }

  private async runDueSchedules(now: number) {
    const due = await this.schedules
      .createQueryBuilder("schedule")
      .where("schedule.next_run_at <= :now", { now: String(now) })
      .getMany();
    for (const row of due) {
      const state = await this.load(row.integrationId).catch(() => null);
      const revision = state?.revisions.find((item) => item.id === state.acceptedRevisionId);
      if (!state || !revision) continue;
      try {
        await this.runRevision(state, revision, { kind: "schedule", name: row.name }, null).promise;
      } catch (error) {
        const message = error instanceof Error ? error.message : "The schedule failed.";
        await this.record(row.integrationId, revision.id, row.name, message);
      }
      await this.schedules.update(
        { integrationId: row.integrationId, name: row.name },
        { nextRunAt: String(now + Number(row.everySeconds) * 1000) },
      );
    }
  }

  async reconcileTasks(now = Date.now()) {
    const active = await this.integrations
      .createQueryBuilder("integration")
      .where("integration.deleted = false")
      .andWhere("integration.accepted_revision_id is not null")
      .getMany();
    const desired: Array<{ id: string; revisionId: string }> = [];
    for (const row of active) {
      if (!row.acceptedRevisionId) continue;
      const revision = await this.revisions.findOne({ where: { id: row.acceptedRevisionId } });
      if (!revision?.capabilities?.task) continue;
      if (!(await this.holdLease(row.id, now))) continue;
      desired.push({ id: row.id, revisionId: revision.id });
    }
    const wanted = new Set(desired.map((item) => item.id));
    for (const [id, task] of this.tasks) {
      const next = desired.find((item) => item.id === id);
      if (!next || next.revisionId !== task.revisionId) {
        task.stop();
        this.tasks.delete(id);
        if (!wanted.has(id)) await this.releaseLease(id);
      }
    }
    for (const item of desired) {
      if (this.tasks.has(item.id)) continue;
      this.startTask(item.id, item.revisionId);
    }
  }

  private startTask(integrationId: string, revisionId: string) {
    let stopped = false;
    let cancel = () => {};
    this.tasks.set(integrationId, {
      revisionId,
      stop: () => {
        stopped = true;
        cancel();
      },
    });
    void (async () => {
      while (!stopped) {
        try {
          const state = await this.load(integrationId);
          const revision = state.revisions.find((item) => item.id === revisionId);
          if (!revision || state.acceptedRevisionId !== revisionId) break;
          const handle = this.runRevision(state, revision, "onStart", null, true);
          cancel = handle.cancel;
          await handle.promise;
          if (stopped) break;
          await wait(30000);
        } catch (error) {
          if (stopped) break;
          const message = error instanceof Error ? error.message : "The task failed.";
          await this.record(integrationId, revisionId, "onStart", message);
          await wait(5000);
        }
      }
      if (this.tasks.get(integrationId)?.revisionId === revisionId) this.tasks.delete(integrationId);
    })();
  }

  private async holdLease(integrationId: string, now: number) {
    const expires = now + LEASE_MS;
    await this.leases.query(
      `INSERT INTO integration_leases (integration_id, owner, expires_at) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         owner = IF(expires_at < ? OR owner = ?, VALUES(owner), owner),
         expires_at = IF(expires_at < ? OR owner = ?, VALUES(expires_at), expires_at)`,
      [integrationId, this.ownerId, String(expires), String(now), this.ownerId, String(now), this.ownerId],
    );
    const row = await this.leases.findOne({ where: { integrationId } });
    return row?.owner === this.ownerId;
  }

  private async releaseLease(integrationId: string) {
    await this.leases.delete({ integrationId, owner: this.ownerId });
  }

  private async syncRuntime(state: FlowState, revision: RevisionRecord) {
    const declared = (await this.runRevision(state, revision, { kind: "register" }, null).promise) as {
      schedules?: { name: string; everySeconds: number }[];
      subscriptions?: string[];
    };
    const schedules = declared.schedules || [];
    const existing = await this.schedules.find({ where: { integrationId: state.id } });
    const names = new Set(schedules.map((item) => item.name));
    for (const row of existing) {
      if (!names.has(row.name)) await this.schedules.delete({ integrationId: state.id, name: row.name });
    }
    const now = Date.now();
    for (const item of schedules) {
      const previous = existing.find((row) => row.name === item.name);
      const keep = previous && Number(previous.everySeconds) === item.everySeconds;
      await this.schedules.save({
        integrationId: state.id,
        name: item.name,
        everySeconds: item.everySeconds,
        nextRunAt: keep && previous?.nextRunAt ? previous.nextRunAt : String(now),
      });
    }
    await this.subscriptions.delete({ integrationId: state.id });
    for (const event of declared.subscriptions || []) {
      await this.subscriptions.save({ integrationId: state.id, eventName: event });
    }
  }

  private async dispatchRoute(
    state: FlowState,
    revision: RevisionRecord,
    method: string,
    path: string,
    request: { method: string; headers: unknown; query: unknown; body: unknown },
    fallback?: HookName,
  ) {
    try {
      const value = await this.runRevision(state, revision, {
        kind: "route",
        method,
        path: path.startsWith("/") ? path : `/${path}`,
      }, request).promise;
      return httpResult(value);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The hook failed.";
      if (fallback && message.includes("NO_ROUTE")) {
        try {
          const value = await this.runRevision(state, revision, fallback, request).promise;
          return httpResult(value);
        } catch (hookError) {
          const hookMessage = hookError instanceof Error ? hookError.message : "The hook failed.";
          await this.record(state.id, revision.id, fallback, hookMessage);
          return { status: 500, body: { message: "The integration failed to handle this request." } };
        }
      }
      await this.record(state.id, revision.id, "route", message);
      return {
        status: message.includes("NO_ROUTE") ? 404 : 500,
        body: { message: message.includes("NO_ROUTE") ? "That route is not registered." : "The integration failed to handle this request." },
      };
    }
  }

  private runRevision(
    state: FlowState,
    revision: RevisionRecord,
    hook: HookName | ProgramDispatch,
    payload: unknown,
    resident = false,
  ) {
    const values = { ...state.values };
    return runIntegrationHook(
      revision.source,
      hook,
      payload,
      {
        configGet: async (key) => values[key]?.value ?? null,
        configSet: async (key, value) => {
          if (key.length > 64 || value.length > 16000) throw new Error("That config value cannot be stored.");
          const field = revision.inputs.find((item) => item.key === key);
          const secret = Boolean(field?.secret || values[key]?.secret);
          values[key] = { value, secret };
          await this.values.save({
            integrationId: state.id,
            configKey: key,
            ciphertext: encryptSecret(value),
            secret,
          });
        },
        stateGet: async (key) => {
          const row = await this.states.findOne({ where: { integrationId: state.id, stateKey: key.slice(0, 128) } });
          return row?.value ?? null;
        },
        stateSet: async (key, value) => {
          if (value.length > 16000) throw new Error("That state value is too long.");
          await this.states.save({ integrationId: state.id, stateKey: key.slice(0, 128), value });
        },
        http: (url, init) => this.fetchOutbound(url, init),
        emit: async (event, body) => {
          if (!QUEUE_EVENT.test(event)) throw new Error("That event name is not usable.");
          const allowed = revision.capabilities.queueEvents;
          if (allowed && allowed.length && !allowed.includes(event)) {
            throw new Error("That event is not declared for this integration.");
          }
          this.publisher.publishIntegration({
            integrationId: state.id,
            revisionId: revision.id,
            event,
            payload: body,
          });
        },
        log: async (message) => {
          await this.record(state.id, revision.id, "log", message);
        },
        setStatus: async (text) => {
          state.status = text;
          await this.integrations.update(state.id, { status: text, updatedAt: String(Date.now()) });
        },
      },
      revision.capabilities,
      { integrationId: state.id, resident },
    );
  }

  private async fetchOutbound(url: string, init: HookHttpInit) {
    const headers = { ...(init.headers || {}) };
    const hasBody = init.body != null;
    if (hasBody && typeof init.body === "object" && !headers["content-type"] && !headers["Content-Type"]) {
      headers["content-type"] = "application/json";
    }
    const response = await fetch(url, {
      method: init.method || "GET",
      headers,
      body: !hasBody ? undefined : typeof init.body === "string" ? init.body : JSON.stringify(init.body),
      signal: AbortSignal.timeout(10000),
    });
    const text = await response.text();
    try {
      return { status: response.status, body: text ? JSON.parse(text) : null };
    } catch {
      return { status: response.status, body: text };
    }
  }

  private async record(integrationId: string, revisionId: string, hook: string, message: string) {
    await this.failures.save({
      id: randomUUID(),
      integrationId,
      revisionId,
      hook: hook.slice(0, 32),
      message: redactMessage(message),
      createdAt: String(Date.now()),
    });
  }

  private async takenPaths(exceptId: string) {
    const rows = await this.integrations
      .createQueryBuilder("integration")
      .where("integration.deleted = false")
      .andWhere("integration.accepted_revision_id is not null")
      .getMany();
    return rows.filter((row) => row.id !== exceptId && row.inboundPath).map((row) => row.inboundPath as string);
  }

  private async mutate(id: string, change: (state: FlowState) => FlowState | Promise<FlowState>) {
    try {
      const next = await change(await this.load(id));
      await this.store(next);
      return this.read(id);
    } catch (error) {
      this.rethrow(error);
    }
  }

  private async load(id: string): Promise<FlowState> {
    const row = await this.integrations.findOne({ where: { id, deleted: false } });
    if (!row) throw new NotFoundException({ message: "That integration was not found." });
    const revisions = await this.revisions.find({ where: { integrationId: id }, order: { number: "ASC" } });
    const storedValues = await this.values.find({ where: { integrationId: id } });
    const storedProgress = await this.progress.find({ where: { integrationId: id } });
    return {
      id: row.id,
      name: row.name,
      status: row.status as FlowState["status"],
      acceptedRevisionId: row.acceptedRevisionId,
      inboundPath: row.inboundPath,
      nextRunAt: row.nextRunAt == null ? null : Number(row.nextRunAt),
      createdById: row.createdById,
      createdAt: Number(row.createdAt),
      updatedAt: Number(row.updatedAt),
      revisions: revisions.map((revision) => ({
        id: revision.id,
        number: revision.number,
        source: revision.source,
        pageHtml: revision.pageHtml || "",
        pageJs: revision.pageJs || "",
        capabilities: revision.capabilities,
        inputs: revision.inputs,
        steps: revision.steps,
        status: revision.status as RevisionRecord["status"],
        createdAt: Number(revision.createdAt),
      })),
      values: Object.fromEntries(
        storedValues.map((value) => [
          value.configKey,
          { value: decryptSecret(value.ciphertext), secret: Boolean(value.secret) },
        ]),
      ),
      progress: storedProgress.map((item) => item.stepId),
    };
  }

  private async store(state: FlowState) {
    await this.integrations.save({
      id: state.id,
      name: state.name,
      status: state.status,
      acceptedRevisionId: state.acceptedRevisionId,
      inboundPath: state.inboundPath,
      nextRunAt: state.nextRunAt == null ? null : String(state.nextRunAt),
      createdById: state.createdById,
      createdAt: String(state.createdAt),
      updatedAt: String(state.updatedAt),
      deleted: false,
    });
    for (const revision of state.revisions) {
      await this.revisions.save({
        id: revision.id,
        integrationId: state.id,
        number: revision.number,
        source: revision.source,
        pageHtml: revision.pageHtml,
        pageJs: revision.pageJs,
        capabilities: revision.capabilities,
        inputs: revision.inputs,
        steps: revision.steps,
        status: revision.status,
        createdAt: String(revision.createdAt),
      });
    }
    const existing = await this.values.find({ where: { integrationId: state.id } });
    for (const row of existing) {
      if (!state.values[row.configKey]) {
        await this.values.delete({ integrationId: state.id, configKey: row.configKey });
      }
    }
    for (const [key, stored] of Object.entries(state.values)) {
      await this.values.save({
        integrationId: state.id,
        configKey: key,
        ciphertext: encryptSecret(stored.value),
        secret: stored.secret,
      });
    }
    await this.progress.delete({ integrationId: state.id });
    for (const stepId of state.progress) {
      await this.progress.save({
        integrationId: state.id,
        stepId,
        doneAt: String(state.updatedAt),
      });
    }
  }

  private rethrow(error: unknown): never {
    if (error instanceof IntegrationError) {
      throw new BadRequestException({ message: error.message });
    }
    throw error;
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const CONNECTION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function hookTarget(path: string): { connectionId?: string; inbound?: string; routePath: string } {
  const clean = path.replace(/^\/+|\/+$/g, "");
  const [first, ...rest] = clean.split("/").filter(Boolean);
  if (first && CONNECTION_ID.test(first)) {
    return { connectionId: first, routePath: `/${rest.join("/")}` };
  }
  const inbound = clean.endsWith("/oauth") ? clean.slice(0, -"/oauth".length) : clean;
  return { inbound, routePath: clean.endsWith("/oauth") ? "/oauth" : `/${clean}` };
}

function httpResult(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value) && "status" in value) {
    const status = Number((value as { status?: unknown }).status) || 200;
    const body = "body" in value ? (value as { body: unknown }).body : value;
    return { status, body };
  }
  return { status: 200, body: value };
}
