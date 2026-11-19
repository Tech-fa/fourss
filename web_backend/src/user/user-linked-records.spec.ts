import { getLocalStartOfDay } from "../util/helper-util";
import {
  DEFAULT_DAYS_SOON,
  dueSoonUntil,
  resolveDaysSoon,
  taskDueUrgency,
} from "./user-linked-records";

describe("task due windows", () => {
  const now = new Date(2026, 5, 15, 15, 30, 0, 0).getTime();

  function atOffset(days: number, hour = 12): number {
    const date = new Date(getLocalStartOfDay(now));
    date.setDate(date.getDate() + days);
    date.setHours(hour, 0, 0, 0);
    return date.getTime();
  }

  it("defaults days_soon to 3", () => {
    expect(DEFAULT_DAYS_SOON).toBe(3);
    expect(resolveDaysSoon(undefined)).toBe(3);
    expect(resolveDaysSoon(Number.NaN)).toBe(3);
    expect(resolveDaysSoon(0)).toBe(3);
    expect(resolveDaysSoon(5.9)).toBe(5);
  });

  it("marks dates before today as overdue and the next days_soon days as due soon", () => {
    expect(taskDueUrgency(null, 3, now)).toBeNull();
    expect(taskDueUrgency(atOffset(-1), 3, now)).toBe("overdue");
    expect(taskDueUrgency(atOffset(0, 0), 3, now)).toBe("due_soon");
    expect(taskDueUrgency(atOffset(2), 3, now)).toBe("due_soon");
    expect(taskDueUrgency(dueSoonUntil(3, now) - 1, 3, now)).toBe("due_soon");
    expect(taskDueUrgency(dueSoonUntil(3, now), 3, now)).toBe("scheduled");
    expect(taskDueUrgency(atOffset(3), 3, now)).toBe("scheduled");
  });

  it("honors a custom days_soon window", () => {
    expect(taskDueUrgency(atOffset(0), 1, now)).toBe("due_soon");
    expect(taskDueUrgency(atOffset(1), 1, now)).toBe("scheduled");
  });
});
