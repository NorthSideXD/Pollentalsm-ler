// Constants for risk levels by pollen type
const RISK_LEVELS = {
    tree: {
        LOW: { threshold: 14, color: '#4CAF50' },
        MEDIUM: { threshold: 89, color: '#FFC107' },
        HIGH: { threshold: 1499, color: '#F44336' },
        VERY_HIGH: { threshold: Infinity, color: '#8B0000' }
    },
    grass: {
        LOW: { threshold: 4, color: '#4CAF50' },
        MEDIUM: { threshold: 19, color: '#FFC107' },
        HIGH: { threshold: 199, color: '#F44336' },
        VERY_HIGH: { threshold: Infinity, color: '#8B0000' }
    },
    weed: {
        LOW: { threshold: 9, color: '#4CAF50' },
        MEDIUM: { threshold: 49, color: '#FFC107' },
        HIGH: { threshold: 499, color: '#F44336' },
        VERY_HIGH: { threshold: Infinity, color: '#8B0000' }
    }
};

// Current pollen type
let currentPollenType = 'tree';

// Set up the visualization
const margin = { top: 40, right: 40, bottom: 60, left: 60 };
const width = document.getElementById('visualization').clientWidth - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// Create SVG
const svg = d3.select('#visualization')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

// Tooltip div
const tooltip = d3.select('body')
    .append('div')
    .attr('class', 'tooltip')
    .style('opacity', 0);

// Create scales
const xScale = d3.scaleLinear()
    .range([0, width]);

const yScale = d3.scaleLinear()
    .range([height, 0]);

// Add axes
const xAxis = svg.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${height})`);

const yAxis = svg.append('g')
    .attr('class', 'y-axis');

// Add axis labels
svg.append('text')
    .attr('class', 'axis-label')
    .attr('x', width / 2)
    .attr('y', height + margin.bottom - 10)
    .attr('text-anchor', 'middle')
    .text('Data from the past 30 days until now');

svg.append('text')
    .attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -margin.left + 15)
    .attr('text-anchor', 'middle')
    .text('Pollen Grains / m³');

// Add grid
svg.append('g')
    .attr('class', 'grid')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale)
        .ticks(10)
        .tickSize(-height)
        .tickFormat(''));

svg.append('g')
    .attr('class', 'grid')
    .call(d3.axisLeft(yScale)
        .ticks(10)
        .tickSize(-width)
        .tickFormat(''));

function getRiskLevel(count, type) {
    const levels = RISK_LEVELS[type];
    if (count <= levels.LOW.threshold) return {level: 'Low', color: levels.LOW.color};
    if (count <= levels.MEDIUM.threshold) return {level: 'Medium', color: levels.MEDIUM.color};
    if (count <= levels.HIGH.threshold) return {level: 'High', color: levels.HIGH.color};
    return {level: 'Very High', color: levels.VERY_HIGH.color};
}

function getAdvice(level) {
    switch(level) {
        case 'Low':
            return 'Safe to go out without medicine';
        case 'Medium':
            return 'Good idea to consider medicine';
        case 'High':
            return 'Certainly take medicine';
        case 'Very High':
            return 'Do NOT go out without medicine';
        default:
            return 'Check pollen levels';
    }
}

// Function to update risk level labels
function updateRiskLabels(type) {
    const levels = RISK_LEVELS[type];
    const labels = document.querySelectorAll('.risk-label');
    
    labels[0].textContent = `Low Risk (0-${levels.LOW.threshold})`;
    labels[1].textContent = `Medium Risk (${levels.LOW.threshold + 1}-${levels.MEDIUM.threshold})`;
    labels[2].textContent = `High Risk (${levels.MEDIUM.threshold + 1}-${levels.HIGH.threshold})`;
    labels[3].textContent = `Very High Risk (${levels.HIGH.threshold + 1}+)`;
}

// Function to update the visualization
function updateVisualization(data) {
    // Get the last 30 days of data
    const last30Days = data.slice(-30);
    
    // Update scales
    xScale.domain([29, 0]);
    yScale.domain([0, d3.max(last30Days, d => d.count) * 1.1]);

    // Update axes
    xAxis.transition().duration(500).call(d3.axisBottom(xScale));
    yAxis.transition().duration(500).call(d3.axisLeft(yScale));

    // Create line generator
    const line = d3.line()
        .x((d, i) => xScale(29 - i))
        .y(d => yScale(d.count))
        .curve(d3.curveLinear);

    // Create area generator
    const area = d3.area()
        .x((d, i) => xScale(29 - i))
        .y0(height)  // This sets the bottom of the area to the bottom of the chart
        .y1(d => yScale(d.count))
        .curve(d3.curveLinear);

    // Remove any existing gradients and areas
    svg.selectAll('defs').remove();
    svg.selectAll('.area').remove();

    // Add area fills
    const areas = svg.selectAll('.area')
        .data([last30Days]);
    areas.exit().remove();
    const newAreas = areas.enter()
        .append('path')
        .attr('class', 'area');
    areas.merge(newAreas)
        .transition()
        .duration(500)
        .attr('d', area)
        .attr('fill', d => {
            // Get the risk level color for each point based on current pollen type
            const colors = d.map(point => {
                const count = point.count;
                const levels = RISK_LEVELS[currentPollenType];
                
                if (count <= levels.LOW.threshold) {
                    return levels.LOW.color;
                } else if (count <= levels.MEDIUM.threshold) {
                    return levels.MEDIUM.color;
                } else if (count <= levels.HIGH.threshold) {
                    return levels.HIGH.color;
                } else {
                    return levels.VERY_HIGH.color;
                }
            });

            // Create a new gradient for this area
            const gradientId = `area-gradient-${currentPollenType}`;
            const gradient = svg.append('defs')
                .append('linearGradient')
                .attr('id', gradientId)
                .attr('x1', '0%')
                .attr('y1', '0%')
                .attr('x2', '100%')
                .attr('y2', '0%');

            colors.forEach((color, i) => {
                gradient.append('stop')
                    .attr('offset', `${(i / (colors.length - 1)) * 100}%`)
                    .attr('stop-color', color)
                    .attr('stop-opacity', 0.3);  // Make the fill semi-transparent
            });

            return `url(#${gradientId})`;
        });

    // Add connecting lines
    const lines = svg.selectAll('.line')
        .data([last30Days]);
    lines.exit().remove();
    const newLines = lines.enter()
        .append('path')
        .attr('class', 'line');
    lines.merge(newLines)
        .transition()
        .duration(500)
        .attr('d', line)
        .attr('stroke', d => {
            // Get the risk level color for each point based on current pollen type
            const colors = d.map(point => {
                const count = point.count;
                const levels = RISK_LEVELS[currentPollenType];
                
                // Ensure we're using the correct thresholds for each pollen type
                if (count <= levels.LOW.threshold) {
                    return levels.LOW.color;
                } else if (count <= levels.MEDIUM.threshold) {
                    return levels.MEDIUM.color;
                } else if (count <= levels.HIGH.threshold) {
                    return levels.HIGH.color;
                } else {
                    return levels.VERY_HIGH.color;
                }
            });

            // Create a new gradient for this line
            const gradientId = `line-gradient-${currentPollenType}`;
            const gradient = svg.append('defs')
                .append('linearGradient')
                .attr('id', gradientId)
                .attr('x1', '0%')
                .attr('y1', '0%')
                .attr('x2', '100%')
                .attr('y2', '0%');

            colors.forEach((color, i) => {
                gradient.append('stop')
                    .attr('offset', `${(i / (colors.length - 1)) * 100}%`)
                    .attr('stop-color', color);
            });

            return `url(#${gradientId})`;
        })
        .attr('stroke-width', 2)
        .attr('fill', 'none');

    // Dots
    const dots = svg.selectAll('.dot')
        .data(last30Days);
    dots.exit().remove();
    const newDots = dots.enter()
        .append('circle')
        .attr('class', 'dot')
        .attr('r', 5);
    dots.merge(newDots)
        .transition()
        .duration(500)
        .attr('cx', (d, i) => xScale(29 - i))
        .attr('cy', d => yScale(d.count))
        .attr('fill', d => getRiskLevel(d.count, currentPollenType).color);

    // Tooltip events
    svg.selectAll('.dot')
        .on('mouseover', function(event, d) {
            const risk = getRiskLevel(d.count, currentPollenType);
            tooltip.transition().duration(200).style('opacity', 0.95);
            tooltip.html(
                `<strong>Pollen Value:</strong> ${d.count.toFixed(1)} grains/m³<br>` +
                `<strong>Risk Level:</strong> ${risk.level}<br>` +
                `<strong>Advice:</strong> ${getAdvice(risk.level)}`
            )
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        })
        .on('mousemove', function(event) {
            tooltip.style('left', (event.pageX + 15) + 'px')
                   .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
            tooltip.transition().duration(300).style('opacity', 0);
        });
}

// Function to read and parse the data file
async function readDataFile() {
    try {
        const response = await fetch(`${currentPollenType}_pollen_data.txt`);
        const text = await response.text();
        const lines = text.trim().split('\n');
        
        const data = lines.map((line, index) => {
            const count = parseFloat(line);
            return {
                count: count
            };
        });

        updateVisualization(data);
    } catch (error) {
        console.error('Error reading data file:', error);
    }
}

// Set up pollen type selector
document.querySelectorAll('.pollen-btn').forEach(button => {
    button.addEventListener('click', () => {
        // Update active button
        document.querySelectorAll('.pollen-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Update current pollen type
        currentPollenType = button.dataset.type;
        
        // Update risk level labels
        updateRiskLabels(currentPollenType);
        
        // Update visualization
        readDataFile();
    });
});

// Initial read
readDataFile();
updateRiskLabels(currentPollenType);

// Set up polling to check for file updates
setInterval(readDataFile, 2000); // Check every 2 seconds