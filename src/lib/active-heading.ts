export type HeadingRect = { id: string; top: number; bottom: number }

export function computeActiveHeadingId(
  headings: HeadingRect[],
  mainTop: number,
  readLineOffset: number
): string | null {
  let best: HeadingRect | null = null
  let bestDist = Infinity
  for (const h of headings) {
    if (!h.id) continue
    if (h.bottom <= mainTop) continue
    const dist = Math.abs(h.top - mainTop - readLineOffset)
    if (dist < bestDist) {
      bestDist = dist
      best = h
    }
  }
  return best?.id ?? null
}
