/**
 * The LLM references accounts/categories by name (it can't invent a valid UUID), so we
 * resolve its output back to real ids ourselves: exact match first, then substring, in
 * either direction, so "hdfc" matches "HDFC Bank" and vice versa.
 */
export function resolveByName<T extends { id: string; name: string }>(
  name: string | null | undefined,
  candidates: T[],
): T | null {
  if (!name) return null;
  const target = name.trim().toLowerCase();
  if (!target) return null;

  const exact = candidates.find((c) => c.name.toLowerCase() === target);
  if (exact) return exact;

  const contains = candidates.find(
    (c) => c.name.toLowerCase().includes(target) || target.includes(c.name.toLowerCase()),
  );
  return contains ?? null;
}
