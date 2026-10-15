"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markActivitySeen } from "./actions";

/** After the page is on screen, mark the activity as seen and clear the dot in the nav. */
export default function MarkSeen({ hadNew }: { hadNew: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!hadNew) return;
    const t = setTimeout(() => markActivitySeen().then(() => router.refresh()), 1500);
    return () => clearTimeout(t);
  }, [hadNew, router]);
  return null;
}
