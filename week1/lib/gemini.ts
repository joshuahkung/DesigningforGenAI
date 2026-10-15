// Server-only: called from a Server Action. GEMINI_API_KEY has no NEXT_PUBLIC_ prefix, so it never reaches the browser.
import { STYLES, type Style } from "./styles";

export { STYLES, isStyle, type Style } from "./styles";

// The exact text sent to the model with every photo. It is saved next to each caption it produces,
// so if this prompt changes, old captions still show the prompt that actually wrote them.
export function captionPrompt(style: Style = "mixed") {
  return `You write captions for a humor feed that Columbia undergrads scroll every day.

Look at the photo and write 3 captions for it. The reader is a college junior who grew up in the Midwest, moved to New York City for school, lives in a dorm, is extremely online, and spends weekends figuring the city out. Things they find funny: rent and bodega prices, the subway, dining hall food, club applications, internship season, group chats, missing home a little.

Rules:
- Every caption must be about what is actually visible in this photo, not a generic situation.
- ${STYLES[style].angle}
- One sentence each, under 110 characters. No hashtags, no emojis, no quotation marks.
- Sound like a post from a funny friend, not an ad.
- Joke about situations. Never joke about how a real person in the photo looks, or about anyone's race, gender, religion, body, or disability.

Return JSON in this shape: {"captions": ["...", "...", "..."]}`;
}

// Free-tier models that accept a photo. The first one that answers wins.
const DEFAULT_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];

export type CaptionResult = { ok: true; captions: string[]; model: string } | { ok: false; error: string };

type GeminiResponse = {
  candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
};

function parseCaptions(text: string): string[] {
  // The model is asked for JSON, but tolerate a ```json fence around it.
  const body = text.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return [];
  }
  const list = Array.isArray(raw) ? raw : (raw as { captions?: unknown })?.captions;
  if (!Array.isArray(list)) return [];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    if (typeof item !== "string") continue;
    const caption = item.trim().replace(/^["“”']+|["“”']+$/g, "").trim().slice(0, 300);
    const key = caption.toLowerCase();
    if (!caption || seen.has(key)) continue;
    seen.add(key);
    out.push(caption);
  }
  return out.slice(0, 3);
}

/** Send one photo to Gemini and get back up to three captions. */
export async function writeCaptions(image: { base64: string; mimeType: string }, style: Style = "mixed"): Promise<CaptionResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, error: "The AI isn't set up yet: GEMINI_API_KEY is missing on the server." };

  const models = [process.env.GEMINI_MODEL, ...DEFAULT_MODELS].filter((m, i, all): m is string => !!m && all.indexOf(m) === i);
  let lastError = "The AI didn't respond. Try again in a minute.";

  for (const model of models) {
    let res: Response;
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ inlineData: { mimeType: image.mimeType, data: image.base64 } }, { text: captionPrompt(style) }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: { captions: { type: "ARRAY", items: { type: "STRING" } } },
              required: ["captions"],
            },
          },
        }),
        signal: AbortSignal.timeout(40_000),
        cache: "no-store",
      });
    } catch {
      lastError = "The AI took too long to answer. Try again.";
      continue;
    }

    const json = (await res.json().catch(() => ({}))) as GeminiResponse;

    if (!res.ok) {
      if (res.status === 429) lastError = "The AI has hit its free limit for now. Try again in a few minutes.";
      else if (res.status === 400 || res.status === 403) {
        // A bad key or a rejected request won't be fixed by trying another model.
        return { ok: false, error: `The AI rejected the request: ${json.error?.message ?? res.statusText}` };
      } else lastError = `The AI returned an error (${res.status}). Try again.`;
      continue; // 404 (model retired), 429, 5xx: try the next model
    }

    const candidate = json.candidates?.[0];
    if (json.promptFeedback?.blockReason || candidate?.finishReason === "SAFETY" || candidate?.finishReason === "PROHIBITED_CONTENT") {
      return { ok: false, error: "The AI wouldn't caption that photo. Try a different one." };
    }

    const text = (candidate?.content?.parts ?? [])
      .filter((p) => !p.thought && typeof p.text === "string")
      .map((p) => p.text)
      .join("");
    const captions = parseCaptions(text);
    if (captions.length) return { ok: true, captions, model };
    lastError = "The AI answered, but not with captions. Try again.";
  }

  return { ok: false, error: lastError };
}
