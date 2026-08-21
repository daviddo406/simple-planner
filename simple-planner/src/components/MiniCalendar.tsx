import Link from "next/link";
import {
  dayKey as toDayKey,
  formatDayLabel,
  monthGrid,
  monthLabel,
  parseDayKey,
  shiftMonth,
  startOfWeekMonday,
  weekdayHeaders,
} from "@/lib/calendar";
import { PixelButton } from "@/components/ui/PixelButton";
import { PixelFrame } from "@/components/ui/PixelFrame";

/**
 * A navigator, not a month view. Every cell is a `<Link>` and there is no
 * state at all: the whole grid is server-rendered HTML, so paging months and
 * picking a day are ordinary URL changes.
 *
 * The month is a separate param from the week, because paging to another month
 * must not move the week page — it only changes what the grid shows.
 */
export function MiniCalendar({
  weekKey,
  monthKey,
  holidayKeys,
}: {
  weekKey: string;
  monthKey: string;
  holidayKeys: string[];
}) {
  const month = parseDayKey(monthKey);
  const selectedWeek = new Set(
    monthGrid(month)
      .flat()
      .filter((cell): cell is Date => cell !== null)
      .filter((cell) => toDayKey(startOfWeekMonday(cell)) === weekKey)
      .map(toDayKey),
  );
  const holidays = new Set(holidayKeys);

  const href = (week: string, monthStart: string) => `/?week=${week}&month=${monthStart}`;

  return (
    <PixelFrame className="w-max p-4">
      <div className="mb-3 flex items-center justify-between gap-6">
        <span className="font-display text-display-md">{monthLabel(month)}</span>
        <div className="flex gap-2">
          <PixelButton
            as={Link}
            aria-label="Previous month"
            href={href(weekKey, toDayKey(shiftMonth(month, -1)))}
          >
            &#9668;
          </PixelButton>
          <PixelButton
            as={Link}
            aria-label="Next month"
            href={href(weekKey, toDayKey(shiftMonth(month, 1)))}
          >
            &#9658;
          </PixelButton>
        </div>
      </div>

      <table className="border-collapse">
        <thead>
          <tr>
            {weekdayHeaders().map((letter, column) => (
              <th
                // The seven headers are not unique letters — M T W T F S S —
                // so the column index is the only stable key.
                key={column}
                scope="col"
                className="size-8 font-display text-display-sm font-normal text-ink-faint"
              >
                {letter}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {monthGrid(month).map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, column) => {
                if (!cell) {
                  // Padding cells are empty rather than adjacent-month dates,
                  // so the grid never asks the reader to ignore something.
                  return <td key={column} className="size-8" />;
                }
                const key = toDayKey(cell);
                const inWeek = selectedWeek.has(key);
                return (
                  <td key={column} className="size-8 p-0">
                    <Link
                      href={href(toDayKey(startOfWeekMonday(cell)), monthKey)}
                      aria-label={`${cell.getDate()} ${formatDayLabel(cell).split(" ").slice(2).join(" ")} ${cell.getFullYear()}`}
                      data-day-key={key}
                      data-in-week={inWeek || undefined}
                      className={[
                        "relative flex size-8 flex-col items-center justify-center",
                        "font-display text-display-sm",
                        // Selection is marked by inverting the fill, not by a
                        // ring: a ring on a 32px cell competes with the grid's
                        // own 2px borders and reads as noise.
                        inWeek ? "bg-ink text-paper" : "text-ink hover:bg-ink-ghost",
                      ].join(" ")}
                    >
                      {cell.getDate()}
                      {holidays.has(key) && (
                        <span
                          aria-hidden
                          className="absolute bottom-[3px] h-[2px] w-[2px] bg-accent"
                        />
                      )}
                    </Link>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </PixelFrame>
  );
}
