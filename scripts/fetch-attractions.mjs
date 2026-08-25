#!/usr/bin/env node
/**
 * Build data/attractions.json.
 *
 *   TOUR_API_KEY='decoded-service-key' node scripts/fetch-attractions.mjs
 *
 * With a key: KorService2 areaBasedList2 (contentTypeId=12). History =
 * cat2 A0201, UNESCO name match, or detailIntro heritage flags. Remaining
 * type-12 rows are tourism. History rows get detailCommon2 overviews.
 *
 * Without a key: curated UNESCO + palace seed, then Overpass (historic
 * palace/castle/temple vs other tourism). Do not put the key in the
 * browser or commit it.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

var ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
var OUT = join(ROOT, "data", "attractions.json");
var AREA_CODES = [
  1, 2, 3, 4, 5, 6, 7, 8, 31, 32, 33, 34, 35, 36, 37, 38, 39,
];
var PAGE_SIZE = 100;
var HISTORY_CAT2 = "A0201";
var CAT2_LABEL = {
  A0101: "자연",
  A0102: "자연",
  A0201: "역사",
  A0202: "휴양",
  A0203: "체험",
  A0204: "산업",
  A0205: "건축",
};
var CAT3_LABEL = {
  A01010100: "국립공원",
  A01010200: "도립공원",
  A01010300: "군립공원",
  A01010400: "산",
  A01010500: "생태관광",
  A01010600: "휴양림",
  A01010700: "수목원",
  A01010800: "폭포",
  A01010900: "계곡",
  A01011000: "약수터",
  A01011100: "해수욕장",
  A01011200: "섬",
  A01011300: "항구",
  A01011400: "어촌",
  A01011600: "등대",
  A01011700: "호수",
  A01011800: "강",
  A01011900: "동굴",
  A02020200: "관광단지",
  A02020300: "온천",
  A02020600: "테마공원",
  A02020700: "공원",
  A02020800: "유람선",
  A02030100: "농산어촌",
  A02030200: "전통체험",
  A02030400: "이색체험",
  A02030600: "이색거리",
  A02040400: "발전소",
  A02040600: "식음료",
  A02040800: "산업시설",
  A02041000: "자동차",
  A02050200: "다리",
  A02050300: "전망대",
  A02050500: "동상",
  A02050700: "유명건물",
};
var MOUNTAIN_CAT3 = {
  A01010100: 1,
  A01010200: 1,
  A01010300: 1,
  A01010400: 1,
  A01010500: 1,
  A01010600: 1,
  A01010700: 1,
  A01010800: 1,
  A01010900: 1,
  A01011000: 1,
  A01011900: 1,
};
var SEA_CAT3 = {
  A01011100: 1,
  A01011200: 1,
  A01011300: 1,
  A01011400: 1,
  A01011600: 1,
};
var WATER_CAT3 = {
  A01011700: 1,
  A01011800: 1,
};

var UNESCO_PATTERNS = [
  "석굴암",
  "불국사",
  "해인사",
  "장경판전",
  "종묘",
  "창덕궁",
  "수원화성",
  "화성행궁",
  "경주역사",
  "대릉원",
  "첨성대",
  "황룡사",
  "고인돌",
  "조선왕릉",
  "동구릉",
  "선정릉",
  "홍유릉",
  "서오릉",
  "서삼릉",
  "하회마을",
  "양동마을",
  "남한산성",
  "공산성",
  "정림사지",
  "미륵사지",
  "왕궁리",
  "송산리 고분",
  "통도사",
  "부석사",
  "봉정사",
  "법주사",
  "마곡사",
  "선암사",
  "대흥사",
  "소수서원",
  "남계서원",
  "옥산서원",
  "도산서원",
  "필암서원",
  "도동서원",
  "병산서원",
  "무성서원",
  "돈암서원",
  "대성동 고분",
  "말이산",
  "지산동 고분",
  "한라산",
  "성산일출봉",
  "거문오름",
  "갯벌",
  "순천만",
];

var HISTORY_SEED = [
  {
    title: "경복궁",
    x: "126.9770",
    y: "37.5796",
    address: "서울특별시 종로구",
    badges: ["heritage", "historic"],
    summary: "조선 법궁. 광화문과 근정전을 중심으로 한 궁궐이다.",
    overview:
      "조선 왕조가 한양에 도읍한 뒤 세운 법궁이다. 근정전·경회루·향원정과 국립고궁박물관이 있고, 일제강점기와 한국전쟁을 거쳐 복원되었다.",
  },
  {
    title: "창덕궁",
    x: "126.9910",
    y: "37.5794",
    address: "서울특별시 종로구",
    badges: ["unesco", "heritage", "historic"],
    summary: "유네스코 세계유산. 자연 지형을 살린 조선 궁궐이다.",
    overview:
      "1405년 정궁의 이궁으로 창건되었다. 인정전·선정전·후원(비원)이 남아 있으며 1997년 유네스코 세계유산에 올랐다.",
  },
  {
    title: "창경궁",
    x: "126.9950",
    y: "37.5788",
    address: "서울특별시 종로구",
    badges: ["heritage", "historic"],
    summary: "성종 때 창건된 조선 궁궐이다.",
    overview:
      "세종이 지은 수강궁을 성종이 창경궁으로 확장했다. 명정전은 조선 궁궐 정전 중 가장 오래된 목조 건물이다.",
  },
  {
    title: "덕수궁",
    x: "126.9751",
    y: "37.5658",
    address: "서울특별시 중구",
    badges: ["heritage", "historic"],
    summary: "고종이 머문 궁. 석조전과 중명전이 있다.",
    overview:
      "임진왜란 때 선조의 행궁이었고, 대한제국 시기 고종의 거처가 되었다. 서양식 석조전과 즉조당·준명당이 한 자리에 있다.",
  },
  {
    title: "경희궁",
    x: "126.9683",
    y: "37.5714",
    address: "서울특별시 종로구",
    badges: ["heritage", "historic"],
    summary: "광해군 때 지은 조선의 이궁이다.",
    overview:
      "서궐로 불렸다. 일제강점기에 대부분 훼손된 뒤 숭정전 등이 복원되었다.",
  },
  {
    title: "종묘",
    x: "126.9942",
    y: "37.5744",
    address: "서울특별시 종로구",
    badges: ["unesco", "heritage", "historic"],
    summary: "조선 왕실 사당. 유네스코 세계유산이다.",
    overview:
      "역대 왕과 왕비의 신위를 모신 유교 사당이다. 정전과 영녕전, 종묘제례가 1995년 세계유산·세계무형유산으로 지정되었다.",
  },
  {
    title: "숭례문",
    x: "126.9753",
    y: "37.5600",
    address: "서울특별시 중구",
    badges: ["heritage", "historic"],
    summary: "한양도성 남대문. 국보 숭례문이다.",
    overview:
      "조선 한양도성의 정문이다. 2008년 화재 후 복원되어 2013년 다시 열렸다.",
  },
  {
    title: "흥인지문",
    x: "127.0095",
    y: "37.5710",
    address: "서울특별시 종로구",
    badges: ["heritage", "historic"],
    summary: "한양도성 동대문이다.",
    overview:
      "한양도성 동쪽 문이다. 앞뒤에 옹성을 둔 유일한 한양도성 성문이다.",
  },
  {
    title: "불국사",
    x: "129.3320",
    y: "35.7900",
    address: "경상북도 경주시",
    badges: ["unesco", "heritage", "historic"],
    summary: "신라 사찰. 석굴암과 함께 세계유산이다.",
    overview:
      "경덕왕 때 김대성이 창건했다고 전한다. 다보탑·석가탑, 청운교·백운교가 있으며 1995년 석굴암과 함께 세계유산에 등재되었다.",
  },
  {
    title: "석굴암",
    x: "129.3494",
    y: "35.7947",
    address: "경상북도 경주시",
    badges: ["unesco", "heritage", "historic"],
    summary: "토함산 석굴 사원. 유네스코 세계유산이다.",
    overview:
      "8세기 신라의 인조 석굴이다. 본존불을 중심으로 보살·나한·사천왕 조각이 원형에 가깝게 남아 있다.",
  },
  {
    title: "해인사 장경판전",
    x: "128.0977",
    y: "35.8010",
    address: "경상남도 합천군",
    badges: ["unesco", "heritage", "historic"],
    summary: "팔만대장경 판전. 세계유산이다.",
    overview:
      "고려 팔만대장경 경판을 보관한 목조 건물이다. 자연 환기 구조로 유명하며 1995년 세계유산에 올랐다.",
  },
  {
    title: "수원화성",
    x: "127.0119",
    y: "37.2871",
    address: "경기도 수원시",
    badges: ["unesco", "heritage", "historic"],
    summary: "정조가 쌓은 성곽 도시. 세계유산이다.",
    overview:
      "1794~1796년 축성되었다. 성벽과 장안문·팔달문·화홍문, 화성행궁이 남아 1997년 세계유산에 등재되었다.",
  },
  {
    title: "첨성대",
    x: "129.2194",
    y: "35.8347",
    address: "경상북도 경주시",
    badges: ["unesco", "heritage", "historic"],
    summary: "신라 천문대. 경주역사유적지구의 일부다.",
    overview:
      "선덕여왕 대에 세워진 것으로 전하는 동아시아에서 가장 오래된 천문대 유적이다. 경주역사유적지구 세계유산에 포함된다.",
  },
  {
    title: "대릉원",
    x: "129.2110",
    y: "35.8380",
    address: "경상북도 경주시",
    badges: ["unesco", "heritage", "historic"],
    summary: "신라 고분군. 천마총이 있다.",
    overview:
      "경주 노동동·노서동 고분군이다. 천마총에서 천마도가 나왔고, 경주역사유적지구 세계유산에 속한다.",
  },
  {
    title: "고창 고인돌 유적",
    x: "126.6336",
    y: "35.4328",
    address: "전라북도 고창군",
    badges: ["unesco", "heritage", "historic"],
    summary: "세계유산 고인돌 유적 중 한 곳이다.",
    overview:
      "고창·화순·강화 고인돌 유적은 2000년 세계유산에 등재되었다. 고창은 군집 밀도가 높다.",
  },
  {
    title: "화순 고인돌 유적",
    x: "126.9194",
    y: "34.9766",
    address: "전라남도 화순군",
    badges: ["unesco", "heritage", "historic"],
    summary: "세계유산 고인돌 유적이다.",
    overview:
      "도곡면·춘양면 일대 거석 무덤이다. 고창·강화와 함께 2000년 세계유산에 올랐다.",
  },
  {
    title: "강화 고인돌 유적",
    x: "126.4320",
    y: "37.6335",
    address: "인천광역시 강화군",
    badges: ["unesco", "heritage", "historic"],
    summary: "강화도 부근리 고인돌 등 세계유산이다.",
    overview:
      "북한산 기슭과 강화 일대 탁자식 고인돌이다. 고창·화순과 함께 세계유산이다.",
  },
  {
    title: "동구릉",
    x: "127.1310",
    y: "37.6180",
    address: "경기도 구리시",
    badges: ["unesco", "heritage", "historic"],
    summary: "조선왕릉 군집. 세계유산이다.",
    overview:
      "건원릉을 비롯해 아홉 능이 있다. 2009년 조선왕릉 세계유산에 포함되었다.",
  },
  {
    title: "선정릉",
    x: "127.0492",
    y: "37.5090",
    address: "서울특별시 강남구",
    badges: ["unesco", "heritage", "historic"],
    summary: "성종·중종·정현왕후 능. 조선왕릉 세계유산이다.",
    overview:
      "서울 도심에 남은 조선왕릉이다. 선릉과 정릉을 함께 선정릉이라 부른다.",
  },
  {
    title: "안동 하회마을",
    x: "128.5186",
    y: "36.5392",
    address: "경상북도 안동시",
    badges: ["unesco", "heritage", "historic"],
    summary: "낙동강 하회 씨족마을. 세계유산이다.",
    overview:
      "풍산 류씨 집성촌이다. 양동마을과 함께 2010년 세계유산에 등재되었다.",
  },
  {
    title: "경주 양동마을",
    x: "129.2542",
    y: "35.9975",
    address: "경상북도 경주시",
    badges: ["unesco", "heritage", "historic"],
    summary: "월성 손씨·여강 이씨 씨족마을. 세계유산이다.",
    overview:
      "조선 양반 촌락의 공간 구성을 보여 준다. 하회와 함께 세계유산이다.",
  },
  {
    title: "남한산성",
    x: "127.1811",
    y: "37.4789",
    address: "경기도 광주시",
    badges: ["unesco", "heritage", "historic"],
    summary: "조선 비상 수도 산성. 세계유산이다.",
    overview:
      "한양 동쪽 비상 산성이다. 병자호란 때 인조가 피란했고 2014년 세계유산에 올랐다.",
  },
  {
    title: "공주 공산성",
    x: "127.1264",
    y: "36.4620",
    address: "충청남도 공주시",
    badges: ["unesco", "heritage", "historic"],
    summary: "백제 왕도 산성. 백제역사유적지구다.",
    overview:
      "웅진 백제 왕성이다. 부여·익산 유적과 함께 2015년 세계유산에 등재되었다.",
  },
  {
    title: "부여 정림사지",
    x: "126.9130",
    y: "36.2790",
    address: "충청남도 부여군",
    badges: ["unesco", "heritage", "historic"],
    summary: "사비 백제 사찰터. 오층석탑이 있다.",
    overview:
      "백제 사비기 도성 사찰이다. 정림사지 오층석탑은 백제역사유적지구 세계유산이다.",
  },
  {
    title: "익산 미륵사지",
    x: "127.0300",
    y: "36.0120",
    address: "전라북도 익산시",
    badges: ["unesco", "heritage", "historic"],
    summary: "백제 최대 사찰터. 세계유산이다.",
    overview:
      "무왕 대 창건으로 전한다. 서탑 해체·복원과 사리장엄이 확인되었고 백제역사유적지구에 속한다.",
  },
  {
    title: "통도사",
    x: "129.0644",
    y: "35.4881",
    address: "경상남도 양산시",
    badges: ["unesco", "heritage", "historic"],
    summary: "영남 삼보사찰. 산사 세계유산이다.",
    overview:
      "자장율사가 창건했다고 전한다. 2018년 「산사, 한국의 산지승원」 세계유산에 포함되었다.",
  },
  {
    title: "부석사",
    x: "128.6860",
    y: "36.9990",
    address: "경상북도 영주시",
    badges: ["unesco", "heritage", "historic"],
    summary: "의상이 창건한 화엄 사찰. 산사 세계유산이다.",
    overview:
      "무량수전·조사당이 국보다. 산지 가람 배치를 보여 주며 산사 세계유산에 들어 있다.",
  },
  {
    title: "도산서원",
    x: "128.8430",
    y: "36.7270",
    address: "경상북도 안동시",
    badges: ["unesco", "heritage", "historic"],
    summary: "이황을 모신 서원. 한국의 서원 세계유산이다.",
    overview:
      "퇴계 이황의 학문과 제향을 잇는 서원이다. 2019년 「한국의 서원」 세계유산에 등재되었다.",
  },
  {
    title: "병산서원",
    x: "128.5530",
    y: "36.5400",
    address: "경상북도 안동시",
    badges: ["unesco", "heritage", "historic"],
    summary: "풍산 류씨 서원. 만대루가 있다.",
    overview:
      "하회마을과 가까운 서원이다. 만대루 경치로 알려져 「한국의 서원」 세계유산에 속한다.",
  },
  {
    title: "한라산",
    x: "126.5292",
    y: "33.3617",
    address: "제주특별자치도",
    badges: ["unesco", "heritage"],
    summary: "제주 화산섬 세계유산의 중심이다.",
    overview:
      "남한 최고봉 화산이다. 성산일출봉·거문오름 용암동굴계와 함께 2007년 세계자연유산에 올랐다.",
  },
  {
    title: "성산일출봉",
    x: "126.9425",
    y: "33.4580",
    address: "제주특별자치도 서귀포시",
    badges: ["unesco", "heritage"],
    summary: "수성화산체. 제주 세계자연유산이다.",
    overview:
      "약 5천 년 전 형성된 응회구다. 제주 화산섬과 용암동굴 세계유산에 포함된다.",
  },
  {
    title: "순천만갯벌",
    x: "127.4000",
    y: "34.8130",
    address: "전라남도 순천시",
    badges: ["unesco", "heritage"],
    summary: "한국의 갯벌 세계유산의 일부다.",
    overview:
      "보성-순천 갯벌은 2021년 「한국의 갯벌」 세계자연유산에 들어 있다. 갈대밭과 철새 도래지로 알려져 있다.",
  },
  {
    title: "신안갯벌",
    x: "126.1000",
    y: "34.8330",
    address: "전라남도 신안군",
    badges: ["unesco", "heritage"],
    summary: "다도해 갯벌. 세계자연유산이다.",
    overview:
      "신안 갯벌은 규모가 큰 조간대다. 서천·고창·보성-순천과 함께 한국의 갯벌 세계유산이다.",
  },
];

var TOURISM_SEED = [
  { title: "설악산", x: "128.4650", y: "38.1193", address: "강원특별자치도 속초시", cat2: "A0101", cat3: "A01010100", summary: "동해안 국립공원." },
  { title: "내장산", x: "126.8880", y: "35.4880", address: "전라북도 정읍시", cat2: "A0101", cat3: "A01010100", summary: "단풍으로 알려진 국립공원." },
  { title: "지리산", x: "127.6040", y: "35.3370", address: "전라남도 구례군", cat2: "A0101", cat3: "A01010100", summary: "남한 내륙 최고봉 국립공원." },
  { title: "북한산", x: "126.9820", y: "37.6590", address: "서울특별시 강북구", cat2: "A0101", cat3: "A01010100", summary: "서울·경기 국립공원." },
  { title: "치악산", x: "128.0500", y: "37.3650", address: "강원특별자치도 원주시", cat2: "A0101", cat3: "A01010100", summary: "원주 국립공원." },
  { title: "오대산", x: "128.5430", y: "37.7290", address: "강원특별자치도 평창군", cat2: "A0101", cat3: "A01010100", summary: "월정사가 있는 국립공원." },
  { title: "주왕산", x: "129.1630", y: "36.3890", address: "경상북도 청송군", cat2: "A0101", cat3: "A01010100", summary: "기암 계곡 국립공원." },
  { title: "덕유산", x: "127.7460", y: "35.8600", address: "전라북도 무주군", cat2: "A0101", cat3: "A01010100", summary: "향적봉 국립공원." },
  { title: "소백산", x: "128.4300", y: "36.9600", address: "충청북도 단양군", cat2: "A0101", cat3: "A01010100", summary: "능선 국립공원." },
  { title: "무등산", x: "126.9880", y: "35.1340", address: "광주광역시", cat2: "A0101", cat3: "A01010100", summary: "광주 국립공원." },
  { title: "계룡산", x: "127.2060", y: "36.3420", address: "충청남도 공주시", cat2: "A0101", cat3: "A01010100", summary: "충청 국립공원." },
  { title: "월출산", x: "126.7010", y: "34.7670", address: "전라남도 영암군", cat2: "A0101", cat3: "A01010100", summary: "기암 국립공원." },
  { title: "속리산", x: "127.8330", y: "36.5430", address: "충청북도 보은군", cat2: "A0101", cat3: "A01010100", summary: "법주사가 있는 국립공원." },
  { title: "가야산", x: "128.1400", y: "35.8220", address: "경상남도 합천군", cat2: "A0101", cat3: "A01010100", summary: "해인사 자락 국립공원." },
  { title: "태백산", x: "128.9160", y: "37.0960", address: "강원특별자치도 태백시", cat2: "A0101", cat3: "A01010100", summary: "천제단이 있는 국립공원." },
  { title: "팔공산", x: "128.6950", y: "35.9830", address: "대구광역시", cat2: "A0101", cat3: "A01010200", summary: "대구 도립공원." },
  { title: "도봉산", x: "127.0160", y: "37.6990", address: "서울특별시 도봉구", cat2: "A0101", cat3: "A01010400", summary: "서울 북부 암봉." },
  { title: "관악산", x: "126.9670", y: "37.4450", address: "서울특별시 관악구", cat2: "A0101", cat3: "A01010400", summary: "서울 남부 산." },
  { title: "마이산", x: "127.3950", y: "35.7630", address: "전라북도 진안군", cat2: "A0101", cat3: "A01010400", summary: "말 귀 모양 봉우리." },
  { title: "대둔산", x: "127.3020", y: "36.1170", address: "전라북도 완주군", cat2: "A0101", cat3: "A01010400", summary: "구름다리로 알려진 산." },
  { title: "축령산자연휴양림", x: "127.3130", y: "37.7540", address: "경기도 남양주시", cat2: "A0101", cat3: "A01010600", summary: "잣나무 휴양림." },
  { title: "국립수목원", x: "127.1680", y: "37.7490", address: "경기도 포천시", cat2: "A0101", cat3: "A01010700", summary: "광릉숲 수목원." },
  { title: "홍릉숲", x: "127.0430", y: "37.5930", address: "서울특별시 동대문구", cat2: "A0101", cat3: "A01010700", summary: "서울 도심 수목원." },
  { title: "천지연폭포", x: "126.5540", y: "33.2440", address: "제주특별자치도 서귀포시", cat2: "A0101", cat3: "A01010800", summary: "서귀포 대표 폭포." },
  { title: "정방폭포", x: "126.5710", y: "33.2448", address: "제주특별자치도 서귀포시", cat2: "A0101", cat3: "A01010800", summary: "바다로 떨어지는 폭포." },
  { title: "대승폭포", x: "128.4220", y: "38.1720", address: "강원특별자치도 인제군", cat2: "A0101", cat3: "A01010800", summary: "설악 내설악 폭포." },
  { title: "구천동계곡", x: "127.7460", y: "35.8900", address: "전라북도 무주군", cat2: "A0101", cat3: "A01010900", summary: "덕유산 계곡." },
  { title: "피아골", x: "127.5910", y: "35.2650", address: "전라남도 구례군", cat2: "A0101", cat3: "A01010900", summary: "지리산 단풍 계곡." },
  { title: "만장굴", x: "126.7710", y: "33.5280", address: "제주특별자치도 제주시", cat2: "A0101", cat3: "A01011900", summary: "거문오름 용암동굴." },
  { title: "해운대해수욕장", x: "129.1604", y: "35.1586", address: "부산광역시 해운대구", cat2: "A0101", cat3: "A01011100", summary: "부산의 대표적인 해수욕장." },
  { title: "광안리해수욕장", x: "129.1186", y: "35.1532", address: "부산광역시 수영구", cat2: "A0101", cat3: "A01011100", summary: "광안대교가 보이는 해변." },
  { title: "경포대해수욕장", x: "128.9080", y: "37.7960", address: "강원특별자치도 강릉시", cat2: "A0101", cat3: "A01011100", summary: "강릉의 대표 해변." },
  { title: "송정해수욕장", x: "129.1990", y: "35.1780", address: "부산광역시 해운대구", cat2: "A0101", cat3: "A01011100", summary: "송정 해변." },
  { title: "다대포해수욕장", x: "128.9660", y: "35.0470", address: "부산광역시 사하구", cat2: "A0101", cat3: "A01011100", summary: "낙조로 알려진 해변." },
  { title: "을왕리해수욕장", x: "126.3730", y: "37.4470", address: "인천광역시 중구", cat2: "A0101", cat3: "A01011100", summary: "영종도 해변." },
  { title: "대천해수욕장", x: "126.5130", y: "36.3110", address: "충청남도 보령시", cat2: "A0101", cat3: "A01011100", summary: "서해 대표 해변." },
  { title: "만리포해수욕장", x: "126.5100", y: "36.7870", address: "충청남도 태안군", cat2: "A0101", cat3: "A01011100", summary: "태안 해변." },
  { title: "변산해수욕장", x: "126.5140", y: "35.6280", address: "전라북도 부안군", cat2: "A0101", cat3: "A01011100", summary: "변산반도 해변." },
  { title: "함덕해수욕장", x: "126.6700", y: "33.5430", address: "제주특별자치도 제주시", cat2: "A0101", cat3: "A01011100", summary: "제주 북동 해변." },
  { title: "협재해수욕장", x: "126.2390", y: "33.3940", address: "제주특별자치도 제주시", cat2: "A0101", cat3: "A01011100", summary: "비양도가 보이는 해변." },
  { title: "중문색달해수욕장", x: "126.4120", y: "33.2450", address: "제주특별자치도 서귀포시", cat2: "A0101", cat3: "A01011100", summary: "중문 흑모래 해변." },
  { title: "낙산해수욕장", x: "128.6280", y: "38.1160", address: "강원특별자치도 양양군", cat2: "A0101", cat3: "A01011100", summary: "낙산사 아래 해변." },
  { title: "속초해수욕장", x: "128.6000", y: "38.1910", address: "강원특별자치도 속초시", cat2: "A0101", cat3: "A01011100", summary: "속초 시내 해변." },
  { title: "망상해수욕장", x: "129.0900", y: "37.5930", address: "강원특별자치도 동해시", cat2: "A0101", cat3: "A01011100", summary: "동해 해변." },
  { title: "상주은모래비치", x: "127.9780", y: "34.7180", address: "경상남도 남해군", cat2: "A0101", cat3: "A01011100", summary: "남해 은모래 해변." },
  { title: "우도", x: "126.9510", y: "33.5060", address: "제주특별자치도 제주시", cat2: "A0101", cat3: "A01011200", summary: "성산 앞 섬." },
  { title: "남이섬", x: "127.5260", y: "37.7900", address: "강원특별자치도 춘천시", cat2: "A0101", cat3: "A01011200", summary: "북한강 관광 섬." },
  { title: "선유도", x: "126.4160", y: "35.8100", address: "전라북도 군산시", cat2: "A0101", cat3: "A01011200", summary: "고군산군도 섬." },
  { title: "홍도", x: "125.1950", y: "34.6850", address: "전라남도 신안군", cat2: "A0101", cat3: "A01011200", summary: "홍도자연보호구역." },
  { title: "오륙도", x: "129.1280", y: "35.0990", address: "부산광역시 남구", cat2: "A0101", cat3: "A01011200", summary: "부산 앞바다 섬." },
  { title: "주문진항", x: "128.8320", y: "37.8910", address: "강원특별자치도 강릉시", cat2: "A0101", cat3: "A01011300", summary: "오징어로 알려진 항구." },
  { title: "묵호항", x: "129.1170", y: "37.5500", address: "강원특별자치도 동해시", cat2: "A0101", cat3: "A01011300", summary: "동해 항구." },
  { title: "자갈치시장", x: "129.0300", y: "35.0970", address: "부산광역시 중구", cat2: "A0101", cat3: "A01011400", summary: "부산 어시장." },
  { title: "호미곶등대", x: "129.5780", y: "36.0780", address: "경상북도 포항시", cat2: "A0101", cat3: "A01011600", summary: "한반도 최동단 등대." },
  { title: "팔미도등대", x: "126.5110", y: "37.3580", address: "인천광역시 중구", cat2: "A0101", cat3: "A01011600", summary: "한국 최초 서양식 등대." },
  { title: "소양호", x: "127.8150", y: "37.9450", address: "강원특별자치도 춘천시", cat2: "A0101", cat3: "A01011700", summary: "소양강댐 호수." },
  { title: "충주호", x: "128.0000", y: "37.0000", address: "충청북도 충주시", cat2: "A0101", cat3: "A01011700", summary: "남한강 인공호." },
  { title: "안동호", x: "128.7750", y: "36.5800", address: "경상북도 안동시", cat2: "A0101", cat3: "A01011700", summary: "안동댐 호수." },
  { title: "청평호", x: "127.5100", y: "37.7350", address: "경기도 가평군", cat2: "A0101", cat3: "A01011700", summary: "북한강 호수." },
  { title: "경포호", x: "128.8960", y: "37.7950", address: "강원특별자치도 강릉시", cat2: "A0101", cat3: "A01011700", summary: "강릉 석호." },
  { title: "두물머리", x: "127.3100", y: "37.5800", address: "경기도 양평군", cat2: "A0101", cat3: "A01011800", summary: "남한강·북한강 합류점." },
  { title: "한강공원 여의도", x: "126.9330", y: "37.5280", address: "서울특별시 영등포구", cat2: "A0101", cat3: "A01011800", summary: "여의도 한강 둔치." },
  { title: "반포한강공원", x: "126.9960", y: "37.5100", address: "서울특별시 서초구", cat2: "A0101", cat3: "A01011800", summary: "달빛무지개분수 한강공원." },
  { title: "롯데월드 어드벤처", x: "127.0980", y: "37.5110", address: "서울특별시 송파구", cat2: "A0202", cat3: "A02020600", summary: "잠실의 실내외 테마파크." },
  { title: "에버랜드", x: "127.2044", y: "37.2942", address: "경기도 용인시", cat2: "A0202", cat3: "A02020600", summary: "용인의 대형 테마파크." },
  { title: "서울랜드", x: "127.0200", y: "37.4340", address: "경기도 과천시", cat2: "A0202", cat3: "A02020600", summary: "과천 테마파크." },
  { title: "한국민속촌", x: "127.1210", y: "37.2590", address: "경기도 용인시", cat2: "A0202", cat3: "A02020600", summary: "전통 마을 테마파크." },
  { title: "경주월드", x: "129.2820", y: "35.8360", address: "경상북도 경주시", cat2: "A0202", cat3: "A02020600", summary: "보문단지 테마파크." },
  { title: "서울대공원", x: "127.0170", y: "37.4270", address: "경기도 과천시", cat2: "A0202", cat3: "A02020600", summary: "동물원과 공원." },
  { title: "어린이대공원", x: "127.0810", y: "37.5480", address: "서울특별시 광진구", cat2: "A0202", cat3: "A02020700", summary: "광진구 도시 공원." },
  { title: "올림픽공원", x: "127.1230", y: "37.5210", address: "서울특별시 송파구", cat2: "A0202", cat3: "A02020700", summary: "88올림픽 공원." },
  { title: "일산호수공원", x: "126.7620", y: "37.6550", address: "경기도 고양시", cat2: "A0202", cat3: "A02020700", summary: "일산 호수 공원." },
  { title: "송도센트럴파크", x: "126.6410", y: "37.3920", address: "인천광역시 연수구", cat2: "A0202", cat3: "A02020700", summary: "송도 수변 공원." },
  { title: "중문관광단지", x: "126.4120", y: "33.2450", address: "제주특별자치도 서귀포시", cat2: "A0202", cat3: "A02020200", summary: "제주 서귀포 휴양 관광지." },
  { title: "보문관광단지", x: "129.2870", y: "35.8440", address: "경상북도 경주시", cat2: "A0202", cat3: "A02020200", summary: "경주 보문호 관광단지." },
  { title: "스파랜드 부곡", x: "128.6040", y: "35.4370", address: "경상남도 창녕군", cat2: "A0202", cat3: "A02020300", summary: "부곡온천 휴양지." },
  { title: "북촌한옥마을", x: "126.9849", y: "37.5826", address: "서울특별시 종로구", cat2: "A0203", cat3: "A02030600", summary: "가회동 일대 한옥 밀집 거리." },
  { title: "감천문화마을", x: "129.0106", y: "35.0975", address: "부산광역시 사하구", cat2: "A0203", cat3: "A02030600", summary: "산비탈 마을을 꾸민 부산의 관광지." },
  { title: "전주한옥마을", x: "127.1530", y: "35.8150", address: "전라북도 전주시", cat2: "A0203", cat3: "A02030600", summary: "전주 교동·풍남동 한옥 거리." },
  { title: "서촌", x: "126.9690", y: "37.5790", address: "서울특별시 종로구", cat2: "A0203", cat3: "A02030600", summary: "경복궁 서쪽 한옥 동네." },
  { title: "익선동", x: "126.9900", y: "37.5740", address: "서울특별시 종로구", cat2: "A0203", cat3: "A02030600", summary: "한옥 골목 상권." },
  { title: "동피랑마을", x: "128.4250", y: "34.8450", address: "경상남도 통영시", cat2: "A0203", cat3: "A02030600", summary: "통영 벽화 마을." },
  { title: "남해다랭이마을", x: "127.8920", y: "34.7260", address: "경상남도 남해군", cat2: "A0203", cat3: "A02030100", summary: "계단식 논 마을." },
  { title: "대관령양떼목장", x: "128.7180", y: "37.6890", address: "강원특별자치도 평창군", cat2: "A0203", cat3: "A02030100", summary: "대관령 목장 체험." },
  { title: "보성녹차밭", x: "127.0800", y: "34.7170", address: "전라남도 보성군", cat2: "A0203", cat3: "A02030100", summary: "대한다원 녹차밭." },
  { title: "이천도예촌", x: "127.4540", y: "37.2720", address: "경기도 이천시", cat2: "A0203", cat3: "A02030200", summary: "도자기 체험 마을." },
  { title: "인사동", x: "126.9860", y: "37.5740", address: "서울특별시 종로구", cat2: "A0203", cat3: "A02030600", summary: "전통 공예 거리." },
  { title: "파주출판도시", x: "126.6900", y: "37.7170", address: "경기도 파주시", cat2: "A0204", cat3: "A02040800", summary: "출판·건축 산업 단지." },
  { title: "헤이리예술마을", x: "126.6980", y: "37.7890", address: "경기도 파주시", cat2: "A0204", cat3: "A02040800", summary: "파주 예술 단지." },
  { title: "포천아트밸리", x: "127.1580", y: "37.9190", address: "경기도 포천시", cat2: "A0204", cat3: "A02040800", summary: "채석장을 활용한 문화공간." },
  { title: "태백석탄박물관", x: "128.9860", y: "37.1760", address: "강원특별자치도 태백시", cat2: "A0204", cat3: "A02040800", summary: "탄광 산업 유산." },
  { title: "울산대공원", x: "129.2940", y: "35.5320", address: "울산광역시 남구", cat2: "A0202", cat3: "A02020700", summary: "울산의 대형 도시 공원." },
  { title: "현대자동차 울산공장", x: "129.4200", y: "35.5100", address: "울산광역시 북구", cat2: "A0204", cat3: "A02041000", summary: "자동차 산업 견학." },
  { title: "남산서울타워", x: "126.9882", y: "37.5512", address: "서울특별시 용산구", cat2: "A0205", cat3: "A02050300", summary: "남산 위의 전망 타워." },
  { title: "롯데월드타워", x: "127.1020", y: "37.5130", address: "서울특별시 송파구", cat2: "A0205", cat3: "A02050700", summary: "잠실 초고층 전망 건물." },
  { title: "63빌딩", x: "126.9400", y: "37.5200", address: "서울특별시 영등포구", cat2: "A0205", cat3: "A02050700", summary: "여의도 전망 빌딩." },
  { title: "광안대교", x: "129.1260", y: "35.1470", address: "부산광역시 수영구", cat2: "A0205", cat3: "A02050200", summary: "광안리 앞 현수교." },
  { title: "인천대교", x: "126.5250", y: "37.4130", address: "인천광역시", cat2: "A0205", cat3: "A02050200", summary: "영종도 연결 대교." },
  { title: "돌산대교", x: "127.7360", y: "34.7300", address: "전라남도 여수시", cat2: "A0205", cat3: "A02050200", summary: "여수 돌산도 다리." },
  { title: "동대문디자인플라자", x: "127.0090", y: "37.5670", address: "서울특별시 중구", cat2: "A0205", cat3: "A02050700", summary: "동대문 곡선 건축." },
  { title: "서울로7017", x: "126.9710", y: "37.5560", address: "서울특별시 중구", cat2: "A0205", cat3: "A02050700", summary: "서울역 고가 산책로." },
  { title: "부산타워", x: "129.0320", y: "35.1010", address: "부산광역시 중구", cat2: "A0205", cat3: "A02050300", summary: "용두산공원 전망탑." },
  { title: "세빛섬", x: "126.9960", y: "37.5120", address: "서울특별시 서초구", cat2: "A0205", cat3: "A02050700", summary: "반포 한강 인공 섬." },
];

function ua() {
  return "kakaoMap/1.0 (https://github.com/snuu09/kakaoMap; attractions snapshot)";
}

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function inKorea(lat, lng) {
  return lat >= 32 && lat <= 39.6 && lng >= 124 && lng <= 132.5;
}

function cleanTitle(title) {
  title = String(title || "").trim();
  if (title.length < 2 || /^[0-9]+$/.test(title) || /^[\p{P}\p{S}\s]+$/u.test(title)) {
    return "";
  }
  return title;
}

function isCoreHistoryTitle(title) {
  return (
    isUnescoTitle(title) ||
    /궁|왕릉|고인돌|서원|사지|판전|첨성대|화성|숭례문|흥인지문|종묘|불국|석굴|해인사|부석사|통도사|한라산|갯벌|양동|하회|대릉원|남한산성|공산성|미륵|고분군|선정릉|동구릉/.test(
      String(title || "")
    )
  );
}

function truthyHeritage(value) {
  var s = String(value || "").trim().toLowerCase();
  return s === "y" || s === "1" || s === "있음" || s.indexOf("유산") !== -1;
}

function summarize(text, max) {
  max = max || 80;
  text = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) {
    return "";
  }
  if (text.length <= max) {
    return text;
  }
  return text.slice(0, max - 1) + "…";
}

function topicFor(cat2, cat3) {
  var c3 = String(cat3 || "");
  var c2 = String(cat2 || "");
  if (SEA_CAT3[c3]) {
    return "sea";
  }
  if (WATER_CAT3[c3]) {
    return "water";
  }
  if (MOUNTAIN_CAT3[c3]) {
    return "mountain";
  }
  if (c2 === "A0202") {
    return "leisure";
  }
  if (c2 === "A0203") {
    return "experience";
  }
  if (c2 === "A0204") {
    return "industry";
  }
  if (c2 === "A0205") {
    return "architecture";
  }
  if (c2 === "A0101" || c2 === "A0102") {
    return "mountain";
  }
  return "";
}

function imageUrl(value) {
  var raw = String(value || "").trim();
  if (!raw || raw === "undefined") {
    return "";
  }
  raw = raw.replace(/^http:\/\//, "https://");
  if (raw.indexOf("commons.wikimedia.org") !== -1 && raw.indexOf("FilePath") !== -1) {
    return raw;
  }
  if (raw.indexOf("wikimedia.org") !== -1 && raw.indexOf("/wiki/") !== -1) {
    var name = decodeURIComponent(raw.split("/").pop().replace(/ /g, "_"));
    return (
      "https://commons.wikimedia.org/wiki/Special:FilePath/" +
      encodeURIComponent(name)
    );
  }
  return raw;
}

function makePlace(opts) {
  var lat = parseFloat(opts.y);
  var lng = parseFloat(opts.x);
  var title = cleanTitle(opts.title);
  if (!title || !/[가-힣]/.test(title)) {
    return null;
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  if (!inKorea(lat, lng)) {
    return null;
  }
  var badges = (opts.badges || []).slice();
  if (isUnescoTitle(title) && badges.indexOf("unesco") === -1) {
    badges.unshift("unesco");
  }
  var cat2 = opts.cat2 || "";
  var cat3 = opts.cat3 || "";
  return {
    id: String(opts.id || title + "," + lng + "," + lat),
    title: title,
    x: String(lng),
    y: String(lat),
    address: String(opts.address || "").trim(),
    kind: opts.kind || "tourism",
    cat2: cat2,
    cat3: cat3,
    topic: opts.topic || topicFor(cat2, cat3),
    image: imageUrl(opts.image),
    badges: badges,
    summary: opts.summary || "",
    overview: opts.overview || "",
    tel: opts.tel || "",
    useTime: opts.useTime || "",
    restDate: opts.restDate || "",
    homepage: opts.homepage || "",
  };
}

function seedHistoryPlaces() {
  return HISTORY_SEED.map(function (row, index) {
    return makePlace({
      id: "seed/" + (index + 1),
      title: row.title,
      x: row.x,
      y: row.y,
      address: row.address,
      kind: "history",
      cat2: HISTORY_CAT2,
      cat3: "A02010100",
      badges: row.badges,
      summary: row.summary,
      overview: row.overview,
      image: row.image,
    });
  }).filter(Boolean);
}

function seedTourismPlaces() {
  return TOURISM_SEED.map(function (row, index) {
    return makePlace({
      id: "tourism-seed/" + (index + 1),
      title: row.title,
      x: row.x,
      y: row.y,
      address: row.address,
      kind: "tourism",
      cat2: row.cat2 || "A0203",
      cat3: row.cat3 || "",
      badges: [],
      summary: row.summary,
      overview: row.overview || row.summary || "",
      image: row.image,
    });
  }).filter(Boolean);
}

function nearKey(place) {
  return (
    place.title.replace(/\s+/g, "") +
    ":" +
    parseFloat(place.y).toFixed(3) +
    ":" +
    parseFloat(place.x).toFixed(3)
  );
}

function fillMissingMeta(target, extra) {
  var byName = {};
  target.forEach(function (place) {
    byName[place.title.replace(/\s+/g, "")] = place;
  });
  extra.forEach(function (place) {
    var existing = byName[place.title.replace(/\s+/g, "")];
    if (!existing) {
      return;
    }
    if (!existing.image && place.image) {
      existing.image = place.image;
    }
    if (!existing.cat3 && place.cat3) {
      existing.cat3 = place.cat3;
      existing.topic = existing.topic || topicFor(existing.cat2, existing.cat3);
    }
    if (!existing.summary && place.summary) {
      existing.summary = place.summary;
    }
  });
}

function mergeByNear(target, extra) {
  var seen = {};
  target.forEach(function (place) {
    seen[nearKey(place)] = true;
    seen[place.title.replace(/\s+/g, "")] = true;
  });
  extra.forEach(function (place) {
    var name = place.title.replace(/\s+/g, "");
    if (seen[nearKey(place)] || seen[name]) {
      return;
    }
    seen[nearKey(place)] = true;
    seen[name] = true;
    target.push(place);
  });
  return target;
}

async function fetchJson(url, extraHeaders) {
  var headers = Object.assign(
    {
      Accept: "application/json",
      "User-Agent": ua(),
    },
    extraHeaders || {}
  );
  var res = await fetch(url, { headers: headers });
  if (!res.ok) {
    throw new Error("HTTP " + res.status + " " + url);
  }
  return res.json();
}

async function fetchTourApiList(key, areaCode, pageNo, cat2) {
  var params = new URLSearchParams({
    serviceKey: key,
    MobileOS: "ETC",
    MobileApp: "kakaoMap",
    _type: "json",
    contentTypeId: "12",
    areaCode: String(areaCode),
    numOfRows: String(PAGE_SIZE),
    pageNo: String(pageNo),
    arrange: "A",
  });
  if (cat2) {
    params.set("cat1", "A02");
    params.set("cat2", cat2);
  }
  var url =
    "https://apis.data.go.kr/B551011/KorService2/areaBasedList2?" +
    params.toString();
  var json = await fetchJson(url);
  var body = json && json.response && json.response.body;
  if (!body) {
    var header = json && json.response && json.response.header;
    throw new Error(
      "TourAPI list area " +
        areaCode +
        " page " +
        pageNo +
        ": " +
        JSON.stringify(header || json)
    );
  }
  var items = body.items && body.items.item;
  if (!items) {
    return { total: Number(body.totalCount) || 0, rows: [] };
  }
  if (!Array.isArray(items)) {
    items = [items];
  }
  return { total: Number(body.totalCount) || items.length, rows: items };
}

async function fetchTourDetail(key, path, contentId, contentTypeId) {
  var params = new URLSearchParams({
    serviceKey: key,
    MobileOS: "ETC",
    MobileApp: "kakaoMap",
    _type: "json",
    contentId: String(contentId),
  });
  if (contentTypeId) {
    params.set("contentTypeId", String(contentTypeId));
  }
  var url =
    "https://apis.data.go.kr/B551011/KorService2/" +
    path +
    "?" +
    params.toString();
  var json = await fetchJson(url);
  var body = json && json.response && json.response.body;
  var item = body && body.items && body.items.item;
  if (!item) {
    return {};
  }
  return Array.isArray(item) ? item[0] : item;
}

function rowToPlace(row, kind) {
  var cat2 = String(row.cat2 || "");
  var cat3 = String(row.cat3 || "");
  var badges = [];
  if (kind === "history") {
    badges.push("historic");
    if (isUnescoTitle(row.title || "")) {
      badges.unshift("unesco");
    }
  }
  return makePlace({
    id: row.contentid,
    title: row.title,
    x: row.mapx,
    y: row.mapy,
    address: row.addr1,
    kind: kind,
    cat2: cat2,
    cat3: cat3,
    image: row.firstimage || row.firstimage2 || "",
    badges: badges,
    tel: row.tel || "",
  });
}

function classifyTourRow(row) {
  var cat2 = String(row.cat2 || "");
  var title = String(row.title || "");
  if (cat2 === HISTORY_CAT2 || isUnescoTitle(title)) {
    return "history";
  }
  return "tourism";
}

async function listAllType12(key) {
  var byId = {};
  for (var i = 0; i < AREA_CODES.length; i++) {
    var area = AREA_CODES[i];
    var page = 1;
    var total = Infinity;
    while ((page - 1) * PAGE_SIZE < total) {
      var result = await fetchTourApiList(key, area, page, "");
      total = result.total || 0;
      result.rows.forEach(function (row) {
        if (row && row.contentid) {
          byId[String(row.contentid)] = row;
        }
      });
      if (!result.rows.length) {
        break;
      }
      page += 1;
      await sleep(120);
    }
  }
  return Object.keys(byId).map(function (id) {
    return byId[id];
  });
}

async function enrichHistory(key, places) {
  var unesco = places.filter(function (place) {
    return place.badges.indexOf("unesco") !== -1;
  });
  var rest = places.filter(function (place) {
    return place.badges.indexOf("unesco") === -1;
  });
  var toFetch = unesco.concat(rest).slice(0, 80);
  for (var i = 0; i < toFetch.length; i++) {
    var place = toFetch[i];
    try {
      var common = await fetchTourDetail(key, "detailCommon2", place.id, "12");
      await sleep(80);
      var intro = await fetchTourDetail(key, "detailIntro2", place.id, "12");
      if (common.firstimage || common.firstimage2) {
        place.image = place.image || imageUrl(common.firstimage || common.firstimage2);
      }
      if (common.overview) {
        place.overview = String(common.overview).replace(/\s+/g, " ").trim();
        place.summary = summarize(place.overview, 80);
      }
      if (common.homepage) {
        place.homepage = String(common.homepage)
          .replace(/<[^>]+>/g, "")
          .trim();
      }
      if (common.tel) {
        place.tel = String(common.tel);
      }
      if (intro.infocenter) {
        place.tel = place.tel || String(intro.infocenter);
      }
      if (intro.usetime) {
        place.useTime = String(intro.usetime).replace(/<[^>]+>/g, "").trim();
      }
      if (intro.restdate) {
        place.restDate = String(intro.restdate);
      }
      if (
        truthyHeritage(intro.heritage1) ||
        truthyHeritage(intro.heritage2) ||
        truthyHeritage(intro.heritage3)
      ) {
        if (place.badges.indexOf("heritage") === -1) {
          place.badges.push("heritage");
        }
        if (place.kind !== "history") {
          place.kind = "history";
          place.cat2 = HISTORY_CAT2;
        }
      }
    } catch (err) {
      console.error("detail skip " + place.id, err.message || err);
    }
    await sleep(80);
  }
  return places;
}

async function fromTourApi(key) {
  var rows = await listAllType12(key);
  var places = [];
  rows.forEach(function (row) {
    var kind = classifyTourRow(row);
    var place = rowToPlace(row, kind);
    if (place) {
      places.push(place);
    }
  });
  var history = places.filter(function (place) {
    return place.kind === "history";
  });
  var tourism = places.filter(function (place) {
    return place.kind === "tourism";
  });
  history = mergeByNear(seedHistoryPlaces(), history);
  fillMissingMeta(
    history,
    places.filter(function (place) {
      return place.kind === "history";
    })
  );
  history = await enrichHistory(key, history);
  tourism = mergeByNear(seedTourismPlaces(), tourism);
  fillMissingMeta(
    tourism,
    places.filter(function (place) {
      return place.kind === "tourism";
    })
  );
  var historyIds = {};
  history.forEach(function (place) {
    historyIds[place.id] = true;
    historyIds[place.title.replace(/\s+/g, "")] = true;
  });
  tourism = tourism.filter(function (place) {
    return (
      !historyIds[place.id] && !historyIds[place.title.replace(/\s+/g, "")]
    );
  });
  try {
    await attachWikidataImages(history.concat(tourism));
  } catch (err) {
    console.error(err);
  }
  try {
    await attachWikipediaImages(history.concat(tourism));
  } catch (err) {
    console.error(err);
  }
  return history.concat(tourism).sort(function (a, b) {
    if (a.kind !== b.kind) {
      return a.kind === "history" ? -1 : 1;
    }
    return a.title.localeCompare(b.title, "ko");
  });
}

function osmCat2(tags) {
  var historic = tags.historic;
  if (
    historic === "palace" ||
    historic === "castle" ||
    historic === "temple" ||
    historic === "city_gate"
  ) {
    return HISTORY_CAT2;
  }
  var tourism = tags.tourism;
  if (
    tourism === "theme_park" ||
    tourism === "zoo" ||
    tourism === "aquarium"
  ) {
    return "A0202";
  }
  if (tourism === "viewpoint") {
    return "A0101";
  }
  if (tourism === "museum" || tourism === "gallery") {
    return "A0205";
  }
  return "A0203";
}

function osmCat3(tags, cat2) {
  if (tags.natural === "beach") {
    return "A01011100";
  }
  if (tags.place === "island" || tags.natural === "coastline") {
    return "A01011200";
  }
  if (tags.natural === "peak" || tags.natural === "volcano") {
    return "A01010400";
  }
  if (tags.leisure === "nature_reserve" || tags.boundary === "national_park") {
    return "A01010100";
  }
  if (tags.water === "lake" || tags.natural === "water") {
    return "A01011700";
  }
  if (tags.waterway === "river") {
    return "A01011800";
  }
  if (tags.tourism === "theme_park" || tags.tourism === "zoo" || tags.tourism === "aquarium") {
    return "A02020600";
  }
  if (cat2 === "A0205") {
    return "A02050700";
  }
  if (cat2 === "A0202") {
    return "A02020600";
  }
  if (cat2 === "A0203") {
    return "A02030600";
  }
  if (cat2 === HISTORY_CAT2) {
    return "A02010100";
  }
  return "";
}

function osmKind(tags) {
  var title = tags["name:ko"] || tags.name || "";
  if (isUnescoTitle(title)) {
    return "history";
  }
  var historic = tags.historic;
  if (
    historic === "palace" ||
    historic === "castle" ||
    historic === "city_gate" ||
    historic === "temple"
  ) {
    return "history";
  }
  return "tourism";
}

function osmBadges(tags, kind) {
  var badges = [];
  if (kind === "history") {
    badges.push("historic");
    if (
      tags.heritage ||
      tags["heritage:operator"] ||
      tags.historic === "palace" ||
      tags.historic === "castle" ||
      tags.historic === "archaeological_site"
    ) {
      badges.push("heritage");
    }
  }
  return badges;
}

async function fromOverpass() {
  var query =
    '[out:json][timeout:120];' +
    'area["ISO3166-1"="KR"][admin_level=2]->.kr;' +
    "(" +
    '  nwr["historic"="palace"](area.kr);' +
    '  nwr["historic"="castle"](area.kr);' +
    '  nwr["historic"="temple"](area.kr);' +
    '  nwr["historic"="city_gate"](area.kr);' +
    '  nwr["tourism"="attraction"](area.kr);' +
    '  nwr["tourism"="viewpoint"](area.kr);' +
    '  nwr["tourism"="museum"](area.kr);' +
    '  nwr["tourism"="theme_park"](area.kr);' +
    '  nwr["tourism"="zoo"](area.kr);' +
    '  nwr["tourism"="aquarium"](area.kr);' +
    '  nwr["tourism"="gallery"](area.kr);' +
    ");" +
    "out center tags;";
  var res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "User-Agent": ua(),
    },
    body: "data=" + encodeURIComponent(query),
  });
  if (!res.ok) {
    throw new Error("HTTP " + res.status + " Overpass");
  }
  var json = await res.json();
  var places = [];
  (json.elements || []).forEach(function (el) {
    var tags = el.tags || {};
    var title = tags["name:ko"] || tags.name || tags["name:en"];
    if (!/[가-힣]/.test(String(title || ""))) {
      return;
    }
    if (
      /잔해|진입로|주차장|놀이터|아파트|CC$|골프장|스탬프|볼링|패총|지석묘/.test(
        String(title)
      )
    ) {
      return;
    }
    var lat = el.lat;
    var lng = el.lon;
    if (el.center) {
      lat = el.center.lat;
      lng = el.center.lon;
    }
    var kind = osmKind(tags);
    var cat2 = osmCat2(tags);
    var cat3 = osmCat3(tags, cat2);
    var place = makePlace({
      id: el.type + "/" + el.id,
      title: title,
      x: lng,
      y: lat,
      address: [tags["addr:full"], tags["addr:city"], tags["addr:district"]]
        .filter(Boolean)
        .join(" "),
      kind: kind,
      cat2: cat2,
      cat3: cat3,
      badges: osmBadges(tags, kind),
      summary:
        kind === "history"
          ? (CAT2_LABEL[cat2] || "역사") + " 유적"
          : CAT3_LABEL[cat3] || CAT2_LABEL[cat2] || "관광지",
    });
    if (place) {
      places.push(place);
    }
  });
  return places;
}

async function fromWikidataHistory() {
  var query =
    "SELECT DISTINCT ?item ?itemLabel ?lon ?lat ?desc ?image WHERE {\n" +
    "  ?item wdt:P17 wd:Q884 .\n" +
    "  ?item wdt:P625 ?coord .\n" +
    "  { ?item wdt:P1435 wd:Q9259 . }\n" +
    "  BIND(geof:longitude(?coord) AS ?lon)\n" +
    "  BIND(geof:latitude(?coord) AS ?lat)\n" +
    "  OPTIONAL { ?item wdt:P18 ?image . }\n" +
    '  SERVICE wikibase:label { bd:serviceParam wikibase:language "ko,en". }\n' +
    "  OPTIONAL {\n" +
    '    ?item schema:description ?desc . FILTER(LANG(?desc) = "ko")\n' +
    "  }\n" +
    "}\n";
  var res = await fetch("https://query.wikidata.org/sparql", {
    method: "POST",
    headers: {
      Accept: "application/sparql-results+json",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "User-Agent": ua(),
    },
    body: new URLSearchParams({ format: "json", query: query }).toString(),
  });
  if (!res.ok) {
    throw new Error("HTTP " + res.status + " Wikidata SPARQL");
  }
  var json = await res.json();
  var bindings = (json.results && json.results.bindings) || [];
  return bindings
    .map(function (row) {
      var id = row.item && row.item.value && row.item.value.split("/").pop();
      var title = row.itemLabel && row.itemLabel.value;
      var desc = (row.desc && row.desc.value) || "";
      return makePlace({
        id: id,
        title: title,
        x: row.lon && row.lon.value,
        y: row.lat && row.lat.value,
        kind: "history",
        cat2: HISTORY_CAT2,
        badges: isUnescoTitle(title || "")
          ? ["unesco", "heritage", "historic"]
          : ["heritage", "historic"],
        summary: summarize(desc, 80) || "한국의 역사 유적",
        overview: desc,
        image: row.image && row.image.value,
      });
    })
    .filter(Boolean);
}

async function attachWikidataImages(places) {
  var missing = places.filter(function (place) {
    return !place.image;
  }).slice(0, 150);
  var size = 30;
  for (var i = 0; i < missing.length; i += size) {
    var batch = missing.slice(i, i + size);
    var values = batch
      .map(function (place) {
        return '"' + place.title.replace(/"/g, "") + '"@ko';
      })
      .join(" ");
    var query =
      "SELECT ?label ?image WHERE {\n" +
      "  VALUES ?label { " +
      values +
      " }\n" +
      "  ?item rdfs:label ?label .\n" +
      "  ?item wdt:P17 wd:Q884 .\n" +
      "  ?item wdt:P18 ?image .\n" +
      "}\n";
    try {
      var res = await fetch("https://query.wikidata.org/sparql", {
        method: "POST",
        headers: {
          Accept: "application/sparql-results+json",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "User-Agent": ua(),
        },
        body: new URLSearchParams({ format: "json", query: query }).toString(),
      });
      if (!res.ok) {
        throw new Error("HTTP " + res.status + " Wikidata images");
      }
      var json = await res.json();
      var byLabel = {};
      ((json.results && json.results.bindings) || []).forEach(function (row) {
        var label = row.label && row.label.value;
        var image = row.image && row.image.value;
        if (label && image && !byLabel[label]) {
          byLabel[label] = imageUrl(image);
        }
      });
      batch.forEach(function (place) {
        if (!place.image && byLabel[place.title]) {
          place.image = byLabel[place.title];
        }
      });
    } catch (err) {
      console.error(err);
    }
    await sleep(200);
  }
  return places;
}

async function attachWikipediaImages(places) {
  var targets = places.filter(function (place) {
    return (
      !place.image &&
      /^(seed\/|tourism-seed\/|Q)/.test(String(place.id))
    );
  });
  for (var i = 0; i < targets.length; i++) {
    var place = targets[i];
    try {
      var url =
        "https://ko.wikipedia.org/api/rest_v1/page/summary/" +
        encodeURIComponent(place.title);
      var json = await fetchJson(url);
      var src =
        (json.originalimage && json.originalimage.source) ||
        (json.thumbnail && json.thumbnail.source) ||
        "";
      if (src) {
        place.image = imageUrl(src);
      }
    } catch (err) {
      /* summary missing is fine */
    }
    await sleep(60);
  }
  return places;
}

async function fromFallback() {
  var history = seedHistoryPlaces();
  var tourism = seedTourismPlaces();
  try {
    var osm = await fromOverpass();
    var osmHistory = osm.filter(function (place) {
      return place.kind === "history";
    });
    var osmTourism = osm.filter(function (place) {
      return place.kind === "tourism";
    });
    history = mergeByNear(history, osmHistory);
    tourism = mergeByNear(tourism, osmTourism);
  } catch (err) {
    console.error(err);
  }
  try {
    history = mergeByNear(history, await fromWikidataHistory());
  } catch (err) {
    console.error(err);
  }
  history = mergeByNear(seedHistoryPlaces(), history);
  tourism = mergeByNear(seedTourismPlaces(), tourism);
  var historyNames = {};
  history.forEach(function (place) {
    historyNames[place.title.replace(/\s+/g, "")] = true;
  });
  tourism = tourism.filter(function (place) {
    return !historyNames[place.title.replace(/\s+/g, "")];
  });
  history = history.filter(function (place) {
    var id = String(place.id || "");
    return (
      id.indexOf("seed/") === 0 ||
      id.charAt(0) === "Q" ||
      isCoreHistoryTitle(place.title)
    );
  });
  try {
    await attachWikidataImages(history.concat(tourism));
  } catch (err) {
    console.error(err);
  }
  try {
    await attachWikipediaImages(history.concat(tourism));
  } catch (err) {
    console.error(err);
  }
  return history.concat(tourism).sort(function (a, b) {
    if (a.kind !== b.kind) {
      return a.kind === "history" ? -1 : 1;
    }
    return a.title.localeCompare(b.title, "ko");
  });
}

async function main() {
  var key = (process.env.TOUR_API_KEY || "").trim();
  var source = "tourapi";
  var places;
  if (key) {
    places = await fromTourApi(key);
  } else {
    source = "seed+overpass";
    places = await fromFallback();
  }

  var historyCount = places.filter(function (place) {
    return place.kind === "history";
  }).length;
  var payload = {
    source: source,
    contentTypeId: 12,
    updated: new Date().toISOString().slice(0, 10),
    count: places.length,
    historyCount: historyCount,
    tourismCount: places.length - historyCount,
    places: places,
  };

  await mkdir(join(ROOT, "data"), { recursive: true });
  await writeFile(OUT, JSON.stringify(payload), "utf8");
  console.log(
    "Wrote " +
      places.length +
      " places (" +
      historyCount +
      " history, " +
      (places.length - historyCount) +
      " tourism) from " +
      source +
      " to " +
      OUT
  );
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
