# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

정적 HTML, CSS, JavaScript. 카카오 지도 JavaScript API (`dapi.kakao.com`). 프레임워크 없음.

## Users

_Inferred from the product and confirmed by the redesign brief: keep Kakao-map chrome, preserve search/filter/cluster/sheet._

한국에서 주변 장소를 찾는 일반 사용자. 이동 중이거나 지도를 보며 역사 명소·일반 관광지, 스타벅스·메가커피·GS25·CU 같은 브랜드를 걸러 보거나, 주소·상호로 검색한다.

## Product Purpose

전체 화면 카카오 지도 위에서 장소를 찾고, 역사 명소·관광·브랜드 필터로 현재 화면의 지점을 모아 보며, 목록과 핀·상세를 오가며 고른다. 성공은 원하는 지점을 지도와 목록에서 빠르게 확인하는 것이다.

## Positioning

카카오 장소 검색에 브랜드 칩, 역사 명소·관광 스냅샷, 줌 기반 클러스터, 제스처 바텀시트·상세 시트를 붙인 정적 지도 페이지. 공식 카카오맵 앱이 아니며, 키는 로컬 `config.js`로만 넣는다.

## Operating Context

로컬 정적 서버(`python3 -m http.server 5500` 등) 또는 같은 방식으로 호스팅한다. `file://`로는 Web 도메인 제한 때문에 지도가 나오지 않는다. 카카오 디벨로퍼스에 JavaScript 키와 Web 플랫폼 도메인이 등록되어 있어야 한다.

## Capabilities and Constraints

- 키워드 검색은 전국 장소 검색이다. 브랜드 필터 칩은 현재 지도 중심 또는 화면 범위로 카카오 `keywordSearch`를 다시 한다.
- **명소**는 역사·유적·국가유산·유네스코 세계유산이다. **관광**은 그 밖의 관광지다. 둘 다 카카오 검색 한도를 쓰지 않고 `data/attractions.json`을 한 번 불러 `kind`로 가른다. 기본은 전국, **내 근처**는 명소 또는 관광이 켜져 있을 때만 Geolocation 반경 3km. idle에서 카카오 재검색 없이 bbox 클러스터한다.
- 스냅샷은 `scripts/fetch-attractions.mjs`다. `TOUR_API_KEY`가 있으면 TourAPI `contentTypeId=12`를 받아 `cat2=A0201`·유네스코·유산 플래그는 명소, 나머지는 관광. `firstimage`·`cat3`를 JSON에 굽는다. 키가 없으면 유네스코·궁궐·관광 시드와 Overpass/Wikidata·위키백과 대표 사진이다. 키는 브라우저와 Git에 두지 않는다.
- 명소 핀은 공식 태극기(`icons/taegeukgi.svg`, 위키미디어 Flag of South Korea), 관광 핀은 `cat2` 유형 아이콘이다. 메인 칩은 로고 다음 라벨이다. **내 근처**는 아이콘이 없다. 관광이 켜지면 그 아래 **그룹** 줄만 열린다. **전체**가 기본이며 세부는 숨긴다. 산·바다·호수·강·휴양·체험·산업·건축을 고르면 그 아래 **세부** 줄(그 그룹의 cat3와 그룹 안 전체)이 열린다. 목록·상세는 대표 사진(`image`)을 쓰고 없으면 Carto 타일이다. 명소·관광 상세는 이름·카테고리 다음, 데스크톱에서는 사진 왼쪽·오른쪽에 주소·3일 예보(자리 예약)·뱃지·이용 정보, 그 아래 전체 너비 개요, 맨 아래에 미사용 필드다. 컴팩트는 사진이 위다. 날씨는 Open-Meteo 어제·오늘·내일이다. 현위치가 있고 장소가 3km 안이면 생략한다. 목록에서 상세로 들어가면 지도를 그 장소(레벨 3)로 줌하고, 뒤로(셰브론 아이콘) 나오면 이전 카메라를 되돌린다. 브랜드 검색은 상세 시트와 대표 사진을 쓰지 않는다.
- 필터일 때만 줌 레벨에 따라 가까운 핀을 클러스터한다. 일반 검색 결과는 개별 핀이다. 명소는 화면 안만 오버레이하고 대략 90개 이하로 유지한다.
- 바텀시트는 접힘 / 중간 / 최대이며 핸들 탭과 드래그로 스냅한다. 컴팩트 중간 높이는 `min(38dvh, 340px)`이다.
- 현재 위치는 Geolocation이다. 검색바가 아니라 지도 우측 하단 버튼이다. 권한 거부 시 커스텀 다이얼로그로 알린다.
- 언어는 우측 도구에서 한·영·일·중(간체)을 고른다. 기본은 한국어. 크롬·라벨·날씨 상태·카테고리 칩만 번역하고, 장소 이름·개요·카카오 주소와 브랜드 검색 키워드는 한국어 그대로다.
- 컴팩트(`max-width: 767px`)에서는 줌만 상시 두고 지도 타입·오버레이는 레이어 패널에, 언어는 토글 아래 메뉴에 접는다.
- 장소 사진은 카카오 API/약관상 쓰지 않는다. 명소·관광 대표 사진은 TourAPI `firstimage` 또는 위키미디어/위키백과이며, 없으면 Carto Voyager 타일이다.
- `config.js`는 Git에 올리지 않는다. 추적되는 예시는 `config.example.js`다.

## Brand Commitments

화면 이름은 「카카오 지도」. 카카오맵식 플로팅 크롬(흰 검색바, 칩, 우측 도구, 우측 하단 현위치, 하단 시트)을 유지한다. 스타벅스·메가커피·GS25·CU·기본 필터 아이콘은 제품 자산이며 교체하지 않는다. 명소 칩·역사 핀은 `icons/taegeukgi.svg`, 관광 칩은 `icons/attraction.svg`다. 공식 카카오 브랜드 가이드를 사칭하지 않는다.

## Evidence on Hand

- 구현: `index.html`, `style.css`, `app.js`, `i18n.js`
- 아이콘: `icons/` (default, taegeukgi, attraction, tourism-*, weather-*, starbucks, gs25, cu, location; 메가커피는 PNG)
- 명소/관광 스냅샷: `data/attractions.json`, 생성 스크립트 `scripts/fetch-attractions.mjs`
- 사용 설명: `README.md`
- 허구 후기, 벤치마크, 장소 실사 사진은 없다. 만들지 않는다.

## Product Principles

1. 지도가 주 화면이다. 크롬은 지도를 가리지 않는다.
2. 검색과 필터의 결과는 핀과 목록이 같은 순서를 가리킨다.
3. 필터를 켠 채 지도를 움직이면 그 화면의 결과를 따른다.
4. 알림은 브라우저 `alert`가 아니라 페이지 다이얼로그다.
5. 정적 페이지로 남긴다. 기능을 위해 프레임워크를 들이지 않는다.

## Accessibility & Inclusion

한·영·일·중(간체) UI, 기본 한국어. 키보드로 검색·칩·레이어·언어·줌·현위치·시트 핸들·다이얼로그를 쓸 수 있어야 하고, 포커스가 보여야 한다. 컴팩트 검색 입력은 16px 이상이다. 본문 대비율은 WCAG AA(4.5:1)을 목표로 한다. 모션은 `prefers-reduced-motion`을 존중한다.
