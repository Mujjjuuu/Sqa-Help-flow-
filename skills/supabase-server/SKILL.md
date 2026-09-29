---
name: supabase-server
description: Use when planning or writing server-side code that uses `@supabase/server` — Edge Functions, Hono apps, webhook handlers, or any backend that creates Supabase clients or validates inbound auth. Trigger **before** writing or modifying any file that imports from `@supabase/server` (or sub-paths like `@supabase/server/core`); calls `withSupabase`, `createSupabaseContext`, `createAdminClient`, `createContextClient`, `verifyAuth`, `verifyCredentials`, or `extractCredentials`; configures an `auth:` mode (`'none'` | `'publishable'` | `'secret'` | `'user'`, or keyed variants like `'secret:*'`); or lives under `supabase/functions/` and authenticates an inbound request. Also trigger during planning — if a plan mentions any of the above, load the skill before drafting code; do not extrapolate `auth:` values or auth modes from neighboring functions. Also trigger when you see legacy patterns to migrate to this package — `Deno.serve`, `createClient(Deno.env.get('SUPABASE_URL'))`, imports from `esm.sh/@supabase` or `deno.land/std`, usage of `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`, or the deprecated `allow:` config option / removed `'always'` / `'public'` mode values / removed `authType` field.
---

# @supabase/server

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
