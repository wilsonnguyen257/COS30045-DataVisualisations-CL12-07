// Mock data
const data = [
    { country: 'CountryA', healthExpenditure: 5000, lifeExpectancy: 80, hospitalBeds: 3.5, medicalProfessionals: 2.5 },
    { country: 'CountryB', healthExpenditure: 3000, lifeExpectancy: 75, hospitalBeds: 2.8, medicalProfessionals: 2.0 },
    { country: 'CountryC', healthExpenditure: 7000, lifeExpectancy: 82, hospitalBeds: 4.0, medicalProfessionals: 3.0 },
    { country: 'CountryD', healthExpenditure: 4000, lifeExpectancy: 78, hospitalBeds: 3.0, medicalProfessionals: 2.2 },
    { country: 'CountryE', healthExpenditure: 6000, lifeExpectancy: 81, hospitalBeds: 3.8, medicalProfessionals: 2.7 }
];

// Main Visualization: Scatter Plot
const scatterPlot = d3.select('#scatter-plot')
    .append('svg')
    .attr('width', 800)
    .attr('height', 600);

const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.healthExpenditure)])
    .range([50, 750]);

const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.lifeExpectancy)])
    .range([550, 50]);

scatterPlot.selectAll('circle')
    .data(data)
    .enter().append('circle')
    .attr('cx', d => x(d.healthExpenditure))
    .attr('cy', d => y(d.lifeExpectancy))
    .attr('r', 5)
    .attr('fill', 'blue');

scatterPlot.append('g')
    .attr('transform', 'translate(0, 550)')
    .call(d3.axisBottom(x));

scatterPlot.append('g')
    .attr('transform', 'translate(50, 0)')
    .call(d3.axisLeft(y));

scatterPlot.append('text')
    .attr('transform', 'translate(400, 580)')
    .style('text-anchor', 'middle')
    .text('Health Expenditure per Capita');

scatterPlot.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', 15)
    .attr('x', -300)
    .style('text-anchor', 'middle')
    .text('Life Expectancy');

// Secondary Visualization: Bar Charts for Healthcare Resources
const barCharts = d3.select('#bar-charts')
    .append('svg')
    .attr('width', 800)
    .attr('height', 400);

const resources = ['hospitalBeds', 'medicalProfessionals'];

resources.forEach((resource, i) => {
    const barChart = barCharts.append('g')
        .attr('transform', `translate(${i * 400}, 0)`);

    const x = d3.scaleBand()
        .domain(data.map(d => d.country))
        .range([50, 350])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d[resource])])
        .range([350, 50]);

    barChart.selectAll('rect')
        .data(data)
        .enter().append('rect')
        .attr('x', d => x(d.country))
        .attr('y', d => y(d[resource]))
        .attr('width', x.bandwidth())
        .attr('height', d => 350 - y(d[resource]))
        .attr('fill', 'green');

    barChart.append('g')
        .attr('transform', 'translate(0, 350)')
        .call(d3.axisBottom(x).tickFormat(d => d));

    barChart.append('g')
        .attr('transform', 'translate(50, 0)')
        .call(d3.axisLeft(y));

    barChart.append('text')
        .attr('transform', 'translate(200, 380)')
        .style('text-anchor', 'middle')
        .text(resource.replace(/([A-Z])/g, ' $1'));
});
