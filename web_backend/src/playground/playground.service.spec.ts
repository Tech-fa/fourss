import { PlaygroundRecord } from "./playground-record.entity";
import { PlaygroundReference } from "./playground-reference.entity";
import { playgroundException } from "./playground.errors";
import { PlaygroundService } from "./playground.service";

describe("PlaygroundService", () => {
  const user = { id: "user-1", username: "ada", teamIds: [7] };
  const other = { id: "user-2", username: "grace", teamIds: [7] };
  let rows: any[];
  let savedRecords: any[];
  let savedRefs: any[];
  let service: PlaygroundService;
  let queryRunner: {
    connect: jest.Mock;
    startTransaction: jest.Mock;
    commitTransaction: jest.Mock;
    rollbackTransaction: jest.Mock;
    release: jest.Mock;
  };
  let resolver: { resolve: jest.Mock };

  beforeEach(() => {
    rows = [];
    savedRecords = [];
    savedRefs = [];
    const playgroundRepository = {
      create: jest.fn((value) => ({ ...value })),
      save: jest.fn(async (value) => {
        const index = rows.findIndex((row) => row.id === value.id);
        const stored = { ...value, publisher: value.publisher };
        if (index >= 0) rows[index] = { ...rows[index], ...stored };
        else rows.push(stored);
        return rows.find((row) => row.id === value.id);
      }),
      find: jest.fn(async ({ where }) =>
        rows.filter((row) => row.teamId === where.teamId && !row.deleted),
      ),
      findOne: jest.fn(async ({ where }) => {
        const found = rows.find((row) => row.id === where.id && !row.deleted);
        if (!found) return null;
        if (found.publisherId) {
          return {
            ...found,
            publisher: {
              id: found.publisherId,
              fname: found.publisherId === "user-2" ? "Grace" : "Ada",
              lname: "Hopper",
            },
          };
        }
        return { ...found, publisher: null };
      }),
    };
    const recordRepository = {
      findOne: jest.fn(async ({ where }) =>
        savedRecords.find(
          (row) => row.id === where.id && row.playgroundId === where.playgroundId && !row.deleted,
        ) || null,
      ),
      save: jest.fn(async (value) => value),
    };
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    };
    const dataSource = {
      createQueryRunner: jest.fn(() => ({
        ...queryRunner,
        manager: {
          getRepository: (entity: unknown) => {
            if (entity === PlaygroundRecord) {
              return {
                create: (value) => ({ ...value }),
                save: async (value) => {
                  savedRecords.push(value);
                  return value;
                },
              };
            }
            if (entity === PlaygroundReference) {
              return {
                create: (value) => ({ ...value }),
                save: async (value) => {
                  savedRefs.push(value);
                  return value;
                },
              };
            }
            throw new Error("unexpected repository");
          },
        },
      })),
    };
    resolver = {
      resolve: jest.fn(async (_caller, _playground, entityType, entityId) => ({
        entityType,
        entityId,
        title: "Policy",
      })),
    };
    service = new PlaygroundService(
      playgroundRepository as never,
      recordRepository as never,
      dataSource as never,
      resolver as never,
    );
  });

  it("lets one team own many playgrounds", async () => {
    await service.create("First", 7, user);
    await service.create("Second", 7, user);
    const listed = await service.list(7, user);
    expect(listed.map((item) => item.name).sort()).toEqual(["First", "Second"]);
  });

  it("starts unpublished and turned off", async () => {
    const created = await service.create("Draft", 7, user);
    expect(created.enabled).toBe(false);
    expect(created.publisher).toBeNull();
    expect(created.lastPublishedAt).toBeNull();
    expect(await service.listPublished(7, user)).toEqual([]);
  });

  it("publishes, republishes, and keeps a turned-off playground on the published list", async () => {
    const created = await service.create("Notes", 7, user);
    const published = await service.publish(created.id, user);
    expect(published.enabled).toBe(true);
    expect(published.publisher).toMatchObject({ id: "user-1", fname: "Ada" });
    expect(published.lastPublishedAt).toEqual(expect.any(Number));

    const again = await service.publish(created.id, other);
    expect(again.publisher).toMatchObject({ id: "user-2", fname: "Grace" });
    expect(again.lastPublishedAt).toBeGreaterThanOrEqual(published.lastPublishedAt as number);

    const disabled = await service.setEnabled(created.id, false, user);
    expect(disabled.enabled).toBe(false);
    expect(disabled.publisher).toMatchObject({ id: "user-2" });
    expect(disabled.lastPublishedAt).toBe(again.lastPublishedAt);
    const listed = await service.listPublished(7, user);
    expect(listed.map((item) => item.id)).toEqual([created.id]);
  });

  it("stores source without publishing it", async () => {
    const created = await service.create("Draft", 7, user);
    const saved = await service.putSource(created.id, "function handle(){ return null }", user);
    expect(saved.revision).toBe(1);
    expect(saved.source).toContain("function handle");
    expect(saved.lastPublishedAt).toBeNull();
    expect(await service.get(created.id, user)).toMatchObject({ source: saved.source });
  });

  it("hides a playground after it is deleted", async () => {
    const created = await service.create("Notes", 7, user);
    await expect(service.remove(created.id, user)).resolves.toEqual({
      id: created.id,
      deleted: true,
    });
    await expect(service.get(created.id, user)).rejects.toMatchObject({
      response: { key: "PG_002" },
    });
    await expect(service.list(7, user)).resolves.toEqual([]);
  });

  it("refuses record writes while the playground is off and still resolves existing data", async () => {
    const created = await service.create("Draft", 7, user);
    const playground = await service["requirePlayground"](created.id, user);
    await expect(
      service.commitSave(playground, user, {
        action: "save",
        entityType: "inspection_note",
        data: { note: "x" },
        refs: [],
      }),
    ).rejects.toMatchObject({ response: { key: "PG_018" } });
    expect(queryRunner.connect).not.toHaveBeenCalled();

    await service.publish(created.id, user);
    await service.setEnabled(created.id, false, user);
    await expect(service.requireWritable(created.id, user)).rejects.toMatchObject({
      response: { key: "PG_018" },
    });
  });

  it("writes a document link as entity_type and entity_id", async () => {
    const created = await service.create("Notes", 7, user);
    await service.publish(created.id, user);
    const playground = await service["requirePlayground"](created.id, user);
    const saved = await service.commitSave(playground, user, {
      action: "save",
      entityType: "inspection_note",
      data: { note: "Torque" },
      refs: [{ entityType: "document", entityId: "doc-1" }],
    });
    expect(saved.refs).toEqual([{ entityType: "document", entityId: "doc-1" }]);
    expect(savedRecords[0].documentId).toBeUndefined();
    expect(savedRefs[0]).toMatchObject({
      entityType: "document",
      entityId: "doc-1",
    });
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
    savedRefs.splice(0, savedRefs.length);
    expect(savedRefs).toHaveLength(0);
  });

  it("keeps the reference row when the document later disappears", async () => {
    const created = await service.create("Notes", 7, user);
    await service.publish(created.id, user);
    const playground = await service["requirePlayground"](created.id, user);
    await service.commitSave(playground, user, {
      action: "save",
      entityType: "inspection_note",
      data: { note: "Torque" },
      refs: [{ entityType: "document", entityId: "doc-1" }],
    });
    expect(savedRefs).toHaveLength(1);
    resolver.resolve.mockRejectedValue(playgroundException("PG_006"));
    await expect(
      service.commitSave(playground, user, {
        action: "save",
        entityType: "inspection_note",
        data: { note: "Again" },
        refs: [{ entityType: "document", entityId: "doc-1" }],
      }),
    ).rejects.toMatchObject({ response: { key: "PG_006" } });
    expect(savedRefs).toHaveLength(1);
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
  });

  it("rejects a record kind named document", async () => {
    const created = await service.create("Notes", 7, user);
    await service.publish(created.id, user);
    const playground = await service["requirePlayground"](created.id, user);
    await expect(
      service.commitSave(playground, user, {
        action: "save",
        entityType: "document",
        data: { note: "x" },
        refs: [],
      }),
    ).rejects.toMatchObject({ response: { key: "PG_004" } });
  });

  it("hides a playground on another team", async () => {
    const created = await service.create("Notes", 7, user);
    await expect(
      service.get(created.id, { ...user, teamIds: [9] }),
    ).rejects.toMatchObject({ response: { key: "PG_002" } });
    await expect(service.list(9, user)).rejects.toMatchObject({
      response: { key: "PG_001" },
    });
  });
});
