(function () {
  const cars = window.GOOGLE_CARS || {};
  const countryName = document.getElementById("countryName");
  const vehicleCount = document.getElementById("vehicleCount");
  const gallery = document.getElementById("gallery");
  const coverageStat = document.getElementById("coverageStat");
  const vehiclePanel = document.getElementById("vehiclePanel");
  const sheetHandle = document.getElementById("sheetHandle");
  let currentRenderedName = "";
  let selectedLayer = null;
  let geoFeatures = [];
  const featureLayers = new WeakMap();

  const normalise = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const aliases = new Map(
    Object.entries({
      "Czechia": "Czech Republic",
      "Dem. Rep. Congo": "Democratic Republic of the Congo",
      "Dominican Rep.": "Dominican Republic",
      "Macedonia": "North Macedonia",
      "S. Sudan": "South Sudan",
      "Solomon Is.": "Solomon Islands",
      "Somaliland": "Somalia",
      "United States of America": "United States",
    }).map(([mapName, dataName]) => [normalise(mapName), dataName])
  );

  const dataByKey = new Map(Object.keys(cars).map((name) => [normalise(name), name]));
  const totalVehicles = Object.values(cars).reduce((sum, list) => sum + list.length, 0);
  coverageStat.textContent = `${totalVehicles} photos | ${Object.keys(cars).length} countries`;

  const territoryMarkers = [
    { name: "Christmas Island", latlng: [-10.4475, 105.6904] },
    { name: "Cocos (Keeling) Islands", latlng: [-12.1642, 96.871] },
    { name: "Gibraltar", latlng: [36.1408, -5.3536] },
    { name: "Réunion", latlng: [-21.1151, 55.5364] },
  ];

  const map = L.map("map", {
    zoomControl: false,
    worldCopyJump: true,
    minZoom: 2,
    maxZoom: 7,
  }).setView([18, 8], 2);

  L.control.zoom({ position: "bottomleft" }).addTo(map);

  function featureNames(feature) {
    const props = feature.properties || {};
    return [
      props.NAME,
      props.NAME_EN,
      props.ADMIN,
      props.SOVEREIGNT,
      props.BRK_NAME,
      props.FORMAL_EN,
      props.NAME_LONG,
    ].filter(Boolean);
  }

  function dataNameFor(feature) {
    for (const name of featureNames(feature)) {
      const key = normalise(name);
      if (dataByKey.has(key)) return dataByKey.get(key);
      if (aliases.has(key)) return aliases.get(key);
    }
    return null;
  }

  function styleFor(feature) {
    const hasCars = Boolean(dataNameFor(feature));
    return {
      color: hasCars ? "#7cc8bd" : "#26323d",
      weight: hasCars ? 0.9 : 0.5,
      fillColor: hasCars ? "#2f8f83" : "#314252",
      fillOpacity: hasCars ? 0.74 : 0.42,
    };
  }

  function selectLayer(layer, name, displayName) {
    if (selectedLayer && selectedLayer !== layer) {
      countryLayer.resetStyle(selectedLayer);
    }

    selectedLayer = layer;
    layer.setStyle({
      color: "#f4c95d",
      weight: 2,
      fillColor: name ? "#f4c95d" : "#45515e",
      fillOpacity: name ? 0.9 : 0.52,
    });

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
      layer.bringToFront();
    }

    name ? renderCountry(name) : renderEmpty(displayName);
  }

  function openVehiclePanel() {
    vehiclePanel.classList.add("is-open");
    vehiclePanel.style.transform = "";
  }

  function closeVehiclePanel() {
    vehiclePanel.classList.remove("is-open");
    vehiclePanel.style.transform = "";
  }

  function lngInRange(lng, west, east) {
    if (west <= east) return lng >= west && lng <= east;
    return lng >= west || lng <= east;
  }

  function featureBounds(feature) {
    if (feature._bounds) return feature._bounds;

    const bounds = {
      west: 180,
      east: -180,
      south: 90,
      north: -90,
    };

    function visitCoordinate(coordinate) {
      const lng = coordinate[0];
      const lat = coordinate[1];
      bounds.west = Math.min(bounds.west, lng);
      bounds.east = Math.max(bounds.east, lng);
      bounds.south = Math.min(bounds.south, lat);
      bounds.north = Math.max(bounds.north, lat);
    }

    function visitRing(ring) {
      ring.forEach(visitCoordinate);
    }

    if (feature.geometry.type === "Polygon") {
      feature.geometry.coordinates.forEach(visitRing);
    } else if (feature.geometry.type === "MultiPolygon") {
      feature.geometry.coordinates.forEach((polygon) => polygon.forEach(visitRing));
    }

    feature._bounds = bounds;
    return bounds;
  }

  function pointInRing(latlng, ring) {
    const x = latlng.lng;
    const y = latlng.lat;
    let inside = false;

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0];
      const yi = ring[i][1];
      const xj = ring[j][0];
      const yj = ring[j][1];
      const crosses = yi > y !== yj > y;

      if (crosses) {
        const xIntersect = ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (x < xIntersect) inside = !inside;
      }
    }

    return inside;
  }

  function pointInPolygon(latlng, polygon) {
    if (!pointInRing(latlng, polygon[0])) return false;
    return !polygon.slice(1).some((hole) => pointInRing(latlng, hole));
  }

  function featureAt(latlng) {
    const point = {
      lat: latlng.lat,
      lng: ((latlng.lng + 540) % 360) - 180,
    };

    return geoFeatures.find((feature) => {
      const bounds = featureBounds(feature);
      if (
        point.lat < bounds.south ||
        point.lat > bounds.north ||
        !lngInRange(point.lng, bounds.west, bounds.east)
      ) {
        return false;
      }

      if (feature.geometry.type === "Polygon") {
        return pointInPolygon(point, feature.geometry.coordinates);
      }

      if (feature.geometry.type === "MultiPolygon") {
        return feature.geometry.coordinates.some((polygon) => pointInPolygon(point, polygon));
      }

      return false;
    });
  }

  function selectFeatureAt(latlng) {
    const feature = featureAt(latlng);
    if (!feature) return;

    const layer = featureLayers.get(feature);
    if (!layer) return;

    const name = dataNameFor(feature);
    const displayName = name || feature.properties.NAME_EN || feature.properties.NAME || "Unknown";
    selectLayer(layer, name, displayName);
  }

  function renderCountry(name) {
    openVehiclePanel();
    if (currentRenderedName === name) return;
    currentRenderedName = name;

    const list = cars[name] || [];
    countryName.textContent = name;
    vehicleCount.textContent = `${list.length} ${list.length === 1 ? "car" : "cars"}`;
    gallery.hidden = false;

    gallery.replaceChildren(
      ...list.map((vehicle, index) => {
        const card = document.createElement("article");
        card.className = "vehicle-card";

        const img = document.createElement("img");
        img.src = vehicle.image;
        img.alt = `${name} Google car ${index + 1}`;
        img.loading = index < 2 ? "eager" : "lazy";

        const link = document.createElement("a");
        link.href = vehicle.maps;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.innerHTML = `<strong>Open in Google Maps</strong><span>#${index + 1}</span>`;

        card.append(img, link);
        return card;
      })
    );
  }

  function renderEmpty(name) {
    openVehiclePanel();
    if (currentRenderedName === name) return;
    currentRenderedName = name;

    countryName.textContent = name || "No vehicle photos";
    vehicleCount.textContent = "0 cars";
    gallery.hidden = true;
    gallery.replaceChildren();
  }

  function onEachCountry(feature, layer) {
    const name = dataNameFor(feature);
    const displayName = name || feature.properties.NAME_EN || feature.properties.NAME || "Unknown";
    const selectCountry = () => selectLayer(layer, name, displayName);
    featureLayers.set(feature, layer);

    layer.bindTooltip(displayName, {
      direction: "top",
      sticky: true,
      opacity: 0.92,
    });

    layer.on({
      mouseout: () => {
        if (selectedLayer !== layer) {
          countryLayer.resetStyle(layer);
        }
      },
      click: selectCountry,
      touchstart: selectCountry,
    });
  }

  let countryLayer;

  let dragStartY = 0;
  let dragDistance = 0;
  let isDraggingSheet = false;

  sheetHandle.addEventListener("click", () => {
    if (vehiclePanel.classList.contains("is-open")) {
      closeVehiclePanel();
    } else if (currentRenderedName) {
      openVehiclePanel();
    }
  });

  sheetHandle.addEventListener("pointerdown", (event) => {
    isDraggingSheet = true;
    dragStartY = event.clientY;
    dragDistance = 0;
    sheetHandle.setPointerCapture(event.pointerId);
    vehiclePanel.classList.add("is-dragging");
  });

  sheetHandle.addEventListener("pointermove", (event) => {
    if (!isDraggingSheet || !vehiclePanel.classList.contains("is-open")) return;
    dragDistance = Math.max(0, event.clientY - dragStartY);
    vehiclePanel.style.transform = `translateY(${dragDistance}px)`;
  });

  sheetHandle.addEventListener("pointerup", () => {
    if (!isDraggingSheet) return;
    isDraggingSheet = false;
    vehiclePanel.classList.remove("is-dragging");

    if (dragDistance > 90) {
      closeVehiclePanel();
    } else {
      openVehiclePanel();
    }
  });

  sheetHandle.addEventListener("pointercancel", () => {
    isDraggingSheet = false;
    vehiclePanel.classList.remove("is-dragging");
    vehiclePanel.style.transform = "";
  });

  fetch("countries.geo.json")
    .then((response) => {
      if (!response.ok) throw new Error("Could not load country geometry");
      return response.json();
    })
    .then((geojson) => {
      geoFeatures = geojson.features || [];
      countryLayer = L.geoJSON(geojson, {
        style: styleFor,
        onEachFeature: onEachCountry,
      }).addTo(map);

      territoryMarkers.forEach((territory) => {
        if (!cars[territory.name]) return;
        const marker = L.circleMarker(territory.latlng, {
          radius: 6,
          color: "#f4c95d",
          weight: 2,
          fillColor: "#f4c95d",
          fillOpacity: 0.86,
        }).addTo(map);

        marker.bindTooltip(territory.name, {
          direction: "top",
          offset: [0, -8],
          opacity: 0.92,
        });
        marker.on("click", () => renderCountry(territory.name));
      });

      map.fitBounds(countryLayer.getBounds(), { padding: [12, 12] });

      const mapElement = map.getContainer();

      mapElement.addEventListener("click", (event) => {
        selectFeatureAt(map.mouseEventToLatLng(event));
      });
    })
    .catch((error) => {
      countryName.textContent = "Map failed to load";
      vehicleCount.textContent = "0 cars";
      gallery.hidden = false;
      gallery.replaceChildren();

      const message = document.createElement("article");
      message.className = "vehicle-card message-card";
      message.textContent = `${error.message}. Run this page from a local web server so the GeoJSON can be fetched.`;
      gallery.append(message);
      openVehiclePanel();
    });
})();
