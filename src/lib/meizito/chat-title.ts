/** عنوان گفتگو/گروه/کانال — حداقل یک حرف یا رقم؛ بدون نام‌های فقط علامت (مثل «,K,»). */
export function validateChatTitle(raw: string): { ok: true; title: string } | { ok: false; message: string } {
  const title = raw.trim().replace(/\s+/g, ' ');
  if (title.length < 2) {
    return { ok: false, message: 'نام باید حداقل ۲ کاراکتر باشد.' };
  }
  if (!/[\p{L}\p{N}]/u.test(title)) {
    return { ok: false, message: 'نام باید شامل حرف یا عدد باشد (نه فقط علائم).' };
  }
  return { ok: true, title };
}