# Render static site

Use repository root, Node 24, build command `npm ci && npm run build`, publish directory `dist`, and `SKIP_INSTALL_DEPS=true`. Set public build variable `VITE_API_BASE_URL=https://api.brandistaapp.com/api/v1` before building. Builds reject missing, insecure, loopback or malformed API roots; development still permits loopback. Never store secrets in VITE variables.

Add a Render rewrite `/*` -> `/index.html` (Rewrite, not Redirect). Attach `admin.brandistaapp.com` to this static site and use the exact Render-provided hostname for its DNS CNAME. Backend CORS must include `https://admin.brandistaapp.com`. JWTs remain in memory; page reload requires sign-in. Verify current SUPER_ADMIN with `/api/v1/super-admin/identity`; no public registration grants that capability.

This configuration does not provision an account or a live service. Production invitation delivery is absent from backend main at bc67754 and must be implemented/configured before full onboarding. Review the consolidated backend deployment report for sequencing and evidence requirements.
