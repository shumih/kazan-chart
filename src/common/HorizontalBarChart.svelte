<script>
  import Widget from '../common/Widget.svelte';
  import hb2000 from '../data/horizontal-bar-2000.json';
  import * as d3 from 'd3';
  import { afterUpdate } from 'svelte';

  export let width;
  export let height;

  function parseChartData(object) {
    return Object.entries(object)
      .map(([key, value]) => ({ name: key, value }))
      .slice(0, 10);
  }

  function updateChart(data) {
    const margin = { top: 30, right: 30, bottom: 10, left: 150 };

    const yAxis = g => g.attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y).tickSizeOuter(0));

    const xAxis = g =>
      g
        .attr('transform', `translate(0,${margin.top})`)
        .call(d3.axisTop(x).ticks(width / 80))
        .call(g => g.select('.domain').remove());

    const y = d3
      .scaleBand()
      .domain(data.map(d => d.name))
      .range([margin.top, height - margin.bottom])
      .padding(0.1);

    const x = d3
      .scaleLinear()
      .domain([0, d3.max(data, d => d.value)])
      .range([margin.left, width - margin.right]);

    const format = x.tickFormat(20);

    const svg = d3
      .select(svgEl)
      .style('width', width + 'px')
      .style('height', height + 'px');

    svg
      .append('g')
      .attr('fill', 'steelblue')
      .selectAll('rect')
      .data(data)
      .join('rect')
      .attr('x', x(0))
      .attr('y', d => y(d.name))
      .attr('width', d => x(d.value) - x(0))
      .attr('height', y.bandwidth())
      .attr('opacity', (d, i, array) => 1 - 0.04 * i);

    svg
      .append('g')
      .attr('fill', 'white')
      .attr('text-anchor', 'end')
      .style('font', '12px sans-serif')
      .selectAll('text')
      .data(data)
      .join('text')
      .attr('x', d => x(d.value) - 4)
      .attr('y', d => y(d.name) + y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .text(d => format(d.value));

    svg.append('g').call(xAxis);

    svg.append('g').call(yAxis);

    return svg.node();
  }

  const pieMarks = [
    { text: 'Начальное общее (начальное)', color: '#E6550D' },
    { text: 'Основное общее (неполное среднее)', color: '#FDAE6B' },
    { text: 'Среднее (полное) общее', color: '#6BAED6' },
    { text: 'Начальное профессиональное', color: '#31A354' },
    { text: 'Среднее профессиональное', color: '#756BB1' },
    { text: 'Незаконченное высшее', color: '#FDD0A2' },
    { text: 'Высшее', color: '#C7E9C0' },
    { text: 'Не имею образования', color: '#FF914E' },
  ];

  afterUpdate(() => {
    if (width && height) {
      const data = parseChartData(hb2000);

      updateChart(data);
    }
  });

  let svgEl;
</script>

<style>

</style>

<svg bind:this={svgEl} />
