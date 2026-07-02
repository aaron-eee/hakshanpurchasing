# HAKSHAN Supply Portal 客善供应链系统

Sourcing → Purchase → Arrivals → Warehouse. Built with Next.js + Supabase, deployed on Vercel.

## What's already set up (backend — DONE)

In your Supabase project **"china sourcing"** (`xmuubnpyqyidkbpiarfa`):
- Tables: `items`, `suppliers`, `purchases`, `warehouse`, `take_log`
- Storage bucket `sourcing` (public) for supplier images + inspection photos
- Edge Function `notify-arrivals` — emails Pui Teng when an arrival is due
- Daily cron `notify-arrivals-daily` at 01:00 UTC (09:00 Malaysia) that runs it

## The flow

1. **Sourcing** — add an item, add multiple suppliers (image / price / ETA / note). Item always shows **Unit price** and **Total value**.
2. **Purchase** — click "Purchase this" on a supplier, fill unit price / quantity / arrival date / deliver-to, then press **Confirm Purchase** (double-confirm). Only then does it move on.
3. **Arrivals** — when the arrival date is reached, Pui Teng is **emailed automatically** (no manual button). To confirm arrival she must **upload an opening/inspection photo**. Then "Opened & OK → Stock" puts it in the warehouse.
4. **Warehouse** — category / photo / quantity / location, with **Sort by** (category, location, quantity, name, newest). "Take Item" sends stock out, records the destination, and decrements quantity.

Data is shared and real-time across everyone who opens the site.

---

## Deploy (once)

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "HAKSHAN supply portal"
git branch -M main
git remote add origin https://github.com/<you>/hakshan-supply.git
git push -u origin main
```

### 2. Import to Vercel
- New Project → import the repo
- Add two Environment Variables (from `.env.example`):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Deploy. Done — share the URL with the team.

### 3. Turn on automatic emails (Resend — free)
The notify function is deployed but needs an email provider key:
1. Sign up at https://resend.com (free tier is plenty)
2. Create an API key
3. In Supabase → Project → Edge Functions → **notify-arrivals** → Secrets, add:
   - `RESEND_API_KEY = <your key>`
4. To send from your own domain, verify it in Resend and change the `from:` address in the function. Until then it sends from `onboarding@resend.dev`.

Test it manually anytime:
```bash
curl -X POST https://xmuubnpyqyidkbpiarfa.supabase.co/functions/v1/notify-arrivals
```

## Local dev
```bash
npm install
cp .env.example .env.local
npm run dev
```
