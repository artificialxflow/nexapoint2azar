# دیپلوی Runflare (Nexapoint)

## پیش‌نیاز پنل

1. سرویس از نوع **NextJS** باشد (نه Node خالی — وگرنه صفحهٔ پیش‌فرض Runflare می‌ماند).
2. دامنه `nexapoint.ir` به همان سرویس production وصل باشد (معمولاً **`nexapointapplication`**؛ سرویس تازه مثل `nexapoint2azar` فقط اگر دامنه را آنجا گذاشته‌اید).
3. **Auto Restart After Deploy = ON**
4. متغیرهای env طبق `env.example` (حداقل `DATABASE_URL`, `DIRECT_URL`, `AUTH_SESSION_SECRET`, `NEXA_STORAGE_ROOT=/data`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_FRONTEND_ONLY=false`).

روی Runflare مفید است:

| متغیر | مقدار پیشنهادی |
|--------|----------------|
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `PORT` | `3000` (یا پورت سرویس) |

### ترتیب بیلد Runflare (مهم)

ایمیج Runflare اول فقط `package.json` و `prisma/` را کپی می‌کند و `npm install` می‌زند. بنابراین:

- **`postinstall`** فقط باید `prisma generate` باشد (بدون اسکریپت داخل `scripts/`).
- **`next build`** با اسکریپت **`npm run build`** بعد از کپی کل سورس اجرا می‌شود (پیش‌فرض سرویس NextJS).

استارت: `npm start` → `scripts/run-production.mjs` (bootstrap + migrate + `next start`).

## دستورات محلی

```bash
# دیپلوی فایل‌ها
runflare deploy
# پروژه: nexaapoint — سرویس production را انتخاب کنید

# مایگریشن روی DB پرود (از همین ریپو، نه npx prisma جدا)
npm run db:deploy

# ری‌استارت از CLI (در صورت نیاز)
runflare restart
```

## عیب‌یابی سریع

- لاگ فقط `runflare.png` → سرویس NextJS نیست یا اپ استارت نشده / Auto Restart خاموش.
- `npx prisma migrate deploy` نسخهٔ اشتباه Prisma می‌کشد → همیشه `npm run db:deploy` استفاده کنید.
- `Cannot find module .../scripts/postinstall.mjs` → `postinstall` نباید فایل داخل `scripts/` صدا بزند؛ فقط `prisma generate`.