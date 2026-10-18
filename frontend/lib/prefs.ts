"use client";
/** Language + theme preferences (docs/06 §4.6).
 *
 * Both live in localStorage — the browser's own store, so nothing is written
 * to the backend and no account is needed. `applyPrefs` mirrors them onto
 * <html>: `lang` for the document language, the `dark` class for the palette
 * (globals.css), and `color-scheme` so native controls follow along.
 *
 * The event pattern is the one lib/prefs.ts itself uses for language and
 * theme, so every mounted screen reacts to a toggle without a shared provider.
 */
import { useEffect, useState } from "react";

import { t } from "./i18n";
import { TAU_MAX, TAU_MIN } from "./route";
import { LANG_KEY, PREFS_EVENT as EVENT, THEME_KEY } from "./prefKeys";

export type Lang = "en" | "bn";
export type Theme = "light" | "dark";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    /* private mode, disabled storage — fall through to the default */
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* non-fatal: the choice just does not outlive this tab */
  }
}

export function loadLang(): Lang {
  return read(LANG_KEY) === "bn" ? "bn" : "en";
}

/** The visitor's choice wins; dark is the default when nothing is saved. */
export function loadTheme(): Theme {
  return read(THEME_KEY) === "light" ? "light" : "dark";
}

export function applyPrefs(lang: Lang, theme: Theme): void {
  const el = document.documentElement;
  el.lang = lang;
  el.classList.toggle("dark", theme === "dark");
  el.style.colorScheme = theme;
}

function broadcast(): void {
  window.dispatchEvent(new Event(EVENT));
}

export function setLang(lang: Lang): void {
  write(LANG_KEY, lang);
  applyPrefs(lang, loadTheme());
  broadcast();
}

export function setTheme(theme: Theme): void {
  write(THEME_KEY, theme);
  applyPrefs(loadLang(), theme);
  broadcast();
}

/* ── threshold τ (docs/06 §6) ──────────────────────────────────────────
 * Same store, same shape as the two above: the slider writes it and every
 * screen reads it on mount, so the value stays consistent across Inbox /
 * Try It / Dashboard / Evaluation without a provider. Clamped to the range
 * route() can actually enforce, so a stale value cannot sit outside it. */
const TAU_KEY = "order_khata.tau";

export function loadTau(fallback: number): number {
  const raw = read(TAU_KEY);
  if (raw === null) return fallback;
  const v = parseFloat(raw);
  return Number.isFinite(v) ? Math.min(TAU_MAX, Math.max(TAU_MIN, v)) : fallback;
}

export function saveTau(v: number): void {
  write(TAU_KEY, String(v));
}

export interface Prefs {
  lang: Lang;
  theme: Theme;
  setLang: (v: Lang) => void;
  setTheme: (v: Theme) => void;
  /** Translate a key into the current language. */
  t: (key: string) => string;
}

/** Reactive preferences. Renders the defaults (English, dark — the same as the
 *  server markup and the pre-paint script) and syncs from storage on mount, so
 *  hydration never mismatches. */
export function usePrefs(): Prefs {
  const [lang, setLangState] = useState<Lang>("en");
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const sync = () => {
      setLangState(loadLang());
      setThemeState(loadTheme());
    };
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);

  return { lang, theme, setLang, setTheme, t: (key: string) => t(lang, key) };
}
