"use client";
/** Language + theme preferences (docs/06 §4.6).
 *
 * Both live in localStorage — the browser's own store, so nothing is written
 * to the backend and no account is needed. `applyPrefs` mirrors them onto
 * <html>: `lang` for the document language, the `dark` class for the palette
 * (globals.css), and `color-scheme` so native controls follow along.
 *
 * The event pattern matches lib/store.ts (tau), so every mounted screen reacts
 * to a toggle without a shared provider.
 */
import { useEffect, useState } from "react";

import { t } from "./i18n";
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

export function loadTheme(): Theme {
  return read(THEME_KEY) === "dark" ? "dark" : "light";
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

export interface Prefs {
  lang: Lang;
  theme: Theme;
  setLang: (v: Lang) => void;
  setTheme: (v: Theme) => void;
  /** Translate a key into the current language. */
  t: (key: string) => string;
}

/** Reactive preferences. Renders English/light first (same as the server
 *  markup) and syncs from storage on mount, so hydration never mismatches. */
export function usePrefs(): Prefs {
  const [lang, setLangState] = useState<Lang>("en");
  const [theme, setThemeState] = useState<Theme>("light");

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
