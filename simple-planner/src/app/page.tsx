import { MiniCalendar } from "@/components/MiniCalendar";
import { TodayMarker } from "@/components/TodayMarker";
import { WeekPage } from "@/components/WeekPage";
import { SlimePicker } from "@/components/SlimePicker";
import { getSlime, tasksForWeek } from "@/db/queries";
import { SLIMES } from "@/lib/slimes";
import { dayKey, isDayKey, parseDayKey, shiftMonth, startOfWeekMonday } from "@/lib/calendar";
import { holidaysByDayKey, holidaysForYear } from "@/lib/holidays";
import { WeekRedirect } from "./week-redirect";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * The selected week lives in the URL, not in React state. The iOS app's "one
 * `selectedDate` owned by the root view" becomes one `?week=` param owned by
 * the router: the mini calendar and the week page both derive from it, so they
 * cannot disagree — the same invariant, with the better property that the
 * state is shareable, bookmarkable, and survives a reload.
 */
export default async function Page({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const requestedWeek = firstValue(params.week);

  if (!requestedWeek || !isDayKey(requestedWeek)) {
    return <WeekRedirect />;
  }

  // Normalize rather than trust: `?week=` is user input and may name any day.
  const weekKey = dayKey(startOfWeekMonday(parseDayKey(requestedWeek)));

  // The visible month is its own param, because paging the mini calendar to
  // another month must not move the week page.
  const requestedMonth = firstValue(params.month);
  const monthKey =
    requestedMonth && isDayKey(requestedMonth)
      ? dayKey(shiftMonth(parseDayKey(requestedMonth), 0))
      : dayKey(shiftMonth(parseDayKey(weekKey), 0));

  const [tasks, slime] = await Promise.all([tasksForWeek(weekKey), getSlime()]);
  const holidays = holidaysByDayKey(weekKey);
  // The grid can show a month either side of the selected week, so the mini
  // calendar is given the whole visible year's holidays rather than the week's.
  const monthHolidayKeys = holidaysForYear(parseDayKey(monthKey).getFullYear()).map(
    (holiday) => holiday.dayKey,
  );

  return (
    <main
      // The chosen slime's shade *is* the accent. Publishing it as the token
      // here means the week rule and the holiday square pick it up with no
      // component knowing a slime exists.
      style={{ "--color-accent": SLIMES[slime].shade } as React.CSSProperties}
      className="mx-auto flex max-w-280 flex-col items-start gap-8 p-6 lg:flex-row"
    >
      <aside className="flex shrink-0 flex-col gap-4">
        <MiniCalendar weekKey={weekKey} monthKey={monthKey} holidayKeys={monthHolidayKeys} />
        <SlimePicker selected={slime} />
        <TodayMarker />
      </aside>
      <div className="w-full grow">
        <WeekPage weekKey={weekKey} tasks={tasks} holidays={holidays} slime={slime} />
      </div>
    </main>
  );
}
