"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { deleteTask, renameTask, toggleTask } from "@/app/actions";
import { PixelCheckbox } from "@/components/ui/PixelCheckbox";
import type { Task } from "@/db/queries";

/**
 * Optimistic on every control. Without it every checkbox tick waits for a
 * server round-trip, which reads as lag in a way the native app never had.
 */
export function TaskItem({ task }: { task: Task }) {
  const [, startTransition] = useTransition();
  const [completed, setCompleted] = useOptimistic(task.isCompleted);
  const [title, setTitle] = useOptimistic(task.title);
  const [editing, setEditing] = useState(false);
  // Escape unmounts the input, and an unmounted input fires no blur — but a
  // browser that disagrees would otherwise commit the text just abandoned.
  const cancelled = useRef(false);

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

  function commit(next: string) {
    setEditing(false);
    const trimmed = next.trim();
    // An empty or unchanged title is the user backing out, not a write.
    if (!trimmed || trimmed === title) return;
    startTransition(async () => {
      setTitle(trimmed);
      await renameTask(task.id, trimmed);
    });
  }

  return (
    <li className="flex items-start gap-3">
      <PixelCheckbox
        checked={completed}
        onChange={onToggle}
        aria-label={title}
        className="mt-1"
      />
      {/* The grow spacer is separate from the title so the strike stops where
          the text does rather than running on to the delete button, and so the
          delete button does not move when the row swaps into an input. */}
      <span className="grow">
        {editing ? (
          <form
            action={(formData: FormData) => commit(String(formData.get("title") ?? ""))}
            className="flex"
          >
            <input
              // Uncontrolled: typing never waits on React, as in `AddTaskForm`.
              defaultValue={title}
              name="title"
              autoComplete="off"
              // The caret belongs in the field the user just opened by
              // clicking its text; this is a response to their action, not a
              // steal on page load.
              autoFocus
              aria-label={`Edit “${title}”`}
              onFocus={(event) => {
                // Caret at the end rather than the text selected, so the first
                // keystroke appends instead of replacing the whole title.
                const { value } = event.currentTarget;
                event.currentTarget.setSelectionRange(value.length, value.length);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  cancelled.current = true;
                  setEditing(false);
                }
              }}
              onBlur={(event) => {
                if (cancelled.current) {
                  cancelled.current = false;
                  setEditing(false);
                  return;
                }
                commit(event.currentTarget.value);
              }}
              className="w-full border-2 border-ink bg-paper px-2 py-1"
            />
          </form>
        ) : (
          <button
            type="button"
            // A button rather than a click handler on the span: editing has to
            // be reachable with a keyboard, not only a pointer.
            onClick={() => {
              cancelled.current = false;
              setEditing(true);
            }}
            aria-label={`Edit “${title}”`}
            className={`block w-full cursor-text text-left ${
              completed ? "strike-pixel text-ink-soft" : ""
            }`}
          >
            {title}
          </button>
        )}
      </span>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete “${title}”`}
        // A 32px square: the delete control is the smallest thing on the page and
        // still has to be a comfortable target.
        className="grid size-8 shrink-0 place-content-center font-display text-display-md text-ink-faint hover:bg-ink hover:text-paper"
      >
        &#215;
      </button>
    </li>
  );
}
