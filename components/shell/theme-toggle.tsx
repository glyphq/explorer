"use client";

import {
  ComputerIcon,
  Moon01Icon,
  Sun01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

export type ThemeMode = "light" | "dark" | "system";

const DEFAULT_THEME: ThemeMode = "system";
const THEME_STORAGE_KEY = "glyph-explorer:theme";

const THEME_MODES: ReadonlyArray<{
  value: ThemeMode;
  label: string;
  icon: HugeiconsIconProps["icon"];
}> = [
  { value: "light", label: "Light", icon: Sun01Icon },
  { value: "dark", label: "Dark", icon: Moon01Icon },
  { value: "system", label: "System", icon: ComputerIcon },
];

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.setAttribute("data-theme", theme);
}

const themeListeners = new Set<() => void>();

function getThemeSnapshot(): ThemeMode {
  if (typeof document === "undefined") return DEFAULT_THEME;

  const theme = document.documentElement.dataset.theme ?? null;
  return isThemeMode(theme) ? theme : DEFAULT_THEME;
}

function subscribeToTheme(listener: () => void) {
  themeListeners.add(listener);

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;

    const nextTheme = isThemeMode(event.newValue) ? event.newValue : DEFAULT_THEME;
    applyTheme(nextTheme);
    themeListeners.forEach((themeListener) => themeListener());
  };

  window.addEventListener("storage", handleStorage);
  return () => {
    themeListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function notifyThemeChange() {
  themeListeners.forEach((themeListener) => themeListener());
}

function getServerThemeSnapshot() {
  return DEFAULT_THEME;
}

function ThemeIcon({ icon }: { icon: HugeiconsIconProps["icon"] }) {
  return (
    <HugeiconsIcon
      aria-hidden="true"
      focusable="false"
      icon={icon}
      size={18}
      strokeWidth={1.5}
    />
  );
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const selectTheme = useCallback((nextTheme: ThemeMode) => {
    applyTheme(nextTheme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // The visual preference still applies when storage is unavailable.
    }
    notifyThemeChange();
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  const selectedMode = THEME_MODES.find((mode) => mode.value === theme) ?? THEME_MODES[2];

  return (
    <div className="glyph-theme-toggle">
      <button
        ref={triggerRef}
        aria-controls={panelId}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Theme: ${selectedMode.label}. Change theme`}
        className="glyph-theme-toggle__trigger"
        title={`Theme: ${selectedMode.label}`}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
      >
        <ThemeIcon icon={selectedMode.icon} />
      </button>
      <div
        ref={panelRef}
        aria-label="Theme options"
        className="glyph-theme-toggle__panel"
        hidden={!isOpen}
        id={panelId}
      >
        <span className="glyph-theme-toggle__label">Appearance</span>
        <div aria-label="Theme mode" role="group">
          {THEME_MODES.map((mode) => (
            <button
              key={mode.value}
              aria-pressed={theme === mode.value}
              className="glyph-theme-toggle__option"
              type="button"
              onClick={() => selectTheme(mode.value)}
            >
              <ThemeIcon icon={mode.icon} />
              <span>{mode.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
