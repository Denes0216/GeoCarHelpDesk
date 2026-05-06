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

  function listLineMarkings(markings) {
    if (!markings.length) return "No data";
    return markings.map((p) => labels[p] || p).join(", ");
  }

  function listValue(values) {
    return values.length ? values.join(", ") : "No data";
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
            <div><dt>Driving side</dt><dd>${country.drivingSide ?? "Unknown"}</dd></div>
            <div><dt>EU blue plate</dt><dd>${yesNo(country.euLicencePlate)}</dd></div>
            <div><dt>Line markings</dt><dd>${listLineMarkings(country.lineMarkings)}</dd></div>
            <div><dt>Coverage</dt><dd>${yearValue(country.coverageYears)}</dd></div>
            <div><dt>Camera gen</dt><dd>${listValue(country.cameraGenerations)}</dd></div>
            <div><dt>Car color</dt><dd>${listValue(country.carColors ?? ["white"])}</dd></div>
            <div><dt>Vehicle type</dt><dd>${country.vehicleType ?? "car"}</dd></div>
          </dl>
        `;
        return card;
      })
    );
  }

  renderResults();
})();
