import PocketBase, { BaseAuthStore } from "pocketbase";

export const backendUrl = import.meta.env.PROD ? undefined : (import.meta.env.VITE_PB_BASE_URL || undefined)

export const pb = new PocketBase(backendUrl);

/**
 * Superuser client, used only by the backups admin page.
 *
 * Separate from `pb` for two reasons: authenticating as a superuser on the
 * shared client would overwrite the signed-in user's token and log the app
 * out, and `BaseAuthStore` keeps the token in memory only - unlike the default
 * `LocalAuthStore`, nothing is written to localStorage, so a superuser session
 * cannot be lifted from storage later and ends when the tab is reloaded.
 */
export const pbAdmin = new PocketBase(backendUrl, new BaseAuthStore());
