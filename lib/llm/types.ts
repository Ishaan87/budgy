export type LlmProvider = "openrouter" | "gemini" | "huggingface";

export type LlmErrorKind =
  | "RATE_LIMIT"
  | "QUOTA"
  | "AUTH"
  | "MODEL_GONE"
  | "SERVER"
  | "INVALID_OUTPUT"
  | "UNKNOWN";

export class LlmAdapterError extends Error {
  kind: LlmErrorKind;
  /** For RATE_LIMIT, how long to cool down before retrying this model. */
  retryAfterMs?: number;

  constructor(kind: LlmErrorKind, message: string, retryAfterMs?: number) {
    super(message);
    this.name = "LlmAdapterError";
    this.kind = kind;
    this.retryAfterMs = retryAfterMs;
  }
}

export type LlmCompletionRequest = {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  /** Plain JSON Schema (as produced by z.toJSONSchema) describing the required output shape. */
  jsonSchema: Record<string, unknown>;
  schemaName: string;
  timeoutMs?: number;
};

export type LlmCompletionResult = {
  /** Raw JSON text returned by the model — the caller validates it against a Zod schema. */
  text: string;
  inputTokens?: number;
  outputTokens?: number;
};

export interface LlmAdapter {
  provider: LlmProvider;
  complete(req: LlmCompletionRequest): Promise<LlmCompletionResult>;
}

/** Strips JSON Schema keywords that Gemini's OpenAPI-subset schema format rejects. */
export function toGeminiSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const clone = structuredClone(schema);
  const strip = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(strip);
    if (node && typeof node === "object") {
      const obj = node as Record<string, unknown>;
      delete obj.$schema;
      delete obj.additionalProperties;
      delete obj.$id;
      for (const key of Object.keys(obj)) {
        obj[key] = strip(obj[key]);
      }
      return obj;
    }
    return node;
  };
  return strip(clone) as Record<string, unknown>;
}
