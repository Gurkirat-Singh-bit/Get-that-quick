/**
 * @fileoverview Accent colour system.
 *
 * Provides preset accent colours, localStorage persistence,
 * and runtime CSS variable application for theming.
 *
 * @module lib/accent
 */

const ACCENT_KEY = "gtq_accent";
const DEFAULT = "#A5D8FF";

export const accentPresets = [
  { hex: "#A5D8FF", name: "Icy Blue" },
  { hex: "#7C3AED", name: "Violet" },
  { hex: "#10B981", name: "Emerald" },
  { hex: "#F59E0B", name: "Amber" },
  { hex: "#EF4444", name: "Rose" },
  { hex: "#EC4899", name: "Pink" },
  { hex: "#06B6D4", name: "Cyan" },
  { hex: "#8B5CF6", name: "Purple" },
];

export function getAccent(): string {
  return localStorage.getItem(ACCENT_KEY) || DEFAULT;
}

export function setAccent(hex: string) {
  localStorage.setItem(ACCENT_KEY, hex);
  applyAccent(hex);
}

export function applyAccent(hex: string) {
  const root = document.documentElement;
  const [r, g, b] = hexToRgb(hex);

  // Primary color across both Tailwind @theme and shadcn CSS vars
  root.style.setProperty("--color-primary", hex);
  root.style.setProperty("--primary", hex);
  root.style.setProperty("--ring", hex);
  root.style.setProperty("--sidebar-primary", hex);
  root.style.setProperty("--sidebar-ring", hex);
  root.style.setProperty("--color-ring", hex);

  // Foreground: dark text for light accents, white for dark accents
  const lum = luminance(r, g, b);
  const fg = lum > 0.35 ? "#0f172a" : "#ffffff";
  root.style.setProperty("--primary-foreground", fg);
  root.style.setProperty("--color-primary-foreground", fg);

  // Scrollbar
  root.style.setProperty("--scrollbar-thumb", `rgba(${r}, ${g}, ${b}, 0.5)`);
  root.style.setProperty("--scrollbar-hover", `rgba(${r}, ${g}, ${b}, 0.75)`);
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function luminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}
