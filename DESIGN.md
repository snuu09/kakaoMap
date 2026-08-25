---
name: 카카오 지도
description: 카카오맵식 플로팅 크롬을 유지한 전체 화면 장소 검색
colors:
  ink: "#191919"
  ink-hover: "#2c2c2c"
  ink-muted: "#5c6370"
  on-primary: "#ffffff"
  surface: "#ffffff"
  surface-muted: "#f4f5f7"
  border: "#e6e8ec"
  accent: "#2563eb"
  accent-soft: "#eef4ff"
  accent-hover: "#dfe9ff"
  pin: "#191919"
  handle: "#d5d8de"
rounded:
  sm: "8px"
  thumb: "10px"
  md: "12px"
  pin-wide: "14px"
  lg: "16px"
  xl: "20px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
typography:
  body:
    fontFamily: "Pretendard, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Pretendard, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  meta:
    fontFamily: "Pretendard, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  label:
    fontFamily: "Pretendard, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  place:
    fontFamily: "Pretendard, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  badge:
    fontFamily: "Pretendard, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0"
  cluster:
    fontFamily: "Pretendard, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    height: "40px"
    padding: "0 14px"
  button-primary-hover:
    backgroundColor: "{colors.ink-hover}"
    textColor: "{colors.on-primary}"
  button-location:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.accent}"
    rounded: "{rounded.md}"
    height: "40px"
    width: "40px"
  button-location-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
  input-search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "40px"
    padding: "0 12px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.meta}"
    rounded: "{rounded.pill}"
    height: "40px"
    padding: "0 10px 0 14px"
  chip-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.pill}"
    height: "40px"
  chip-option:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.meta}"
    rounded: "{rounded.pill}"
    height: "40px"
    padding: "0 14px"
  chip-option-pressed:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
  tool-btn:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    height: "40px"
    padding: "0 10px"
  tool-btn-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-primary}"
  sheet:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
  dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "20px"
    width: "360px"
---

# Design System

## Overview

지도가 캔버스다. UI는 그 위에 뜬 밝은 크롬이다. 검색바, 필터 칩(기본·명소·관광·브랜드), 현재 동 표시, 우측 지도 도구, 하단 장소 시트·상세 시트가 한 가족처럼 같은 흰 표면·잉크 글자·짧은 그림자를 쓴다.

**The Map First Rule.** 크롬은 읽히되 지도를 가리지 않는다. 배경색 페이지나 히어로 섹션을 만들지 않는다.

모션은 핀·클러스터가 나타나고 사라질 때뿐이며 220ms 페이드·스케일이다. 스크롤 연출과 GSAP는 쓰지 않는다.

## Colors

잉크(`ink`)가 글자와 선택 상태다. 흰 표면(`surface`)이 모든 플로팅 패널이다. 파란 액센트(`accent`)는 현재 위치 점·현위치 아이콘·포커스 링에만 쓴다.

**The One Accent Rule.** 위치와 키보드 포커스가 파랑이다. 검색 버튼과 활성 브랜드/명소 칩은 잉크다. **내 근처**와 언어 옵션만 눌린 상태(`aria-pressed`)로 `accent-soft`를 쓴다. 생성기가 제안한 이벤트 오렌지·크림 배경은 쓰지 않는다.

본문과 메타는 `ink` / `ink-muted`이며 순수 쿨 그레이 `#6b7280` 대신 잉크를 풀어 쓴다.

## Typography

Pretendard가 한글 본문이다. 시스템 산세리프는 fallback이다. Inter, 퍼플 그라데이션 글자, 디스플레이 세리프는 쓰지 않는다.

제목은 16px/700, 본문 컨트롤은 14px/600, 메타는 13px/500, 도구 라벨은 12px/600이다. 숫자는 목록 뱃지에서 `tabular-nums`에 가깝게 굵게 둔다.

## Layout

좌상단 검색 열(데스크톱 최대 560px), 그 아래 가로 스크롤 칩, 그 아래 **왼쪽 정렬**된 캡슐형 현재 주소(`width: fit-content`, 최대 280px). 우측 상단은 줌·지도 타입·오버레이·언어 스택. 현위치는 검색 행이 아니라 **우측 하단 플로팅 버튼**이다. 하단은 전체 너비 바텀시트. 맵은 `100% / 100dvh`.

**Breakpoint.** 컴팩트는 `max-width: 767px`. 데스크톱은 `min-width: 768px`.

**Desktop (768up).** 검색 제출은 「검색」 텍스트. 줌·타입·오버레이를 모두 펼친다. 시트가 열려도 `map-tools` z-index는 시트보다 높아 줌이 잘리지 않는다. 호버는 `@media (hover: hover)`만.

**Compact (767down).** `--control-h: 44px`. 검색 입력은 16px(iOS 확대 방지). 제출은 돋보기만. 검색 열 너비는 왼쪽 inset + 줌 44px + **검색–줌 간격 8px** + 오른쪽 inset을 뺀다. 줌 `+`/`-`만 상시. 타입·오버레이는 레이어 토글 **아래**로 펼치는 패널. 시트 중간은 `min(38dvh, 340px)`, 최대는 `100dvh - 72px`. 최대일 때 레이어 패널·토글·현위치 버튼을 숨기고 줌만 남긴다. `setBounds` 하단 패딩은 시트 실제 높이에 맞춘다. 안전 영역은 `env(safe-area-inset-*)`로 민다.

## Elevation & Depth

그림자는 잉크 틴트다. 크롬은 짧은 두 겹(`0 2px 10px / 0 1px 3px`), 시트는 위로 퍼지는 그림자, 다이얼로그는 더 깊은 그림자. 순수 검정 그림자와 제로 오프셋 헤일로를 쓰지 않는다.

표면은 거의 불투명한 흰색이다. 지도를 읽어야 하므로 강한 글래스·블러는 쓰지 않는다.

## Shapes

검색 필드와 버튼은 8px, 도구 그룹은 12px, 다이얼로그는 16px, 시트 상단은 20px, 칩과 주소 캡슐은 알약이다. 안쪽은 더 타이트하고 바깥 컨테이너는 더 둥글다.

핀 헤드는 원, 와이드 브랜드(메가커피·GS25·CU)만 14px 라운드 사각형이다.

## Components

- **검색 행:** 흰 패널 안에 필드 + 검정 검색. 높이 40px(컴팩트 44px). 현위치 버튼을 넣지 않는다.
- **현위치:** 우측 하단 흰 정사각(`radius-md`), 액센트 십자 조준 아이콘. 활성일 때 `accent-soft` 배경. 시트 중간·접힘 위 12px, 시트 최대일 때 숨김.
- **주소 칩:** 필터 아래 왼쪽. 작은 핀 아이콘 + 말줄임. 검색 열 전체 너비로 늘리지 않는다.
- **칩:** 로고가 라벨 앞. 패딩 `0 14px 0 10px`. 기본 다음에 명소(공식 태극기)·관광(랜드마크), 그다음 브랜드. 활성일 때 잉크 채움. 명소 또는 관광이 켜진 뒤에만 **내 근처**(아이콘 없음). 관광이 켜지면 그룹 줄만. **전체**에서는 세부를 숨기고, 산 등을 고르면 그 아래 세부 줄(`chip-option`, 라벨은 「산의 세부」). 검색창에 「명소」「관광」을 넣지 않는다.
- **도구 버튼:** 세로로 붙고 활성 행만 잉크. 언어는 한/EN/日/中 2×2이며 눌린 칸만 `accent-soft`. 컴팩트에서는 레이어 토글 아래에 타입·오버레이 패널, 언어 토글 아래에 언어 메뉴.
- **시트:** 핸들 바, 제목+건수, 썸네일 번호가 있는 장소 행. 명소·관광 썸네일은 대표 사진(실패 시 Carto). 명소 행은 유네스코/국가유산/유적 뱃지와 한 줄 소개. 활성 행은 `surface-muted`. 상세 시트는 같은 흰 패널에 셰브론 뒤로(32px, `aria-label`만 번역), 이름, 카테고리. 데스크톱은 사진 왼쪽·오른쪽에 주소·어제/오늘/내일 예보(로딩 자리 예약)·뱃지·이용 정보, 개요는 아래 전체 너비, 미사용 필드는 맨 아래. 컴팩트는 사진이 위. 날씨는 GPS가 없거나 3km 밖일 때만. 목록에서 열면 지도를 레벨 3으로 줌하고 뒤로 시 이전 카메라를 되돌린다. 브랜드는 상세가 없다.
- **핀/클러스터:** 흰 콘 핀. 역사는 태극기, 관광은 유형 아이콘. 선택 시 검정 말풍선 상호.
- **다이얼로그:** 가운데 모달, 전체 너비 확인 버튼.

호버는 포인터 기기만. `:focus-visible`·활성·빈 목록을 같은 토큰으로 맞춘다. 포커스 링은 액센트 28% 오버레이 3px다.

## Do's and Don'ts

**Do**

- 카카오맵처럼 흰 플로팅 크롬과 검정 액션을 유지한다.
- 브랜드 필터 아이콘을 그대로 쓴다.
- 컴팩트에서는 검색–줌 간격과 16px 입력을 유지한다.
- 기존 마커 페이드만 쓰고 `prefers-reduced-motion`을 끈다.

**Don't**

- 퍼플·오렌지 그라데이션, Inter 일색, 히어로 카드 그리드, 마케팅 랜딩 레이아웃.
- 장소 실사 사진이나 허구 후기를 넣지 않는다.
- 검색/필터/클러스터/시트 제스처를 디자인 때문에 바꾸지 않는다.
