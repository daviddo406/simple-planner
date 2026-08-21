import { dayKey as toDayKey, daysOfWeek, formatWeekRange, parseDayKey } from "@/lib/calendar";
import type { Task } from "@/db/queries";
import { Slime } from "@/components/ui/Slime";
import type { SlimeId } from "@/lib/slimes";
import { DaySection } from "./DaySection";
import { ThisWeekButton } from "./ThisWeekButton";

/**
 * Where each day sits on the two-page spread at `md` and up. Tailwind needs
 * whole class names to see them, so the six positions are written out rather
 * than computed from the index.
 */
const COLUMN_PLACEMENT = [
  "md:col-start-1 md:row-start-1",
  "md:col-start-1 md:row-start-2",
  "md:col-start-1 md:row-start-3",
  "md:col-start-2 md:row-start-1",
  "md:col-start-2 md:row-start-2",
  "md:col-start-2 md:row-start-3",
  "md:col-span-2 md:col-start-1 md:row-start-4",
];

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
        <h1 className="font-display text-display-md uppercase text-accent">
          {formatWeekRange(days[0])}
        </h1>
        <div className="ml-auto">
          <ThisWeekButton weekKey={weekKey} />
        </div>
      </header>
      {/* Two facing columns, the way a paper planner opens, each read top to
          bottom rather than across: Mon/Tue/Wed down the left, Thu/Fri/Sat down
          the right, then Sunday across the fold. The DOM stays in weekday
          order — the placement is explicit so the columns fill downwards — and
          below `md` the placement drops away and the days stack in that same
          order, because a half-width day is narrower than the task text it has
          to hold. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {days.map((date, index) => {
          const key = toDayKey(date);
          return (
            <DaySection
              key={key}
              date={date}
              dayKey={key}
              tasks={tasks[key] ?? []}
              holidays={holidays[key] ?? []}
              className={COLUMN_PLACEMENT[index]}
            />
          );
        })}
      </div>
    </div>
  );
}
