export function isProbablyBinary(buf: Buffer): boolean {
  if (buf.length === 0) return false
  let zero = 0
  const sample = buf.subarray(0, Math.min(buf.length, 8000))
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === 0) zero++
  }
  if (zero > 0) return true
  return false
}
