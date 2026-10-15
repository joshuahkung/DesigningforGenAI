/**
 * How a caption is doing, spelled out: "Score +1" (funny minus not funny), then the counts behind it.
 * `dark` is for use on the black sign plates.
 */
export default function ScoreLabel({ up, down, dark = false }: { up: number; down: number; dark?: boolean }) {
  const score = up - down;
  const total = up + down;
  const pill =
    score > 0 ? "bg-up text-white" : score < 0 ? "bg-down text-white" : dark ? "bg-white/15 text-white" : "bg-black/[0.07] text-foreground dark:bg-white/15";
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      <span
        title="Score = funny votes minus not-funny votes"
        className={`inline-flex items-center rounded-full px-2 py-0.5 font-bold tabular-nums ${pill}`}
      >
        Score {score > 0 ? `+${score}` : score}
      </span>
      <span className={`tabular-nums ${dark ? "text-neutral-400" : "text-neutral-500"}`}>
        {total === 0 ? "No votes yet" : `${up} funny · ${down} not funny`}
      </span>
    </span>
  );
}
