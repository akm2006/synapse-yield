// src/lib/agent/serialize.ts
export function toJSONSafe<T>(value: T) {
  // Replacer converts BigInt to string; then parse back to a plain JS object
  // with no BigInt values so NextResponse.json can safely stringify.
  const json = JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? v.toString() : v));
  return JSON.parse(json);
}
