# Map chrome override

This page overrides `design-system/kakaomap/MASTER.md` and aligns with root `DESIGN.md`.

- Keep floating white search, chips, tools, location FAB, and bottom sheet.
- Primary actions: `#191919`. Accent: `#2563EB` for geolocation icon/dot, focus, and the pressed **내 근처** option.
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

## Attractions and tourism

- Chip order: 기본, 명소 (`data-filter="attractions"`, `icons/taegeukgi.svg`), 관광 (`data-filter="tourism"`, `icons/attraction.svg`), then brands. Logo before label. Do not type those labels into search.
- **내 근처** shows while either snapshot chip is active and has no icon.
- 명소 is history, heritage, and UNESCO. Pin: official Taegeukgi. List: badges and a one-line summary. Thumb: `image` or Carto.
- 관광 is other type-12 / supplementary spots. Pins follow `cat2`. While active, show `#tourism-groups` only (`전체` default). Choosing 산·바다·호수·강·휴양·체험·산업·건축 reveals `#tourism-cat3-row` (label 산의 세부, group cat3 + 전체). Filter is group AND cat3. Map fit top padding adds one row or two.
- Tap a list row or pin to open `#place-detail` (back, weather if no GPS or farther than 3km, representative photo then Carto, overview, hours/phone/web). Same 3-snap sheet heights. Brand search does not use this panel.
- Nationwide: fit Korea, cluster the current bbox. Nearby: GPS 3km. No Kakao `keywordSearch` while these modes are on. Cap overlays (~90).
