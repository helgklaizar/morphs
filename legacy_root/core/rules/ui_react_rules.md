# Basic rules for UI-Morph (Stack: React + Tailwind)

1. NEVER write Class Components. Use functional components with hooks.
2. ALWAYS use Tailwind CSS for styling. NO custom `.css` or inline styles unless strictly necessary for dynamic positioning.
3. ALWAYS ensure components are accessible (ARIA tags, readable contrast).
4. If a component is complex, break it down. One hook or state per logical block.
5. All icons must be from `lucide-react`.
6. DO NOT use generic variables like `let data = ...`, use strict TS types.
