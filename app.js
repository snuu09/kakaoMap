(function () {
  var DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };
  var SEARCH_RADIUS = 3000;
  var BRAND_ICONS = {
    스타벅스: { src: "icons/starbucks.svg", wide: false },
    메가커피: { src: "icons/mega-coffee.png", wide: true },
    GS25: { src: "icons/gs25.svg", wide: true },
    CU: { src: "icons/cu.svg", wide: true },
  };

  var script = document.createElement("script");
  script.src =
    "https://dapi.kakao.com/v2/maps/sdk.js?appkey=" +
    KAKAO_JS_KEY +
    "&autoload=false&libraries=services";
  script.onload = function () {
    kakao.maps.load(init);
  };
  document.head.appendChild(script);

  function init() {
    var defaultCenter = new kakao.maps.LatLng(
      DEFAULT_CENTER.lat,
      DEFAULT_CENTER.lng
    );
    var map = new kakao.maps.Map(document.getElementById("map"), {
      center: defaultCenter,
      level: 3,
    });
    var places = new kakao.maps.services.Places(map);
    var infowindow = new kakao.maps.InfoWindow({ zIndex: 1 });
    var searchMarkers = [];
    var placeItems = [];
    var currentPosition = null;
    var currentLocationOverlay = null;
    var activeSearchKeyword = "";
    var openPin = null;
    var activeOverlays = {};

    var form = document.getElementById("search-form");
    var input = document.getElementById("search-input");
    var locationBtn = document.getElementById("location-btn");
    var chips = document.querySelectorAll(".chip");
    var dialog = document.getElementById("dialog");
    var dialogTitle = document.getElementById("dialog-title");
    var dialogMessage = document.getElementById("dialog-message");
    var dialogClose = document.getElementById("dialog-close");
    var sheet = document.getElementById("place-sheet");
    var sheetGrab = document.getElementById("sheet-grab");
    var sheetToggle = document.getElementById("sheet-toggle");
    var sheetTitle = document.getElementById("sheet-title");
    var sheetCount = document.getElementById("sheet-count");
    var placeList = document.getElementById("place-list");
    var SHEET_STATES = ["collapsed", "mid", "expanded"];
    var sheetState = "mid";

    dialogClose.addEventListener("click", hideDialog);
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) {
        hideDialog();
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !dialog.hidden) {
        hideDialog();
      }
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var keyword = input.value.trim();
      if (!keyword) {
        return;
      }
      setActiveChip(null);
      searchPlaces(keyword, false);
    });

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        var filter = chip.getAttribute("data-filter");
        setActiveChip(chip);

        if (filter === "default") {
          resetToDefault();
          return;
        }

        input.value = filter;
        searchPlaces(filter, true);
      });
    });

    locationBtn.addEventListener("click", moveToCurrentLocation);
    bindSheetGestures();
    bindMapTools();

    function searchPlaces(keyword, nearby) {
      activeSearchKeyword = keyword;

      if (nearby) {
        places.keywordSearch(keyword, handleSearchResult, {
          useMapCenter: true,
          radius: SEARCH_RADIUS,
        });
        return;
      }

      places.keywordSearch(keyword, handleSearchResult);
    }

    function handleSearchResult(data, status) {
      infowindow.close();
      clearSearchMarkers();
      hideSheet();

      if (status === kakao.maps.services.Status.ZERO_RESULT) {
        showDialog("검색 결과 없음", "검색 결과가 없습니다.");
        return;
      }

      if (status !== kakao.maps.services.Status.OK) {
        showDialog("검색 오류", "검색 중 오류가 발생했습니다.");
        return;
      }

      var brand = BRAND_ICONS[activeSearchKeyword];
      var bounds = new kakao.maps.LatLngBounds();

      data.forEach(function (place, index) {
        var position = new kakao.maps.LatLng(place.y, place.x);
        var item = createPlaceMarker(place, position, brand, index);
        searchMarkers.push(item.overlay);
        placeItems.push(item);
        bounds.extend(position);
      });

      map.setBounds(bounds, 120, 110, 280, 24);
      renderPlaceList(data);
      showSheet();
    }

    function createPlaceMarker(place, position, brand, index) {
      var number = index + 1;
      var headHtml = brand
        ? '<img src="' + brand.src + '" alt="">'
        : '<img src="icons/default.svg" alt="">';
      var content = document.createElement("div");
      content.className = "map-pin" + (brand && brand.wide ? " is-wide" : "");
      content.innerHTML =
        '<div class="map-pin-label">' +
        escapeHtml(place.place_name) +
        "</div>" +
        '<div class="map-pin-body">' +
        '<span class="map-pin-badge">' +
        number +
        "</span>" +
        '<div class="map-pin-head">' +
        headHtml +
        "</div>" +
        "</div>" +
        '<div class="map-pin-tail"></div>';
      content.addEventListener("click", function () {
        selectPlace(index, false);
      });

      var overlay = new kakao.maps.CustomOverlay({
        map: map,
        position: position,
        content: content,
        yAnchor: 1,
        zIndex: 3,
      });

      return {
        overlay: overlay,
        pinEl: content,
        place: place,
        position: position,
      };
    }

    function renderPlaceList(data) {
      sheetTitle.textContent = activeSearchKeyword + " 검색 결과";
      sheetCount.textContent = data.length + "곳";
      placeList.innerHTML = "";

      data.forEach(function (place, index) {
        var item = document.createElement("li");
        var button = document.createElement("button");
        var address = place.road_address_name || place.address_name || "";
        var category = (place.category_name || "").split(">").pop().trim();
        var meta = [category, address].filter(Boolean).join(" · ");
        var lat = parseFloat(place.y);
        var lng = parseFloat(place.x);

        button.type = "button";
        button.className = "place-item";
        button.innerHTML =
          '<span class="place-thumb">' +
          '<img alt="" referrerpolicy="no-referrer" src="' +
          mapThumbUrl(lat, lng) +
          '">' +
          '<span class="place-thumb-num">' +
          (index + 1) +
          "</span>" +
          "</span>" +
          '<span class="place-body">' +
          '<span class="place-name">' +
          escapeHtml(place.place_name) +
          "</span>" +
          (meta
            ? '<span class="place-meta">' + escapeHtml(meta) + "</span>"
            : "") +
          "</span>";

        var thumb = button.querySelector(".place-thumb img");
        thumb.addEventListener("error", function () {
          thumb.style.display = "none";
        });

        button.addEventListener("click", function () {
          selectPlace(index, true);
        });

        item.appendChild(button);
        placeList.appendChild(item);
      });
    }

    function mapThumbUrl(lat, lng) {
      var zoom = 16;
      var latRad = (lat * Math.PI) / 180;
      var n = Math.pow(2, zoom);
      var x = Math.floor(((lng + 180) / 360) * n);
      var y = Math.floor(
        ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) /
          2) *
          n
      );
      return (
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/" +
        zoom +
        "/" +
        x +
        "/" +
        y +
        "@2x.png"
      );
    }

    function selectPlace(index, fromList) {
      infowindow.close();

      placeItems.forEach(function (item, i) {
        var selected = i === index;
        item.pinEl.classList.toggle("is-open", selected);
        item.pinEl.classList.toggle("is-selected", selected);
        item.overlay.setZIndex(selected ? 100 : 3);
      });

      Array.prototype.forEach.call(
        placeList.querySelectorAll(".place-item"),
        function (button, i) {
          button.classList.toggle("is-active", i === index);
        }
      );

      openPin = placeItems[index].pinEl;

      if (fromList) {
        map.panTo(placeItems[index].position);
      }

      if (sheetState === "collapsed") {
        setSheetState("mid");
      }

      var activeItem = placeList.querySelector(".place-item.is-active");
      if (activeItem) {
        activeItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }

    function showSheet() {
      sheet.hidden = false;
      setSheetState("mid");
    }

    function hideSheet() {
      sheet.hidden = true;
      sheet.style.height = "";
      setSheetState("mid");
      placeList.innerHTML = "";
    }

    function setSheetState(state) {
      sheetState = state;
      sheet.classList.remove("is-collapsed", "is-mid", "is-expanded");
      sheet.classList.add("is-" + state);
      sheet.style.height = "";
      sheetToggle.setAttribute("aria-label", sheetStateLabel(state));
    }

    function sheetStateLabel(state) {
      if (state === "collapsed") {
        return "바텀시트 중간 크기로 펼치기";
      }
      if (state === "mid") {
        return "바텀시트 최대로 펼치기";
      }
      return "바텀시트 접기";
    }

    function sheetSnapHeights() {
      var collapsed = sheetGrab.getBoundingClientRect().height;
      var mid = Math.min(window.innerHeight * 0.42, 420);
      var expanded = window.innerHeight - 88;
      return {
        collapsed: collapsed,
        mid: mid,
        expanded: expanded,
      };
    }

    function nearestSheetState(height) {
      var snaps = sheetSnapHeights();
      var states = SHEET_STATES;
      var closest = states[0];
      var minDiff = Infinity;

      states.forEach(function (state) {
        var diff = Math.abs(height - snaps[state]);
        if (diff < minDiff) {
          minDiff = diff;
          closest = state;
        }
      });

      return closest;
    }

    function bindSheetGestures() {
      var drag = null;
      var skipClick = false;

      sheetToggle.addEventListener("click", function () {
        if (skipClick) {
          skipClick = false;
          return;
        }
        var current = SHEET_STATES.indexOf(sheetState);
        setSheetState(SHEET_STATES[(current + 1) % SHEET_STATES.length]);
      });

      sheetGrab.addEventListener("pointerdown", function (event) {
        if (event.button && event.button !== 0) {
          return;
        }

        var startHeight = sheet.getBoundingClientRect().height;
        drag = {
          pointerId: event.pointerId,
          startY: event.clientY,
          startHeight: startHeight,
          moved: false,
        };
        sheetGrab.setPointerCapture(event.pointerId);
        sheet.classList.add("is-dragging");
      });

      sheetGrab.addEventListener("pointermove", function (event) {
        if (!drag || event.pointerId !== drag.pointerId) {
          return;
        }

        var nextHeight = drag.startHeight + (drag.startY - event.clientY);
        var snaps = sheetSnapHeights();
        nextHeight = Math.max(
          snaps.collapsed,
          Math.min(snaps.expanded, nextHeight)
        );

        if (Math.abs(event.clientY - drag.startY) > 8) {
          drag.moved = true;
        }

        sheet.classList.remove("is-collapsed");
        sheet.style.height = nextHeight + "px";
      });

      function endDrag(event) {
        if (!drag || event.pointerId !== drag.pointerId) {
          return;
        }

        var moved = drag.moved;
        var height = sheet.getBoundingClientRect().height;
        sheet.classList.remove("is-dragging");
        if (moved) {
          skipClick = true;
          setSheetState(nearestSheetState(height));
        }
        drag = null;
      }

      sheetGrab.addEventListener("pointerup", endDrag);
      sheetGrab.addEventListener("pointercancel", endDrag);
    }

    function escapeHtml(text) {
      return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function clearSearchMarkers() {
      if (openPin) {
        openPin.classList.remove("is-open");
        openPin = null;
      }

      searchMarkers.forEach(function (marker) {
        marker.setMap(null);
      });
      searchMarkers = [];
      placeItems = [];
    }

    function resetToDefault() {
      infowindow.close();
      clearSearchMarkers();
      hideSheet();
      input.value = "";
      var target = currentPosition || defaultCenter;
      map.setCenter(target);
      map.setLevel(3);
    }

    function setActiveChip(activeChip) {
      chips.forEach(function (chip) {
        chip.classList.toggle("is-active", chip === activeChip);
      });
    }

    function moveToCurrentLocation() {
      if (!navigator.geolocation) {
        showDialog(
          "현재 위치 불가",
          "이 브라우저에서는 현재 위치를 사용할 수 없습니다."
        );
        return;
      }

      navigator.geolocation.getCurrentPosition(
        function (position) {
          currentPosition = new kakao.maps.LatLng(
            position.coords.latitude,
            position.coords.longitude
          );
          map.setCenter(currentPosition);
          map.setLevel(3);
          showCurrentLocation(currentPosition);
        },
        function (error) {
          var message = "현재 위치를 가져올 수 없습니다.";

          if (error && error.code === error.PERMISSION_DENIED) {
            message = "위치 권한이 거부되었습니다. 브라우저 설정에서 허용해 주세요.";
          } else if (error && error.code === error.POSITION_UNAVAILABLE) {
            message = "현재 위치 정보를 사용할 수 없습니다.";
          } else if (error && error.code === error.TIMEOUT) {
            message = "현재 위치를 가져오는 시간이 초과되었습니다.";
          }

          showDialog("현재 위치 오류", message);
        }
      );
    }

    function showDialog(title, message) {
      dialogTitle.textContent = title;
      dialogMessage.textContent = message;
      dialog.hidden = false;
      dialogClose.focus();
    }

    function hideDialog() {
      dialog.hidden = true;
    }

    function showCurrentLocation(position) {
      if (currentLocationOverlay) {
        currentLocationOverlay.setMap(null);
      }

      currentLocationOverlay = new kakao.maps.CustomOverlay({
        map: map,
        position: position,
        content: '<div class="current-location-dot"></div>',
      });
    }

    function bindMapTools() {
      document.getElementById("zoom-in").addEventListener("click", function () {
        map.setLevel(map.getLevel() - 1);
      });

      document.getElementById("zoom-out").addEventListener("click", function () {
        map.setLevel(map.getLevel() + 1);
      });

      document.querySelectorAll(".map-type").forEach(function (button) {
        button.addEventListener("click", function () {
          var type = button.getAttribute("data-type");
          map.setMapTypeId(kakao.maps.MapTypeId[type]);
          document.querySelectorAll(".map-type").forEach(function (item) {
            item.classList.toggle("is-active", item === button);
          });
        });
      });

      document.querySelectorAll(".map-overlay").forEach(function (button) {
        button.addEventListener("click", function () {
          var overlayName = button.getAttribute("data-overlay");
          var overlayId = kakao.maps.MapTypeId[overlayName];

          if (activeOverlays[overlayName]) {
            map.removeOverlayMapTypeId(overlayId);
            activeOverlays[overlayName] = false;
            button.classList.remove("is-active");
            return;
          }

          map.addOverlayMapTypeId(overlayId);
          activeOverlays[overlayName] = true;
          button.classList.add("is-active");
        });
      });
    }
  }
})();
