/* eslint-disable @next/next/no-img-element */
export default function Avatar({ src, name, size = 32 }: { src: string | null; name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
  return src ? (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      className="rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className="inline-flex items-center justify-center rounded-full bg-neutral-200 font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </span>
  );
}
