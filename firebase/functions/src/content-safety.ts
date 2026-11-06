// Baseline text filter; human report review remains necessary for context and evasion.
const prohibited = [
  /seni\s+(?:öldür|oldur)(?:eceğim|ecegim|ürüm|urum)/iu,
  /(?:i(?:'|’)?ll|i will)\s+(?:kill|rape)\s+you/iu,
  /(?:çocuk|cocuk|child)\s+(?:porn|porno)/iu,
];
export function textAllowed(value: string) {
  const normalized = value.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '');
  return !prohibited.some(rule => rule.test(normalized));
}
export function photoAllowed(annotation: Record<string, string> | undefined) {
  if (!annotation || !['adult', 'violence', 'racy'].every(key => ['VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY'].includes(annotation[key]))) return false;
  return !['adult', 'violence', 'racy'].some(key => ['LIKELY', 'VERY_LIKELY'].includes(annotation[key]));
}
