"use client";

import { useOptimistic, useTransition } from "react";
import { addTodo } from "@/app/actions";
import { PixelFrame } from "@/components/ui/PixelFrame";
import type { WeekTodo } from "@/db/queries";
import { AddTaskForm } from "./AddTaskForm";
import { TodoItem } from "./TodoItem";

/**
 * The week's own list, in the sidebar under the theme picker — the things that
 * belong to the week without belonging to a day on it.
 *
 * A `fieldset` with a legend, like the slime and theme pickers beside it, so
 * the three sidebar boxes read as one column of labelled panels rather than a
 * list that happens to sit below two settings.
 *
 * Owns the optimistic append for the same reason `DayTasks` does: the form at
 * the bottom cannot render a row above itself. Ticking, renaming, and deleting
 * stay inside `TodoItem`, which owns its own row.
 */
export function WeekTodoList({ weekKey, todos }: { weekKey: string; todos: WeekTodo[] }) {
  const [, startTransition] = useTransition();
  const [optimisticTodos, appendTodo] = useOptimistic(
    todos,
    (current: WeekTodo[], title: string) => [
      ...current,
      {
        // Negative so it cannot collide with a real identity column value while
        // the server round-trip is in flight.
        id: -Date.now(),
        title,
        weekKey,
        isCompleted: false,
        createdAt: new Date(),
      },
    ],
  );

  function onAdd(title: string) {
    startTransition(async () => {
      appendTodo(title);
      await addTodo(weekKey, title);
    });
  }

  return (
    <PixelFrame as="fieldset" className="p-3">
      <legend className="px-2 font-display text-display-sm uppercase text-ink-soft">Todo</legend>
      <div className="flex flex-col gap-2">
        {optimisticTodos.length > 0 && (
          <ul className="flex flex-col gap-1">
            {optimisticTodos.map((todo) => (
              <TodoItem key={todo.id} todo={todo} />
            ))}
          </ul>
        )}
        <AddTaskForm dayLabel="this week’s list" onAdd={onAdd} />
      </div>
    </PixelFrame>
  );
}
