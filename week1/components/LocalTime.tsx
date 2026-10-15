"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** A time shown in the viewer's own time zone ("3:42 PM", or "Thu 3:42 PM" if it isn't today). */
export default function LocalTime({ iso }: { iso: string }) {
  const text = useSyncExternalStore(
    noop,
    () => {
      const d = new Date(iso);
      const today = d.toDateString() === new Date().toDateString();
      return d.toLocaleString([], today ? { hour: "numeric", minute: "2-digit" } : { weekday: "short", hour: "numeric", minute: "2-digit" });
    },
    () => "", // server render: no time zone yet
  );
  return <time dateTime={iso}>{text}</time>;
}
