"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { dayKey, startOfWeekMonday } from "@/lib/calendar";

/**
 * Resolves this week's Monday from the *browser's* clock and rewrites the URL.
 *
 * The server does not know the user's time zone, so if `/` computed "today"
 * during SSR a user in UTC+13 could be shown yesterday's week and React would
 * log a hydration mismatch. Instead `/` renders nothing date-dependent until
 * `?week=` is present; from then on the server render is fully deterministic
 * and every later navigation is an ordinary URL change.
 *
 * The skeleton below deliberately contains no date.
 */
export function WeekRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/?week=${dayKey(startOfWeekMonday(new Date()))}`);
  }, [router]);

  return (
    <div className="p-6 font-display text-display-sm uppercase text-ink-faint">
      Opening this week…
    </div>
  );
}
