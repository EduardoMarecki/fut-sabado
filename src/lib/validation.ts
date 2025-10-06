export function sanitizeString(input: string, maxLen = 80): string {
  return input
    .replace(/[\r\n\t]+/g, ' ') // remove quebras e tabs
    .replace(/\s{2,}/g, ' ') // colapsa espaços
    .trim()
    .slice(0, maxLen);
}

export function isValidWhatsapp(input: string): boolean {
  if (!input) return true; // opcional
  const digits = input.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15; // faixa comum internacional
}

export function assertNonEmpty(input: string): boolean {
  return sanitizeString(input).length > 0;
}

export function clampNumber(n: number, min = 0, max = 1000): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}