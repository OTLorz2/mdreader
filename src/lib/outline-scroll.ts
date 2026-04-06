export function computeOutlineScrollTopToCenter(
  clientHeight: number,
  scrollHeight: number,
  itemContentY: number,
  itemHeight: number
): number {
  const maxScroll = Math.max(0, scrollHeight - clientHeight)
  const ideal = itemContentY + itemHeight / 2 - clientHeight / 2
  return Math.max(0, Math.min(ideal, maxScroll))
}
