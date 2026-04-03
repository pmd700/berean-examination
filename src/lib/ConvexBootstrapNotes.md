# Convex bootstrap notes

These files were added as the first migration step from Base44 to Convex.

## Added in this step

- `src/lib/convexClient.js`
- `src/lib/ConvexBootstrapProvider.jsx`

## What still needs to happen

1. Install Convex in the repo: `npm install convex`
2. Add `VITE_CONVEX_URL` to your local environment.
3. Wrap the root app with `ConvexBootstrapProvider`.
4. Replace Base44 auth calls in `src/lib/AuthContext.jsx`.
5. Replace Base44 data calls with Convex queries and mutations.
6. Remove `@base44/sdk` and `@base44/vite-plugin` after the app no longer depends on them.
