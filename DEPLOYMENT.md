# Frontend deployment (Vercel + Supabase Auth)

Vercel detects this repository as Next.js automatically. Connect `StateAI---Frontend`, select `main`, and configure these production variables:

- `NEXT_PUBLIC_API_URL`: the public HTTPS URL of the FastAPI service, without a trailing slash.
- `NEXT_PUBLIC_SUPABASE_URL`: the existing Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the existing publishable/anon key; never use `service_role`.

After Vercel provides the final domain, add `https://<domain>/auth/callback` to Supabase Authentication → URL Configuration → Redirect URLs and set the production Site URL to `https://<domain>`.

## Google login

The app already calls Supabase OAuth with `provider: "google"`. Supabase still needs its Google provider enabled with a Google Cloud Web OAuth client:

1. Create a Google OAuth Web client.
2. In Google Cloud, use the Supabase callback shown on Authentication → Providers → Google as the authorized redirect URI. It has the form `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Add the final Vercel origin as an authorized JavaScript origin.
4. Paste the Google Client ID and Client Secret into Supabase's Google provider and enable it.
5. Keep both local and production callback URLs in Supabase's redirect allow-list if both environments are used.

Retify's invitation code is intentionally separate from Google: the code selects the organization and role; Google proves ownership of the invited email. The backend accepts the invitation only when both match.
