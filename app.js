(function () {
  var DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };
  var SEARCH_RADIUS = 3000;
  var CLUSTER_MIN_LEVEL = 6;
  var FADE_MS = 220;
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
    var geocoder = new kakao.maps.services.Geocoder();
    var infowindow = new kakao.maps.InfoWindow({ zIndex: 1 });
    var searchMarkers = [];
    var placeItems = [];
    var clusterItems = [];
    var searchSeq = 0;
    var currentPosition = null;
    var currentLocationOverlay = null;
    var activeSearchKeyword = "";
    var lastSearchNearby = false;
    var searchQuiet = false;
    var skipIdleOnce = false;
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
    var areaInfo = document.getElementById("area-info");
    var areaInfoText = document.getElementById("area-info-text");
    var SHEET_STATES = ["collapsed", "mid", "expanded"];
    var sheetState = "mid";

    dialogClose.addEventListener("click", hideDialog);
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) {
        hideDialog();
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") {
        return;
      }
      if (closeLayersPanel()) {
        return;
      }
      if (!dialog.hidden) {
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
    bindMapIdle();
    updateAreaInfo();

    function searchPlaces(keyword, nearby, quiet) {
      activeSearchKeyword = keyword;
      lastSearchNearby = nearby;
      searchQuiet = !!quiet;
      var seq = ++searchSeq;

      function onResult(data, status) {
        if (seq !== searchSeq) {
          return;
        }
        handleSearchResult(data, status);
      }

      if (nearby) {
        places.keywordSearch(keyword, onResult, nearbySearchOptions());
        return;
      }

      places.keywordSearch(keyword, onResult);
    }

    function nearbySearchOptions() {
      var level = map.getLevel();
      if (level >= 7) {
        return { useMapBounds: true };
      }

      return {
        useMapCenter: true,
        radius: Math.min(20000, 1000 * Math.pow(2, Math.max(0, level - 2))),
      };
    }

    function handleSearchResult(data, status) {
      infowindow.close();

      if (!searchQuiet) {
        hideSheet();
        clearSearchMarkers();
      }

      if (status === kakao.maps.services.Status.ZERO_RESULT) {
        if (searchQuiet) {
          fadeOutAllPlaces();
          renderPlaceList([]);
          showSheet();
          return;
        }
        showDialog("검색 결과 없음", "검색 결과가 없습니다.");
        return;
      }

      if (status !== kakao.maps.services.Status.OK) {
        if (!searchQuiet) {
          showDialog("검색 오류", "검색 중 오류가 발생했습니다.");
        }
        return;
      }

      var brand = BRAND_ICONS[activeSearchKeyword];
      var bounds = new kakao.maps.LatLngBounds();

      if (searchQuiet && lastSearchNearby && placeItems.length) {
        syncFilterPlaces(data, brand);
      } else {
        if (searchQuiet) {
          clearSearchMarkers();
        }
        data.forEach(function (place, index) {
          var position = new kakao.maps.LatLng(place.y, place.x);
          var item = createPlaceMarker(place, position, brand, index);
          searchMarkers.push(item.overlay);
          placeItems.push(item);
        });
      }

      data.forEach(function (place) {
        bounds.extend(new kakao.maps.LatLng(place.y, place.x));
      });

      if (lastSearchNearby) {
        applyFilterClustering(true);
      } else {
        placeItems.forEach(function (item) {
          setPinVisible(item, true, true);
        });
      }

      if (!searchQuiet) {
        skipIdleOnce = true;
        var padding = mapFitPadding(true);
        map.setBounds(
          bounds,
          padding.top,
          padding.right,
          padding.bottom,
          padding.left
        );
      }

      renderPlaceList(data);
      if (sheet.hidden || !searchQuiet) {
        showSheet();
      }
    }

    function placeKey(place) {
      return place.id || place.x + "," + place.y + "," + place.place_name;
    }

    function motionEnabled() {
      return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    function cancelHide(el) {
      if (el._hideTimer) {
        clearTimeout(el._hideTimer);
        el._hideTimer = null;
      }
      el.classList.remove("is-leave");
    }

    function showOverlay(overlay, el, animate) {
      cancelHide(el);
      if (animate) {
        el.classList.add("is-enter");
      } else {
        el.classList.remove("is-enter", "is-leave");
      }
      overlay.setMap(map);
      if (animate) {
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            el.classList.remove("is-enter");
          });
        });
      }
    }

    function hideOverlay(overlay, el, animate) {
      if (!animate) {
        cancelHide(el);
        overlay.setMap(null);
        el.classList.remove("is-enter", "is-leave");
        return;
      }

      cancelHide(el);
      el.classList.remove("is-enter");
      el.classList.add("is-leave");
      el._hideTimer = setTimeout(function () {
        el._hideTimer = null;
        overlay.setMap(null);
        el.classList.remove("is-leave");
      }, FADE_MS);
    }

    function setPinVisible(item, visible, animate) {
      animate = animate && motionEnabled();
      if (visible) {
        if (item.visible) {
          cancelHide(item.pinEl);
          return;
        }
        item.visible = true;
        showOverlay(item.overlay, item.pinEl, animate);
        return;
      }

      if (!item.visible) {
        return;
      }
      item.visible = false;
      hideOverlay(item.overlay, item.pinEl, animate);
    }

    function clusterSizeClass(count) {
      if (count >= 50) {
        return "is-lg";
      }
      if (count >= 10) {
        return "is-md";
      }
      return "is-sm";
    }

    function zoomIntoCluster(center) {
      skipIdleOnce = true;
      if (map.getLevel() <= CLUSTER_MIN_LEVEL) {
        map.setLevel(CLUSTER_MIN_LEVEL - 1, { anchor: center });
        return;
      }
      map.setLevel(Math.max(CLUSTER_MIN_LEVEL - 1, map.getLevel() - 2), {
        anchor: center,
      });
    }

    function createPlaceMarker(place, position, brand, index) {
      var item = {
        overlay: null,
        pinEl: null,
        place: place,
        position: position,
        index: index,
        visible: false,
      };
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
        (index + 1) +
        "</span>" +
        '<div class="map-pin-head">' +
        headHtml +
        "</div>" +
        "</div>" +
        '<div class="map-pin-tail"></div>';
      content.addEventListener("click", function () {
        selectPlace(item.index, false);
      });

      item.pinEl = content;
      item.overlay = new kakao.maps.CustomOverlay({
        position: position,
        content: content,
        yAnchor: 1,
        zIndex: 3,
      });

      return item;
    }

    function syncFilterPlaces(data, brand) {
      var nextByKey = {};
      data.forEach(function (place, index) {
        nextByKey[placeKey(place)] = { place: place, index: index };
      });

      var kept = {};
      placeItems.forEach(function (item) {
        var key = placeKey(item.place);
        if (nextByKey[key]) {
          kept[key] = item;
        } else {
          item.visible = false;
          hideOverlay(item.overlay, item.pinEl, motionEnabled());
        }
      });

      var nextItems = [];
      data.forEach(function (place, index) {
        var key = placeKey(place);
        var existing = kept[key];
        var position = new kakao.maps.LatLng(place.y, place.x);

        if (existing) {
          existing.place = place;
          existing.index = index;
          existing.position = position;
          existing.overlay.setPosition(position);
          var badge = existing.pinEl.querySelector(".map-pin-badge");
          if (badge) {
            badge.textContent = String(index + 1);
          }
          nextItems.push(existing);
          return;
        }

        nextItems.push(createPlaceMarker(place, position, brand, index));
      });

      placeItems = nextItems;
      searchMarkers = placeItems.map(function (item) {
        return item.overlay;
      });
    }

    function fadeOutAllPlaces() {
      var items = placeItems.slice();
      var clusters = clusterItems.slice();
      placeItems = [];
      searchMarkers = [];
      clusterItems = [];
      openPin = null;
      items.forEach(function (item) {
        hideOverlay(item.overlay, item.pinEl, motionEnabled());
      });
      clusters.forEach(function (cluster) {
        hideOverlay(cluster.overlay, cluster.el, motionEnabled());
      });
    }

    function fadeOutClusters(animate) {
      clusterItems.forEach(function (cluster) {
        hideOverlay(cluster.overlay, cluster.el, animate);
      });
      clusterItems = [];
    }

    function createClusterItem(key, next, animate) {
      var el = document.createElement("button");
      var cluster = {
        key: key,
        overlay: null,
        el: el,
        center: next.center,
        count: next.count,
      };

      el.type = "button";
      el.className = "map-cluster " + clusterSizeClass(next.count);
      el.textContent = String(next.count);
      el.setAttribute("aria-label", next.count + "개 장소 묶음, 확대");
      el.addEventListener("click", function (event) {
        event.stopPropagation();
        zoomIntoCluster(cluster.center);
      });

      cluster.overlay = new kakao.maps.CustomOverlay({
        position: next.center,
        content: el,
        xAnchor: 0.5,
        yAnchor: 0.5,
        zIndex: 40,
      });

      showOverlay(cluster.overlay, el, animate);
      return cluster;
    }

    function applyFilterClustering(animate) {
      animate = animate !== false && motionEnabled();

      if (!lastSearchNearby || !placeItems.length) {
        fadeOutClusters(animate);
        placeItems.forEach(function (item) {
          setPinVisible(item, true, animate);
        });
        return;
      }

      if (map.getLevel() < CLUSTER_MIN_LEVEL) {
        fadeOutClusters(animate);
        placeItems.forEach(function (item) {
          setPinVisible(item, true, animate);
        });
        return;
      }

      var projection = map.getProjection();
      var gridSize = 80;
      var buckets = {};

      placeItems.forEach(function (item) {
        var point = projection.pointFromCoords(item.position);
        var key =
          Math.floor(point.x / gridSize) + ":" + Math.floor(point.y / gridSize);
        if (!buckets[key]) {
          buckets[key] = [];
        }
        buckets[key].push(item);
      });

      var nextClusters = {};

      Object.keys(buckets).forEach(function (key) {
        var group = buckets[key];
        if (group.length < 2) {
          setPinVisible(group[0], true, animate);
          return;
        }

        group.forEach(function (item) {
          setPinVisible(item, false, animate);
        });

        var lat = 0;
        var lng = 0;
        group.forEach(function (item) {
          lat += item.position.getLat();
          lng += item.position.getLng();
        });

        nextClusters[key] = {
          group: group,
          center: new kakao.maps.LatLng(
            lat / group.length,
            lng / group.length
          ),
          count: group.length,
        };
      });

      var remaining = [];
      clusterItems.forEach(function (cluster) {
        var next = nextClusters[cluster.key];
        if (!next) {
          hideOverlay(cluster.overlay, cluster.el, animate);
          return;
        }

        delete nextClusters[cluster.key];
        cancelHide(cluster.el);
        cluster.el.className = "map-cluster " + clusterSizeClass(next.count);
        cluster.el.textContent = String(next.count);
        cluster.el.setAttribute(
          "aria-label",
          next.count + "개 장소 묶음, 확대"
        );
        cluster.overlay.setPosition(next.center);
        cluster.center = next.center;
        cluster.count = next.count;
        remaining.push(cluster);
      });

      Object.keys(nextClusters).forEach(function (key) {
        remaining.push(createClusterItem(key, nextClusters[key], animate));
      });

      clusterItems = remaining;
    }

    function renderPlaceList(data) {
      sheetTitle.textContent = activeSearchKeyword + " 검색 결과";
      sheetCount.textContent = data.length + "곳";
      placeList.innerHTML = "";

      if (!data.length) {
        placeList.innerHTML =
          '<li class="place-empty">이 화면에서 결과를 찾지 못했습니다.</li>';
        return;
      }

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

      var selectedItem = placeItems[index];
      openPin = selectedItem.pinEl;

      if (fromList) {
        skipIdleOnce = true;
        if (lastSearchNearby && map.getLevel() >= CLUSTER_MIN_LEVEL) {
          map.setLevel(CLUSTER_MIN_LEVEL - 1);
        }
        map.panTo(selectedItem.position);
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
      if (state === "expanded") {
        closeLayersPanel();
      }
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

    function viewportHeight() {
      if (window.visualViewport && window.visualViewport.height) {
        return window.visualViewport.height;
      }
      return window.innerHeight;
    }

    function isCompactMap() {
      return window.matchMedia("(max-width: 767px)").matches;
    }

    function mapFitPadding(forResults) {
      var top = isCompactMap() ? 108 : 120;
      var right = isCompactMap() ? 56 : 110;
      var left = isCompactMap() ? 16 : 24;
      var bottom = 24;

      if (forResults || !sheet.hidden) {
        var sheetHeight = !sheet.hidden
          ? sheet.getBoundingClientRect().height
          : 0;
        if (!sheetHeight) {
          sheetHeight = sheetSnapHeights().mid;
        }
        bottom = Math.round(sheetHeight) + 16;
      }

      return { top: top, right: right, bottom: bottom, left: left };
    }

    function closeLayersPanel() {
      var tools = document.getElementById("map-tools");
      var toggle = document.getElementById("layers-toggle");
      if (!tools || !tools.classList.contains("is-layers-open")) {
        return false;
      }
      tools.classList.remove("is-layers-open");
      if (toggle) {
        toggle.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
      return true;
    }

    function sheetSnapHeights() {
      var collapsed = sheetGrab.getBoundingClientRect().height;
      var height = viewportHeight();
      var mid = isCompactMap()
        ? Math.min(height * 0.38, 340)
        : Math.min(height * 0.42, 420);
      var expanded = height - (isCompactMap() ? 72 : 88);
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

      infowindow.close();
      placeItems.forEach(function (item) {
        cancelHide(item.pinEl);
        item.overlay.setMap(null);
      });
      clusterItems.forEach(function (cluster) {
        cancelHide(cluster.el);
        cluster.overlay.setMap(null);
      });
      searchMarkers = [];
      placeItems = [];
      clusterItems = [];
    }

    function resetToDefault() {
      infowindow.close();
      clearSearchMarkers();
      hideSheet();
      input.value = "";
      activeSearchKeyword = "";
      lastSearchNearby = false;
      skipIdleOnce = true;
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
          skipIdleOnce = true;
          map.setCenter(currentPosition);
          map.setLevel(3);
          showCurrentLocation(currentPosition);
          locationBtn.classList.add("is-active");
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

    function bindMapIdle() {
      kakao.maps.event.addListener(map, "zoom_changed", function () {
        if (lastSearchNearby && placeItems.length) {
          applyFilterClustering(true);
        }
      });

      kakao.maps.event.addListener(map, "idle", function () {
        updateAreaInfo();

        if (skipIdleOnce) {
          skipIdleOnce = false;
          return;
        }

        if (lastSearchNearby && activeSearchKeyword) {
          searchPlaces(activeSearchKeyword, true, true);
        }
      });
    }

    function updateAreaInfo() {
      var center = map.getCenter();
      geocoder.coord2Address(
        center.getLng(),
        center.getLat(),
        function (result, status) {
          if (status === kakao.maps.services.Status.OK && result[0]) {
            var name =
              (result[0].road_address && result[0].road_address.address_name) ||
              (result[0].address && result[0].address.address_name);
            if (name) {
              areaInfoText.textContent = name;
              areaInfo.hidden = false;
              return;
            }
          }

          geocoder.coord2RegionCode(
            center.getLng(),
            center.getLat(),
            function (region, regionStatus) {
              if (
                regionStatus === kakao.maps.services.Status.OK &&
                region[0]
              ) {
                areaInfoText.textContent = region[0].address_name;
                areaInfo.hidden = false;
              }
            }
          );
        }
      );
    }

    function eventInsideMapTools(event) {
      var node = event.target;
      if (node && node.nodeType === 3) {
        node = node.parentNode;
      }
      if (node && typeof node.closest === "function") {
        return !!node.closest("#map-tools");
      }
      var tools = document.getElementById("map-tools");
      return !!(tools && tools.contains(node));
    }

    function bindMapTools() {
      var tools = document.getElementById("map-tools");
      var layersToggle = document.getElementById("layers-toggle");
      var layersIgnoreUntil = 0;

      document.getElementById("zoom-in").addEventListener("click", function () {
        map.setLevel(map.getLevel() - 1);
      });

      document.getElementById("zoom-out").addEventListener("click", function () {
        map.setLevel(map.getLevel() + 1);
      });

      layersToggle.addEventListener(
        "click",
        function (event) {
          event.preventDefault();
          event.stopPropagation();
          var open = !tools.classList.contains("is-layers-open");
          tools.classList.toggle("is-layers-open", open);
          layersToggle.classList.toggle("is-open", open);
          layersToggle.setAttribute("aria-expanded", open ? "true" : "false");
          if (open) {
            layersIgnoreUntil = Date.now() + 400;
          }
        }
      );

      document.addEventListener(
        "pointerdown",
        function (event) {
          if (!tools.classList.contains("is-layers-open")) {
            return;
          }
          if (Date.now() < layersIgnoreUntil) {
            return;
          }
          if (eventInsideMapTools(event)) {
            return;
          }
          closeLayersPanel();
        },
        true
      );

      window.addEventListener("resize", function () {
        if (!isCompactMap()) {
          closeLayersPanel();
        }
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
