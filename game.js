(function () {
  const countries = window.COUNTRY_FILTER_DATA || [];
  const lineLabels = window.LINE_PATTERN_LABELS || {};

  // ── SVG helpers (mirrors filters.js) ────────────────────────────────────
  let _svgId = 0;

  function drivingSideSVG(side) {
    const W = 52, H = 18, cx = W / 2;
    const carW = 12, carH = 10, carX = side === "left" ? W * 0.25 : W * 0.75;
    const otherX = side === "left" ? W * 0.75 : W * 0.25;
    const carY = (H - carH) / 2;
    const label = side === "left" ? "Left-hand traffic" : "Right-hand traffic";
    return (
      `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" class="driving-side-svg" title="${label}">` +
      `<rect width="${W}" height="${H}" fill="#15191e" rx="3"/>` +
      `<line x1="${cx}" y1="2" x2="${cx}" y2="${H - 2}" stroke="#3a4048" stroke-width="1.5" stroke-dasharray="3 2"/>` +
      `<rect x="${carX - carW / 2}" y="${carY}" width="${carW}" height="${carH}" fill="#f0c040" rx="2"/>` +
      `<polygon points="${carX},${carY + 1} ${carX - 4},${carY + 6} ${carX + 4},${carY + 6}" fill="#15191e"/>` +
      `<rect x="${otherX - carW / 2}" y="${carY}" width="${carW}" height="${carH}" fill="#f0c040" rx="2"/>` +
      `<polygon points="${otherX},${carY + carH - 1} ${otherX - 4},${carY + carH - 6} ${otherX + 4},${carY + carH - 6}" fill="#15191e"/>` +
      `</svg>`
    );
  }

  function euStarDots(cx, cy) {
    let dots = "";
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      dots += `<circle cx="${(cx + 3.2 * Math.cos(a)).toFixed(1)}" cy="${(cy + 3.2 * Math.sin(a)).toFixed(1)}" r="0.9" fill="#ffcc00"/>`;
    }
    return dots;
  }

  const PLATE_LABEL = {
    "eu":              "EU blue plate",
    "eu-both":         "EU blue (both sides)",
    "eu-yellow-right": "EU blue + yellow right",
    "yellow-eu":       "Yellow + EU strip",
    "yellow":          "Yellow plate",
    "black":           "Black plate",
    "red-stripe":      "Red stripe (left)",
    "red":             "Red plate",
    "white":           "White plate",
  };

  const PLATE_BASE = {
    "eu": "#f0f0f0", "eu-both": "#f0f0f0", "eu-yellow-right": "#f0f0f0",
    "yellow-eu": "#f5c518", "yellow": "#f5c518",
    "black": "#111111", "red-stripe": "#f0f0f0", "red": "#c0282a", "white": "#f0f0f0",
  };

  function plateSVG(plateType) {
    const W = 60, H = 20, stripW = 10;
    const cid = `psvg${++_svgId}`;
    const clip = `<defs><clipPath id="${cid}"><rect width="${W}" height="${H}" rx="3"/></clipPath></defs>`;
    const baseFill = PLATE_BASE[plateType] || "#f0f0f0";
    const label = PLATE_LABEL[plateType] || plateType;
    const EU_BLUE = "#003399";
    let strips = "";
    if (["eu", "eu-both", "eu-yellow-right", "yellow-eu"].includes(plateType)) {
      strips += `<rect x="0" y="0" width="${stripW}" height="${H}" fill="${EU_BLUE}"/>` + euStarDots(stripW / 2, H / 2);
    }
    if (plateType === "eu-both") strips += `<rect x="${W - stripW}" y="0" width="${stripW}" height="${H}" fill="${EU_BLUE}"/>`;
    if (plateType === "eu-yellow-right") strips += `<rect x="${W - stripW}" y="0" width="${stripW}" height="${H}" fill="#f5c518"/>`;
    if (plateType === "red-stripe") strips += `<rect x="0" y="0" width="${stripW}" height="${H}" fill="#c0282a"/>`;
    return (
      `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" class="plate-svg" title="${label}">` +
      clip + `<g clip-path="url(#${cid})"><rect width="${W}" height="${H}" fill="${baseFill}"/>${strips}</g></svg>`
    );
  }

  const LINE_COLOR_MAP = {
    white: "#d0d0d0", yellow: "#f0c040", red: "#d63c3c",
    blue: "#2979c8", orange: "#e87a20", green: "#3ea060",
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
    const W = 80, H = 20, edgeW = 5, cx = W / 2;
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
    const lbl = lineLabels[pattern] || pattern;
    return (
      `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" class="road-line-svg" title="${lbl}">` +
      `<rect width="${W}" height="${H}" fill="#15191e" rx="3"/>` +
      `<rect x="0" y="0" width="${edgeW}" height="${H}" fill="${oc}"/>` +
      `<rect x="${W - edgeW}" y="0" width="${edgeW}" height="${H}" fill="${oc}"/>` +
      dashes + `</svg>`
    );
  }

  const COLOR_CSS = {
    white: "#e8e8e8", black: "#1c1c1c", red: "#d63c3c",
    blue: "#2979c8", gray: "#8a9099", striped: null,
  };

  function colorSwatch(c) {
    const bg = COLOR_CSS[c];
    const style = bg
      ? `background:${bg}`
      : `background:repeating-linear-gradient(135deg,#d0d0d0 0,#d0d0d0 4px,#1c1c1c 4px,#1c1c1c 8px)`;
    return `<span class="color-swatch" style="${style}" title="${c}"></span>`;
  }

  // ── Filter type definitions ──────────────────────────────────────────────
  const FILTER_TYPES = [
    {
      id: "drivingSide",
      label: "Driving side",
      abbr: "Side",
      hasData: (c) => !!c.drivingSide,
      matches: (c, v) => c.drivingSide === v,
      values: (all) => [...new Set(all.map(c => c.drivingSide).filter(Boolean))],
      render: (v) => drivingSideSVG(v) + `<span class="crit-text">${v === "left" ? "Left" : "Right"}</span>`,
    },
    {
      id: "euLicencePlate",
      label: "Licence plate",
      abbr: "Plate",
      hasData: (c) => !!c.euLicencePlate,
      matches: (c, v) => c.euLicencePlate === v,
      values: (all) => [...new Set(all.map(c => c.euLicencePlate).filter(Boolean))],
      render: (v) => plateSVG(v) + `<span class="crit-text">${PLATE_LABEL[v] || v}</span>`,
    },
    {
      id: "lineMarkings",
      label: "Road lines",
      abbr: "Lines",
      hasData: (c) => c.lineMarkings && c.lineMarkings.length > 0,
      matches: (c, v) => c.lineMarkings && c.lineMarkings.includes(v),
      values: (all) => [...new Set(all.flatMap(c => c.lineMarkings || []))],
      render: (v) => roadLineSVG(v) + `<span class="crit-text">${lineLabels[v] || v}</span>`,
    },
    {
      id: "cameraGenerations",
      label: "Camera gen",
      abbr: "Gen",
      hasData: (c) => c.cameraGenerations && c.cameraGenerations.length > 0,
      matches: (c, v) => c.cameraGenerations && c.cameraGenerations.includes(v),
      values: (all) => [...new Set(all.flatMap(c => c.cameraGenerations || []))].sort(),
      render: (v) => `<span class="crit-text">Gen ${v}</span>`,
    },
    {
      id: "hemisphere",
      label: "Hemisphere",
      abbr: "Hemi",
      hasData: (c) => !!c.hemisphere,
      matches: (c, v) => c.hemisphere === v || c.hemisphere === "both",
      values: () => ["north", "south"],
      render: (v) => `<span class="crit-text">${v === "north" ? "Northern" : "Southern"}</span>`,
    },
    {
      id: "carColors",
      label: "Car color",
      abbr: "Color",
      hasData: () => true,
      matches: (c, v) => (c.carColors || ["white"]).includes(v),
      values: (all) => [...new Set(all.flatMap(c => c.carColors || ["white"]))],
      render: (v) => colorSwatch(v) + `<span class="crit-text">${v.charAt(0).toUpperCase() + v.slice(1)}</span>`,
    },
    {
      id: "vehicleType",
      label: "Vehicle type",
      abbr: "Type",
      hasData: () => true,
      matches: (c, v) => (c.vehicleType ?? "car") === v,
      values: (all) => [...new Set(all.map(c => c.vehicleType ?? "car"))],
      render: (v) => `<span class="crit-text">${v === "truck" ? "Truck / Pickup" : v === "suv" ? "SUV" : "Car"}</span>`,
    },
  ];

  // ── Game state ────────────────────────────────────────────────────────────
  let gameCriteria = [];
  let validAnswers = [];
  let guesses = [];
  let gameOver = false;
  const MAX_GUESSES = 5;

  // ── DOM refs ─────────────────────────────────────────────────────────────
  const criteriaEl    = document.getElementById("gameCriteria");
  const guessInput    = document.getElementById("guessInput");
  const guessDropdown = document.getElementById("guessDropdown");
  const historyEl     = document.getElementById("guessHistory");
  const messageEl     = document.getElementById("gameMessage");
  const counterEl     = document.getElementById("guessCounter");
  const newGameBtn    = document.getElementById("newGameBtn");

  // ── Game generation ───────────────────────────────────────────────────────
  const FIXED_CRITERIA_IDS = ["lineMarkings", "drivingSide", "hemisphere", "carColors", "cameraGenerations"];
  const FIXED_FILTER_TYPES = FIXED_CRITERIA_IDS.map(id => FILTER_TYPES.find(ft => ft.id === id));

  function generateGame() {
    for (let attempt = 0; attempt < 300; attempt++) {
      const criteria = [];
      for (const ft of FIXED_FILTER_TYPES) {
        const pool = ft.values(countries).filter(v =>
          countries.some(c => ft.hasData(c) && ft.matches(c, v))
        );
        if (!pool.length) continue;
        const value = pool[Math.floor(Math.random() * pool.length)];
        criteria.push({ ...ft, value });
      }
      if (criteria.length < 5) continue;

      const valid = countries.filter(c =>
        criteria.every(cr => cr.hasData(c) && cr.matches(c, cr.value))
      );
      if (valid.length >= 1) return { criteria, valid };
    }
    return null;
  }

  function startGame() {
    const result = generateGame();
    if (!result) {
      showMessage("Could not generate a valid game. Please try again.", false);
      return;
    }
    gameCriteria = result.criteria;
    validAnswers = result.valid;
    guesses = [];
    gameOver = false;
    guessInput.value = "";
    guessInput.disabled = false;
    guessDropdown.hidden = true;
    messageEl.hidden = true;
    renderCriteria();
    renderHistory();
    updateCounter();
  }

  function renderCriteria() {
    criteriaEl.innerHTML = gameCriteria.map((cr, i) =>
      `<div class="game-crit-chip">
        <span class="game-crit-label">${i + 1}. ${cr.label}</span>
        <span class="game-crit-value">${cr.render(cr.value)}</span>
      </div>`
    ).join("");
  }

  function updateCounter() {
    counterEl.textContent = `${guesses.length} / ${MAX_GUESSES} guesses`;
  }

  function showMessage(html, isWin) {
    messageEl.innerHTML = html;
    messageEl.className = "game-message " + (isWin ? "game-message--win" : "game-message--lose");
    messageEl.hidden = false;
  }

  // ── Guess handling ────────────────────────────────────────────────────────
  function submitGuess(countryName) {
    if (gameOver) return;
    const country = countries.find(c => c.country.toLowerCase() === countryName.toLowerCase());
    if (!country) return;
    if (guesses.some(g => g.country.country === country.country)) return;

    const results = gameCriteria.map(cr => ({
      correct: cr.hasData(country) && cr.matches(country, cr.value),
      hasData: cr.hasData(country),
    }));
    const allCorrect = results.every(r => r.correct);
    guesses.push({ country, results, allCorrect });

    renderHistory();
    updateCounter();

    if (allCorrect) {
      gameOver = true;
      guessInput.disabled = true;
      const others = validAnswers.filter(c => c.country !== country.country);
      const note = others.length
        ? ` Also valid: ${others.slice(0, 4).map(c => c.country).join(", ")}${others.length > 4 ? ` and ${others.length - 4} more` : ""}.`
        : "";
      showMessage(`<strong>Correct!</strong> ${country.country} matches all criteria.${note}`, true);
    } else if (guesses.length >= MAX_GUESSES) {
      gameOver = true;
      guessInput.disabled = true;
      const list = validAnswers.slice(0, 6).map(c => c.country).join(", ");
      const more = validAnswers.length > 6 ? ` and ${validAnswers.length - 6} more` : "";
      showMessage(`<strong>Game over.</strong> Valid answers: ${list}${more}.`, false);
    }

    guessInput.value = "";
    guessDropdown.hidden = true;
  }

  function renderHistory() {
    if (!guesses.length) { historyEl.innerHTML = ""; return; }

    const colDef = `1fr ${gameCriteria.map(() => "52px").join(" ")}`;

    const header = `<div class="guess-grid-header" style="grid-template-columns:${colDef}">
      <div></div>
      ${gameCriteria.map((cr, i) => `<div class="guess-col-label" title="${cr.label}">${i + 1}</div>`).join("")}
    </div>`;

    const rows = guesses.map(({ country, results, allCorrect }) => {
      const cells = results.map(r => {
        const cls = r.correct ? "result-badge--correct" : r.hasData ? "result-badge--incorrect" : "result-badge--nodata";
        const icon = r.correct ? "✓" : r.hasData ? "✗" : "?";
        return `<div class="guess-result-col"><span class="result-badge ${cls}">${icon}</span></div>`;
      }).join("");
      const rowCls = allCorrect ? "guess-grid-row guess-grid-row--win" : "guess-grid-row";
      return `<div class="${rowCls}" style="grid-template-columns:${colDef}">
        <div class="guess-name-col">${country.country}</div>${cells}
      </div>`;
    }).join("");

    historyEl.innerHTML = `<div class="guess-grid">${header}${rows}</div>`;
  }

  // ── Autocomplete ─────────────────────────────────────────────────────────
  function fuzzyScore(query, name) {
    const q = query.toLowerCase(), n = name.toLowerCase();
    if (n.startsWith(q)) return 0;
    if (n.includes(q)) return 1;
    let qi = 0;
    for (let i = 0; i < n.length && qi < q.length; i++) if (n[i] === q[qi]) qi++;
    return qi === q.length ? 2 : Infinity;
  }

  function buildDropdown(query) {
    if (!query) { guessDropdown.hidden = true; return; }
    const matches = countries
      .map(c => ({ name: c.country, score: fuzzyScore(query, c.country) }))
      .filter(m => m.score < Infinity)
      .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name))
      .slice(0, 15);
    if (!matches.length) { guessDropdown.hidden = true; return; }
    guessDropdown.replaceChildren(
      ...matches.map(({ name }) => {
        const li = document.createElement("li");
        li.textContent = name;
        li.addEventListener("mousedown", (e) => {
          e.preventDefault();
          guessDropdown.hidden = true;
          submitGuess(name);
        });
        return li;
      })
    );
    guessDropdown.hidden = false;
  }

  guessInput.addEventListener("input", () => { if (!gameOver) buildDropdown(guessInput.value.trim()); });
  guessInput.addEventListener("focus", () => { if (guessInput.value.trim() && !gameOver) buildDropdown(guessInput.value.trim()); });
  guessInput.addEventListener("blur", () => { guessDropdown.hidden = true; });
  guessInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { const v = guessInput.value.trim(); if (v) submitGuess(v); }
  });

  newGameBtn.addEventListener("click", startGame);
  startGame();
})();
