"use client";

import { useOptimistic, useTransition } from "react";
import { deleteTask, toggleTask } from "@/app/actions";
import { PixelCheckbox } from "@/components/ui/PixelCheckbox";
import type { Task } from "@/db/queries";

/**
 * Optimistic on both controls. Without it every checkbox tick waits for a
 * server round-trip, which reads as lag in a way the native app never had.
 */
export function TaskItem({ task }: { task: Task }) {
  const [, startTransition] = useTransition();
  const [completed, setCompleted] = useOptimistic(task.isCompleted);

  function onToggle() {
    startTransition(async () => {
      setCompleted(!completed);
      await toggleTask(task.id);
    });
  }

  function onDelete() {
    startTransition(async () => {
      await deleteTask(task.id);
    });
  }

  return (
    <li className="flex items-start gap-3">
      <PixelCheckbox
        checked={completed}
        onChange={onToggle}
        aria-label={task.title}
        className="mt-1"
      />
      {/* The grow spacer is separate from the title so the strike stops where
          the text does rather than running on to the delete button. */}
      <span className="grow">
        <span className={completed ? "strike-pixel text-ink-soft" : undefined}>{task.title}</span>
      </span>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete “${task.title}”`}
        // A 32px square: the delete control is the smallest thing on the page and
        // still has to be a comfortable target.
        className="grid size-8 shrink-0 place-content-center font-display text-display-md text-ink-faint hover:bg-ink hover:text-paper"
      >
        &#215;
      </button>
    </li>
  );
}
