const margin = { top: 20, right: 30, bottom: 40, left: 60 },
      width = 960 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const x = d3.scaleBand().range([0, width]).padding(0.1);
const y = d3.scaleLinear().range([height, 0]);
const color = d3.scaleOrdinal(d3.schemeCategory10);

const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

let years, countries1, countries2, countries3;

function loadAllData() {
    Promise.all([
        d3.csv("doctors_consultations_in_person_dataset.csv"),
        d3.csv("dentists_consultations_in_person_dataset.csv"),
        d3.csv("doctors_teleconsultations_dataset.csv")
    ]).then(data => {
        years = data[0].columns.slice(1); // Assuming all datasets have the same years
        countries1 = transformData(data[0]);
        countries2 = transformData(data[1]);
        countries3 = transformData(data[2]);
        updateCountrySelect();
        updateYearSlider();
        updateChart();
    }).catch(error => {
        console.error('Error loading the data:', error);
    });
}

function transformData(data) {
    return data.map(row => ({
        id: row.Country,
        values: years.map(year => ({
            year: year,
            consultations: +row[year]
        }))
    }));
}

function updateCountrySelect() {
    const countrySelect = d3.select("#countrySelect");
    countrySelect.selectAll("div").remove();

    const countries = [...new Set(countries1.map(d => d.id).concat(countries2.map(d => d.id)).concat(countries3.map(d => d.id)))];

    countrySelect.selectAll("div")
        .data(countries)
        .enter()
        .append("div")
        .attr("class", "checkbox")
        .each(function(d) {
            const checkbox = d3.select(this);
            checkbox.append("input")
                .attr("type", "checkbox")
                .attr("value", d)
                .on("change", updateChart);
            checkbox.append("label")
                .attr("for", d)
                .text(d);
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

function updateYearSlider() {
    const yearSlider = d3.select("#yearSlider");
    yearSlider.attr("min", years[0])
              .attr("max", years[years.length - 1])
              .attr("value", years[0]);

    yearSlider.on("input", function() {
        d3.select("#startYear").text(this.value);
        updateChart();
    });
}

function updateChart() {
    const selectedCountries = d3.selectAll("#countrySelect input:checked").nodes().map(d => d.value);
    const selectedYear = d3.select("#yearSlider").property("value");

    const filteredData1 = countries1.filter(d => selectedCountries.includes(d.id)).map(country => ({
        id: country.id,
        consultations: country.values.find(v => v.year === selectedYear)?.consultations || 0
    }));

    const filteredData2 = countries2.filter(d => selectedCountries.includes(d.id)).map(country => ({
        id: country.id,
        consultations: country.values.find(v => v.year === selectedYear)?.consultations || 0
    }));

    const filteredData3 = countries3.filter(d => selectedCountries.includes(d.id)).map(country => ({
        id: country.id,
        consultations: country.values.find(v => v.year === selectedYear)?.consultations || 0
    }));

    const dataTransformed = selectedCountries.map(country => ({
        id: country,
        values: [
            { dataset: "Doctors consultations (in person)", consultations: filteredData1.find(d => d.id === country)?.consultations || 0 },
            { dataset: "Dentists consultations (in person)", consultations: filteredData2.find(d => d.id === country)?.consultations || 0 },
            { dataset: "Doctors teleconsultations", consultations: filteredData3.find(d => d.id === country)?.consultations || 0 }
        ]
    }));

    const datasets = ["Doctors consultations (in person)", "Dentists consultations (in person)", "Doctors teleconsultations"];
    const stackedData = d3.stack().keys(datasets).value((d, key) => {
        return d.values.find(v => v.dataset === key).consultations;
    })(dataTransformed);

    x.domain(dataTransformed.map(d => d.id));
    y.domain([0, d3.max(stackedData, d => d3.max(d, d => d[1]))]);

    color.domain(datasets);

    svg.selectAll("*").remove();

    // Show the bars
    svg.append("g")
        .selectAll("g")
        .data(stackedData)
        .join("g")
        .attr("fill", d => color(d.key))
        .attr("class", d => "myRect " + d.key) // Add a class to each subgroup: their name
        .selectAll("rect")
        .data(d => d)
        .join("rect")
        .attr("x", d => x(d.data.id))
        .attr("y", d => y(d[1]))
        .attr("height", d => y(d[0]) - y(d[1]))
        .attr("width", x.bandwidth())
        .attr("stroke", "grey")
        .on("mouseover", function(event, d) {
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`Value: ${(d[1] - d[0]).toFixed(2)}`)
                .style("left", `${event.pageX}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", function(event, d) {
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
        .text("Country");

    svg.append("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -height / 2 + margin.top)
        .text("Consultations per Capita");

    updateLegend(datasets);
}

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

// Load the initial datasets
loadAllData();
