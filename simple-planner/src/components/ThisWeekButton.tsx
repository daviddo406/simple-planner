"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { PixelButton } from "@/components/ui/PixelButton";
import { dayKey, shiftMonth, startOfWeekMonday } from "@/lib/calendar";

/**
 * A way back, shown only when the reader has navigated away from the week they
 * are in.
 *
 * "This week" is the same thing the server cannot know as "today": it depends
 * on the browser's clock and zone, and a server-rendered answer would be wrong
 * for anyone far enough east *and* would hydrate into a mismatch. The browser's
 * clock is therefore read as an external store, whose server snapshot is `null`
 * — so the server sends no button, hydration matches, and the browser fills the
 * answer in. Nothing subscribes, because the clock has no change event; the
 * snapshot is re-read on every render instead, which keeps it honest across
 * midnight.
 *
 * The link carries `&month=` as well, so following it brings the mini calendar
 * back with the week page rather than leaving it paged somewhere else.
 */
export function ThisWeekButton({ weekKey }: { weekKey: string }) {
  const currentWeekKey = useSyncExternalStore(
    () => () => {},
    () => dayKey(startOfWeekMonday(new Date())),
    () => null,
  );

  if (currentWeekKey === null || currentWeekKey === weekKey) return null;

  const monthKey = dayKey(shiftMonth(new Date(), 0));

  return (
    <PixelButton as={Link} href={`/?week=${currentWeekKey}&month=${monthKey}`}>
      This week
    </PixelButton>
  );
}
