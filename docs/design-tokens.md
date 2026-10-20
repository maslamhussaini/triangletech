# Design tokens — Indigo Glass (`src/app/theme-indigo.css`)

Source of truth is the stylesheet. This file indexes the tokens new pages may
reuse. Do not invent values; if a token is missing, extend the stylesheet
additively (opt-in classes only) — never restyle existing components.

## Rule
ADDITIVE ONLY. The file is imported after `globals.css` and wins on equal
specificity. Every primitive is opt-in via an explicit class name. The existing
product accent system, nav, footer, and mockups are untouched.

## Brand color
- `--brand: #4F46E5` (electric indigo; 6.29:1 on white — safe for body text)
- `--brand-strong: #312E81`
- `--brand-soft: #EEF0FF`
- `--brand-secondary: #7C5CFF` (secondary accent only, never large surfaces)
- `--brand-contrast: #FFFFFF`
- `--brand-ink: #1B1B4B` (deep ground for dark hero surfaces)

## Gradients
- `--gradient-brand: linear-gradient(120deg, #4F46E5 0%, #5B4FE9 45%, #7C5CFF 100%)`
- `--gradient-hero: radial-gradient(circle at 78% -12%, #3E37C9 0%, transparent 58%), linear-gradient(160deg, #1B1B4B 0%, #0E0E2B 100%)`
- `--gradient-soft: linear-gradient(135deg, #F5F6FF 0%, #EEF0FF 55%, #F7F4FF 100%)`

## Surfaces
- `--surface: var(--card)` · `--surface-soft: var(--paper)` (reuse existing neutrals)
- `--surface-elevated: #FFFFFF`
- `--surface-glass: rgba(255, 255, 255, 0.72)`
- `--surface-glass-dark: rgba(20, 20, 56, 0.55)`

## Text (WCAG AA for new copy)
- `--text-primary: var(--text)` (#1a2338, 14.5:1 on white)
- `--text-secondary: #4A5573`
- `--text-muted: #6B7690` (~4.9:1 — use for secondary copy, not the older `--muted`)
- `--text-on-brand: #FFFFFF`
- `--text-inverse-soft: #C9CCF5`

## Borders, shadows, focus
- `--border-soft: var(--border)` · `--border-brand: rgba(79, 70, 229, 0.42)` · `--border-strong: #C9CFE4`
- `--shadow-card`, `--shadow-elevated`, `--shadow-brand: 0 10px 30px rgba(79, 70, 229, 0.28)`
- `--focus-ring: 0 0 0 3px rgba(79, 70, 229, 0.35)` (visible focus on all interactives)

## Feedback
- `--danger: #B42318` · `--danger-soft: #FEF3F2`
- `--success: #12704E`

## Motion & shape
- `--ease-out-soft: cubic-bezier(0.22, 1, 0.36, 1)`
- `--dur-fast: 140ms` · `--dur-base: 220ms` · `--dur-slow: 420ms`
- `--radius-sm: 8px` · `--radius-md: 12px` · `--radius-lg: 16px`
- `--control-height: 48px` (≥44px touch target on every interactive primitive)
- `prefers-reduced-motion` is honored (animations disabled under `reduce`)

## Reusable classes for the US landing page & estimator
- Buttons: `.button-indigo`, `.button-indigo-secondary`, `.on-dark`
- Hero: `.hero-indigo`, `.eyebrow-indigo`, `.gradient-text`, `.hero-orb`
- Cards: `.card-premium`, `.glass-panel`, `.metric-card`, `.hover-lift`
- Forms: `.field-premium`, `.label-premium`, `.input-premium`, `.helper-premium`,
  `.error-premium`, `.input-affix`
- Finder/quiz (estimator pattern): `.finder-section`, `.finder-panel`,
  `.finder-progress`, `.finder-option`
- FAQ: `.faq-preview` · Process: `.process-grid` · Tools: `.tools-hero`
