(function () {
  function t(key, vars) {
    return window.MapI18n.t(key, vars);
  }

  function i18nHas(key) {
    return window.MapI18n.has(key);
  }

  var DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };
  var SEARCH_RADIUS = 3000;
  var CLUSTER_MIN_LEVEL = 6;
  var DETAIL_MAP_LEVEL = 3;
  var ATTRACTION_MAX_OVERLAYS = 90;
  var HISTORY_ICON = { src: "icons/taegeukgi.svg", wide: true };
  var TOURISM_ICONS = {
    A0101: { src: "icons/tourism-nature.svg", wide: false },
    A0102: { src: "icons/tourism-nature.svg", wide: false },
    A0202: { src: "icons/tourism-leisure.svg", wide: false },
    A0203: { src: "icons/tourism-experience.svg", wide: false },
    A0204: { src: "icons/tourism-default.svg", wide: false },
    A0205: { src: "icons/tourism-default.svg", wide: false },
  };
  var TOURISM_ICON_DEFAULT = { src: "icons/tourism-default.svg", wide: false };
  var BADGE_KEYS = { unesco: 1, heritage: 1, historic: 1 };
  var KOREA_BOUNDS = {
    sw: { lat: 33.1, lng: 124.6 },
    ne: { lat: 38.7, lng: 131.9 },
  };
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
    var attractionsCatalog = { history: [], tourism: [] };
    var attractionsPromise = null;
    var attractionMode = null;
    var catalogKind = null;
    var tourismGroup = "";
    var tourismCat3 = "";

    var form = document.getElementById("search-form");
    var input = document.getElementById("search-input");
    var locationBtn = document.getElementById("location-btn");
    var chips = document.querySelectorAll(".chip[data-filter]");
    var nearbyAttractionsBtn = document.getElementById("nearby-attractions");
    var tourismGroupsEl = document.getElementById("tourism-groups");
    var tourismCat3Row = document.getElementById("tourism-cat3-row");
    var tourismCat3Label = document.getElementById("tourism-cat3-label");
    var tourismCat3El = document.getElementById("tourism-cat3");
    var weatherCache = {};
    var weatherSeq = 0;
    var detailPlace = null;
    var detailGeocodedAddress = "";
    var detailCamera = null;
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
    var detailSheet = document.getElementById("place-detail");
    var detailGrab = document.getElementById("detail-grab");
    var detailToggle = document.getElementById("detail-toggle");
    var detailBack = document.getElementById("detail-back");
    var detailTitle = document.getElementById("detail-title");
    var detailMeta = document.getElementById("detail-meta");
    var detailBody = document.getElementById("detail-body");
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
      if (closeLangPanel()) {
        return;
      }
      if (closeLayersPanel()) {
        return;
      }
      if (closePlaceDetail()) {
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
      hideNearbyAttractionsOption();
      hideTourismFilters();
      attractionMode = null;
      catalogKind = null;
      closePlaceDetail();
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

        if (filter === "attractions" || filter === "tourism") {
          input.value = "";
          nearbyAttractionsBtn.setAttribute("aria-pressed", "false");
          if (filter === "tourism") {
            tourismGroup = "";
            tourismCat3 = "";
          } else {
            hideTourismFilters();
          }
          openCatalog(filter === "tourism" ? "tourism" : "history", "nationwide");
          return;
        }

        hideNearbyAttractionsOption();
        hideTourismFilters();
        attractionMode = null;
        catalogKind = null;
        closePlaceDetail();
        input.value = filter;
        searchPlaces(filter, true);
      });
    });

    nearbyAttractionsBtn.addEventListener("click", function () {
      var on = nearbyAttractionsBtn.getAttribute("aria-pressed") !== "true";
      nearbyAttractionsBtn.setAttribute("aria-pressed", on ? "true" : "false");
      openCatalog(catalogKind || "history", on ? "nearby" : "nationwide");
    });

    if (tourismGroupsEl) {
      tourismGroupsEl.addEventListener("click", function (event) {
        var button = event.target.closest("[data-tourism-group]");
        if (!button || catalogKind !== "tourism") {
          return;
        }
        tourismGroup = button.getAttribute("data-tourism-group") || "";
        tourismCat3 = "";
        refreshTourismFilterChips();
        openCatalog("tourism", attractionMode || "nationwide");
      });
    }

    if (tourismCat3El) {
      tourismCat3El.addEventListener("click", function (event) {
        var button = event.target.closest("[data-tourism-cat3]");
        if (!button || catalogKind !== "tourism") {
          return;
        }
        tourismCat3 = button.getAttribute("data-tourism-cat3") || "";
        refreshTourismFilterChips();
        openCatalog("tourism", attractionMode || "nationwide");
      });
    }

    detailBack.addEventListener("click", function () {
      closePlaceDetail();
    });

    locationBtn.addEventListener("click", moveToCurrentLocation);
    bindSheetGestures();
    bindMapTools();
    bindMapIdle();
    updateAreaInfo();
    applyI18n();

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

    function hideNearbyAttractionsOption() {
      nearbyAttractionsBtn.hidden = true;
      nearbyAttractionsBtn.setAttribute("aria-pressed", "false");
    }

    function hideTourismFilters() {
      tourismGroup = "";
      tourismCat3 = "";
      if (tourismGroupsEl) {
        tourismGroupsEl.hidden = true;
      }
      if (tourismCat3Row) {
        tourismCat3Row.hidden = true;
      }
      if (tourismCat3El) {
        tourismCat3El.innerHTML = "";
      }
    }

    function refreshTourismFilterChips() {
      if (!tourismGroupsEl || !tourismCat3El) {
        return;
      }
      var catalog = attractionsCatalog.tourism || [];
      var topicCounts = {};
      catalog.forEach(function (place) {
        if (place.topic) {
          topicCounts[place.topic] = (topicCounts[place.topic] || 0) + 1;
        }
      });
      Array.prototype.forEach.call(
        tourismGroupsEl.querySelectorAll("[data-tourism-group]"),
        function (button) {
          var group = button.getAttribute("data-tourism-group") || "";
          button.setAttribute("aria-pressed", group === tourismGroup ? "true" : "false");
          if (!group) {
            button.hidden = false;
            return;
          }
          button.hidden = !topicCounts[group];
        }
      );
      tourismGroupsEl.hidden = false;

      if (!tourismGroup) {
        tourismCat3 = "";
        if (tourismCat3Row) {
          tourismCat3Row.hidden = true;
        }
        tourismCat3El.innerHTML = "";
        return;
      }

      var scoped = catalog.filter(function (place) {
        return place.topic === tourismGroup;
      });
      var cat3Counts = {};
      scoped.forEach(function (place) {
        if (place.cat3) {
          cat3Counts[place.cat3] = (cat3Counts[place.cat3] || 0) + 1;
        }
      });
      var cat3Keys = Object.keys(cat3Counts).sort(function (a, b) {
        return cat3Label(a).localeCompare(cat3Label(b), MapI18n.locale());
      });
      var html =
        '<button type="button" class="chip chip-option" data-tourism-cat3="" aria-pressed="' +
        (tourismCat3 ? "false" : "true") +
        '">' +
        escapeHtml(t("group.all")) +
        "</button>";
      cat3Keys.forEach(function (key) {
        html +=
          '<button type="button" class="chip chip-option" data-tourism-cat3="' +
          escapeHtml(key) +
          '" aria-pressed="' +
          (tourismCat3 === key ? "true" : "false") +
          '">' +
          escapeHtml(cat3Label(key)) +
          "</button>";
      });
      tourismCat3El.innerHTML = html;
      if (tourismCat3Label) {
        tourismCat3Label.textContent = t("groupDetails", {
          group: groupLabel(tourismGroup) || t("extra.topic"),
        });
      }
      if (tourismCat3Row) {
        tourismCat3Row.hidden = false;
      }
    }

    function cat2Label(key) {
      return t("cat2." + key);
    }

    function cat3Label(key) {
      return i18nHas("cat3." + key) ? t("cat3." + key) : key;
    }

    function groupLabel(key) {
      return key && i18nHas("group." + key) ? t("group." + key) : key || "";
    }

    function catalogLabel(kind) {
      return kind === "tourism" ? t("chip.tourism") : t("chip.attractions");
    }

    function categoryLabel(place) {
      if (place && (place.kind === "history" || place.kind === "tourism")) {
        if (place.cat3 && i18nHas("cat3." + place.cat3)) {
          return cat3Label(place.cat3);
        }
        if (place.cat2 && i18nHas("cat2." + place.cat2)) {
          return cat2Label(place.cat2);
        }
        return t(
          place.kind === "history" ? "kind.historySite" : "kind.tourismSite"
        );
      }
      var raw = (place && place.category_name) || "";
      return raw.split(">").pop().trim();
    }

    function iconForPlace(place) {
      if (place && place.kind === "history") {
        return HISTORY_ICON;
      }
      var cat2 = place && place.cat2;
      return (cat2 && TOURISM_ICONS[cat2]) || TOURISM_ICON_DEFAULT;
    }

    function toAttractionPlace(row) {
      var kind = row.kind === "history" ? "history" : "tourism";
      var cat2 = row.cat2 || (kind === "history" ? "A0201" : "");
      var cat3 = row.cat3 || "";
      return {
        id: row.id,
        place_name: row.title,
        x: row.x,
        y: row.y,
        address_name: row.address || "",
        kind: kind,
        cat2: cat2,
        cat3: cat3,
        topic: row.topic || "",
        image: row.image || "",
        badges: row.badges || [],
        summary: row.summary || "",
        overview: row.overview || "",
        tel: row.tel || "",
        useTime: row.useTime || "",
        restDate: row.restDate || "",
        homepage: row.homepage || "",
      };
    }

    function loadAttractions() {
      if (attractionsPromise) {
        return attractionsPromise;
      }
      attractionsPromise = fetch("data/attractions.json?v=15")
        .then(function (res) {
          if (!res.ok) {
            throw new Error("attractions " + res.status);
          }
          return res.json();
        })
        .then(function (payload) {
          var history = [];
          var tourism = [];
          (payload.places || []).forEach(function (row) {
            var place = toAttractionPlace(row);
            if (place.kind === "history") {
              history.push(place);
            } else {
              tourism.push(place);
            }
          });
          attractionsCatalog = { history: history, tourism: tourism };
          return attractionsCatalog;
        })
        .catch(function (err) {
          attractionsPromise = null;
          throw err;
        });
      return attractionsPromise;
    }

    function haversineMeters(lat1, lng1, lat2, lng2) {
      var toRad = Math.PI / 180;
      var dLat = (lat2 - lat1) * toRad;
      var dLng = (lng2 - lng1) * toRad;
      var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * toRad) *
          Math.cos(lat2 * toRad) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function attractionWorkingSet() {
      var catalog = attractionsCatalog[catalogKind] || [];
      if (!catalog.length) {
        return [];
      }
      if (catalogKind === "tourism") {
        catalog = catalog.filter(function (place) {
          if (tourismGroup && place.topic !== tourismGroup) {
            return false;
          }
          if (tourismCat3 && place.cat3 !== tourismCat3) {
            return false;
          }
          return true;
        });
      }
      if (attractionMode === "nearby" && currentPosition) {
        var lat = currentPosition.getLat();
        var lng = currentPosition.getLng();
        return catalog.filter(function (place) {
          return (
            haversineMeters(
              lat,
              lng,
              parseFloat(place.y),
              parseFloat(place.x)
            ) <= SEARCH_RADIUS
          );
        });
      }
      return catalog;
    }

    function placesInMapBounds(places) {
      var bounds = map.getBounds();
      var sw = bounds.getSouthWest();
      var ne = bounds.getNorthEast();
      var south = sw.getLat();
      var west = sw.getLng();
      var north = ne.getLat();
      var east = ne.getLng();
      return places.filter(function (place) {
        var lat = parseFloat(place.y);
        var lng = parseFloat(place.x);
        return lat >= south && lat <= north && lng >= west && lng <= east;
      });
    }

    function openCatalog(kind, mode) {
      catalogKind = kind;
      nearbyAttractionsBtn.hidden = false;
      attractionMode = mode;
      if (kind === "tourism") {
        refreshTourismFilterChips();
      } else {
        hideTourismFilters();
      }
      activeSearchKeyword = catalogLabel(kind);
      lastSearchNearby = false;
      closePlaceDetail();
      var seq = ++searchSeq;
      var label = catalogLabel(kind);

      loadAttractions()
        .then(function () {
          if (seq !== searchSeq) {
            return;
          }
          if (kind === "tourism") {
            refreshTourismFilterChips();
          }
          if (mode === "nearby") {
            withCurrentPosition(function (position) {
              if (seq !== searchSeq) {
                return;
              }
              currentPosition = position;
              renderAttractionMode(true);
            }, seq);
            return;
          }
          renderAttractionMode(true);
        })
        .catch(function () {
          if (seq !== searchSeq) {
            return;
          }
          showDialog(
            t("dataErrorTitle", { label: label }),
            t("dataError", { label: label })
          );
        });
    }

    function withCurrentPosition(onOk, seq) {
      if (currentPosition) {
        onOk(currentPosition);
        return;
      }
      if (!navigator.geolocation) {
        nearbyAttractionsBtn.setAttribute("aria-pressed", "false");
        attractionMode = "nationwide";
        showDialog(t("geoUnavailableTitle"), t("geoUnavailable"));
        renderAttractionMode(true);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        function (position) {
          if (seq != null && seq !== searchSeq) {
            return;
          }
          var coords = new kakao.maps.LatLng(
            position.coords.latitude,
            position.coords.longitude
          );
          currentPosition = coords;
          showCurrentLocation(coords);
          locationBtn.classList.add("is-active");
          onOk(coords);
        },
        function (error) {
          if (seq != null && seq !== searchSeq) {
            return;
          }
          nearbyAttractionsBtn.setAttribute("aria-pressed", "false");
          attractionMode = "nationwide";
          var message = t("geoError");
          if (error && error.code === error.PERMISSION_DENIED) {
            message = t("geoDenied");
          }
          showDialog(t("geoErrorTitle"), message);
          renderAttractionMode(true);
        }
      );
    }

    function renderAttractionMode(fit) {
      var all = attractionWorkingSet();
      infowindow.close();
      showSheet();

      if (fit) {
        if (!all.length) {
          clearSearchMarkers();
          renderAttractionList([], 0, 0);
          if (attractionMode === "nearby") {
            showDialog(t("noResultsTitle"), t("noNearby"));
          }
          return;
        }
        skipIdleOnce = true;
        var bounds = new kakao.maps.LatLngBounds();
        if (attractionMode === "nearby") {
          all.forEach(function (place) {
            bounds.extend(new kakao.maps.LatLng(place.y, place.x));
          });
          bounds.extend(currentPosition);
        } else {
          bounds.extend(
            new kakao.maps.LatLng(KOREA_BOUNDS.sw.lat, KOREA_BOUNDS.sw.lng)
          );
          bounds.extend(
            new kakao.maps.LatLng(KOREA_BOUNDS.ne.lat, KOREA_BOUNDS.ne.lng)
          );
        }
        var padding = mapFitPadding(true);
        map.setBounds(
          bounds,
          padding.top,
          padding.right,
          padding.bottom,
          padding.left
        );
        return;
      }

      rebuildAttractionOverlays(true);
    }

    function rebuildAttractionOverlays(animate) {
      var all = attractionWorkingSet();
      var inView = placesInMapBounds(all);
      var visiblePlaces = [];
      var nextClusters = {};
      var shouldCluster =
        map.getLevel() >= CLUSTER_MIN_LEVEL ||
        inView.length > ATTRACTION_MAX_OVERLAYS;

      if (!shouldCluster) {
        visiblePlaces = inView.slice();
      } else {
        var projection = map.getProjection();
        var gridSize = 80;
        var buckets = {};
        var overlayBudget = 0;

        function bucketKey(place) {
          var point = projection.pointFromCoords(
            new kakao.maps.LatLng(place.y, place.x)
          );
          return (
            Math.floor(point.x / gridSize) +
            ":" +
            Math.floor(point.y / gridSize)
          );
        }

        function refillBuckets() {
          buckets = {};
          inView.forEach(function (place) {
            var key = bucketKey(place);
            if (!buckets[key]) {
              buckets[key] = [];
            }
            buckets[key].push(place);
          });
          overlayBudget = Object.keys(buckets).length;
        }

        refillBuckets();
        while (overlayBudget > ATTRACTION_MAX_OVERLAYS && gridSize < 320) {
          gridSize += 40;
          refillBuckets();
        }

        Object.keys(buckets).forEach(function (key) {
          var group = buckets[key];
          if (group.length < 2) {
            visiblePlaces.push(group[0]);
            return;
          }
          var lat = 0;
          var lng = 0;
          group.forEach(function (place) {
            lat += parseFloat(place.y);
            lng += parseFloat(place.x);
          });
          nextClusters[key] = {
            center: new kakao.maps.LatLng(
              lat / group.length,
              lng / group.length
            ),
            count: group.length,
          };
        });
      }

      var clusterKeys = Object.keys(nextClusters);
      if (visiblePlaces.length + clusterKeys.length > ATTRACTION_MAX_OVERLAYS) {
        clusterKeys.sort(function (a, b) {
          return nextClusters[b].count - nextClusters[a].count;
        });
        if (clusterKeys.length > ATTRACTION_MAX_OVERLAYS) {
          clusterKeys = clusterKeys.slice(0, ATTRACTION_MAX_OVERLAYS);
          visiblePlaces = [];
        } else {
          visiblePlaces = visiblePlaces.slice(
            0,
            ATTRACTION_MAX_OVERLAYS - clusterKeys.length
          );
        }
        var kept = {};
        clusterKeys.forEach(function (key) {
          kept[key] = nextClusters[key];
        });
        nextClusters = kept;
      }

      clearSearchMarkers();
      animate = animate !== false && motionEnabled();
      visiblePlaces.forEach(function (place, index) {
        var position = new kakao.maps.LatLng(place.y, place.x);
        var item = createPlaceMarker(
          place,
          position,
          iconForPlace(place),
          index
        );
        searchMarkers.push(item.overlay);
        placeItems.push(item);
        setPinVisible(item, true, animate);
      });

      Object.keys(nextClusters).forEach(function (key) {
        clusterItems.push(createClusterItem(key, nextClusters[key], animate));
      });

      renderAttractionList(visiblePlaces, inView.length, all.length);
    }

    function renderAttractionList(visiblePlaces, inViewCount, totalCount) {
      var label = catalogLabel(catalogKind);
      var title =
        attractionMode === "nearby"
          ? t("nearbyTitle", { label: label })
          : label;
      var countLabel =
        attractionMode === "nearby"
          ? t("countNearby", { n: totalCount })
          : t("countView", { in: inViewCount, total: totalCount });
      renderPlaceList(visiblePlaces, title, countLabel);
      if (!visiblePlaces.length && inViewCount > 0) {
        placeList.innerHTML =
          '<li class="place-empty">' + escapeHtml(t("emptyZoom")) + "</li>";
      }
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
        showDialog(t("noResultsTitle"), t("noSearch"));
        return;
      }

      if (status !== kakao.maps.services.Status.OK) {
        if (!searchQuiet) {
          showDialog(t("searchErrorTitle"), t("searchError"));
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
      el.setAttribute("aria-label", t("clusterZoom", { n: next.count }));
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
          t("clusterZoom", { n: next.count })
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

    function renderPlaceList(data, title, countLabel) {
      sheetTitle.textContent =
        title || t("searchResults", { q: activeSearchKeyword });
      sheetCount.textContent = countLabel || t("placeCount", { n: data.length });
      placeList.innerHTML = "";

      if (!data.length) {
        placeList.innerHTML =
          '<li class="place-empty">' + escapeHtml(t("emptyInView")) + "</li>";
        return;
      }

      data.forEach(function (place, index) {
        var item = document.createElement("li");
        var button = document.createElement("button");
        var address = place.road_address_name || place.address_name || "";
        var category = categoryLabel(place);
        var meta = [category, address].filter(Boolean).join(" · ");
        var lat = parseFloat(place.y);
        var lng = parseFloat(place.x);

        var extra = "";
        if (catalogKind) {
          extra += badgeHtml(place.badges);
          if (place.summary) {
            extra +=
              '<span class="place-summary">' +
              escapeHtml(place.summary) +
              "</span>";
          }
        }

        button.type = "button";
        button.className = "place-item";
        button.innerHTML =
          '<span class="place-thumb">' +
          '<img alt="" referrerpolicy="no-referrer" src="' +
          placeThumbSrc(place) +
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
          extra +
          "</span>";

        var thumb = button.querySelector(".place-thumb img");
        bindThumbFallback(thumb, place);

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

    function placeThumbSrc(place) {
      if (place && place.image) {
        return place.image;
      }
      return mapThumbUrl(parseFloat(place.y), parseFloat(place.x));
    }

    function bindThumbFallback(img, place) {
      if (!img) {
        return;
      }
      img.addEventListener("error", function () {
        if (img.dataset.fallback === "1") {
          img.style.display = "none";
          return;
        }
        img.dataset.fallback = "1";
        img.src = mapThumbUrl(parseFloat(place.y), parseFloat(place.x));
      });
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

      if (fromList && catalogKind && selectedItem && selectedItem.place) {
        if (!detailCamera) {
          var previous = map.getCenter();
          detailCamera = {
            lat: previous.getLat(),
            lng: previous.getLng(),
            level: map.getLevel(),
          };
        }
        skipIdleOnce = true;
        map.setCenter(selectedItem.position);
        map.setLevel(DETAIL_MAP_LEVEL);
      } else if (fromList) {
        skipIdleOnce = true;
        if (lastSearchNearby && map.getLevel() >= CLUSTER_MIN_LEVEL) {
          map.setLevel(CLUSTER_MIN_LEVEL - 1);
        }
        map.panTo(selectedItem.position);
      }

      if (sheetState === "collapsed") {
        setSheetState("mid");
      }

      if (catalogKind && selectedItem && selectedItem.place) {
        openPlaceDetail(selectedItem.place);
      }

      var activeItem = placeList.querySelector(".place-item.is-active");
      if (activeItem) {
        activeItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }

    function badgeHtml(badges) {
      if (!badges || !badges.length) {
        return "";
      }
      var seen = {};
      var html = '<span class="place-badges">';
      badges.forEach(function (key) {
        if (seen[key] || !BADGE_KEYS[key]) {
          return;
        }
        seen[key] = true;
        html +=
          '<span class="place-badge' +
          (key === "unesco" ? " is-unesco" : "") +
          '">' +
          escapeHtml(t("badge." + key)) +
          "</span>";
      });
      html += "</span>";
      return html;
    }

    function wmoWeatherLabel(code) {
      var n = Number(code);
      if (n === 0 || n === 1) {
        return t("wmo.clear");
      }
      if (n === 2) {
        return t("wmo.cloudy");
      }
      if (n === 3) {
        return t("wmo.overcast");
      }
      if (n === 45 || n === 48) {
        return t("wmo.fog");
      }
      if (n >= 51 && n <= 57) {
        return t("wmo.drizzle");
      }
      if (n >= 61 && n <= 67) {
        return t("wmo.rain");
      }
      if ((n >= 71 && n <= 77) || n === 85 || n === 86) {
        return t("wmo.snow");
      }
      if (n >= 80 && n <= 82) {
        return t("wmo.shower");
      }
      if (n >= 95) {
        return t("wmo.thunder");
      }
      return t("wmo.cloudy");
    }

    function wmoWeatherIcon(code) {
      var n = Number(code);
      if (n === 0 || n === 1) {
        return "icons/weather-clear.svg";
      }
      if (n === 2) {
        return "icons/weather-cloudy.svg";
      }
      if (n === 3) {
        return "icons/weather-overcast.svg";
      }
      if (n === 45 || n === 48) {
        return "icons/weather-fog.svg";
      }
      if ((n >= 71 && n <= 77) || n === 85 || n === 86) {
        return "icons/weather-snow.svg";
      }
      if (n >= 95) {
        return "icons/weather-thunder.svg";
      }
      if (
        (n >= 51 && n <= 57) ||
        (n >= 61 && n <= 67) ||
        (n >= 80 && n <= 82)
      ) {
        return "icons/weather-rain.svg";
      }
      return "icons/weather-cloudy.svg";
    }

    function detailForecastEl() {
      return detailBody ? detailBody.querySelector(".detail-forecast") : null;
    }

    function detailAddressEl() {
      return detailBody ? detailBody.querySelector(".detail-address") : null;
    }

    function detailExtraEl() {
      return detailBody ? detailBody.querySelector(".detail-extra") : null;
    }

    function isForecastPayload(payload) {
      return !!(payload && payload.days && payload.days.length === 3);
    }

    function clearDetailWeather() {
      weatherSeq += 1;
      var el = detailForecastEl();
      if (!el) {
        return;
      }
      el.hidden = true;
      el.innerHTML = "";
      el.classList.remove("is-pending");
      el.removeAttribute("aria-busy");
    }

    function shouldShowPlaceWeather(lat, lng) {
      if (!isFinite(lat) || !isFinite(lng)) {
        return false;
      }
      if (!currentPosition) {
        return true;
      }
      return (
        haversineMeters(
          currentPosition.getLat(),
          currentPosition.getLng(),
          lat,
          lng
        ) > SEARCH_RADIUS
      );
    }

    function forecastPendingMarkup() {
      return (
        '<div class="detail-forecast-day"></div>' +
        '<div class="detail-forecast-day"></div>' +
        '<div class="detail-forecast-day"></div>'
      );
    }

    function detailForecastMarkup(payload) {
      var keys = ["yesterday", "today", "tomorrow"];
      return payload.days
        .map(function (day, index) {
          var label = wmoWeatherLabel(day.code);
          var now =
            index === 1 && payload.currentTemp != null
              ? '<span class="detail-forecast-now">' +
                escapeHtml(t("forecast.now", { n: payload.currentTemp })) +
                "</span>"
              : "";
          return (
            '<div class="detail-forecast-day">' +
            '<span class="detail-forecast-label">' +
            escapeHtml(t("forecast." + keys[index])) +
            "</span>" +
            '<img src="' +
            wmoWeatherIcon(day.code) +
            '" alt="' +
            escapeHtml(label) +
            '" width="20" height="20">' +
            '<span class="detail-forecast-temps">' +
            escapeHtml(day.max + "° / " + day.min + "°") +
            "</span>" +
            now +
            "</div>"
          );
        })
        .join("");
    }

    function renderDetailForecast(payload) {
      var el = detailForecastEl();
      if (!el) {
        return;
      }
      if (!isForecastPayload(payload)) {
        el.hidden = true;
        el.innerHTML = "";
        el.classList.remove("is-pending");
        el.removeAttribute("aria-busy");
        return;
      }
      el.innerHTML = detailForecastMarkup(payload);
      el.classList.remove("is-pending");
      el.removeAttribute("aria-busy");
      el.removeAttribute("aria-label");
      el.hidden = false;
    }

    function parseDailyForecast(data) {
      var daily = data && data.daily;
      var codes = daily && daily.weather_code;
      var maxes = daily && daily.temperature_2m_max;
      var mins = daily && daily.temperature_2m_min;
      if (!codes || codes.length < 3 || !maxes || !mins) {
        return null;
      }
      var current = data.current || {};
      var days = [];
      var i;
      for (i = 0; i < 3; i += 1) {
        days.push({
          code: codes[i],
          max: Math.round(Number(maxes[i])),
          min: Math.round(Number(mins[i])),
        });
      }
      return {
        currentTemp:
          current.temperature_2m == null
            ? null
            : Math.round(Number(current.temperature_2m)),
        currentCode: current.weather_code,
        days: days,
      };
    }

    function loadPlaceWeather(lat, lng, seq) {
      if (!shouldShowPlaceWeather(lat, lng)) {
        return;
      }
      var key = lat.toFixed(2) + "," + lng.toFixed(2);
      function show(payload) {
        if (seq !== weatherSeq) {
          return;
        }
        renderDetailForecast(payload);
      }
      if (isForecastPayload(weatherCache[key])) {
        show(weatherCache[key]);
        return;
      }
      fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=" +
          encodeURIComponent(String(lat)) +
          "&longitude=" +
          encodeURIComponent(String(lng)) +
          "&current=temperature_2m,weather_code" +
          "&daily=weather_code,temperature_2m_max,temperature_2m_min" +
          "&past_days=1&forecast_days=2&timezone=Asia/Seoul"
      )
        .then(function (res) {
          if (!res.ok) {
            throw new Error("weather " + res.status);
          }
          return res.json();
        })
        .then(function (data) {
          var payload = parseDailyForecast(data);
          if (!payload) {
            throw new Error("weather empty");
          }
          weatherCache[key] = payload;
          show(payload);
        })
        .catch(function () {
          show(null);
        });
    }

    function snapshotAddress(place) {
      return place.road_address_name || place.address_name || "";
    }

    function extraRowsHtml(place, geocoded) {
      if (!place) {
        return "";
      }
      var rows = [];
      if (
        place.overview &&
        place.summary &&
        place.summary !== place.overview
      ) {
        rows.push(
          '<li><span class="detail-extra-label">' +
            escapeHtml(t("extra.summary")) +
            "</span><span>" +
            escapeHtml(place.summary) +
            "</span></li>"
        );
      }
      if (place.topic) {
        rows.push(
          '<li><span class="detail-extra-label">' +
            escapeHtml(t("extra.topic")) +
            "</span><span>" +
            escapeHtml(groupLabel(place.topic) || place.topic) +
            "</span></li>"
        );
      }
      if (place.kind === "history" || place.kind === "tourism") {
        rows.push(
          '<li><span class="detail-extra-label">' +
            escapeHtml(t("extra.kind")) +
            "</span><span>" +
            escapeHtml(t("kind." + place.kind)) +
            "</span></li>"
        );
      }
      var listed = (place.address_name || "").trim();
      var geo = (geocoded || "").trim();
      if (listed && geo && listed !== geo) {
        rows.push(
          '<li><span class="detail-extra-label">' +
            escapeHtml(t("extra.listedAddress")) +
            "</span><span>" +
            escapeHtml(listed) +
            "</span></li>"
        );
      }
      if (place.y && place.x) {
        rows.push(
          '<li><span class="detail-extra-label">' +
            escapeHtml(t("extra.coords")) +
            "</span><span>" +
            escapeHtml(place.y + ", " + place.x) +
            "</span></li>"
        );
      }
      return rows.join("");
    }

    function fillDetailExtra(place, geocoded) {
      var el = detailExtraEl();
      if (!el) {
        return;
      }
      var html = extraRowsHtml(place, geocoded);
      el.innerHTML = html;
      el.hidden = !html;
    }

    function setDetailAddress(text) {
      var el = detailAddressEl();
      if (!el) {
        return;
      }
      el.textContent = text || "";
      el.setAttribute("aria-label", t("address"));
      detailGeocodedAddress = text || "";
      fillDetailExtra(detailPlace, detailGeocodedAddress);
    }

    function loadPlaceAddress(place, lat, lng, seq) {
      setDetailAddress(snapshotAddress(place));
      if (!isFinite(lat) || !isFinite(lng)) {
        return;
      }
      geocoder.coord2Address(lng, lat, function (result, status) {
        if (seq !== weatherSeq) {
          return;
        }
        if (status !== kakao.maps.services.Status.OK || !result[0]) {
          return;
        }
        var full =
          (result[0].road_address && result[0].road_address.address_name) ||
          (result[0].address && result[0].address.address_name);
        if (full) {
          setDetailAddress(full);
        }
      });
    }

    function restoreDetailCamera() {
      if (!detailCamera) {
        return;
      }
      skipIdleOnce = true;
      map.setCenter(
        new kakao.maps.LatLng(detailCamera.lat, detailCamera.lng)
      );
      map.setLevel(detailCamera.level);
      detailCamera = null;
    }

    function openPlaceDetail(place) {
      if (!detailSheet) {
        return;
      }
      var lat = parseFloat(place.y);
      var lng = parseFloat(place.x);
      var category = categoryLabel(place);
      weatherSeq += 1;
      var seq = weatherSeq;
      detailPlace = place;
      detailTitle.textContent = place.place_name || "";
      detailMeta.textContent = category;
      detailMeta.hidden = !category;
      var showWeather = shouldShowPlaceWeather(lat, lng);
      var weatherKey =
        isFinite(lat) && isFinite(lng)
          ? lat.toFixed(2) + "," + lng.toFixed(2)
          : "";
      var cachedWeather =
        showWeather && isForecastPayload(weatherCache[weatherKey])
          ? weatherCache[weatherKey]
          : null;
      var forecastSlot = "";
      if (showWeather) {
        if (cachedWeather) {
          forecastSlot =
            '<div class="detail-forecast">' +
            detailForecastMarkup(cachedWeather) +
            "</div>";
        } else {
          forecastSlot =
            '<div class="detail-forecast is-pending" aria-busy="true" aria-label="' +
            escapeHtml(t("weather")) +
            '">' +
            forecastPendingMarkup() +
            "</div>";
        }
      }
      var aside = [];
      aside.push(
        '<div class="detail-status">' +
          '<p class="detail-address" aria-label="' +
          escapeHtml(t("address")) +
          '"></p>' +
          "</div>"
      );
      if (forecastSlot) {
        aside.push(forecastSlot);
      }
      if (place.badges && place.badges.length) {
        aside.push(badgeHtml(place.badges));
      }
      var facts = [];
      if (place.useTime) {
        facts.push(
          '<li><span class="detail-fact-label">' +
            escapeHtml(t("fact.hours")) +
            "</span><span>" +
            escapeHtml(place.useTime) +
            "</span></li>"
        );
      }
      if (place.restDate) {
        facts.push(
          '<li><span class="detail-fact-label">' +
            escapeHtml(t("fact.rest")) +
            "</span><span>" +
            escapeHtml(place.restDate) +
            "</span></li>"
        );
      }
      if (place.tel) {
        facts.push(
          '<li><span class="detail-fact-label">' +
            escapeHtml(t("fact.phone")) +
            "</span><span>" +
            escapeHtml(place.tel) +
            "</span></li>"
        );
      }
      if (place.homepage) {
        var href = place.homepage.indexOf("http") === 0 ? place.homepage : "";
        facts.push(
          '<li><span class="detail-fact-label">' +
            escapeHtml(t("fact.web")) +
            "</span><span>" +
            (href
              ? '<a href="' +
                escapeHtml(href) +
                '" target="_blank" rel="noopener noreferrer">' +
                escapeHtml(place.homepage) +
                "</a>"
              : escapeHtml(place.homepage)) +
            "</span></li>"
        );
      }
      if (facts.length) {
        aside.push('<ul class="detail-facts">' + facts.join("") + "</ul>");
      }
      var parts = [];
      parts.push(
        '<div class="detail-top">' +
          '<div class="detail-hero"><img alt="" referrerpolicy="no-referrer" src="' +
          placeThumbSrc(place) +
          '"></div>' +
          '<div class="detail-aside">' +
          aside.join("") +
          "</div>" +
          "</div>"
      );
      var overview = place.overview || place.summary || "";
      if (overview) {
        parts.push(
          '<p class="detail-overview">' + escapeHtml(overview) + "</p>"
        );
      }
      parts.push('<ul class="detail-extra" hidden></ul>');
      detailBody.innerHTML = parts.join("");
      var hero = detailBody.querySelector(".detail-hero img");
      bindThumbFallback(hero, place);
      fillDetailExtra(place, snapshotAddress(place));
      loadPlaceAddress(place, lat, lng, seq);
      if (showWeather && !cachedWeather) {
        loadPlaceWeather(lat, lng, seq);
      }
      sheet.hidden = true;
      detailSheet.hidden = false;
      setSheetState(sheetState === "collapsed" ? "mid" : sheetState);
    }

    function closePlaceDetail() {
      if (!detailSheet || detailSheet.hidden) {
        return false;
      }
      clearDetailWeather();
      restoreDetailCamera();
      detailPlace = null;
      detailGeocodedAddress = "";
      detailSheet.hidden = true;
      detailSheet.style.height = "";
      detailBody.innerHTML = "";
      if (catalogKind || placeItems.length) {
        sheet.hidden = false;
      }
      setSheetState(sheetState);
      return true;
    }

    function visibleSheetEl() {
      if (detailSheet && !detailSheet.hidden) {
        return detailSheet;
      }
      return sheet;
    }

    function showSheet() {
      closePlaceDetail();
      sheet.hidden = false;
      setSheetState("mid");
    }

    function hideSheet() {
      closePlaceDetail();
      sheet.hidden = true;
      sheet.style.height = "";
      setSheetState("mid");
      placeList.innerHTML = "";
    }

    function setSheetState(state) {
      sheetState = state;
      [sheet, detailSheet].forEach(function (el) {
        if (!el) {
          return;
        }
        el.classList.remove("is-collapsed", "is-mid", "is-expanded");
        el.classList.add("is-" + state);
        el.style.height = "";
      });
      var label = sheetStateLabel(state);
      sheetToggle.setAttribute("aria-label", label);
      if (detailToggle) {
        detailToggle.setAttribute("aria-label", label);
      }
      if (state === "expanded") {
        closeLayersPanel();
      }
    }

    function sheetStateLabel(state) {
      if (state === "collapsed") {
        return t("sheetToggleMid");
      }
      if (state === "mid") {
        return t("sheetToggleMax");
      }
      return t("sheetToggleCollapse");
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
      var rowExtra = isCompactMap() ? 48 : 44;
      if (tourismGroupsEl && !tourismGroupsEl.hidden) {
        top += rowExtra;
      }
      if (tourismCat3Row && !tourismCat3Row.hidden) {
        top += rowExtra;
      }
      var right = isCompactMap() ? 56 : 110;
      var left = isCompactMap() ? 16 : 24;
      var bottom = 24;

      if (forResults || !visibleSheetEl().hidden) {
        var panel = visibleSheetEl();
        var sheetHeight = !panel.hidden
          ? panel.getBoundingClientRect().height
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

    function closeLangPanel() {
      var tools = document.getElementById("map-tools");
      var toggle = document.getElementById("lang-toggle");
      if (!tools || !tools.classList.contains("is-lang-open")) {
        return false;
      }
      tools.classList.remove("is-lang-open");
      if (toggle) {
        toggle.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
      return true;
    }

    function sheetSnapHeights() {
      var grab = visibleSheetEl() === detailSheet ? detailGrab : sheetGrab;
      var collapsed = grab.getBoundingClientRect().height;
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
      var panels = [
        { grab: sheetGrab, toggle: sheetToggle, panel: sheet },
        { grab: detailGrab, toggle: detailToggle, panel: detailSheet },
      ];

      function cycleSheet() {
        if (skipClick) {
          skipClick = false;
          return;
        }
        var current = SHEET_STATES.indexOf(sheetState);
        setSheetState(SHEET_STATES[(current + 1) % SHEET_STATES.length]);
      }

      panels.forEach(function (entry) {
        if (!entry.grab || !entry.toggle || !entry.panel) {
          return;
        }

        entry.toggle.addEventListener("click", cycleSheet);

        entry.grab.addEventListener("pointerdown", function (event) {
          if (event.button && event.button !== 0) {
            return;
          }
          if (event.target.closest(".sheet-back")) {
            return;
          }
          var panel = entry.panel;
          drag = {
            pointerId: event.pointerId,
            startY: event.clientY,
            startHeight: panel.getBoundingClientRect().height,
            moved: false,
            panel: panel,
            grab: entry.grab,
          };
          entry.grab.setPointerCapture(event.pointerId);
          panel.classList.add("is-dragging");
        });

        entry.grab.addEventListener("pointermove", function (event) {
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
          drag.panel.classList.remove("is-collapsed");
          drag.panel.style.height = nextHeight + "px";
        });

        function endDrag(event) {
          if (!drag || event.pointerId !== drag.pointerId) {
            return;
          }
          var moved = drag.moved;
          var height = drag.panel.getBoundingClientRect().height;
          drag.panel.classList.remove("is-dragging");
          if (moved) {
            skipClick = true;
            setSheetState(nearestSheetState(height));
          }
          drag = null;
        }

        entry.grab.addEventListener("pointerup", endDrag);
        entry.grab.addEventListener("pointercancel", endDrag);
      });
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
      attractionMode = null;
      catalogKind = null;
      hideNearbyAttractionsOption();
      hideTourismFilters();
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
        showDialog(t("geoUnavailableTitle"), t("geoUnavailable"));
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
          var message = t("geoError");

          if (error && error.code === error.PERMISSION_DENIED) {
            message = t("geoDenied");
          } else if (error && error.code === error.POSITION_UNAVAILABLE) {
            message = t("geoUnavailableInfo");
          } else if (error && error.code === error.TIMEOUT) {
            message = t("geoTimeout");
          }

          showDialog(t("geoErrorTitle"), message);
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
        if (attractionMode) {
          return;
        }
        if (lastSearchNearby && placeItems.length) {
          applyFilterClustering(true);
        }
      });

      kakao.maps.event.addListener(map, "idle", function () {
        updateAreaInfo();

        if (skipIdleOnce) {
          skipIdleOnce = false;
          if (attractionMode) {
            rebuildAttractionOverlays(false);
          }
          return;
        }

        if (attractionMode) {
          rebuildAttractionOverlays(true);
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

    function applyI18n() {
      MapI18n.applyStatic();
      var lang = MapI18n.getLang();
      var toggle = document.getElementById("lang-toggle");
      if (toggle) {
        toggle.textContent = MapI18n.LANG_CODES[lang] || "한";
      }
      document.querySelectorAll(".lang-option").forEach(function (button) {
        var on = button.getAttribute("data-lang") === lang;
        button.setAttribute("aria-pressed", on ? "true" : "false");
      });
      if (catalogKind === "tourism") {
        refreshTourismFilterChips();
      }
      if (detailPlace && detailSheet && !detailSheet.hidden) {
        openPlaceDetail(detailPlace);
      } else if (catalogKind && sheet && !sheet.hidden) {
        var all = attractionWorkingSet();
        var inView = placesInMapBounds(all);
        renderAttractionList(
          placeItems.map(function (item) {
            return item.place;
          }),
          inView.length,
          all.length
        );
      } else if (sheet && !sheet.hidden && activeSearchKeyword) {
        renderPlaceList(
          placeItems.map(function (item) {
            return item.place;
          }),
          t("searchResults", { q: activeSearchKeyword })
        );
      }
      clusterItems.forEach(function (cluster) {
        cluster.el.setAttribute(
          "aria-label",
          t("clusterZoom", { n: cluster.count })
        );
      });
      var sheetLabel = sheetStateLabel(sheetState);
      sheetToggle.setAttribute("aria-label", sheetLabel);
      if (detailToggle) {
        detailToggle.setAttribute("aria-label", sheetLabel);
      }
    }

    function bindMapTools() {
      var tools = document.getElementById("map-tools");
      var layersToggle = document.getElementById("layers-toggle");
      var langToggle = document.getElementById("lang-toggle");
      var layersIgnoreUntil = 0;
      var langIgnoreUntil = 0;

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
          closeLangPanel();
          var open = !tools.classList.contains("is-layers-open");
          tools.classList.toggle("is-layers-open", open);
          layersToggle.classList.toggle("is-open", open);
          layersToggle.setAttribute("aria-expanded", open ? "true" : "false");
          if (open) {
            layersIgnoreUntil = Date.now() + 400;
          }
        }
      );

      langToggle.addEventListener(
        "click",
        function (event) {
          event.preventDefault();
          event.stopPropagation();
          closeLayersPanel();
          var open = !tools.classList.contains("is-lang-open");
          tools.classList.toggle("is-lang-open", open);
          langToggle.classList.toggle("is-open", open);
          langToggle.setAttribute("aria-expanded", open ? "true" : "false");
          if (open) {
            langIgnoreUntil = Date.now() + 400;
          }
        }
      );

      document.querySelectorAll(".lang-option").forEach(function (button) {
        button.addEventListener("click", function () {
          var next = button.getAttribute("data-lang");
          if (!next || next === MapI18n.getLang()) {
            closeLangPanel();
            return;
          }
          MapI18n.setLang(next);
          applyI18n();
          closeLangPanel();
        });
      });

      document.addEventListener(
        "pointerdown",
        function (event) {
          var layersOpen = tools.classList.contains("is-layers-open");
          var langOpen = tools.classList.contains("is-lang-open");
          if (!layersOpen && !langOpen) {
            return;
          }
          if (eventInsideMapTools(event)) {
            return;
          }
          if (layersOpen && Date.now() >= layersIgnoreUntil) {
            closeLayersPanel();
          }
          if (langOpen && Date.now() >= langIgnoreUntil) {
            closeLangPanel();
          }
        },
        true
      );

      window.addEventListener("resize", function () {
        if (!isCompactMap()) {
          closeLayersPanel();
          closeLangPanel();
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
