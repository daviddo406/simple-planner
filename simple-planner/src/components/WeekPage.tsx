import { dayKey as toDayKey, daysOfWeek, formatWeekRange, parseDayKey } from "@/lib/calendar";
import type { Task } from "@/db/queries";
import { Slime } from "@/components/ui/Slime";
import type { SlimeId } from "@/lib/slimes";
import { DaySection } from "./DaySection";

/**
 * Seven dated sections, Monday first, derived entirely from `weekKey` — the
 * one piece of state the whole app has, and it lives in the URL rather than in
 * React. The mini calendar derives from the same value, so the two cannot
 * disagree.
 */
export function WeekPage({
  weekKey,
  tasks,
  holidays,
  slime,
}: {
  weekKey: string;
  tasks: Record<string, Task[]>;
  holidays: Record<string, string[]>;
  slime: SlimeId;
}) {
  const days = daysOfWeek(parseDayKey(weekKey));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-4 border-b-2 border-accent pb-3">
        {/* Decoration, so it is hidden: announcing "teal slime" before every
            week range is noise. In the picker it is the opposite. */}
        <Slime id={slime} scale={2} />
        <h1 className="font-display text-display-md uppercase">{formatWeekRange(days[0])}</h1>
      </header>
      <div className="flex flex-col gap-4">
        {days.map((date) => {
          const key = toDayKey(date);
          return (
            <DaySection
              key={key}
              date={date}
              dayKey={key}
              tasks={tasks[key] ?? []}
              holidays={holidays[key] ?? []}
            />
          );
        })}
      </div>
    </div>
  );
}
