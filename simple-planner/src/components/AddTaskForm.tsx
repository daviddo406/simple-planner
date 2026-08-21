"use client";

import { useRef } from "react";

/**
 * The input is square, 2px-bordered, and inherits the body face — no browser
 * default styling survives. Clearing is done through a ref on submit rather
 * than by making the field controlled, so typing never waits on React.
 */
export function AddTaskForm({
  dayLabel,
  onAdd,
}: {
  dayLabel: string;
  onAdd: (title: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <form
      action={(formData: FormData) => {
        const title = String(formData.get("title") ?? "").trim();
        if (!title) return;
        onAdd(title);
        if (input.current) input.current.value = "";
      }}
      className="flex gap-2"
    >
      <input
        ref={input}
        name="title"
        autoComplete="off"
        aria-label={`Add a task to ${dayLabel}`}
        placeholder="+ add"
        className="w-full border-2 border-ink bg-paper px-2 py-1 placeholder:text-ink-ghost"
      />
    </form>
  );
}
