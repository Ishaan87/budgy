import { LlmAdapterError, type LlmAdapter, type LlmCompletionRequest, type LlmCompletionResult } from "../types";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export const openrouterAdapter: LlmAdapter = {
  provider: "openrouter",

  async complete(req: LlmCompletionRequest): Promise<LlmCompletionResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), req.timeoutMs ?? 20_000);

    let response: Response;
    try {
      response = await fetch(ENDPOINT, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${req.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
          "X-Title": "BUDGY",
        },
        body: JSON.stringify({
          model: req.model,
          messages: [
            { role: "system", content: req.system },
            { role: "user", content: req.user },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: req.schemaName, strict: true, schema: req.jsonSchema },
          },
        }),
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        throw new LlmAdapterError("SERVER", "OpenRouter request timed out");
      }
      throw new LlmAdapterError("SERVER", `OpenRouter network error: ${(err as Error).message}`);
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw classifyHttpError(response);
    }

    const json = await response.json();
    const text = json?.choices?.[0]?.message?.content;
    if (typeof text !== "string") {
      throw new LlmAdapterError("INVALID_OUTPUT", "OpenRouter returned no message content");
    }

    return {
      text,
      inputTokens: json?.usage?.prompt_tokens,
      outputTokens: json?.usage?.completion_tokens,
    };
  },
};

function classifyHttpError(response: Response): LlmAdapterError {
  const retryAfterHeader = response.headers.get("retry-after");
  const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : undefined;

  if (response.status === 429) {
    return new LlmAdapterError("RATE_LIMIT", "OpenRouter rate limit hit", retryAfterMs);
  }
  if (response.status === 402) {
    return new LlmAdapterError("QUOTA", "OpenRouter account is out of credits");
  }
  if (response.status === 401 || response.status === 403) {
    return new LlmAdapterError("AUTH", "OpenRouter API key is invalid or revoked");
  }
  if (response.status === 404) {
    return new LlmAdapterError("MODEL_GONE", "OpenRouter model not found");
  }
  if (response.status >= 500) {
    return new LlmAdapterError("SERVER", `OpenRouter server error (${response.status})`);
  }
  return new LlmAdapterError("UNKNOWN", `OpenRouter returned HTTP ${response.status}`);
}
