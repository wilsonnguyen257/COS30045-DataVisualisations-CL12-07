// Set up margins and dimensions
const margin = { top: 20, right: 30, bottom: 40, left: 60 },
      width = 960 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

// Create SVG container
const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Set up scales and color
const x = d3.scaleBand().range([0, width]).padding(0.1);
const y = d3.scaleLinear().range([height, 0]);
const color = d3.scaleOrdinal(d3.schemeCategory10);

// Tooltip for hover information
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

let selectedDataset;
let years, countries;

// Event listeners for dataset and year range changes
d3.select("#datasetSelect").on("change", function() {
    selectedDataset = d3.select(this).property("value");
    loadData(selectedDataset);
});

d3.select("#yearRangeStart").attr("min", 2015).attr("max", 2022).attr("value", 2015).on("input", function() {
    updateYearRange();
});

d3.select("#yearRangeEnd").attr("min", 2015).attr("max", 2022).attr("value", 2022).on("input", function() {
    updateYearRange();
});

// Function to load data from CSV
function loadData(dataset) {
    d3.csv(dataset).then(data => {
        years = data.columns.slice(1);
        countries = data.map(row => ({
            id: row.Country,
            values: years.map(year => ({
                year: year,
                consultations: +row[year]
            }))
        }));
        updateCountrySelect();
        updateChart();
    }).catch(error => {
        console.error('Error loading the data:', error);
    });
}

// Function to update the country selection
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
        countrySelect.selectAll("input").property("checked", true);
        updateChart();
    });

    d3.select("#unselectAll").on("click", () => {
        countrySelect.selectAll("input").property("checked", false);
        updateChart();
    });
}

// Function to update the year range
function updateYearRange() {
    const startYear = +d3.select("#yearRangeStart").property("value");
    const endYear = +d3.select("#yearRangeEnd").property("value");

    d3.select("#startYear").text(startYear);
    d3.select("#endYear").text(endYear);

    updateChart();
}

// Function to update the chart based on selections
function updateChart() {
    const selectedCountries = d3.selectAll("#countrySelect input:checked").data().map(d => d.id);

    const startYear = d3.select("#yearRangeStart").property("value");
    const endYear = d3.select("#yearRangeEnd").property("value");

    const filteredData = countries.filter(d => selectedCountries.includes(d.id)).map(country => ({
        id: country.id,
        values: country.values.filter(v => v.year >= startYear && v.year <= endYear)
    }));

    const dataTransformed = [];
    if (filteredData.length > 0) {
        years.forEach(year => {
            if (year >= startYear && year <= endYear) {
                const obj = { year };
                filteredData.forEach(country => {
                    obj[country.id] = country.values.find(v => v.year === year)?.consultations || 0;
                });
                dataTransformed.push(obj);
            }
        });
    } else {
        years.forEach(year => {
            if (year >= startYear && year <= endYear) {
                const obj = { year };
                countries.forEach(country => {
                    obj[country.id] = 0;
                });
                dataTransformed.push(obj);
            }
        });
    }

    const keys = selectedCountries;
    const stackedData = d3.stack().keys(keys)(dataTransformed);

    x.domain(dataTransformed.map(d => d.year));
    y.domain([0, d3.max(stackedData, d => d3.max(d, d => d[1]))]);

    color.domain(keys);

    svg.selectAll("*").remove();

    const bars = svg.append("g")
        .selectAll("g")
        .data(stackedData)
        .join("g")
        .attr("fill", d => color(d.key))
        .attr("class", d => "myRect " + d.key)
        .selectAll("rect")
        .data(d => d)
        .join("rect")
        .attr("x", d => x(d.data.year))
        .attr("y", d => y(d[1]))
        .attr("height", d => y(d[0]) - y(d[1]))
        .attr("width", x.bandwidth())
        .attr("stroke", "grey")
        .on("mouseover", function(event, d) {
            const subGroupName = d3.select(this.parentNode).datum().key;
            d3.selectAll(".myRect").style("opacity", 0.2);
            d3.selectAll("." + subGroupName).style("opacity", 1);

            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`Year: ${d.data.year}<br/>Consultations: ${(d[1] - d[0]).toFixed(2)}`)
                .style("left", `${event.pageX}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseleave", function(event, d) {
            d3.selectAll(".myRect").style("opacity", 1);
            tooltip.transition().duration(500).style("opacity", 0);
        });

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .attr("class", "y axis")
        .call(d3.axisLeft(y).ticks(10));

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
        .text("Consultations");

    updateLegend(keys);
}

// Function to update the legend based on selected keys
function updateLegend(keys) {
    const legendContainer = d3.select("#legend");
    legendContainer.selectAll("*").remove();

    const legend = legendContainer.selectAll(".legend")
        .data(keys)
        .enter().append("div")
        .attr("class", "legend-item")
        .style("display", "inline-block")
        .style("margin-right", "10px")
        .style("margin-bottom", "10px");

    legend.append("span")
        .style("background-color", d => color(d))
        .style("display", "inline-block")
        .style("width", "12px")
        .style("height", "12px")
        .style("margin-right", "5px");

    legend.append("span").text(d => d);
}

// Load the initial dataset
loadData("doctors_consultations_in_person_dataset.csv");
