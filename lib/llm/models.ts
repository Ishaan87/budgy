import type { LlmProvider } from "./types";

export const PROVIDER_LABELS: Record<LlmProvider, string> = {
  openrouter: "OpenRouter",
  gemini: "Google Gemini",
  huggingface: "HuggingFace",
};

/** Suggested models per provider. The model field also accepts free text for anything newer. */
export const MODEL_PRESETS: Record<LlmProvider, string[]> = {
  openrouter: [
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemini-2.0-flash-exp:free",
    "qwen/qwen-2.5-72b-instruct:free",
    "mistralai/mistral-small-3.1-24b-instruct:free",
  ],
  gemini: ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"],
  huggingface: [
    "meta-llama/Llama-3.3-70B-Instruct",
    "Qwen/Qwen2.5-72B-Instruct",
    "mistralai/Mistral-7B-Instruct-v0.3",
  ],
};
