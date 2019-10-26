<script>
  import Widget from '../common/Widget.svelte';
  import hb2000 from '../data/horizontal-bar-2000.json';
  import * as d3 from 'd3';
  import uuid5 from 'uuid/v5';
  import { afterUpdate } from 'svelte';

  export let width;
  export let height;

  function parseChartData(object) {
    return Object.entries(object)
      .map(([key, value]) => ({ name: key, value, title: key, group: key }))
      .slice(0, 10);
  }

  function updateChart(data) {
    const color = d3.scaleOrdinal(data.map(d => d.group), d3.schemeCategory10);
    const format = d3.format(',d');

    const pack = data =>
      d3
        .pack()
        .size([width - 2, height - 2])
        .padding(3)(d3.hierarchy({ children: data }).sum(d => d.value));

    const root = pack(data);

    const svg = d3
      .select(svgEl)
      .attr('viewBox', [0, 0, width, height])
      .attr('font-size', 10)
      .attr('font-family', 'sans-serif')
      .attr('text-anchor', 'middle');

    const leaf = svg
      .selectAll('g')
      .data(root.leaves())
      .join('g')
      .attr('transform', d => `translate(${d.x + 1},${d.y + 1})`);

    leaf
      .append('circle')
      .attr(
        'id',
        d =>
          (d.leafUid = uuid5(
            leaf
              .data()
              .map(n => n.data.value)
              .sort(() => Math.random())
              .join(''),
            uuid5.URL
          )).id
      )
      .attr('r', d => d.r)
      .attr('fill-opacity', 0.7)
      .attr('fill', d => color(d.data.group));

    leaf
      .append('clipPath')
      .attr(
        'id',
        d =>
          (d.clipUid = uuid5(
            leaf
              .data()
              .map(n => n.data.value)
              .sort(() => Math.random())
              .join(''),
            uuid5.URL
          )).id
      )
      .append('use')
      .attr('xlink:href', d => d.leafUid.href);

    leaf
      .append('text')
      .attr('clip-path', d => d.clipUid)
      .selectAll('tspan')
      .data(d => d.data.name.split(/(?=[A-Z][^A-Z])/g))
      .join('tspan')
      .attr('x', 0)
      .attr('y', (d, i, nodes) => `${i - nodes.length / 2 + 0.8}em`)
      .text(d => d);

    leaf.append('title').text(d => `${d.data.title}\n${format(d.value)}`);

    return svg.node();
  }

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

<svg style="height: 360px; transform: scale(2) translateY(5%)" bind:this={svgEl} />
