# Map chrome override

This page overrides `design-system/kakaomap/MASTER.md` and aligns with root `DESIGN.md`.

- Keep floating white search, chips, tools, location FAB, and bottom sheet.
- Primary actions: `#191919`. Accent: `#2563EB` for geolocation icon/dot and focus only.
- Typeface: Pretendard, not Noto-only and not Inter-only.
- Do not apply Vibrant & Block-based, event orange, cream canvas, or marketplace hero sections.
- Density stays map-chrome (8–16px), not landing-page 48px section gaps.

## Chrome placement

- **Search column:** top-left. Desktop max 560px. Compact width subtracts left inset, 44px zoom, 8px gap, right inset. Do not use `calc(100% - 140px)` or `calc(100% - 56px)` without subtracting the left inset.
- **Zoom:** top-right, always visible. Compact zoom is 44×44.
- **Layers:** compact only. Toggle under zoom; type and overlay menus open **below** the toggle, right-aligned. Desktop shows type and overlay inline (`display: contents`). Expanded sheet hides the toggle and panel.
- **Location:** bottom-right FAB, `radius-md`, accent crosshair. Not in the search row. Sit 12px above a visible sheet; hide when the sheet is expanded.
- **Address:** left-aligned pill under chips, shrink-to-content, ellipsis. Do not stretch to the search column width.
- **Sheet:** desktop mid `min(42vh, 420px)`; compact mid `min(38dvh, 340px)`; compact expanded `100dvh - 72px`. `setBounds` bottom padding follows the live sheet height.

## Compact (`max-width: 767px`)

- Search submit is icon-only; input `font-size: 16px`.
- Touch targets 44px. `:hover` only if `(hover: hover)`.
- Keep brand chip horizontal scroll, clustering, and sheet gestures.
