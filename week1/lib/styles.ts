// Shared by the Create page (the style chips) and the server (the prompt).
// Humor styles a user can pick on the Create page. "mixed" is the original three-angle prompt.
export const STYLES = {
  mixed: { label: "Mixed", angle: "Use a different angle for each one: one dry observation, one overly dramatic, one painfully relatable." },
  sarcastic: { label: "Sarcastic", angle: "All three are sarcastic: deadpan and eye-rolling, saying the opposite of what's meant. Make each a different joke." },
  absurd: { label: "Absurd", angle: "All three are absurd: take what's in the photo and escalate it into something surreal or ridiculous, still clearly about this photo." },
  relatable: { label: "Relatable", angle: "All three are painfully relatable: small, specific feelings of student life in New York that make people say \"literally me\"." },
  wholesome: { label: "Wholesome", angle: "All three are wholesome: warm and kind, still genuinely funny, no snark." },
} as const;
export type Style = keyof typeof STYLES;
export const isStyle = (s: unknown): s is Style => typeof s === "string" && Object.hasOwn(STYLES, s);
