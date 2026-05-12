(function () {
  const plates = window.US_PLATES || [];

  const byState = Object.create(null);
  for (const p of plates) {
    if (!byState[p.state]) byState[p.state] = [];
    byState[p.state].push(p);
  }

  const ALL_COLORS = ["white", "yellow", "blue", "green", "red", "multicolor"];
  const GEO_NAME   = { "District of Columbia": "Washington DC" };

  let activeColors = new Set();
  let geoLayer     = null;

  const plateCountEl = document.getElementById("plateCount");
  const galleryEl    = document.getElementById("stateGallery");
  const panelEl      = document.getElementById("platePanel");
  const handleEl     = document.getElementById("sheetHandle");

  const map = L.map("usMap", {
    center: [38, -96],
    zoom: 4,
    zoomControl: true,
    attributionControl: true,
  });

  function dataName(geoName) {
    return GEO_NAME[geoName] || geoName;
  }

  function matchesFilters(p) {
    if (activeColors.size > 0 && !activeColors.has(p.color)) return false;
    return true;
  }

  function styleState(name) {
    const total    = (byState[name] || []).length;
    const matching = (byState[name] || []).filter(matchesFilters).length;
    if (matching > 0) {
      return { fillColor: "#314252", fillOpacity: 0.82, color: "#4a5a68", weight: 1 };
    }
    if (total > 0) {
      return { fillColor: "#1e2830", fillOpacity: 0.38, color: "#2a3540", weight: 1 };
    }
    return { fillColor: "#161d25", fillOpacity: 0.28, color: "#222a32", weight: 1 };
  }

  function refreshStyles() {
    if (!geoLayer) return;
    geoLayer.eachLayer(layer => {
      layer.setStyle(styleState(dataName(layer.feature.properties.name)));
    });
  }

  function renderGallery() {
    const matching = plates.filter(matchesFilters);
    plateCountEl.textContent = `${matching.length} plate${matching.length !== 1 ? "s" : ""}`;

    if (!matching.length) {
      galleryEl.innerHTML = '<p class="message-card">No plates match the current filter.</p>';
      return;
    }

    galleryEl.replaceChildren(...matching.map(p => {
      const card = document.createElement("div");
      card.className = "plate-card";
      card.innerHTML = `
        <div class="plate-card-img">
          <img src="data/us-plates/${p.file}" alt="${p.state} — ${p.label}" loading="lazy">
        </div>
        <div class="plate-card-info">
          <span class="plate-state">${p.state}</span>
          <span class="plate-label">${p.label}</span>
        </div>
      `;
      return card;
    }));
  }

  fetch("us-states.geo.json")
    .then(r => r.json())
    .then(data => {
      geoLayer = L.geoJSON(data, {
        style: feature => styleState(dataName(feature.properties.name)),
        onEachFeature: (feature, layer) => {
          const name = dataName(feature.properties.name);
          layer.on("mouseover", () => {
            layer.setStyle({ fillColor: "#f4c95d", fillOpacity: 0.22, color: "#f4c95d", weight: 1.5 });
          });
          layer.on("mouseout", () => layer.setStyle(styleState(name)));
        },
      }).addTo(map);
      map.fitBounds([[23, -128], [50, -65]], { padding: [10, 10] });
    });

  function updateColorButtons() {
    document.querySelectorAll(".plate-filter-btn[data-color]").forEach(btn => {
      const c = btn.dataset.color;
      btn.classList.toggle("is-active", c === "all" ? activeColors.size === 0 : activeColors.has(c));
    });
  }

  document.querySelectorAll(".plate-filter-btn[data-color]").forEach(btn => {
    btn.addEventListener("click", () => {
      const color = btn.dataset.color;
      if (color === "all") {
        activeColors.clear();
      } else {
        activeColors.has(color) ? activeColors.delete(color) : activeColors.add(color);
        if (activeColors.size === ALL_COLORS.length) activeColors.clear();
      }
      updateColorButtons();
      refreshStyles();
      renderGallery();
    });
  });

  // Mobile bottom-sheet drag
  let dragStartY  = null;
  let dragWasOpen = false;

  handleEl.addEventListener("pointerdown", e => {
    dragStartY  = e.clientY;
    dragWasOpen = panelEl.classList.contains("is-open");
    panelEl.classList.add("is-dragging");
    handleEl.setPointerCapture(e.pointerId);
  });

  handleEl.addEventListener("pointermove", e => {
    if (dragStartY === null) return;
    const dy     = e.clientY - dragStartY;
    const height = panelEl.getBoundingClientRect().height;
    const baseY  = dragWasOpen ? 0 : height - 52;
    const newY   = Math.max(0, Math.min(height - 52, baseY + dy));
    panelEl.style.transform = `translateY(${newY}px)`;
  });

  handleEl.addEventListener("pointerup", e => {
    if (dragStartY === null) return;
    const dy = e.clientY - dragStartY;
    panelEl.classList.remove("is-dragging");
    panelEl.style.transform = "";
    if (dragWasOpen ? dy > 80 : dy < -80) {
      panelEl.classList.toggle("is-open", !dragWasOpen);
    }
    dragStartY = null;
  });

  renderGallery();
})();
