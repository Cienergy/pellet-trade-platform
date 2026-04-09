# Deploy on Vercel

This app is compatible with Vercel. Follow these steps to deploy and share test logins.

---

## 1. What you need (from you)

### Hosted PostgreSQL

Vercel does not run a database. Use one of:

- **Vercel Postgres** (Neon) – [Vercel Dashboard → Storage → Create Database](https://vercel.com/dashboard)
- **Neon** – [neon.tech](https://neon.tech) (free tier; use **pooled** connection string for serverless)
- **Supabase** – [supabase.com](https://supabase.com) (Postgres + optional Storage)
- **Railway**, **PlanetScale**, etc.

Create a database and get a **connection string** (e.g. `postgresql://user:pass@host:5432/dbname`).  
For serverless, prefer a **pooled** URL if your provider offers one (e.g. Neon’s pooled connection) to avoid exhausting connections.

### Optional: Supabase (for uploads and receipt)

- For **dispatch image** and **payment proof** uploads: create a Supabase project, add Storage buckets **`dispatch-images`** and **`payment-proof`** (public read), and get:
  - **SUPABASE_URL** (e.g. `https://xxxx.supabase.co`)
  - **SUPABASE_SERVICE_ROLE_KEY**
- Without these, uploads will fail or “View image” may return 404; the rest of the app still works with Postgres.

---

## 2. Deploy on Vercel

1. Push your repo to GitHub (or GitLab/Bitbucket).
2. In [Vercel](https://vercel.com): **Add New Project** → Import your repo.
3. **Environment variables** (Project → Settings → Environment Variables). Add at least:

   | Name               | Value                    | Notes                    |
   |--------------------|--------------------------|--------------------------|
   | `DATABASE_URL`     | `postgresql://...`       | **Required.** Your DB URL |
   | `SUPABASE_URL`     | `https://xxx.supabase.co`| Optional (uploads)       |
   | `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...`        | Optional (uploads)       |

   Apply to **Production** (and Preview if you want).

4. **Build settings** (recommended for this repo):

   - **Build Command:** `npm run vercel-build` — runs `prisma generate`, **`prisma migrate deploy`**, then `next build`, so the database schema stays in sync on every deploy. (Requires `DATABASE_URL` in Vercel and a DB reachable from Vercel’s build network.)
   - If you use **`npm run build`** instead, migrations are **not** applied automatically; you must run `npx prisma migrate deploy` manually against production (see §3).
   - **Output:** Next.js.
   - **Install Command:** `npm install`.

5. **Deploy.** After setting the build command above, redeploy. If you skipped migrate-on-build, run §3 after deploy.

---

## 3. Run migrations and seed (once)

After the first successful deploy, apply the schema and seed test data using your **production** `DATABASE_URL`.

From your machine (or a one-off script):

```bash
# Use the same DATABASE_URL as in Vercel (production)
export DATABASE_URL="postgresql://..."   # your production URL

# Apply migrations
npx prisma migrate deploy

# Seed test users and demo data (so everyone can log in)
npx prisma db seed
```

You only need to run these once per new database (or when you add new migrations / change seed).

---

## 4. Test logins to share

After seeding, share the app URL and these logins with testers. **Password for all:** `demo123`.

| Role     | Email                 | After login           |
|----------|------------------------|------------------------|
| Admin    | `admin@cienergy.in`    | `/admin/dashboard`     |
| Ops      | `ops@cienergy.in`      | `/ops/dashboard`       |
| Finance  | `finance@cienergy.in` | `/finance/dashboard`   |
| Buyer    | `buyer@cienergy.in`    | `/buyer/dashboard`     |
| Buyer 2  | `buyer2@acme.in`       | `/buyer/dashboard`     |

Example message:

- **App URL:** `https://your-project.vercel.app`
- **Login:** `https://your-project.vercel.app/login`
- **Password (all accounts):** `demo123`
- Use any of the emails above (Admin, Ops, Finance, Buyer) to test different roles.

---

## 5. Optional: run migrate on deploy

If you prefer to run migrations on every deploy (e.g. from Vercel’s build), you can use a **postinstall** or **build** script that runs only when `DATABASE_URL` is set. Example in `package.json`:

```json
"scripts": {
  "build": "prisma generate && next build",
  "vercel-build": "prisma generate && prisma migrate deploy && next build"
}
```

Then in Vercel → Project Settings → General → **Build Command** set to:

`npm run vercel-build`

This runs migrations during build; your production DB must be reachable from Vercel’s build environment (and you may need to allow Vercel’s IP if your DB has network restrictions).

---

## 6. Troubleshooting

| Issue | What to do |
|-------|------------|
| **`P2022` / column `Invoice.orgId` does not exist** | Schema is ahead of the DB. Run `npx prisma migrate deploy` with production `DATABASE_URL`, or apply `scripts/fix-invoice-org-id.sql` in your SQL console, then redeploy. Also set Vercel **Build Command** to `npm run vercel-build` so future migrations apply automatically. |
| Build fails on Prisma | Ensure **DATABASE_URL** is set for Production (and that **Build Command** runs `prisma generate`). |
| 500 / DB errors at runtime | Run `npx prisma migrate deploy` with production **DATABASE_URL**; check DB is reachable from Vercel (no strict IP allowlist blocking Vercel). |
| “Receipt service not configured” | Optional: set **SUPABASE_URL** and **SUPABASE_SERVICE_ROLE_KEY** if you use the Supabase-backed receipt route. |
| “Bucket not found” for images | Create **`dispatch-images`** (and **`payment-proof`** if used) in Supabase Storage and set them to public. |
| Too many DB connections | Use a **pooled** connection string (e.g. Neon pooled URL) for **DATABASE_URL**. |

---

## Summary checklist

- [ ] Hosted Postgres created; **DATABASE_URL** added in Vercel.
- [ ] (Optional) Supabase project + buckets; **SUPABASE_URL** and **SUPABASE_SERVICE_ROLE_KEY** in Vercel.
- [ ] Project deployed on Vercel; build succeeds.
- [ ] `npx prisma migrate deploy` run once with production **DATABASE_URL**.
- [ ] `npx prisma db seed` run once with production **DATABASE_URL**.
- [ ] Shared app URL and test logins (see table above) with testers.
