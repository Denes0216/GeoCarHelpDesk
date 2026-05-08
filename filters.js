(function () {
  const countries = window.COUNTRY_FILTER_DATA || [];
  const labels = window.LINE_PATTERN_LABELS || {};

  const searchInput = document.getElementById("countrySearch");
  const dropdown    = document.getElementById("countryDropdown");

  const controls = {
    drivingSide:      document.getElementById("drivingSideFilter"),
    euPlate:          document.getElementById("euPlateFilter"),
    lineMarking:      document.getElementById("lineMarkingFilter"),
    year:             document.getElementById("year"),
    cameraGeneration: document.getElementById("cameraGenerationFilter"),
    hemisphere:       document.getElementById("hemisphereFilter"),
    carColor:         document.getElementById("carColorFilter"),
    vehicleType:      document.getElementById("vehicleTypeFilter"),
  };
  const resultCount    = document.getElementById("resultCount");
  const countryResults = document.getElementById("countryResults");

  // Populate line marking options with human-readable labels
  const lineMarkingOptions = [...new Set(countries.flatMap((c) => c.lineMarkings || []))].sort();
  controls.lineMarking.append(
    ...lineMarkingOptions.map((pattern) => {
      const option = document.createElement("option");
      option.value = pattern;
      option.textContent = labels[pattern] || pattern;
      return option;
    })
  );

  Object.values(controls).forEach((control) => {
    control.addEventListener("input", renderResults);
    control.addEventListener("change", renderResults);
  });

  document.getElementById("resetFilters").addEventListener("click", () => {
    Object.values(controls).forEach((control) => {
      control.value = control.tagName === "INPUT" ? "" : "any";
    });
    searchInput.value = "";
    dropdown.hidden = true;
    renderResults();
  });

  function fuzzyScore(query, name) {
    const q = query.toLowerCase();
    const n = name.toLowerCase();
    if (n.startsWith(q)) return 0;
    if (n.includes(q)) return 1;
    let qi = 0;
    for (let i = 0; i < n.length && qi < q.length; i++) {
      if (n[i] === q[qi]) qi++;
    }
    return qi === q.length ? 2 : Infinity;
  }

  function buildDropdown(query) {
    if (!query) { dropdown.hidden = true; return; }
    const matches = countries
      .map((c) => ({ name: c.country, score: fuzzyScore(query, c.country) }))
      .filter((m) => m.score < Infinity)
      .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name))
      .slice(0, 20);
    if (!matches.length) { dropdown.hidden = true; return; }
    dropdown.replaceChildren(
      ...matches.map(({ name }) => {
        const li = document.createElement("li");
        li.textContent = name;
        li.addEventListener("mousedown", (e) => {
          e.preventDefault();
          searchInput.value = name;
          dropdown.hidden = true;
          renderResults();
        });
        return li;
      })
    );
    dropdown.hidden = false;
  }

  searchInput.addEventListener("input", () => {
    buildDropdown(searchInput.value.trim());
    renderResults();
  });

  searchInput.addEventListener("focus", () => {
    if (searchInput.value.trim()) buildDropdown(searchInput.value.trim());
  });

  searchInput.addEventListener("blur", () => {
    dropdown.hidden = true;
  });

  function booleanMatches(value, filterValue) {
    if (filterValue === "any") return true;
    if (filterValue === "unknown") return value === null || value === undefined;
    if (value === null || value === undefined) return false;
    return value === (filterValue === "yes");
  }

  function yearsMatch(countryYears, filterYear) {
    if (filterYear < 2009) return countryYears;
    if (!countryYears.length) return false;
    return countryYears.some((year) => year == filterYear);
  }

  function countryMatches(country) {
    const query = searchInput.value.trim();
    if (query && fuzzyScore(query, country.country) === Infinity) return false;

    const year             = Number(controls.year.value);
    const cameraGeneration = controls.cameraGeneration.value;
    const hemisphere       = controls.hemisphere.value;
    const carColor         = controls.carColor.value;
    const vehicleType      = controls.vehicleType.value;

    return (
      (controls.drivingSide.value === "any" || country.drivingSide === controls.drivingSide.value) &&
      booleanMatches(country.euLicencePlate, controls.euPlate.value) &&
      (controls.lineMarking.value === "any" || country.lineMarkings.includes(controls.lineMarking.value)) &&
      yearsMatch(country.coverageYears, year) &&
      (cameraGeneration === "any" || country.cameraGenerations.includes(Number(cameraGeneration))) &&
      (hemisphere === "any" || country.hemisphere === hemisphere || country.hemisphere === "both") &&
      (carColor === "any" || (country.carColors ?? ["white"]).includes(carColor)) &&
      (vehicleType === "any" || country.vehicleType === vehicleType)
    );
  }

  function yesNo(value) {
    if (value === null || value === undefined) return "Unknown";
    return value ? "Yes" : "No";
  }

  const LINE_COLOR_MAP = {
    white:  "#d0d0d0",
    yellow: "#f0c040",
    red:    "#d63c3c",
    blue:   "#2979c8",
    orange: "#e87a20",
    green:  "#3ea060",
  };

  function parseInsideColors(raw) {
    if (raw === "whiteyellow") return ["white", "yellow"];
    if (raw === "whitegreen")  return ["white", "green"];
    return [raw];
  }

  function roadLineSVG(pattern) {
    const [outside, insideRaw] = pattern.split("-");
    const insideColors = parseInsideColors(insideRaw);
    const oc = LINE_COLOR_MAP[outside] || "#d0d0d0";
    const W = 100, H = 20, edgeW = 5, cx = W / 2;

    let dashes = "";
    if (insideColors.length === 1) {
      const ic = LINE_COLOR_MAP[insideColors[0]] || "#d0d0d0";
      dashes = `<line x1="${cx}" y1="0" x2="${cx}" y2="${H}" stroke="${ic}" stroke-width="3" stroke-dasharray="6 4"/>`;
    } else {
      insideColors.forEach((col, i) => {
        const x = cx + (i === 0 ? -3.5 : 3.5);
        const ic = LINE_COLOR_MAP[col] || "#d0d0d0";
        dashes += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${ic}" stroke-width="2" stroke-dasharray="6 4"/>`;
      });
    }

    const label = labels[pattern] || pattern;
    return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" class="road-line-svg" role="img" aria-label="${label}" title="${label}">` +
      `<rect width="${W}" height="${H}" fill="#15191e" rx="3"/>` +
      `<rect x="0" y="0" width="${edgeW}" height="${H}" fill="${oc}"/>` +
      `<rect x="${W - edgeW}" y="0" width="${edgeW}" height="${H}" fill="${oc}"/>` +
      dashes +
      `</svg>`;
  }

  function roadLineMarkings(markings) {
    if (!markings || !markings.length) return "No data";
    return `<span class="roadline-row">${markings.map(roadLineSVG).join("")}</span>`;
  }

  function listValue(values) {
    return values.length ? values.join(", ") : "No data";
  }

  const COLOR_CSS = {
    white:   "#e8e8e8",
    black:   "#1c1c1c",
    red:     "#d63c3c",
    blue:    "#2979c8",
    gray:    "#8a9099",
    striped: null,
  };

  function colorSwatches(colors) {
    const items = (colors && colors.length ? colors : ["white"]);
    return items.map((c) => {
      const bg = COLOR_CSS[c];
      const style = bg
        ? `background:${bg}`
        : `background:repeating-linear-gradient(135deg,#d0d0d0 0px,#d0d0d0 4px,#1c1c1c 4px,#1c1c1c 8px)`;
      return `<span class="color-swatch" style="${style}" title="${c}"></span>`;
    }).join("");
  }

  let _svgId = 0;

  function drivingSideSVG(side) {
    if (!side) return '<span style="color:var(--muted)">Unknown</span>';
    const W = 52, H = 18, cx = W / 2;
    const carW = 12, carH = 10, carX = side === "left" ? W * 0.25 : W * 0.75;
    const otherX = side === "left" ? W * 0.75 : W * 0.25;
    const carY = (H - carH) / 2;
    const label = side === "left" ? "Left-hand traffic" : "Right-hand traffic";
    return (
      `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" class="driving-side-svg" title="${label}" role="img" aria-label="${label}">` +
      `<rect width="${W}" height="${H}" fill="#15191e" rx="3"/>` +
      `<line x1="${cx}" y1="2" x2="${cx}" y2="${H - 2}" stroke="#3a4048" stroke-width="1.5" stroke-dasharray="3 2"/>` +
      `<rect x="${carX - carW / 2}" y="${carY}" width="${carW}" height="${carH}" fill="#f0c040" rx="2"/>` +
      `<polygon points="${carX},${carY + 1} ${carX - 4},${carY + 6} ${carX + 4},${carY + 6}" fill="#15191e"/>` +
      `<rect x="${otherX - carW / 2}" y="${carY}" width="${carW}" height="${carH}" fill="#f0c040" rx="2"/>` +
      `<polygon points="${otherX},${carY + carH - 1} ${otherX - 4},${carY + carH - 6} ${otherX + 4},${carY + carH - 6}" fill="#15191e"/>` +
      `</svg>`
    );
  }

  const BOTH_SIDES_EU_PLATE = new Set(["Albania", "France", "Italy"]);

  function euStarDots(cx, cy) {
    let dots = "";
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      dots += `<circle cx="${(cx + 3.2 * Math.cos(a)).toFixed(1)}" cy="${(cy + 3.2 * Math.sin(a)).toFixed(1)}" r="0.9" fill="#ffcc00"/>`;
    }
    return dots;
  }

  function plateSVG(countryName, hasEuPlate) {
    const W = 60, H = 20, stripW = 10;
    const cid = `psvg${++_svgId}`;
    const clip = `<defs><clipPath id="${cid}"><rect width="${W}" height="${H}" rx="3"/></clipPath></defs>`;

    if (hasEuPlate === null || hasEuPlate === undefined) {
      return (
        `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" class="plate-svg" title="Unknown" role="img" aria-label="EU plate unknown">` +
        clip + `<g clip-path="url(#${cid})"><rect width="${W}" height="${H}" fill="#2a2f36"/></g>` +
        `<text x="${W / 2}" y="${H / 2 + 4}" text-anchor="middle" font-size="10" fill="#6b7280" font-family="sans-serif">?</text>` +
        `</svg>`
      );
    }

    if (!hasEuPlate) {
      return (
        `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" class="plate-svg" title="No EU blue plate" role="img" aria-label="No EU blue plate">` +
        clip + `<g clip-path="url(#${cid})"><rect width="${W}" height="${H}" fill="#f0f0f0"/></g>` +
        `</svg>`
      );
    }

    const bothSides = BOTH_SIDES_EU_PLATE.has(countryName);
    const label = bothSides ? "EU blue plate (both sides)" : "EU blue plate";
    const strips = bothSides
      ? `<rect x="0" y="0" width="${stripW}" height="${H}" fill="#003399"/>` +
        euStarDots(stripW / 2, H / 2) +
        `<rect x="${W - stripW}" y="0" width="${stripW}" height="${H}" fill="#003399"/>`
      : `<rect x="0" y="0" width="${stripW}" height="${H}" fill="#003399"/>` +
        euStarDots(stripW / 2, H / 2);

    return (
      `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" class="plate-svg" title="${label}" role="img" aria-label="${label}">` +
      clip + `<g clip-path="url(#${cid})"><rect width="${W}" height="${H}" fill="#f0f0f0"/>${strips}</g>` +
      `</svg>`
    );
  }

  function makeCustomSelect(nativeSelect, renderOption) {
    nativeSelect.style.display = "none";

    const listeners = { change: [], input: [] };
    let _value = nativeSelect.value;

    const proxy = {
      get value() { return _value; },
      set value(v) { _value = v; nativeSelect.value = v; updateTrigger(); },
      tagName: "CUSTOM-SELECT",
      addEventListener(type, fn) { if (listeners[type]) listeners[type].push(fn); },
    };

    function emit(type) { (listeners[type] || []).forEach((fn) => fn()); }

    const wrapper = document.createElement("div");
    wrapper.className = "custom-select-wrapper";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "custom-select-trigger";

    const panel = document.createElement("ul");
    panel.className = "custom-select-panel";
    panel.hidden = true;

    function updateTrigger() {
      trigger.innerHTML = renderOption(_value);
    }

    function openPanel() {
      panel.innerHTML = "";
      Array.from(nativeSelect.options).forEach((opt) => {
        const li = document.createElement("li");
        li.className = "custom-select-option" + (_value === opt.value ? " is-selected" : "");
        li.innerHTML = renderOption(opt.value);
        li.addEventListener("mousedown", (e) => {
          e.preventDefault();
          proxy.value = opt.value;
          panel.hidden = true;
          emit("change");
        });
        panel.appendChild(li);
      });
      panel.hidden = false;
    }

    trigger.addEventListener("click", () => {
      if (panel.hidden) openPanel(); else panel.hidden = true;
    });

    document.addEventListener("click", (e) => {
      if (!wrapper.contains(e.target)) panel.hidden = true;
    }, true);

    wrapper.appendChild(trigger);
    wrapper.appendChild(panel);
    nativeSelect.insertAdjacentElement("afterend", wrapper);

    updateTrigger();
    return proxy;
  }

  function yearValue(years) {
    if (!years.length) return "No data";
    return `${years[0]}–${years[years.length - 1]}`;
  }

  function renderResults() {
    const matches = countries.filter(countryMatches);
    resultCount.textContent = `${matches.length} ${matches.length === 1 ? "country" : "countries"}`;

    countryResults.replaceChildren(
      ...matches.map((country) => {
        const card = document.createElement("article");
        card.className = "country-card";
        card.innerHTML = `
          <h3>${country.country}</h3>
          <dl>
            <div><dt>Driving side</dt><dd>${drivingSideSVG(country.drivingSide)}</dd></div>
            <div><dt>EU blue plate</dt><dd>${plateSVG(country.country, country.euLicencePlate)}</dd></div>
            <div><dt>Line markings</dt><dd>${roadLineMarkings(country.lineMarkings)}</dd></div>
            <div><dt>Coverage</dt><dd>${yearValue(country.coverageYears)}</dd></div>
            <div><dt>Camera gen</dt><dd>${listValue(country.cameraGenerations)}</dd></div>
            <div><dt>Car color</dt><dd class="color-swatch-row">${colorSwatches(country.carColors)}</dd></div>
            <div><dt>Vehicle type</dt><dd>${country.vehicleType ?? "car"}</dd></div>
          </dl>
        `;
        return card;
      })
    );
  }

  controls.drivingSide = makeCustomSelect(
    document.getElementById("drivingSideFilter"),
    (v) => v === "any"
      ? '<span class="csd-text">Any</span>'
      : `${drivingSideSVG(v)}<span class="csd-text">${v === "left" ? "Left" : "Right"}</span>`
  );

  controls.lineMarking = makeCustomSelect(
    document.getElementById("lineMarkingFilter"),
    (v) => v === "any"
      ? '<span class="csd-text">Any</span>'
      : roadLineSVG(v)
  );

  [controls.drivingSide, controls.lineMarking].forEach((ctrl) => {
    ctrl.addEventListener("change", renderResults);
  });

  renderResults();
})();
