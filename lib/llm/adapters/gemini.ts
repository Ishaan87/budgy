import {
  LlmAdapterError,
  toGeminiSchema,
  type LlmAdapter,
  type LlmCompletionRequest,
  type LlmCompletionResult,
} from "../types";

function endpointFor(model: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
}

export const geminiAdapter: LlmAdapter = {
  provider: "gemini",

  async complete(req: LlmCompletionRequest): Promise<LlmCompletionResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), req.timeoutMs ?? 20_000);

    let response: Response;
    try {
      response = await fetch(endpointFor(req.model), {
        method: "POST",
        signal: controller.signal,
        headers: {
          "x-goog-api-key": req.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: req.system }] },
          contents: [{ role: "user", parts: [{ text: req.user }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: toGeminiSchema(req.jsonSchema),
          },
        }),
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        throw new LlmAdapterError("SERVER", "Gemini request timed out");
      }
      throw new LlmAdapterError("SERVER", `Gemini network error: ${(err as Error).message}`);
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw await classifyHttpError(response);
    }

    const json = await response.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") {
      throw new LlmAdapterError("INVALID_OUTPUT", "Gemini returned no candidate text");
    }

    return {
      text,
      inputTokens: json?.usageMetadata?.promptTokenCount,
      outputTokens: json?.usageMetadata?.candidatesTokenCount,
    };
  },
};

async function classifyHttpError(response: Response): Promise<LlmAdapterError> {
  if (response.status === 429) {
    // Gemini reports quota resets via the response body rather than Retry-After; fall back
    // to a conservative default cooldown, which the router treats as a RATE_LIMIT.
    return new LlmAdapterError("RATE_LIMIT", "Gemini rate limit hit", 60_000);
  }
  if (response.status === 401 || response.status === 403) {
    return new LlmAdapterError("AUTH", "Gemini API key is invalid or revoked");
  }
  if (response.status === 404) {
    return new LlmAdapterError("MODEL_GONE", "Gemini model not found");
  }
  if (response.status >= 500) {
    return new LlmAdapterError("SERVER", `Gemini server error (${response.status})`);
  }
  return new LlmAdapterError("UNKNOWN", `Gemini returned HTTP ${response.status}`);
}
