// utils.js
export function isOverdue(date) {
  return new Date(date) < new Date();
}

export function filterData(data, filters) {
  return data.filter(item => {
    for (const key in filters) {
      if (filters[key] && item[key] !== filters[key]) {
        return false;
      }
    }
    return true;
  });
}

export function updateChart(chart, labels, data) {
  chart.data.labels = labels;
  chart.data.datasets[0].data = data;
  chart.update();
}

// A função populateTable será implementada no script.js
export function populateTable() {}
