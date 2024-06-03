const margin = { top: 20, right: 80, bottom: 70, left: 70 },
      width = 960 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const parseYear = d3.timeParse("%Y");
const formatYear = d3.timeFormat("%Y");

const x = d3.scaleTime().range([0, width]);
const y = d3.scaleLinear().range([height, 0]);
const color = d3.scaleOrdinal(d3.schemeCategory10);

const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.consultations));

const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

let years, countries, selectedDataset;

d3.select("#datasetSelect").on("change", function() {
    selectedDataset = d3.select(this).property("value");
    loadData(selectedDataset);
});

function loadData(dataset) {
    d3.csv(dataset).then(data => {
        years = data.columns.slice(1).map(year => parseYear(year));

        countries = data.map(row => {
            return {
                id: row.Country,
                values: years.map((year, i) => ({
                    year,
                    consultations: +row[data.columns[i + 1]],
                    country: row.Country
                }))
            };
        });

        updateCountrySelect();
        updateChart();
    });
}

function updateCountrySelect() {
    const countrySelect = d3.select("#countrySelect");
    countrySelect.selectAll("div").remove();

    countrySelect.selectAll("div")
        .data(countries)
        .enter()
        .append("div")
        .attr("class", "checkbox")
        .each(function(d) {
            const checkbox = d3.select(this);
            checkbox.append("input")
                .attr("type", "checkbox")
                .attr("value", d.id)
                .on("change", updateChart);
            checkbox.append("label")
                .text(d.id);
        });

    d3.select("#selectAll").on("click", () => {
        countrySelect.selectAll("input")
            .property("checked", true);
        updateChart();
    });

    d3.select("#unselectAll").on("click", () => {
        countrySelect.selectAll("input")
            .property("checked", false);
        updateChart();
    });

    d3.select("#yearRangeStart").on("input", updateYearRange);
    d3.select("#yearRangeEnd").on("input", updateYearRange);
}

function updateYearRange() {
    const startYear = +d3.select("#yearRangeStart").property("value");
    const endYear = +d3.select("#yearRangeEnd").property("value");

    d3.select("#startYear").text(startYear);
    d3.select("#endYear").text(endYear);

    updateChart();
}

function updateChart() {
    const selectedCountries = d3.selectAll("#countrySelect input:checked")
        .data().map(d => d.id);

    const filteredData = countries.filter(d => selectedCountries.includes(d.id));

    const startYear = parseYear(d3.select("#yearRangeStart").property("value"));
    const endYear = parseYear(d3.select("#yearRangeEnd").property("value"));

    const filteredYears = years.filter(year => year >= startYear && year <= endYear);

    x.range([0, width]).domain(d3.extent(filteredYears));
    y.range([height, 0]).domain([
        d3.min(filteredData, c => d3.min(c.values.filter(v => v.year >= startYear && v.year <= endYear), v => v.consultations)),
        d3.max(filteredData, c => d3.max(c.values.filter(v => v.year >= startYear && v.year <= endYear), v => v.consultations))
    ]);

    svg.selectAll("*").remove();

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(formatYear));

    svg.append("g")
        .attr("class", "y axis")
        .call(d3.axisLeft(y).tickFormat(d3.format(".1f")));

    svg.append("text")
        .attr("text-anchor", "end")
        .attr("x", width / 2 + margin.left)
        .attr("y", height + margin.top + 40)
        .text("Year");

    svg.append("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -height / 2 + margin.top)
        .text("Immunisation");

    const country = svg.selectAll(".country")
        .data(filteredData)
        .enter().append("g")
        .attr("class", "country");

    country.append("path")
        .attr("class", "line")
        .attr("d", d => line(d.values.filter(v => v.year >= startYear && v.year <= endYear)))
        .style("stroke", d => color(d.id));

    country.selectAll("circle")
        .data(d => d.values.filter(v => v.year >= startYear && v.year <= endYear))
        .enter().append("circle")
        .attr("r", 3.5)
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.consultations))
        .on("mouseover", (event, d) => {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`${d.country}<br/>${d.year.getFullYear()}<br/>${d.consultations}`)
                .style("left", `${event.pageX}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", d => {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    updateLegend(filteredData);
}

function updateLegend(filteredData) {
    const legendContainer = d3.select("#legend");
    legendContainer.selectAll("*").remove();

    let currentRow = document.createElement("div");
    currentRow.style.display = "flex";
    currentRow.style.flexWrap = "wrap";
    legendContainer.node().appendChild(currentRow);

    filteredData.forEach((country, index) => {
        if (index > 0 && index % 12 === 0) {
            currentRow = document.createElement("div");
            currentRow.style.display = "flex";
            currentRow.style.flexWrap = "wrap";
            legendContainer.node().appendChild(currentRow);
        }

        const legendItem = document.createElement("div");
        legendItem.className = "legend-item";
        legendItem.style.display = "inline-block";
        legendItem.style.marginRight = "10px";
        legendItem.style.marginBottom = "10px";

        const colorBox = document.createElement("span");
        colorBox.style.backgroundColor = color(country.id);
        colorBox.style.display = "inline-block";
        colorBox.style.width = "12px";
        colorBox.style.height = "12px";
        colorBox.style.marginRight = "5px";
        legendItem.appendChild(colorBox);

        const countryName = document.createElement("span");
        countryName.textContent = country.id;
        legendItem.appendChild(countryName);

        currentRow.appendChild(legendItem);
    });
}

// Load the initial dataset
loadData("Immunisation_Diphtheria_Tetanus_Pertussis.csv");