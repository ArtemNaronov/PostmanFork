export function tryParseJson(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const trimmed = text.trim()
  if (!trimmed) return { ok: true, value: null }
  try {
    return { ok: true, value: JSON.parse(trimmed) }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid JSON'
    return { ok: false, error: msg }
  }
}

export function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}
