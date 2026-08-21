"use client";

import { useOptimistic, useTransition } from "react";
import { addTask } from "@/app/actions";
import type { Task } from "@/db/queries";
import { AddTaskForm } from "./AddTaskForm";
import { TaskItem } from "./TaskItem";

/**
 * Owns the optimistic list for one day, because an optimistic *append* has to
 * live where the list does — the form below it cannot render a row above
 * itself. Toggling and deleting stay inside `TaskItem`, which owns its own row.
 */
export function DayTasks({
  dayKey,
  dayLabel,
  tasks,
}: {
  dayKey: string;
  dayLabel: string;
  tasks: Task[];
}) {
  const [, startTransition] = useTransition();
  const [optimisticTasks, appendTask] = useOptimistic(tasks, (current: Task[], title: string) => [
    ...current,
    {
      // Negative so it cannot collide with a real identity column value while
      // the server round-trip is in flight.
      id: -Date.now(),
      title,
      dayKey,
      isCompleted: false,
      createdAt: new Date(),
    },
  ]);

  function onAdd(title: string) {
    startTransition(async () => {
      appendTask(title);
      const formData = new FormData();
      formData.set("title", title);
      await addTask(dayKey, formData);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {optimisticTasks.length > 0 && (
        <ul className="flex flex-col gap-1">
          {optimisticTasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </ul>
      )}
      <AddTaskForm dayLabel={dayLabel} onAdd={onAdd} />
    </div>
  );
}
