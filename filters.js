(function () {
  const countries = window.COUNTRY_FILTER_DATA || [];
  const controls = {
    drivingSide: document.getElementById("drivingSideFilter"),
    euPlate: document.getElementById("euPlateFilter"),
    lineMarking: document.getElementById("lineMarkingFilter"),
    year: document.getElementById("year"),
    cameraGeneration: document.getElementById("cameraGenerationFilter"),
    hemisphere: document.getElementById("hemisphereFilter"),
    carColor: document.getElementById("carColorFilter"),
    vehicleType: document.getElementById("vehicleTypeFilter"),
  };

  // Countries using a non-car vehicle. Unlisted countries default to "car".
  // Sources: geodummy.com/camera-cars, geomastery.com/google-car
  const VEHICLE_TYPE_DATA = {
    "Christmas Island":            "truck",  // silver pickup/ute
    "Nigeria":                     "truck",  // large white pickup with bars
    "Qatar":                       "truck",  // white truck cab (look down)
    "Senegal":                     "truck",  // silver truck cab (Gen 4)
    "Uganda":                      "suv",    // boxy white SUV, square mirrors
    "United States Virgin Islands": "truck", // bulky ute/pickup with tray
    "Namibia": "truck",
  };

  // Countries with non-white or mixed car colors. Unlisted countries default to ["white"].
  // Sources: geodummy.com/camera-cars, dingyiyi0226.github.io/geoguessr-note
  const CAR_COLOR_DATA = {
    "Argentina":   ["white", "black"],  // Gen 3 black, Gen 4 white
    "Belgium":     ["red"],
    "Bermuda":     ["white", "black"],
    "Bulgaria":    ["white", "black"],  // Gen 4 partly black
    "Colombia":    ["white", "black"],  // Gen 3 black
    "Greece":      ["white", "black"],  // Gen 4 black
    "Israel":      ["white", "black"],  // black car with antenna (Russia-style)
    "Jordan":      ["black"],
    "Latvia":      ["white", "black"],  // Gen 4 partly black
    "Lithuania":   ["white", "black"],  // mostly black in recent coverage
    "Netherlands": ["white", "black"],  // Gen 4 partly black (2023)
    "Palestine":   ["white", "black"],  // black car with antenna
    "Peru":        ["white", "black"],  // Gen 3 black
    "Russia":      ["white", "black"],  // distinctive black car with antenna
    "Rwanda":      ["white", "black"],  // can be white, black, or grey
    "Ukraine":     ["red"],
    "Uruguay":     ["white", "black"],  // Gen 3 black
  };

  // "both" = country straddles the equator and appears in north and south searches
  const HEMISPHERE_DATA = {
    "Åland": "north", "Albania": "north", "American Samoa": "south",
    "Andorra": "north", "Argentina": "south", "Australia": "south",
    "Austria": "north", "Bangladesh": "north", "Belgium": "north",
    "Bermuda": "north", "Bhutan": "north", "Bolivia": "south",
    "Bosnia and Herzegovina": "north", "Botswana": "south", "Brazil": "both",
    "Bulgaria": "north", "Cambodia": "north", "Canada": "north",
    "Chile": "south", "China": "north", "Christmas Island": "south",
    "Cocos (Keeling) Islands": "south", "Colombia": "both", "Costa Rica": "north",
    "Croatia": "north", "Curaçao": "north", "Cyprus": "north",
    "Czech Republic": "north", "Denmark": "north", "Dominican Republic": "north",
    "Ecuador": "both", "Egypt": "north", "Estonia": "north",
    "Eswatini": "south", "Falkland Islands": "south", "Faroe Islands": "north",
    "Finland": "north", "France": "north", "Germany": "north",
    "Ghana": "north", "Gibraltar": "north", "Greece": "north",
    "Greenland": "north", "Guam": "north", "Guatemala": "north",
    "Hong Kong": "north", "Hungary": "north", "Iceland": "north",
    "India": "north", "Indonesia": "both", "Iraq": "north",
    "Ireland": "north", "Isle of Man": "north", "Israel": "north",
    "Italy": "north", "Japan": "north", "Jersey": "north",
    "Jordan": "north", "Kazakhstan": "north", "Kenya": "both",
    "Kyrgyzstan": "north", "Laos": "north", "Latvia": "north",
    "Lebanon": "north", "Lesotho": "south", "Liechtenstein": "north",
    "Lithuania": "north", "Luxembourg": "north", "Macao": "north",
    "Madagascar": "south", "Malaysia": "both", "Malta": "north",
    "Mexico": "north", "Monaco": "north", "Mongolia": "north",
    "Montenegro": "north", "Namibia": "south", "Nepal": "north",
    "Netherlands": "north", "New Zealand": "south", "Nigeria": "north",
    "North Macedonia": "north", "Northern Mariana Islands": "north", "Norway": "north",
    "Oman": "north", "Pakistan": "north", "Palestine": "north",
    "Panama": "north", "Papua New Guinea": "south", "Paraguay": "south",
    "Peru": "both", "Philippines": "north", "Pitcairn Islands": "south",
    "Poland": "north", "Portugal": "north", "Puerto Rico": "north",
    "Qatar": "north", "Réunion": "south", "Romania": "north",
    "Russia": "north", "Rwanda": "south", "Samoa": "south",
    "San Marino": "north", "São Tomé and Príncipe": "both", "Senegal": "north",
    "Serbia": "north", "Singapore": "north", "Slovakia": "north",
    "Slovenia": "north", "South Africa": "south", "South Korea": "north",
    "South Sudan": "north", "Spain": "north", "Sri Lanka": "north",
    "Svalbard and Jan Mayen": "north", "Sweden": "north", "Switzerland": "north",
    "Taiwan": "north", "Thailand": "north", "Tunisia": "north",
    "Turkey": "north", "Uganda": "both", "Ukraine": "north",
    "United Arab Emirates": "north", "United Kingdom": "north", "United States": "north",
    "United States Minor Outlying Islands": "both", "United States Virgin Islands": "north",
    "Uruguay": "south", "Vietnam": "north",
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

  function hemisphereMatches(country, filterValue) {
    if (filterValue === "any") return true;
    const h = HEMISPHERE_DATA[country.country];
    return h === filterValue || h === "both";
  }

  function carColorMatches(country, filterValue) {
    if (filterValue === "any") return true;
    const colors = CAR_COLOR_DATA[country.country] || ["white"];
    return colors.includes(filterValue);
  }

  function vehicleTypeMatches(country, filterValue) {
    if (filterValue === "any") return true;
    const type = VEHICLE_TYPE_DATA[country.country] || "car";
    return type === filterValue;
  }

  function countryMatches(country) {
    const year = Number(controls.year.value)
    const cameraGeneration = controls.cameraGeneration.value;

    return (
      (controls.drivingSide.value === "any" || country.drivingSide === controls.drivingSide.value) &&
      booleanMatches(country.euLicencePlate, controls.euPlate.value) &&
      (controls.lineMarking.value === "any" || country.lineMarkings.includes(controls.lineMarking.value)) &&
      yearsMatch(country.coverageYears, year) &&
      (cameraGeneration === "any" || country.cameraGenerations.includes(Number(cameraGeneration))) &&
      hemisphereMatches(country, controls.hemisphere.value) &&
      carColorMatches(country, controls.carColor.value) &&
      vehicleTypeMatches(country, controls.vehicleType.value)
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
