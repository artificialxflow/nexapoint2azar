const IR_MOBILE = /^09\d{9}$/;

export function normalizeIranMobile(input: string): string | null {
  let s = input.trim().replace(/[\s-]/g, '');
  if (s.startsWith('+98')) s = `0${s.slice(3)}`;
  if (s.startsWith('98') && s.length === 12) s = `0${s.slice(2)}`;
  if (!IR_MOBILE.test(s)) return null;
  return s;
}
