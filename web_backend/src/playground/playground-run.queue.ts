import { Injectable } from "@nestjs/common";
import { AsyncLocalStorage } from "async_hooks";
import { playgroundException } from "./playground.errors";

const MAX_WAITING = 8;
const WAIT_TIMEOUT_MS = 2000;

type Waiter<T> = {
  run: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
  settled: boolean;
};

@Injectable()
export class PlaygroundRunQueue {
  private running = false;
  private readonly waiting: Waiter<unknown>[] = [];
  private readonly slot = new AsyncLocalStorage<boolean>();

  holding() {
    return this.slot.getStore() === true;
  }

  schedule<T>(run: () => Promise<T>): Promise<T> {
    if (this.holding()) throw playgroundException("PG_015");
    if (this.waiting.length >= MAX_WAITING) throw playgroundException("PG_012");
    return new Promise<T>((resolve, reject) => {
      const waiter: Waiter<T> = {
        run,
        resolve,
        reject,
        settled: false,
        timer: setTimeout(() => {
          if (waiter.settled) return;
          const index = this.waiting.indexOf(waiter as Waiter<unknown>);
          if (index === -1) return;
          this.waiting.splice(index, 1);
          waiter.settled = true;
          reject(playgroundException("PG_013"));
        }, WAIT_TIMEOUT_MS),
      };
      this.waiting.push(waiter as Waiter<unknown>);
      this.pump();
    });
  }

  private pump() {
    if (this.running) return;
    const next = this.waiting.shift();
    if (!next) return;
    if (next.settled) {
      this.pump();
      return;
    }
    clearTimeout(next.timer);
    this.running = true;
    void this.slot.run(true, async () => {
      try {
        const value = await next.run();
        if (!next.settled) {
          next.settled = true;
          next.resolve(value);
        }
      } catch (error) {
        if (!next.settled) {
          next.settled = true;
          next.reject(error);
        }
      } finally {
        this.running = false;
        this.pump();
      }
    });
  }
}
