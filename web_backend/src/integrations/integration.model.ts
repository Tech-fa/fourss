export const CONFIG_KEY = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
export const STEP_ID = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
export const INBOUND_PATH = /^[A-Za-z0-9][A-Za-z0-9/_-]{0,120}$/;
export const QUEUE_EVENT = /^[A-Za-z][A-Za-z0-9._-]{0,80}$/;

export const HOOKS = ["onHttp", "onTick", "onMessage", "onStart", "onCall"] as const;
export type HookName = (typeof HOOKS)[number];

export class IntegrationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export type ConfigField = {
  key: string;
  label: string;
  description: string;
  required: boolean;
  secret: boolean;
};

export type StepCopy =
  | { kind: "webhookUrl" }
  | { kind: "oauthRedirectUrl" }
  | { kind: "configKey"; key: string };

export type SetupStep = {
  id: string;
  title: string;
  instruction: string;
  link?: { label: string; url: string };
  fields: string[];
  copy?: StepCopy;
  doneWhen: "manual" | "fields_saved";
};

export type Capabilities = {
  outboundHosts: string[];
  maxPerMinute: number;
  inboundPath?: string;
  tickEverySeconds?: number;
  queueEvents?: string[];
  task?: boolean;
};

export type RevisionStatus = "draft" | "accepted" | "replaced";
export type IntegrationStatus = string;

export type RevisionRecord = {
  id: string;
  number: number;
  source: string;
  pageHtml: string;
  pageJs: string;
  capabilities: Capabilities;
  inputs: ConfigField[];
  steps: SetupStep[];
  status: RevisionStatus;
  createdAt: number;
};

export type StoredValue = { value: string; secret: boolean };

export type FlowState = {
  id: string;
  name: string;
  status: IntegrationStatus;
  acceptedRevisionId: string | null;
  inboundPath: string | null;
  nextRunAt: number | null;
  createdById: string;
  createdAt: number;
  updatedAt: number;
  revisions: RevisionRecord[];
  values: Record<string, StoredValue>;
  progress: string[];
};

export type Proposal = {
  inputs?: unknown;
  steps?: unknown;
  source?: unknown;
  html?: unknown;
  js?: unknown;
  capabilities?: unknown;
};

const EMPTY_CAPABILITIES: Capabilities = { outboundHosts: [], maxPerMinute: 60 };

export function emptyCapabilities(): Capabilities {
  return { outboundHosts: [], maxPerMinute: 60 };
}

export function createFlow(input: {
  id: string;
  name: string;
  userId: string;
  now: number;
  revisionId: string;
}): FlowState {
  const name = cleanName(input.name);
  return {
    id: input.id,
    name,
    status: "draft",
    acceptedRevisionId: null,
    inboundPath: null,
    nextRunAt: null,
    createdById: input.userId,
    createdAt: input.now,
    updatedAt: input.now,
    revisions: [
      {
        id: input.revisionId,
        number: 1,
        source: "",
        pageHtml: "",
        pageJs: "",
        capabilities: emptyCapabilities(),
        inputs: [],
        steps: [],
        status: "draft",
        createdAt: input.now,
      },
    ],
    values: {},
    progress: [],
  };
}

export function propose(state: FlowState, body: Proposal, now: number, revisionId: string): FlowState {
  const base = latest(state);
  const next = parseRevisionContents({
    source: body.source === undefined ? base.source : body.source,
    html: body.html === undefined ? base.pageHtml : body.html,
    js: body.js === undefined ? base.pageJs : body.js,
    capabilities: body.capabilities === undefined ? base.capabilities : body.capabilities,
    inputs: body.inputs === undefined ? base.inputs : body.inputs,
    steps: body.steps === undefined ? base.steps : body.steps,
  });
  const number = state.revisions.reduce((max, revision) => Math.max(max, revision.number), 0) + 1;
  return {
    ...state,
    updatedAt: now,
    status: state.status === "active" ? "active" : state.status,
    revisions: [
      ...state.revisions.map((revision) =>
        revision.status === "draft" ? { ...revision, status: "replaced" as const } : revision,
      ),
      {
        id: revisionId,
        number,
        ...next,
        status: "draft",
        createdAt: now,
      },
    ],
  };
}

export function saveValues(
  state: FlowState,
  incoming: unknown,
  stepId: string | undefined,
  now: number,
): FlowState {
  const revision = visibleRevision(state);
  if (!revision) throw new IntegrationError("This integration has no revision to fill in.");
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
    throw new IntegrationError("Values must be a set of keys and text.");
  }
  const allowed = new Set(revision.inputs.map((field) => field.key));
  if (stepId) {
    const step = revision.steps.find((item) => item.id === stepId);
    if (!step) throw new IntegrationError("That step is not on this integration.");
    for (const key of Object.keys(incoming as Record<string, unknown>)) {
      if (!step.fields.includes(key)) {
        throw new IntegrationError(`"${key}" is not collected on this step.`);
      }
    }
  }
  const values = { ...state.values };
  for (const [key, raw] of Object.entries(incoming as Record<string, unknown>)) {
    if (!allowed.has(key)) throw new IntegrationError(`"${key}" is not a field on this integration.`);
    if (typeof raw !== "string") throw new IntegrationError(`"${key}" must be text.`);
    if (raw.length > 16000) throw new IntegrationError(`"${key}" is too long.`);
    if (!raw) {
      const field = revision.inputs.find((item) => item.key === key);
      if (field?.secret && values[key]?.value) continue;
      delete values[key];
      continue;
    }
    const field = revision.inputs.find((item) => item.key === key);
    values[key] = { value: raw, secret: Boolean(field?.secret) };
  }
  return { ...state, values, updatedAt: now };
}

export function markStepDone(state: FlowState, stepId: string, now: number): FlowState {
  const revision = visibleRevision(state);
  const step = revision?.steps.find((item) => item.id === stepId);
  if (!step) throw new IntegrationError("That step is not on this integration.");
  if (step.doneWhen !== "manual") {
    throw new IntegrationError("This step is finished when its required fields are saved.");
  }
  if (state.progress.includes(stepId)) return state;
  return { ...state, progress: [...state.progress, stepId], updatedAt: now };
}

export type AcceptResult =
  | { ok: true; state: FlowState }
  | { ok: false; reason: "needs_input"; missing: string[]; state: FlowState }
  | { ok: false; reason: "invalid"; message: string };

export function accept(state: FlowState, now: number, takenPaths: string[] = []): AcceptResult {
  const draft = [...state.revisions].reverse().find((revision) => revision.status === "draft");
  if (!draft) return { ok: false, reason: "invalid", message: "There is no draft to accept." };
  const invalid = validateRunnable(draft);
  if (invalid) return { ok: false, reason: "invalid", message: invalid };
  const path = draft.capabilities.inboundPath;
  if (path && takenPaths.includes(path)) {
    return { ok: false, reason: "invalid", message: "That inbound path is already used by another integration." };
  }
  const missing = missingKeys(draft, state.values);
  if (missing.length) {
    return {
      ok: false,
      reason: "needs_input",
      missing,
      state: { ...state, status: "needs_input", updatedAt: now },
    };
  }
  return {
    ok: true,
    state: {
      ...state,
      status: "active",
      acceptedRevisionId: draft.id,
      inboundPath: path ?? null,
      nextRunAt: draft.capabilities.tickEverySeconds ? now : null,
      updatedAt: now,
      revisions: state.revisions.map((revision) =>
        revision.id === draft.id ? { ...revision, status: "accepted" } : revision,
      ),
    },
  };
}

export function restore(state: FlowState, revisionId: string, now: number, takenPaths: string[] = []): FlowState {
  const revision = state.revisions.find((item) => item.id === revisionId);
  if (!revision || revision.status !== "accepted") {
    throw new IntegrationError("Choose an accepted revision to restore.");
  }
  const path = revision.capabilities.inboundPath;
  if (path && takenPaths.includes(path)) {
    throw new IntegrationError("That inbound path is already used by another integration.");
  }
  const missing = missingKeys(revision, state.values);
  return {
    ...state,
    acceptedRevisionId: revision.id,
    status: missing.length ? "needs_input" : "active",
    inboundPath: path ?? null,
    nextRunAt: revision.capabilities.tickEverySeconds ? now : null,
    updatedAt: now,
  };
}

export function visibleRevision(state: FlowState): RevisionRecord | null {
  const ordered = [...state.revisions].sort((a, b) => b.number - a.number);
  const latest = ordered[0] ?? null;
  const accepted = state.revisions.find((revision) => revision.id === state.acceptedRevisionId) ?? null;
  if (latest && latest.status === "draft" && (!accepted || latest.number > accepted.number)) return latest;
  return accepted ?? latest;
}

export function view(state: FlowState, origin: string) {
  const revision = visibleRevision(state);
  const inputs = (revision?.inputs ?? []).map((field) => {
    const stored = state.values[field.key];
    return {
      key: field.key,
      label: field.label,
      description: field.description,
      required: field.required,
      secret: field.secret,
      filled: Boolean(stored?.value),
      ...(field.secret ? {} : { value: stored?.value ?? "" }),
    };
  });
  const steps = (revision?.steps ?? []).map((step) => ({
    id: step.id,
    title: step.title,
    instruction: step.instruction,
    link: step.link ?? null,
    fields: step.fields,
    doneWhen: step.doneWhen,
    copy: step.copy ? (step.copy.kind === "configKey" ? { kind: step.copy.kind, key: step.copy.key } : { kind: step.copy.kind }) : null,
    copyValue: copyValue(step, revision, state, origin),
    done: stepIsDone(step, revision, state),
  }));
  const grouped = new Set(steps.flatMap((step) => step.fields));
  return {
    id: state.id,
    name: state.name,
    status: state.status,
    revisionId: revision?.id ?? null,
    acceptedRevisionId: state.acceptedRevisionId,
    source: revision?.source ?? "",
    pageHtml: revision?.pageHtml ?? "",
    pageJs: revision?.pageJs ?? "",
    hookBase: `${origin}/integrations/hooks/${state.id}`,
    capabilities: revision?.capabilities ?? EMPTY_CAPABILITIES,
    inputs,
    steps,
    otherKeys: inputs.filter((field) => !grouped.has(field.key)).map((field) => field.key),
    missing: revision ? missingKeys(revision, state.values) : [],
    updatedAt: state.updatedAt,
  };
}

export function publicOrigin(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.API_PUBLIC_URL || "";
  if (configured) return configured.replace(/\/$/, "");
  const port = env.PORT || "3004";
  return `http://127.0.0.1:${port}`;
}

export function declaredHooks(source: string): Set<HookName> {
  const found = new Set<HookName>();
  for (const name of HOOKS) {
    const pattern = new RegExp(
      `(?:export\\s+)?(?:async\\s+)?function\\s+${name}\\b|export\\s+(?:const|let|var)\\s+${name}\\b`,
    );
    if (pattern.test(source)) found.add(name);
  }
  return found;
}

export function prepareSource(source: string): string {
  return source
    .replace(/^\s*export\s+\{[^}]*\}\s*;?\s*$/gm, "")
    .replace(/\bexport\s+default\s+/g, "")
    .replace(/\bexport\s+(async\s+function|function|const|let|var|class)\b/g, "$1");
}

export function redactMessage(message: string): string {
  return message
    .replace(/authorization["']?\s*[:=]\s*\S+(?:\s+\S+)?/gi, "authorization: redacted")
    .replace(/bearer\s+\S+/gi, "bearer redacted")
    .slice(0, 2000);
}

export function latest(state: FlowState): RevisionRecord {
  const revision = [...state.revisions].sort((a, b) => b.number - a.number)[0];
  if (!revision) throw new IntegrationError("This integration has no revision.");
  return revision;
}

function cleanName(name: string) {
  const text = String(name || "").trim();
  if (!text || text.length > 255) throw new IntegrationError("Give the integration a name.");
  return text;
}

function parseRevisionContents(input: {
  source: unknown;
  html: unknown;
  js: unknown;
  capabilities: unknown;
  inputs: unknown;
  steps: unknown;
}): Pick<RevisionRecord, "source" | "pageHtml" | "pageJs" | "capabilities" | "inputs" | "steps"> {
  const source = pageText(input.source, "The program is too long.", 65536);
  const pageHtml = pageText(input.html, "The page is too long.", 200000);
  const pageJs = pageText(input.js, "The page script is too long.", 200000);
  const capabilities = parseCapabilities(input.capabilities ?? emptyCapabilities());
  const inputs = parseInputs(input.inputs ?? []);
  const steps = parseSteps(input.steps ?? [], inputs);
  return { source, pageHtml, pageJs, capabilities, inputs, steps };
}

function pageText(value: unknown, message: string, max: number) {
  const text = typeof value === "string" ? value : "";
  if (text.length > max) throw new IntegrationError(message);
  return text;
}

function parseInputs(value: unknown): ConfigField[] {
  if (!Array.isArray(value)) throw new IntegrationError("Inputs must be a list of fields.");
  const seen = new Set<string>();
  return value.map((item) => {
    if (!item || typeof item !== "object") throw new IntegrationError("Each input needs a key and a label.");
    const field = item as Record<string, unknown>;
    const key = String(field.key || "");
    if (!CONFIG_KEY.test(key)) throw new IntegrationError(`"${key || "field"}" is not a usable config key.`);
    if (seen.has(key)) throw new IntegrationError(`"${key}" is listed twice.`);
    seen.add(key);
    const label = requiredText(field.label, `Give "${key}" a label.`, 200);
    const description = requiredText(field.description, `Say where the value for "${key}" comes from.`, 2000);
    return {
      key,
      label,
      description,
      required: Boolean(field.required),
      secret: Boolean(field.secret),
    };
  });
}

function parseSteps(value: unknown, inputs: ConfigField[]): SetupStep[] {
  if (!Array.isArray(value)) throw new IntegrationError("Steps must be a list.");
  const keys = new Set(inputs.map((field) => field.key));
  const seen = new Set<string>();
  return value.map((item) => {
    if (!item || typeof item !== "object") throw new IntegrationError("Each step needs a title and an instruction.");
    const step = item as Record<string, unknown>;
    const id = String(step.id || "");
    if (!STEP_ID.test(id)) throw new IntegrationError("Each step needs an id made of letters, numbers, _ or -.");
    if (seen.has(id)) throw new IntegrationError(`Step "${id}" is listed twice.`);
    seen.add(id);
    const fields = Array.isArray(step.fields) ? step.fields.map((field) => String(field)) : [];
    for (const field of fields) {
      if (!keys.has(field)) throw new IntegrationError(`Step "${id}" asks for "${field}", which is not an input.`);
    }
    const doneWhen = step.doneWhen === "fields_saved" ? "fields_saved" : step.doneWhen === "manual" ? "manual" : "";
    if (!doneWhen) throw new IntegrationError(`Step "${id}" must finish manually or when its fields are saved.`);
    const copy = parseCopy(step.copy, id);
    if (copy?.kind === "configKey" && !keys.has(copy.key)) {
      throw new IntegrationError(`Step "${id}" copies "${copy.key}", which is not an input.`);
    }
    return {
      id,
      title: requiredText(step.title, `Give step "${id}" a title.`, 200),
      instruction: requiredText(step.instruction, `Tell the user what to do for step "${id}".`, 4000),
      link: parseLink(step.link, id),
      fields,
      ...(copy ? { copy } : {}),
      doneWhen,
    };
  });
}

function parseCopy(value: unknown, stepId: string): StepCopy | undefined {
  if (value == null || value === "") return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new IntegrationError(`Step "${stepId}" must name webhookUrl, oauthRedirectUrl, or a config key.`);
  }
  const kind = (value as { kind?: unknown }).kind;
  if (kind === "webhookUrl" || kind === "oauthRedirectUrl") return { kind };
  if (kind === "configKey") {
    const key = String((value as { key?: unknown }).key || "");
    if (!CONFIG_KEY.test(key)) throw new IntegrationError(`Step "${stepId}" copies an unknown config key.`);
    return { kind, key };
  }
  throw new IntegrationError(`Step "${stepId}" must name webhookUrl, oauthRedirectUrl, or a config key.`);
}

function parseLink(value: unknown, stepId: string): SetupStep["link"] | undefined {
  if (value == null) return undefined;
  if (!value || typeof value !== "object") throw new IntegrationError(`Step "${stepId}" has a link that cannot be opened.`);
  const link = value as { label?: unknown; url?: unknown };
  const label = requiredText(link.label, `Name the link on step "${stepId}".`, 200);
  const url = requiredText(link.url, `Give the link on step "${stepId}" an address.`, 2000);
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new IntegrationError(`The link on step "${stepId}" is not a web address.`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new IntegrationError(`The link on step "${stepId}" must start with http or https.`);
  }
  return { label, url };
}

export function parseCapabilities(value: unknown): Capabilities {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new IntegrationError("Capabilities must describe the hosts, path, tick, queue, and task this program needs.");
  }
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.outboundHosts)) throw new IntegrationError("List the https origins this program may call.");
  const outboundHosts = raw.outboundHosts.map((host) => parseHttpsOrigin(String(host)));
  const maxPerMinute = Number(raw.maxPerMinute ?? 60);
  if (!Number.isInteger(maxPerMinute) || maxPerMinute < 1 || maxPerMinute > 10000) {
    throw new IntegrationError("maxPerMinute must be a whole number from 1 to 10000.");
  }
  const capabilities: Capabilities = { outboundHosts, maxPerMinute };
  if (raw.inboundPath != null && raw.inboundPath !== "") {
    const path = String(raw.inboundPath);
    if (!INBOUND_PATH.test(path) || path.includes("..") || path.includes("//")) {
      throw new IntegrationError("The inbound path may use letters, numbers, slashes, _ and -.");
    }
    capabilities.inboundPath = path;
  }
  if (raw.tickEverySeconds != null && raw.tickEverySeconds !== "") {
    const tick = Number(raw.tickEverySeconds);
    if (!Number.isInteger(tick) || tick < 30 || tick > 86400) {
      throw new IntegrationError("A tick must be a whole number of seconds from 30 to 86400.");
    }
    capabilities.tickEverySeconds = tick;
  }
  if (raw.queueEvents != null) {
    if (!Array.isArray(raw.queueEvents)) throw new IntegrationError("Queue events must be a list of names.");
    capabilities.queueEvents = raw.queueEvents.map((event) => {
      const name = String(event);
      if (!QUEUE_EVENT.test(name)) throw new IntegrationError(`"${name}" is not a usable event name.`);
      return name;
    });
  }
  if (raw.task != null) capabilities.task = Boolean(raw.task);
  return capabilities;
}

function parseHttpsOrigin(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new IntegrationError(`"${value}" is not an https origin.`);
  }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new IntegrationError(`"${value}" must be an https origin.`);
  }
  if (url.pathname !== "/" && url.pathname !== "") {
    throw new IntegrationError(`"${value}" must be an origin, without a path.`);
  }
  return url.origin;
}

export function validateRunnable(revision: {
  source: string;
  capabilities: Capabilities;
  inputs: ConfigField[];
  steps: SetupStep[];
}): string | null {
  const hooks = declaredHooks(revision.source);
  const capabilities = revision.capabilities;
  if (capabilities.inboundPath && !revision.steps.some((step) => step.copy?.kind === "webhookUrl")) {
    return "Add a step that copies the webhook URL before accepting an inbound integration.";
  }
  if (capabilities.inboundPath && !hooks.has("onHttp")) {
    return "The program must export onHttp to receive inbound calls.";
  }
  if (capabilities.tickEverySeconds && !hooks.has("onTick")) {
    return "The program must export onTick to run on a schedule.";
  }
  if (capabilities.queueEvents?.length && !hooks.has("onMessage")) {
    return "The program must export onMessage to receive queue events.";
  }
  if (capabilities.task && !hooks.has("onStart")) {
    return "The program must export onStart to keep a resident task.";
  }
  for (const step of revision.steps) {
    if (step.copy?.kind === "webhookUrl" && !capabilities.inboundPath) {
      return "A webhook step needs an inbound path.";
    }
    if (step.copy?.kind === "oauthRedirectUrl" && !capabilities.inboundPath) {
      return "An OAuth redirect step needs an inbound path.";
    }
  }
  return null;
}

export function missingKeys(revision: RevisionRecord | { inputs: ConfigField[] }, values: Record<string, StoredValue>): string[] {
  return revision.inputs.filter((field) => field.required && !values[field.key]?.value).map((field) => field.key);
}

function stepIsDone(step: SetupStep, revision: RevisionRecord | null, state: FlowState): boolean {
  if (state.progress.includes(step.id)) return true;
  if (step.doneWhen !== "fields_saved" || !revision) return false;
  const required = step.fields.filter((key) => revision.inputs.find((field) => field.key === key)?.required);
  const keys = required.length ? required : step.fields;
  if (!keys.length) return false;
  return keys.every((key) => Boolean(state.values[key]?.value));
}

function copyValue(step: SetupStep, revision: RevisionRecord | null, state: FlowState, origin: string): string | null {
  const copy = step.copy;
  if (!copy || !revision) return null;
  const path = revision.capabilities.inboundPath;
  if (copy.kind === "webhookUrl") {
    return path ? `${origin}/integrations/hooks/${path}` : null;
  }
  if (copy.kind === "oauthRedirectUrl") {
    return path ? `${origin}/integrations/hooks/${path}/oauth` : null;
  }
  const input = revision.inputs.find((item) => item.key === copy.key);
  if (!input || input.secret) return null;
  return state.values[copy.key]?.value ?? null;
}

function requiredText(value: unknown, message: string, max: number): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new IntegrationError(message);
  if (text.length > max) throw new IntegrationError(message);
  return text;
}
