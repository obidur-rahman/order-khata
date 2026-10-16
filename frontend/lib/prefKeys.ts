/** The visitor's preference keys, in one place.
 *
 * `lib/prefs.ts` reads and writes them at runtime; `app/layout.tsx` needs the
 * same names inside the string it runs before the first paint. Importing them
 * from here is what stops the two from drifting apart — a typo in either one
 * would silently lose the visitor's language and theme. */

export const LANG_KEY = "order_khata.lang";
export const THEME_KEY = "order_khata.theme";
export const PREFS_EVENT = "order_khata:prefs";
