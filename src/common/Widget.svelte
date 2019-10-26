<script>
  import { pending } from '../storage.js';
  import { onMount, afterUpdate } from 'svelte';
  const types = [
    { text: 'Карта', type: 'map' },
    { text: 'По регионам', type: 'regions' },
    { text: 'По всей России', type: 'russia' },
  ];

  function init() {
    var map = new ymaps.Map('map', {
      center: [48.704272, 65.60203],
      zoom: 4,
      type: 'yandex#map',
      controls: ['zoomControl'],
    });
    map.controls.get('zoomControl').options.set({ size: 'small' });
    // Зададим цвета для раскрашивания.
    // Обратите внимание, для раскраски более крупных карт нужно задавать пятый цвет.
    var colors = ['#F0F075', '#FB6C3F', '#3D4C76', '#49C0B5'];

    var objectManager = new ymaps.ObjectManager();
    // Загрузим регионы.
    ymaps.borders
      .load('RU', {
        lang: 'ru',
        quality: 2,
      })
      .then(function(result) {
        // Очередь раскраски.
        var queue = [];
        // Создадим объект regions, где ключи это ISO код региона.
        var regions = result.features.reduce(function(acc, feature) {
          // Добавим ISO код региона в качестве feature.id для objectManager.
          var iso = feature.properties.iso3166;
          feature.id = iso;
          // Добавим опции региона по умолчанию.
          feature.options = {
            fillOpacity: 0.6,
            strokeColor: '#FFF',
            strokeOpacity: 0.5,
          };
          acc[iso] = feature;
          return acc;
        }, {});

        // Функция, которая раскрашивает регион и добавляет всех нераскрасшенных соседей в очередь на раскраску.
        function paint(iso) {
          var allowedColors = colors.slice();
          // Получим ссылку на раскрашиваемый регион и на его соседей.
          var region = regions[iso];
          var neighbors = region.properties.neighbors;
          // Если у региона есть опция fillColor, значит мы его уже раскрасили.
          if (region.options.fillColor) {
            return;
          }
          // Если у региона есть соседи, то нужно проверить, какие цвета уже заняты.
          if (neighbors.length !== 0) {
            neighbors.forEach(function(neighbor) {
              var fillColor = regions[neighbor].options.fillColor;
              // Если регион раскрашен, то исключаем его цвет.
              if (fillColor) {
                var index = allowedColors.indexOf(fillColor);
                if (index != -1) {
                  allowedColors.splice(index, 1);
                }
                // Если регион не раскрашен, то добавляем его в очередь на раскраску.
              } else if (queue.indexOf(neighbor) === -1) {
                queue.push(neighbor);
              }
            });
          }
          // Раскрасим регион в первый доступный цвет.
          region.options.fillColor = allowedColors[0];
        }

        for (var iso in regions) {
          // Если регион не раскрашен, добавим его в очередь на раскраску.
          if (!regions[iso].options.fillColor) {
            queue.push(iso);
          }
          // Раскрасим все регионы из очереди.
          while (queue.length > 0) {
            paint(queue.shift());
          }
        }
        // Добавим регионы на карту.
        result.features = [];
        for (var reg in regions) {
          result.features.push(regions[reg]);
        }
        objectManager.add(result);
        map.geoObjects.add(objectManager);
      });
  }

  afterUpdate(() => {
    if (selectedType !== 'map') {
      return;
    }

    ymaps.ready(init);
  });

  let selectedType = 'regions';
  let availableWidth;
  let availableHeight;
  let chartContainer;

  export let chart = null;

  $: if (chartContainer && chart) {
    setTimeout(() => {
      const { width, height } = chartContainer.getBoundingClientRect();

      availableHeight = height;
      availableWidth = width;
    });
  }
</script>

<style>
  .widget {
    display: grid;
    grid-template-columns: 2fr 1fr 24px 120px;
    grid-template-rows: 24px 360px 180px;
    background: #f6f6f6;
    border-radius: 30px;
    padding: 32px;
    margin: 24px 2.5%;
  }

  .widget.spinner::after {
    content: '';
    display: inline-block;
    position: absolute;

    top: 50%;
    left: 50%;
    width: 40px;
    height: 40px;
    border: 12px solid #ff8484;
    border-radius: 50%;
    border-top-color: transparent;
    border-left-color: transparent;

    animation: spin 800ms infinite linear;
  }

  @keyframes spin {
    100% {
      transform: rotate(360deg);
    }
  }

  .bar {
    display: flex;
    grid-column: 1 / 3;
    grid-row: 1 / 2;
    justify-content: space-around;
    align-items: center;
  }

  .section-title {
    display: flex;
    flex: 8;
    align-items: center;
    font-family: Pragmatica;
    font-size: 14px;
    color: #797979;
  }

  .types {
    display: flex;
    flex: 1 1 260px;
    font-family: Pragmatica;
    font-size: 14px;
    justify-content: space-between;
    color: #797979;
    height: 100%;
  }

  .type {
    cursor: pointer;
  }

  .type.selected {
    border-bottom: 1px solid #ff2929;
  }

  .vertical-line {
    grid-column: 3 / 4;
    grid-row: 1 / 4;
    align-self: center;
    justify-self: flex-end;
    width: 1px;
    height: 96%;
    background-color: #acacac;
  }

  .actions {
    grid-column: 4 / 5;
    grid-row: 1 / 3;
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
  }

  .action {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    cursor: pointer;
  }

  .action img {
    width: 56px;
    height: 56px;
  }

  .charts {
    display: flex;
    grid-column: 1 / 3;
    grid-row: 2 / 3;
    justify-content: space-evenly;
    align-items: center;
  }

  .charts.full-size {
    grid-row: 2 / 4;
  }

  .action .title {
    font-family: Pragmatica;
    font-size: 16px;
    text-align: center;
    text-transform: capitalize;

    color: #1a1a1a;
  }
</style>

<div class="widget" class:spinner={$pending}>
  <div class="bar">
    <div class="section-title">
      <slot name="name" />
    </div>
    <div class="types">
      {#each types as { text, type }}
        <span class="type" class:selected={selectedType === type} on:click={() => (selectedType = type)}>{text}</span>
      {/each}
    </div>
  </div>
  {#if selectedType !== 'map'}
    <div class="charts" class:full-size={chart} bind:this={chartContainer}>
      <slot name="chart" />
      {#if chart}
        <svelte:component this={chart} width={availableWidth} height={availableHeight} />
      {/if}
    </div>
  {:else if selectedType === 'map'}
    <div class="charts full-size" id="map" />
  {/if}
  <div class="vertical-line" />
  <div class="actions">
    <div class="action">
      <img src="./images/filters.png" alt="filters" />
      <span class="title">Фильтры</span>
    </div>
    <div class="action">
      <img src="./images/refresh.png" alt="refresh" />
      <span class="title">Обновить данные</span>
    </div>
    <div class="action">
      <img src="./images/analitics.png" alt="analitics" />
      <span class="title">Вся аналитика</span>
    </div>
  </div>
  {#if selectedType !== 'map'}
    <slot name="marks" />
  {/if}
</div>
