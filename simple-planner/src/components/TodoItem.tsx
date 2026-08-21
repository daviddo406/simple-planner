"use client";

import { deleteTodo, renameTodo, toggleTodo } from "@/app/actions";
import { ChecklistRow } from "@/components/ChecklistRow";
import type { WeekTodo } from "@/db/queries";

/**
 * One row of the week's list. The twin of `TaskItem`, differing only in which
 * table it writes to — which matters, because `tasks` and `week_todos` have
 * independent identity columns and so share ids freely.
 */
export function TodoItem({ todo }: { todo: WeekTodo }) {
  return (
    <ChecklistRow
      title={todo.title}
      isCompleted={todo.isCompleted}
      onToggle={() => toggleTodo(todo.id)}
      onRename={(title) => renameTodo(todo.id, title)}
      onDelete={() => deleteTodo(todo.id)}
    />
  );
}
