// utils.js

// Verifica se a data informada já passou
export function isOverdue(dateStr) {
  const dueDate = new Date(dateStr);
  const today = new Date();
  return dueDate < today;
}

// Filtra os dados com base nos filtros informados
export function filterData(data, filters) {
  return data.filter(item => {
    let matches = true;
    if (filters.idCarga && !item.id.includes(filters.idCarga)) matches = false;
    if (filters.cliente && !item.cliente.toLowerCase().includes(filters.cliente.toLowerCase())) matches = false;
    if (filters.tipoCarga && !item.tipo_carga.toLowerCase().includes(filters.tipoCarga.toLowerCase())) matches = false;
    if (filters.dataChegada && item.data_chegada !== filters.dataChegada) matches = false;
    if (filters.dataSaida && item.data_saida !== filters.dataSaida) matches = false;
    return matches;
  });
}

// Atualiza os gráficos do Chart.js
export function updateChart(chart, labels, data) {
  chart.data.labels = labels;
  chart.data.datasets[0].data = data;
  chart.update();
}

// A função populateTable é implementada no script.js (sobrescrita para incluir lógica de cores e botões)
export function populateTable() {}
