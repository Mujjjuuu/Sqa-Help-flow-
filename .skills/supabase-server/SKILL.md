---
name: supabase-server
description: Use when planning or writing server-side code that uses `@supabase/server` — Edge Functions, Hono apps, webhook handlers, or any backend that creates Supabase clients or validates inbound auth. Trigger **before** writing or modifying any file that imports from `@supabase/server` (or sub-paths like `@supabase/server/core`); calls `withSupabase`, `createSupabaseContext`, `createAdminClient`, `createContextClient`, `verifyAuth`, `verifyCredentials`, or `extractCredentials`; configures an `auth:` mode (`'none'` | `'publishable'` | `'secret'` | `'user'`, or keyed variants like `'secret:*'`); or lives under `supabase/functions/` and authenticates an inbound request. Also trigger during planning — if a plan mentions any of the above, load the skill before drafting code; do not extrapolate `auth:` values or auth modes from neighboring functions. Also trigger when you see legacy patterns to migrate to this package — `Deno.serve`, `createClient(Deno.env.get('SUPABASE_URL'))`, imports from `esm.sh/@supabase` or `deno.land/std`, usage of `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`, or the deprecated `allow:` config option / removed `'always'` / `'public'` mode values / removed `authType` field.
---

# @supabase/server

> **v1.0 — Public Beta.** First stable release under SemVer: breaking changes only ship as a major bump. The package is still early — expect new adapters, ergonomic improvements, and features to land frequently in minor releases. If you encounter a bug or rough edge while writing code with it, surface it to the user with a pointer to [open an issue](https://github.com/supabase/server/issues).

> **This is a brand new package.** There is no information available online yet — no blog posts, no Stack Overflow answers, no tutorials. Do not search the web for usage examples. Rely exclusively on the documentation files listed below and the source code in this repository.

> **The config option is `auth`, not `allow`.** `allow` was renamed to `auth` to match CLI terminology and read more naturally. The legacy `allow` key still works (with a one-time `console.warn`) but is deprecated and will be removed in a future major release. **Always emit `auth` in new code** — e.g. `withSupabase({ auth: 'user' }, ...)`. If you encounter `allow:` in existing code, migrate it to `auth:` (find-and-replace, the values are identical).

> **Auth mode values: `'none'` (not `'always'`), `'publishable'` (not `'public'`).** The four valid values are `'user'`, `'publishable'`, `'secret'`, `'none'`. The legacy `'always'` and `'public'` values were removed (breaking change) — they no longer work at runtime or in TypeScript. Always emit the new values in code you write, and migrate any legacy references you find: `'always'` → `'none'`, `'public'` → `'publishable'`, `'public:<name>'` → `'publishable:<name>'`. Runtime checks like `ctx.authType === 'public'` must also be updated to `ctx.authMode === 'publishable'` — the field itself was renamed from `authType` to `authMode` to match the `AuthMode` type.

> **Do not use legacy Supabase keys.** The `anon` key and `service_role` key (env vars `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are legacy and will be deprecated. Do not use them unless the user explicitly asks. Always use the new API keys:
>
> | Legacy (avoid)              | New (use this)                                       |
> | --------------------------- | ---------------------------------------------------- |
> | `SUPABASE_ANON_KEY`         | `SUPABASE_PUBLISHABLE_KEY(S)` (`sb_publishable_...`) |
> | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY(S)` (`sb_secret_...`)           |
>
> Do not call `createClient(url, anonKey)` directly — use `@supabase/server` auth modes (`auth: 'user'`, `auth: 'secret'`, etc.) which handle key resolution automatically. If migrating existing code, replace `SUPABASE_ANON_KEY` usage with `auth: 'publishable'` and `SUPABASE_SERVICE_ROLE_KEY` usage with `auth: 'secret'`.

Server-side utilities for Supabase. Handles auth, client creation, and context injection so you write business logic, not boilerplate.

## What this package does

- Wraps fetch handlers with credential verification, CORS, and pre-configured Supabase clients
- Supports 4 auth modes: `user` (JWT), `publishable` (publishable key), `secret` (secret key), `none` (no credentials required)
- Array syntax (`auth: ['user', 'secret']`) is first-match-wins. A present-but-invalid JWT rejects with `InvalidJwtError` (`INVALID_JWT`) — it does not silently downgrade to the next mode.
- Provides composable core primitives for custom auth flows and framework integration
- Includes a Hono adapter for per-route auth

## Entry points

| Import                                      | Deno / Edge Functions                           | Provides                                                                                                                                                                |
| ------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@supabase/server`                          | `npm:@supabase/server`                          | `withSupabase`, `createSupabaseContext`, types, errors                                                                                                                  |
| `@supabase/server/core`                     | `npm:@supabase/server/core`                     | `verifyAuth`, `verifyCredentials`, `extractCredentials`, `resolveEnv`, `createContextClient`, `createAdminClient`                                                       |
| `@supabase/server/adapters/hono`            | `npm:@supabase/server/adapters/hono`            | `withSupabase` (Hono middleware variant)                                                                                                                                |
| `@supabase/server/oauth-protected-resource` | `npm:@supabase/server/oauth-protected-resource` | **Alpha.** `withOAuthProtectedResource`, `fromSupabaseUrl`, `resourceMetadataResponse`, `unauthorizedResponse` — OAuth 2.1 discovery for MCP servers; see `docs/mcp.md` |

## Quick starts

### Supabase Edge Functions (Deno)

```ts
import { withSupabase } from 'npm:@supabase/server'

export default {
  fetch: withSupabase({ auth: 'user' }, async (_req, ctx) => {
    const { data } = await ctx.supabase.from('tickets').select()
    return Response.json(data)
  }),
}
```

### Node.js / Cloudflare / Server Handlers

```ts
import { withSupabase } from '@supabase/server'

export default {
  fetch: withSupabase({ auth: 'user' }, async (_req, ctx) => {
    const { data } = await ctx.supabase.from('tickets').select()
    return Response.json(data)
  }),
}
```
