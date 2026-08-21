import type { ReactNode } from "react";
import { vi } from "vitest";
import type { Task } from "@/db/queries";

/**
 * Component tests render the real components; only the two boundaries a jsdom
 * render cannot cross are stood in for — the app router, which `next/link`
 * expects to be mounted, and the Server Actions module, which reaches a
 * database. Nothing below is asserted on; it exists so the component under
 * test is the real one.
 */
export function stubNextBoundaries() {
  vi.mock("next/link", () => ({
    default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
      <a href={href} {...rest}>
        {children}
      </a>
    ),
  }));
  vi.mock("@/app/actions", () => ({
    addTask: vi.fn(),
    toggleTask: vi.fn(),
    deleteTask: vi.fn(),
    setSlime: vi.fn(),
  }));
}

let nextId = 1;

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: nextId++,
    title: "ship the thing",
    dayKey: "2026-07-01",
    isCompleted: false,
    createdAt: new Date("2026-07-01T09:00:00Z"),
    ...overrides,
  };
}
