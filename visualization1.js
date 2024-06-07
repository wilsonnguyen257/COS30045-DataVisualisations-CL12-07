const NUMBER_OF_COUNTRIES = 5;
const MAX_YEARS = 23;

/* color-pallete can be a custom array of string colors */
const COLOR_PALLETE = generateColorPallete(NUMBER_OF_COUNTRIES);

/* the initial state is set here */
let state = {
  countries: ["Germany", "India", "United States", "Belgium", "Sweden"],
  year: 2010,
};

const dropdownIds = getEmptyArray(NUMBER_OF_COUNTRIES).map(
  (_, i) => `country-${i + 1}`
);

const dropdownHeader = document.querySelector(".dropdown-header");

/* the main function that renders and populates data based on loaded files */
function onDataLoad(data) {
  const uniqueCountries = Array.from(new Set(data.map((d) => d.country))).sort();

  const totalCountries = uniqueCountries.length;
  const COLOR_PALLETE = generateColorPallete(totalCountries);

  const slider = document.getElementById("year-input");
  const output = document.getElementById("year-value");
  output.innerHTML = slider.value;

  slider.oninput = function () {
    output.innerHTML = this.value;
    state.year = this.value;
    updateValues(state);
  };

  function render(countries, year) {
    const filteredData = data.filter(d => d.year == year);
    document.getElementById("scatter-plot").innerHTML = "";

    const margin = { top: 20, right: 50, bottom: 50, left: 50 }; // Increased right margin
    const width = 1000 - margin.left - margin.right; // Width remains 1000
    const height = 400 - margin.top - margin.bottom; // Increased height

    const scatterPlot = d3.select("#scatter-plot")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const maxExpenditure = d3.max(filteredData, d => d.expenditure) || 1;
    const maxLifeExpectancy = d3.max(filteredData, d => d.lifeExpentency) || 1;

    const x = d3.scaleLinear()
      .domain([0, maxExpenditure * 1.2])  
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, maxLifeExpectancy * 1.2])
      .range([height, 0]);

    scatterPlot.selectAll("circle")
      .data(filteredData)
      .enter()
      .append("circle")
      .attr("cx", d => x(d.expenditure))
      .attr("cy", d => y(d.lifeExpentency))
      .attr("r", 5)
      .attr("fill", d => {
        const index = uniqueCountries.indexOf(d.country);
        return COLOR_PALLETE[index];
      })
      .on("mouseover", function(event, d) {
        d3.select(this).attr("r", 10);
        tooltip.transition()
          .duration(200)
          .style("opacity", .9);
        tooltip.html(`${d.country}<br/>Life Expectancy: ${d.lifeExpentency}<br/>Expenditure: ${d.expenditure}`)
          .style("left", (event.pageX + 5) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function(d) {
        d3.select(this).attr("r", 5);
        tooltip.transition()
          .duration(500)
          .style("opacity", 0);
      });

    scatterPlot.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));

    scatterPlot.append("g")
      .call(d3.axisLeft(y));

    scatterPlot.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 15)
      .attr("x", -height / 2)
      .style("text-anchor", "middle")
      .text("Life Expectancy (years)");

    scatterPlot.append("text")
      .attr("transform", `translate(${width / 2},${height + margin.bottom - 10})`)
      .style("text-anchor", "middle")
      .text("Expenditure (Percentage of GDP)");

    // Tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);
  }

  function updateValues({ countries, year }) {
    slider.value = year;
    output.innerHTML = year;

    render(countries, year);
  }

  updateValues(state);
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

/* returns an empty array with given size */
function getEmptyArray(n) {
  return new Array(n).fill();
}

/* transforms and return grouped csv data to array of objects */
function transformData(rawCsvData) {
  return rawCsvData.flatMap((d) =>
    getEmptyArray(MAX_YEARS).map((_, i) => ({
      country: d.Country,
      year: 2000 + i,
      value: d[2000 + i],
    }))
  );
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

// loading, transforming and rendering data
Promise.all([d3.csv("./LifeExpectency.csv"), d3.csv("./Expenditure.csv")])
  .then((datasets) => datasets.map(transformData))
  .then(mergeExpectencyAndExpenditure)
  .then(onDataLoad);
