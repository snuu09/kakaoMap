# 카카오 지도

카카오 지도 JavaScript API로 전체 화면 지도를 띄우는 정적 페이지입니다.

## 1. JavaScript 키 넣기

[`config.example.js`](config.example.js)를 복사해 `config.js`를 만든 뒤, `KAKAO_JS_KEY` 값을 카카오 디벨로퍼스 앱의 **JavaScript 키**로 바꿉니다. `config.js`는 Git에 올리지 않습니다.

```bash
cp config.example.js config.js
```

```js
var KAKAO_JS_KEY = "YOUR_KAKAO_JS_KEY";
```

키는 [카카오 디벨로퍼스](https://developers.kakao.com) → 내 애플리케이션 → 앱 키에서 확인할 수 있습니다.

## 2. Web 도메인 등록

지도가 나오려면 앱에 Web 플랫폼 도메인이 등록되어 있어야 합니다.

1. 카카오 디벨로퍼스 → 내 애플리케이션 → 앱 설정 → 플랫폼
2. Web 플랫폼에 아래 도메인을 추가합니다.
   - `http://localhost:5500`
   - `http://127.0.0.1:5500`

포트를 바꾸면 등록 주소의 포트도 같이 맞춥니다. `index.html`을 `file://`로 열면 도메인 제한 때문에 지도가 나오지 않습니다.

## 3. 실행

프로젝트 폴더에서:

```bash
python3 -m http.server 5500
```

브라우저에서 [http://localhost:5500](http://localhost:5500) 을 엽니다.

처음에는 서울시청 근처(`37.5665`, `126.9780`)가 중심에 표시되고, 같은 위치에 마커가 하나 있습니다.
