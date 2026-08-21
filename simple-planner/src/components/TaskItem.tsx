"use client";

import { deleteTask, renameTask, toggleTask } from "@/app/actions";
import { ChecklistRow } from "@/components/ChecklistRow";
import type { Task } from "@/db/queries";

/**
 * One dated task, inside a day section. The row's whole interaction lives in
 * `ChecklistRow`; all this adds is which three writes it performs.
 */
export function TaskItem({ task }: { task: Task }) {
  return (
    <ChecklistRow
      title={task.title}
      isCompleted={task.isCompleted}
      onToggle={() => toggleTask(task.id)}
      onRename={(title) => renameTask(task.id, title)}
      onDelete={() => deleteTask(task.id)}
    />
  );
}
