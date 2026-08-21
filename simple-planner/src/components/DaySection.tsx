import { formatDayLabel, weekdayAbbreviation } from "@/lib/calendar";
import { PixelFrame } from "@/components/ui/PixelFrame";
import type { Task } from "@/db/queries";
import { DayTasks } from "./DayTasks";

/**
 * One framed section per day, the way a paper planner gives each day its own
 * dated block. Holidays are printed inline on the header line — uppercase and
 * letter-spaced rather than italic, which a bitmap face either lacks entirely
 * or fakes by shearing the bitmap into mush.
 */
export function DaySection({
  date,
  dayKey,
  tasks,
  holidays,
}: {
  date: Date;
  dayKey: string;
  tasks: Task[];
  holidays: string[];
}) {
  const label = formatDayLabel(date);

  return (
    <PixelFrame as="section" aria-label={label} className="flex flex-col gap-3 p-4">
      <div className="flex items-baseline gap-3 border-b-2 border-ink-faint pb-2">
        <span className="font-display text-display-md">{date.getDate()}</span>
        <span className="font-display text-display-sm text-accent">
          {weekdayAbbreviation(date)}
        </span>
        {holidays.length > 0 && (
          <span className="ml-auto flex items-center gap-2 text-body-sm uppercase tracking-[2px] text-ink-soft">
            {/* A drawn pixel glyph, not a font dingbat — nothing to antialias. */}
            <span aria-hidden className="inline-block size-2 bg-accent" />
            {holidays.join(" · ")}
          </span>
        )}
      </div>
      <DayTasks dayKey={dayKey} dayLabel={label} tasks={tasks} />
    </PixelFrame>
  );
}
