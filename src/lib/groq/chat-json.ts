const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

export class GroqChatError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "GroqChatError";
  }
}

export function isGroqRateLimitError(error: unknown): error is GroqChatError {
  return error instanceof GroqChatError && error.status === 429;
}

function parseRetryAfterSeconds(headers: Headers): number | undefined {
  const raw = headers.get("retry-after");
  if (!raw) return undefined;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? Math.min(Math.max(1, n), 300) : undefined;
}

type GroqCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
};

function getGroqApiKey(): string {
  const key = process.env.GROQ_API_KEY?.trim() || process.env.GROK_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "GROQ_API_KEY is not set. Create a key at https://console.groq.com/ and add it to your environment.",
    );
  }
  return key;
}

/**
 * Calls Groq chat completions and returns the assistant message text (expected JSON).
 */
export async function groqChatJsonContent(
  systemInstruction: string,
  userText: string,
): Promise<string> {
  const apiKey = getGroqApiKey();
  const model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

  const baseBody = {
    model,
    messages: [
      { role: "system" as const, content: systemInstruction },
      { role: "user" as const, content: userText },
    ],
    temperature: 0.1,
  };

  const tryWithJsonMode = async () =>
    fetch(GROQ_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...baseBody,
        response_format: { type: "json_object" as const },
      }),
    });

  let res = await tryWithJsonMode();
  let raw = await res.text();

  if (res.status === 400 && /response_format|json_object/i.test(raw)) {
    res = await fetch(GROQ_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(baseBody),
    });
    raw = await res.text();
  }

  const retryAfterSeconds = parseRetryAfterSeconds(res.headers);

  let data: GroqCompletionResponse;
  try {
    data = JSON.parse(raw) as GroqCompletionResponse;
  } catch {
    throw new GroqChatError(
      `Groq returned non-JSON (HTTP ${res.status}).`,
      res.status || 502,
      retryAfterSeconds,
    );
  }

  if (!res.ok) {
    const msg = data.error?.message ?? `Groq request failed (HTTP ${res.status}).`;
    throw new GroqChatError(msg, res.status, retryAfterSeconds);
  }

  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new GroqChatError("Groq returned an empty response.", 502);
  }

  return content.trim();
}
