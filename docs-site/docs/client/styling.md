---
sidebar_position: 6
title: Styling & Theming
---

# Styling & Theming

The GetThatQuick client uses **Tailwind CSS v4** with a fully custom dark-mode theme, an accent color system, and the shadcn/ui component pattern.

---

## Tailwind CSS v4

The client uses Tailwind v4's new `@theme` directive (replacing the old `tailwind.config.js` approach) to define design tokens directly in CSS.

### Color Scheme

Defined in `src/index.css` via `@theme`:

| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `#A5D8FF` | Primary accent / brand color |
| `--color-background-dark` | `#0A0A0B` | Main app background |
| `--color-sidebar` | varies | Sidebar panel backgrounds |
| `--color-shell` | varies | App shell / chrome areas |

The full palette is designed for dark mode first, providing high contrast text on dark backgrounds.

---

## Custom Font

A custom `@font-face` declaration loads the **GTQ Custom** font from `public/fonts/`:

```css
@font-face {
  font-family: "GTQ Custom";
  src: url("/fonts/GTQCustom.woff2") format("woff2");
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
```

Used for branding elements like the logo wordmark.

---

## Accent Color System

**File:** `src/lib/accent.ts`

A dynamic accent color system that lets users personalize the UI.

### Presets

8 built-in color presets:

| Name | Hex | Description |
|---|---|---|
| Blue | `#A5D8FF` | Default |
| Purple | `#D0BFFF` | Soft purple |
| Green | `#B2F2BB` | Mint green |
| Orange | `#FFD8A8` | Warm orange |
| Pink | `#FCC2D7` | Soft pink |
| Cyan | `#99E9F2` | Cool cyan |
| Yellow | `#FFEC99` | Bright yellow |
| Red | `#FFC9C9` | Soft red |

### How It Works

1. **localStorage persistence** — the selected accent color is saved to `localStorage` and restored on page load
2. **CSS variable injection** — when an accent is applied, the system sets `--color-primary` and related CSS custom properties on the document root
3. **Luminance-based contrast** — the system calculates the relative luminance of the chosen color and automatically selects black or white text for optimal readability

```ts
// Simplified flow
function applyAccent(hex: string) {
  document.documentElement.style.setProperty("--color-primary", hex);
  const contrast = luminance(hex) > 0.5 ? "#000" : "#fff";
  document.documentElement.style.setProperty("--color-primary-foreground", contrast);
  localStorage.setItem("accent", hex);
}
```

---

## Dark Mode

Dark mode is implemented via Tailwind v4's `@custom-variant`:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

This enables the `dark:` variant prefix in utility classes. The app ships with dark mode as the default and only theme.

---

## shadcn/ui Pattern

Components in `src/components/ui/` follow the [shadcn/ui](https://ui.shadcn.com/) pattern:

### CVA (Class Variance Authority)

Each component defines its variants using CVA:

```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground ...",
        outline: "border border-input bg-background hover:bg-accent ...",
        secondary: "bg-secondary text-secondary-foreground ...",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

### cn() Utility

**File:** `src/lib/utils.ts`

A helper that combines `clsx` and `tailwind-merge`:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

This allows conditionally composed class names while ensuring Tailwind classes don't conflict (e.g., `p-2` won't clash with `p-4` — the last one wins).

---

## Custom Scrollbar

Global scrollbar styles are defined in `src/index.css` to match the dark theme:

```css
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
```

This provides slim, unobtrusive scrollbars that blend with the dark UI.
