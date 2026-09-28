# M+6066

An English architecture field study for student groups. The route is **Meet M+ → FORM → MATERIAL → LIGHT → PLACE & IDENTITY → AI poster → Miro**. Every mission requires its photo(s) and a photographer name before the next mission unlocks.

## Upload to GitHub

1. Unzip the downloaded package. Create a **private** GitHub repository and upload the files inside the `Mplus6066` folder to the repository root. The root must contain `app/`, `lib/`, `public/`, `supabase/`, `package.json`, and `next.config.ts`.
2. Do not upload `node_modules`, `.next`, `.env.local`, or any API key. They are excluded from this package.

## Deploy under LuminaiTech Pro

1. In Vercel, choose the **LuminaiTech Pro** team. Select **Add New → Project**, then import the GitHub repository. The framework is **Next.js** and the root directory is `./`.
2. In **LuminaiTech Pro → Storage**, find the Supabase Free Plan resource **`supabase-alizarin-fence`** that was created for this project in the Singapore region. Click **Connect Project** and choose the new M+6066 project for **Production**. Do not create another database.
3. In the new Supabase project, open its SQL Editor and run the entire [`supabase/schema.sql`](supabase/schema.sql). This creates the `groups` and `photos` tables and the private `mplus-6066` Storage bucket.
4. In **Vercel Project Settings → Environment Variables**, set the names below for **Production**. If Vercel's Supabase integration already added a matching value, verify it points to the new database. Otherwise copy it from the Supabase project's API settings.

   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | New Supabase project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | New Supabase `service_role` key; server-side only |
   | `VOLCENGINE_API_KEY` | Your active Volcengine Ark key; server-side only |
   | `VOLCENGINE_MODEL` | `doubao-seedream-4-0-250828` (optional default) |

5. **Redeploy** after adding variables. Vercel will assign a `*.vercel.app` URL. Use the same variables for **Preview** too if you plan to use preview deployments.

The key shown in the earlier screenshot was exposed in a chat image. Rotate it in Volcengine before using the production site, and put only the replacement key in Vercel. Never put the key in GitHub or in a `NEXT_PUBLIC_` variable.

## How the deployed app works

- Enter a group name such as `TonyTest`. Groups, photo credits, photo files, and the final poster are saved in Supabase. A group name is a shared identifier, not a password.
- FORM requires three photographs. MATERIAL, LIGHT, and PLACE & IDENTITY each require one. The page and upload API both enforce the order. A photo plus photographer name is required for each frame.
- The poster API sends the six stored photos to **Volcengine Seedream**, saves its generated image in the private Supabase bucket, then reveals the download and class Miro link. The deployed site does **not** substitute a browser collage if the database or image engine is unavailable; it shows an error so the setup can be corrected.
- The Miro destination is `https://miro.com/app/board/uXjVHvXSago=/?share_link_id=388276372730`. Students save the poster, place it in their group's area, and write answers to the mission questions beside it.

## Local preview

Run `npm ci` and `npm run dev`, then open `http://127.0.0.1:3000`. Without Supabase, the local-only preview stores compressed photos in that browser and can create a basic poster. The hosted version requires the real database and image engine.

## Photo sources

The included reference photographs were downloaded from the official M+ website. See [`public/images/CREDITS.md`](public/images/CREDITS.md) for source links. Use a private repository and review image permissions before opening the website to a wider audience. This is an independent course activity, not an official M+ site.
