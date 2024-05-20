const NUMBER_OF_COUNTRIES = 5;
const MAX_YEARS = 23;

/* color-pallete can be a custom array of string colors */
const COLOR_PALLETE = generateColorPallete(NUMBER_OF_COUNTRIES);

/* the initial state is set here */
let state = {
  countries: ["Germany", "India", "United States", "Belgium", "Sweden"],
  year: 2010,
};

/* ["country-1", "country-2", "country-3", "country-4", "country-5"]; */
const dropdownIds = getEmptyArray(NUMBER_OF_COUNTRIES).map(
  (_, i) => `country-${i + 1}`
);

const dropdownHeader = document.querySelector(".dropdown-header");

/* adding dropdowns */
dropdownIds.forEach((elementId, i) => {
  dropdownHeader.innerHTML += `<div>
    <span class="color-dot" style="background-color: ${COLOR_PALLETE[i]}"></span>
    <select id="${elementId}"></select>
  </div>`;
});

/* the main function that renders and populates data based on loaded files */
function onDataLoad(data) {
  const uniqueCountries = Array.from(
    new Set(data.map((d) => d.country))
  ).sort();

  const dropdownEls = dropdownIds.map((id) => document.getElementById(id));
  dropdownEls.forEach((selectEl, i) => {
    uniqueCountries.forEach((country) => {
      const option = document.createElement("option");
      option.value = country;
      option.text = country;
      selectEl.appendChild(option);
    });

    selectEl.onchange = function (ev) {
      const value = ev.target.value;
      state.countries[i] = value;
      updateValues(state);
    };
  });

  const slider = document.getElementById("year-input");
  const output = document.getElementById("year-value");
  output.innerHTML = slider.value;

  slider.oninput = function () {
    output.innerHTML = this.value;
    state.year = this.value;
    updateValues(state);
  };

  function render(countries, year) {
    const filteredData = countries.map(
      (country) =>
        data.find((d) => d.country === country && d.year == year) || data[0]
    );
    document.getElementById("scatter-plot").innerHTML = "";
    const scatterPlot = d3
      .select("#scatter-plot")
      .append("svg")
      .attr("width", 800)
      .attr("height", 300);

    const x = d3.scaleLinear().domain([0, 20]).range([50, 750]);
    const y = d3.scaleLinear().domain([0, 100]).range([250, 50]);

    scatterPlot
      .selectAll("circle")
      .data(filteredData)
      .enter()
      .append("circle")
      .attr("cx", (d) => x(d.expenditure))
      .attr("cy", (d) => y(d.lifeExpentency))
      .attr("r", 5)
      .attr("fill", (_, i) => COLOR_PALLETE[i]);

    scatterPlot.append("g").attr("transform", "translate(0, 250)").call(d3.axisBottom(x));
    scatterPlot.append("g").attr("transform", "translate(50, 0)").call(d3.axisLeft(y));

    scatterPlot.append("text").attr("transform", "rotate(-90)").attr("y", 15).attr("x", -150).style("text-anchor", "middle").text("Life Expectancy");
    scatterPlot.append("text").attr("transform", "translate(400, 300)").style("text-anchor", "middle").text("Expenditure");
  }

  function updateValues({ countries, year }) {
    slider.value = year;
    output.innerHTML = year;

    dropdownEls.forEach((selectEl, i) => {
      selectEl.value = countries[i];
    });

    render(countries, year);
  }

  updateValues(state);
}

/* returns an empty array with given size */
function getEmptyArray(n) {
  return new Array(n).fill();
}

/* transforms and return grouped csv data to array of objects */
function transformData(rawCsvData) {
  const transformedData = [];

  rawCsvData.forEach(d => {
    for (let i = 0; i < MAX_YEARS; i++) {
      transformedData.push({
        country: d.Country,
        year: 2000 + i,
        value: d[2000 + i],
      });
    }
  });

  return transformedData;
}

/* merges the 2 datasets */
function mergeExpectencyAndExpenditure([lifeExpectData, expenditureData]) {
  return lifeExpectData.map((d) => ({
    country: d.country,
    year: d.year,
    lifeExpentency: d.value,
    expenditure:
      expenditureData.find(
        (expenditureD) =>
          expenditureD.country === d.country && expenditureD.year == d.year
      )?.value || 0,
  }));
}

/* 
  splits colors in hsl range [0-360] based on given number
  returns list of colors - string[]
 */
function generateColorPallete(numberOfColors) {
  if (numberOfColors < 1) numberOfColors = 1; // defaults to one color - avoid divide by zero
  const getColorByIndex = (_, colorNum) =>
    `hsl(${(colorNum * (360 / numberOfColors)) % 360},100%,50%)`;
  return getEmptyArray(numberOfColors).map(getColorByIndex);
}

// loading, transforming and rendering data
Promise.all([d3.csv("./LifeExpectency.csv"), d3.csv("./Expenditure.csv")])
  .then(datasets => datasets.map(transformData))
  .then(mergeExpectencyAndExpenditure)
  .then(onDataLoad);
