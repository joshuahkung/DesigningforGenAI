/* eslint-disable @next/next/no-img-element */

/**
 * A user photo shown whole (never cropped, since the caption is about the whole picture),
 * sitting on a blurred copy of itself so any leftover space isn't an empty bar.
 */
export default function CaptionPhoto({ src, className = "" }: { src: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-neutral-900 ${className}`}>
      <img
        src={src}
        alt=""
        aria-hidden
        draggable={false}
        className="absolute inset-0 h-full w-full scale-125 object-cover opacity-70 blur-2xl"
      />
      <img
        src={src}
        alt="Photo this caption was written for"
        draggable={false}
        className="relative h-full w-full object-contain"
      />
    </div>
  );
}
