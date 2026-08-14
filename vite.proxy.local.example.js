/**
 * Local dev-server proxy overrides.
 *
 * Copy this file to `vite.proxy.local.js` (already gitignored) and edit the
 * targets as needed, e.g. to point at a PocketBase instance running on a
 * different host/port. If `vite.proxy.local.js` doesn't exist, vite.config.js
 * falls back to the defaults baked in there.
 */
export const proxy = {
    "/api": "http://127.0.0.1:8090",
    "/_": "http://127.0.0.1:8090",
};
