let chartRef = null;

function groupByHour(rows) {
  const map = new Map(); // hourIso -> count
  rows.forEach(r => {
    const d = new Date(r.conversationStart);
    if (isNaN(d)) return;
    const hour = new Date(d); hour.setMinutes(0,0,0);
    const key = hour.toISOString();
    map.set(key, (map.get(key) || 0) + 1);
  });
  const entries = [...map.entries()].sort((a,b) => a[0].localeCompare(b[0]));
  return {
    labels: entries.map(e => new Date(e[0]).toLocaleString()),
    data: entries.map(e => e[1])
  };
}

function renderChartFromRows(rows) {
  const ctx = document.getElementById('chart');
  const { labels, data } = groupByHour(rows);

  if (chartRef) {
    chartRef.destroy();
    chartRef = null;
  }
  chartRef = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Errores por hora',
        data
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } }
      }
    }
  });
}

window.renderChartFromRows = renderChartFromRows;
