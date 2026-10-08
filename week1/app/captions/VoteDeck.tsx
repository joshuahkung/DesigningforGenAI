"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import CaptionPhoto from "@/components/CaptionPhoto";
import type { FeedCaption } from "@/lib/captions";
import { castVote } from "./actions";

type Direction = "left" | "right" | "down";
type Ghost = { caption: FeedCaption; direction: Direction; fromX: number };
type Notice =
  | { kind: "saved"; value: 1 | -1; upvotes: number; downvotes: number }
  | { kind: "error"; message: string; signedOut?: boolean }
  | null;

const SWIPE_DISTANCE = 90; // px a card must be dragged sideways to count as a vote

function Arrow({ up }: { up: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={up ? "" : "rotate-180"}>
      <path d="M12 20V5M5 12l7-7 7 7" />
    </svg>
  );
}

/** One caption and its photo: the photo on top, the caption on a black sign plate below it. */
function Card({ caption }: { caption: FeedCaption }) {
  const size = caption.content.length <= 60 ? "text-2xl" : caption.content.length <= 110 ? "text-xl" : "text-lg";
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-black/15 bg-sign shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35)] dark:border-white/15">
      <CaptionPhoto src={caption.image_url} className="min-h-0 flex-1" />
      <div className="bg-sign px-5 pb-5 pt-[7px] text-white">
        <div className="mb-3.5 h-px bg-white/90" />
        <p className={`font-bold leading-snug tracking-tight text-balance ${size}`}>{caption.content}</p>
      </div>
    </article>
  );
}

export default function VoteDeck({ initial }: { initial: FeedCaption[] }) {
  const [deck, setDeck] = useState(initial);
  const [position, setPosition] = useState(0);
  const [skipped, setSkipped] = useState<FeedCaption[]>([]);
  const [ghost, setGhost] = useState<Ghost | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<number | null>(null);

  const current = deck[position];
  const remaining = deck.length - position;

  function advance(direction: Direction) {
    setGhost({ caption: current, direction, fromX: dragX });
    setDragX(0);
    setDragging(false);
    dragStart.current = null;
    setPosition((p) => p + 1);
  }

  async function vote(value: 1 | -1) {
    if (!current) return;
    const caption = current;
    advance(value === 1 ? "right" : "left");
    const result = await castVote(caption.id, value);
    if (result.ok) {
      setNotice({ kind: "saved", value, upvotes: result.upvotes, downvotes: result.downvotes });
    } else {
      setNotice({ kind: "error", message: result.error, signedOut: result.signedOut });
      // Not saved, so put the card back at the end of the deck.
      if (!result.signedOut) setDeck((d) => [...d, caption]);
    }
  }

  function skip() {
    if (!current) return;
    setSkipped((s) => [...s, current]);
    advance("down");
  }

  function revisitSkipped() {
    setDeck(skipped);
    setSkipped([]);
    setPosition(0);
    setNotice(null);
  }

  // Arrow keys: left = not funny, right = funny, down = skip.
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select")) return;
    if (e.key === "ArrowRight") vote(1);
    else if (e.key === "ArrowLeft") vote(-1);
    else if (e.key === "ArrowDown") skip();
    else return;
    e.preventDefault();
  });
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Drag or swipe the card sideways to vote.
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragStart.current = e.clientX;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (dragStart.current === null) return;
    setDragX(e.clientX - dragStart.current);
  }
  function onPointerUp() {
    if (dragStart.current === null) return;
    dragStart.current = null;
    setDragging(false);
    if (dragX > SWIPE_DISTANCE) vote(1);
    else if (dragX < -SWIPE_DISTANCE) vote(-1);
    else setDragX(0);
  }

  const lean = dragX > SWIPE_DISTANCE ? "up" : dragX < -SWIPE_DISTANCE ? "down" : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <h1 className="font-semibold">Is this caption funny?</h1>
        <p className="tabular-nums text-neutral-500">{current ? `${remaining} left` : ""}</p>
      </div>

      <div className="relative min-h-0 flex-1">
        {current ? (
          <div
            key={current.id}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
              transform: dragX ? `translateX(${dragX}px) rotate(${dragX / 24}deg)` : undefined,
              transition: dragging ? undefined : "transform 160ms ease-out",
            }}
            className="absolute inset-0 cursor-grab touch-pan-y select-none active:cursor-grabbing"
          >
            <Card caption={current} />
            {lean && (
              <span
                className={`pointer-events-none absolute top-1/2 rounded-full px-5 py-2 text-lg font-bold text-white shadow-lg ${
                  lean === "up" ? "left-5 bg-up" : "right-5 bg-down"
                }`}
              >
                {lean === "up" ? "Funny" : "Not funny"}
              </span>
            )}
          </div>
        ) : (
          <div className="flex h-full flex-col items-start justify-center rounded-2xl border border-dashed border-black/20 p-8 dark:border-white/20">
            <h2 className="mb-2 text-2xl font-bold tracking-tight">
              {initial.length ? "You're caught up." : "Nothing to vote on yet."}
            </h2>
            <p className="mb-6 text-neutral-600 dark:text-neutral-400">
              {initial.length
                ? "That's every caption for now. New ones show up when someone posts a photo."
                : "Post a photo and the AI writes three captions for it. They show up here for everyone to vote on."}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/create" className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-900">
                Post a photo
              </Link>
              {skipped.length > 0 && (
                <button onClick={revisitSkipped} className="rounded-full border border-black/15 px-5 py-2.5 text-sm font-medium dark:border-white/20">
                  Go back to the {skipped.length} you skipped
                </button>
              )}
              {initial.length > 0 && (
                <Link href="/top" className="rounded-full border border-black/15 px-5 py-2.5 text-sm font-medium dark:border-white/20">
                  See the top captions
                </Link>
              )}
            </div>
          </div>
        )}

        {ghost && (
          <div
            key={`ghost-${ghost.caption.id}`}
            onAnimationEnd={() => setGhost(null)}
            style={{ "--from-x": `${ghost.fromX}px` } as React.CSSProperties}
            className={`pointer-events-none absolute inset-0 card-out-${ghost.direction}`}
          >
            <Card caption={ghost.caption} />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-start justify-center gap-7">
        <VoteButton label="Not funny" hint="Downvote" tone="down" disabled={!current} onClick={() => vote(-1)}>
          <Arrow up={false} />
        </VoteButton>
        <VoteButton label="Skip" hint="Skip without voting" tone="skip" disabled={!current} onClick={skip}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 5l7 7-7 7M17 5v14" />
          </svg>
        </VoteButton>
        <VoteButton label="Funny" hint="Upvote" tone="up" disabled={!current} onClick={() => vote(1)}>
          <Arrow up />
        </VoteButton>
      </div>

      <p aria-live="polite" className="mt-3 h-5 text-center text-sm text-neutral-500">
        {notice?.kind === "saved" && (
          <>
            Saved. That one is at{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {notice.upvotes - notice.downvotes > 0 ? "+" : ""}
              {notice.upvotes - notice.downvotes}
            </span>{" "}
            ({notice.upvotes} up, {notice.downvotes} down).
          </>
        )}
        {notice?.kind === "error" && (
          <span className="text-red-600">
            {notice.message}{" "}
            {notice.signedOut && (
              <Link href="/login" className="underline">
                Sign in
              </Link>
            )}
          </span>
        )}
        {!notice && current && <span className="hidden [@media(hover:hover)]:inline">Arrow keys work too: ← not funny, → funny, ↓ skip.</span>}
      </p>
    </div>
  );
}

function VoteButton({
  label,
  hint,
  tone,
  disabled,
  onClick,
  children,
}: {
  label: string;
  hint: string;
  tone: "up" | "down" | "skip";
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const circle =
    tone === "up"
      ? "h-[4.5rem] w-[4.5rem] bg-up text-white"
      : tone === "down"
        ? "h-[4.5rem] w-[4.5rem] bg-down text-white"
        : "mt-2 h-14 w-14 bg-skip text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${hint}: ${label}`}
      className="group flex w-20 flex-col items-center gap-1.5 text-xs font-medium disabled:opacity-35"
    >
      <span
        className={`flex items-center justify-center rounded-full transition-transform group-enabled:group-hover:scale-105 group-enabled:group-active:scale-95 group-focus-visible:outline-2 group-focus-visible:outline-offset-4 group-focus-visible:outline-foreground ${circle}`}
      >
        {children}
      </span>
      {label}
    </button>
  );
}
