import { PlaygroundRunQueue } from "./playground-run.queue";

function keyOf(error: unknown) {
  return (error as { getResponse: () => { key: string } }).getResponse().key;
}

describe("PlaygroundRunQueue", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("runs one handle at a time, in arrival order", async () => {
    const queue = new PlaygroundRunQueue();
    const order: number[] = [];
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = queue.schedule(async () => {
      order.push(1);
      await gate;
      order.push(3);
    });
    await Promise.resolve();
    const second = queue.schedule(async () => {
      order.push(2);
    });
    release();
    await first;
    await second;
    expect(order).toEqual([1, 3, 2]);
  });

  it("rejects the ninth waiter immediately", async () => {
    jest.useFakeTimers();
    const queue = new PlaygroundRunQueue();
    void queue.schedule(() => new Promise(() => undefined)).catch(() => undefined);
    await Promise.resolve();
    for (let index = 0; index < 8; index += 1) {
      void queue.schedule(async () => index).catch(() => undefined);
    }
    try {
      queue.schedule(async () => "overflow");
      throw new Error("expected the queue to be full");
    } catch (error) {
      expect(keyOf(error)).toBe("PG_012");
    }
  });

  it("drops a waiter that does not get the slot within 2 seconds", async () => {
    jest.useFakeTimers();
    const queue = new PlaygroundRunQueue();
    void queue.schedule(() => new Promise(() => undefined));
    await Promise.resolve();
    const waiting = queue.schedule(async () => "late");
    const assertion = expect(waiting).rejects.toMatchObject({
      response: { key: "PG_013" },
    });
    jest.advanceTimersByTime(2000);
    await assertion;
  });

  it("does not take the slot again from inside handle", async () => {
    const queue = new PlaygroundRunQueue();
    await expect(
      queue.schedule(async () => {
        expect(queue.holding()).toBe(true);
        return queue.schedule(async () => "again");
      }),
    ).rejects.toMatchObject({ response: { key: "PG_015" } });
  });
});
