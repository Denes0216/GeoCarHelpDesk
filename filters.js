(function () {
  const countries = window.COUNTRY_FILTER_DATA || [];
  const controls = {
    drivingSide: document.getElementById("drivingSideFilter"),
    euPlate: document.getElementById("euPlateFilter"),
    lineMarking: document.getElementById("lineMarkingFilter"),
    year: document.getElementById("year"),
    cameraGeneration: document.getElementById("cameraGenerationFilter"),
  };
  const resultCount = document.getElementById("resultCount");
  const countryResults = document.getElementById("countryResults");
  const lineMarkingOptions = [
    ...new Set(countries.flatMap((country) => country.lineMarkings || [])),
  ].sort();

  controls.lineMarking.append(
    ...lineMarkingOptions.map((lineMarking) => {
      const option = document.createElement("option");
      option.value = lineMarking;
      option.textContent = lineMarking;
      return option;
    })
  );

  Object.values(controls).forEach((control) => {
    control.addEventListener("input", renderResults);
    control.addEventListener("change", renderResults);
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
    const year = Number(controls.year.value)
    const cameraGeneration = controls.cameraGeneration.value;

    return (
      (controls.drivingSide.value === "any" || country.drivingSide === controls.drivingSide.value) &&
      booleanMatches(country.euLicencePlate, controls.euPlate.value) &&
      (controls.lineMarking.value === "any" || country.lineMarkings.includes(controls.lineMarking.value)) &&
      yearsMatch(country.coverageYears, year) &&
      (cameraGeneration === "any" || country.cameraGenerations.includes(Number(cameraGeneration)))
    );
  }

  function yesNo(value) {
    if (value === null || value === undefined) return "Unknown";
    return value ? "Yes" : "No";
  }

  function listValue(values) {
    return values.length ? values.join(", ") : "No data";
  }

  function yearValue(years) {
    if (!years.length) return "No data";
    return `${years[0]}-${years[years.length - 1]}`;
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
            <div><dt>Driving side</dt><dd>${country.drivingSide}</dd></div>
            <div><dt>Has EU blue on plate</dt><dd>${yesNo(country.euLicencePlate)}</dd></div>
            <div><dt>Line markings</dt><dd>${listValue(country.lineMarkings)}</dd></div>
            <div><dt>Coverage</dt><dd>${yearValue(country.coverageYears)}</dd></div>
            <div><dt>Camera gen</dt><dd>${listValue(country.cameraGenerations)}</dd></div>
          </dl>
        `;
        return card;
      })
    );
  }

  renderResults();
})();
