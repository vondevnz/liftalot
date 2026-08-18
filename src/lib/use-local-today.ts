"use client";

import { useEffect, useState } from "react";
import { todayLocal, type DateString } from "./date";

/**
 * The server cannot know the viewer's timezone, so pages render first with the
 * server's own date and correct to the real local date on mount.
 *
 * Computing it during render instead would produce a hydration mismatch for
 * every user whose local day differs from the server's — which, for a UTC host
 * and a user in Auckland, is most of the evening.
 */
export function useLocalToday(serverToday: DateString): DateString {
  const [today, setToday] = useState(serverToday);

  useEffect(() => {
    const local = todayLocal();
    if (local !== serverToday) setToday(local);
  }, [serverToday]);

  return today;
}
