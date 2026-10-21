# Captions Admin

Admin area for the Captions app (`../week1`). Both apps share one Supabase database.

- **Overview**: stats, leading captions, which humor style lands, and a voter × caption grid
- **Users**: read all profiles
- **Media & captions**: add, edit and delete captions; delete photos
- **Votes**: read every vote

## Access

1. **Login wall:** `proxy.ts` sends anyone without a Google session to `/login`.
2. **Admin check:** every page and server action calls `requireAdmin()`. Signed-in users without `profiles.is_superadmin = true` go to `/denied`.
3. **Database:** row level security (`supabase/week6_admin.sql`) only lets superadmins read or change other people's rows. The app has no service-role key.

**Avoiding lockout:** the first admin is set in the Supabase SQL Editor, which runs as the database owner. A trigger blocks every change to `is_superadmin` from the app, including changes made by admins.

## Env vars
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. These are the same as in week1.
