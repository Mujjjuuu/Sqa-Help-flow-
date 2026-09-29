---
name: supabase-server
description: Use when planning or writing server-side code that uses `@supabase/server` — Edge Functions, Hono apps, webhook handlers, or any backend that creates Supabase clients or validates inbound auth. Trigger before writing or modifying any file that imports from `@supabase/server` (or sub-paths like `@supabase/server/core`); calls `withSupabase`, `createSupabaseContext`, `createAdminClient`, `createContextClient`, `verifyAuth`, `verifyCredentials`, or `extractCredentials`; configures an `auth:` mode (`'none'` | `'publishable'` | `'secret'` | `'user'`, or keyed variants like `'secret:*'`); or lives under `supabase/functions/` and authenticates an inbound request.
---

# @supabase/server

Server-side utilities for Supabase. Handles auth, client creation, and context injection so you write business logic, not boilerplate.

## Configuration & Environment Variables

```env
SUPABASE_URL=https://gmkhnvlotcusmutmjkyp.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_0YfQXT-QhFC5GAxHunySyQ_TXeqEGKG
SUPABASE_JWKS_URL=https://gmkhnvlotcusmutmjkyp.supabase.co/auth/v1/.well-known/jwks.json
```

## Quick Starts

### Edge Functions / Fetch Handlers

```ts
import { withSupabase } from '@supabase/server'

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const { data } = await ctx.supabase.from('tickets').select()
    return Response.json(data)
  }),
}
```

### Express / Node.js & Core Primitives

```ts
import { verifyCredentials, createContextClient, createAdminClient } from '@supabase/server/core'
```
