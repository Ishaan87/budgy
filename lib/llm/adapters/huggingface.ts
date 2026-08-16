import { LlmAdapterError, type LlmAdapter, type LlmCompletionRequest, type LlmCompletionResult } from "../types";

// HuggingFace's OpenAI-compatible router endpoint.
const ENDPOINT = "https://router.huggingface.co/v1/chat/completions";

export const huggingfaceAdapter: LlmAdapter = {
  provider: "huggingface",

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
        throw new LlmAdapterError("SERVER", "HuggingFace request timed out");
      }
      throw new LlmAdapterError("SERVER", `HuggingFace network error: ${(err as Error).message}`);
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw classifyHttpError(response);
    }

    const json = await response.json();
    const text = json?.choices?.[0]?.message?.content;
    if (typeof text !== "string") {
      throw new LlmAdapterError("INVALID_OUTPUT", "HuggingFace returned no message content");
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
    return new LlmAdapterError("RATE_LIMIT", "HuggingFace rate limit hit", retryAfterMs);
  }
  if (response.status === 402) {
    return new LlmAdapterError("QUOTA", "HuggingFace credits exhausted");
  }
  if (response.status === 401 || response.status === 403) {
    return new LlmAdapterError("AUTH", "HuggingFace API key is invalid or revoked");
  }
  if (response.status === 404) {
    return new LlmAdapterError("MODEL_GONE", "HuggingFace model not found");
  }
  if (response.status >= 500) {
    return new LlmAdapterError("SERVER", `HuggingFace server error (${response.status})`);
  }
  return new LlmAdapterError("UNKNOWN", `HuggingFace returned HTTP ${response.status}`);
}
