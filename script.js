// script.js
import { supabase } from './config.js';
import { isOverdue, filterData, updateChart } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Função para buscar os dados da tabela 'cargas' no Supabase
  async function fetchContainersData() {
    const { data, error } = await supabase.from('cargas').select('*');
    if (error) {
      console.error('Erro ao buscar dados:', error);
      return [];
    }
    return data;
  }

  // Carrega os dados iniciais
  let containersData = await fetchContainersData();

  // Inicialização dos gráficos
  const chartTiposCarga = new Chart(document.getElementById('chart-tipos-carga').getContext('2d'), {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'Número de Containers',
        data: [],
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            precision: 0
          }
        }
      }
    }
  });

  const chartProximosVencimento = new Chart(document.getElementById('chart-proximos-vencimento').getContext('2d'), {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Dias Restantes',
        data: [],
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderWidth: 2,
        fill: true
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            precision: 0
          }
        }
      }
    }
  });

  // Atualiza o dashboard (tabelas e gráficos)
  async function atualizarDashboard() {
    containersData = await fetchContainersData();

    // 1. Filtra containers vencidos (usando a propriedade data_saida)
    const containersVencidos = containersData.filter(container => isOverdue(container.data_saida));

    // 2. Preenche a tabela de containers vencidos
    populateTable('tabela-containers-vencidos', containersVencidos, false, containersData, atualizarDashboard);

    // 3. Preenche a tabela principal
    populateTable('tabela-containers', containersData, true, containersData, atualizarDashboard);

    // 4. Dados para o gráfico de tipos de carga
    const tiposDeCarga = [...new Set(containersData.map(container => container.tipo_carga))];
    const contagens = tiposDeCarga.map(tipo => containersData.filter(container => container.tipo_carga === tipo).length);
    updateChart(chartTiposCarga, tiposDeCarga, contagens);

    // 5. Dados para o gráfico de próximos ao vencimento (exibe os 5 primeiros)
    const proximosVencimento = [...containersData]
      .sort((a, b) => new Date(a.data_saida) - new Date(b.data_saida))
      .slice(0, 5);
    const labelsVencimento = proximosVencimento.map(container => container.id);
    const diasRestantes = proximosVencimento.map(container => {
      const diff = new Date(container.data_saida).getTime() - new Date().getTime();
      return Math.ceil(diff / (1000 * 3600 * 24));
    });
    updateChart(chartProximosVencimento, labelsVencimento, diasRestantes);
  }

  // Evento para adicionar uma nova carga
  document.getElementById('addForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const idCarga = document.getElementById('addIdCarga').value;
    const cliente = document.getElementById('addCliente').value;
    const tipoCarga = document.getElementById('addTipoCarga').value;
    const dataChegada = document.getElementById('addDataChegada').value;
    const dataSaida = document.getElementById('addDataSaida').value;

    const { error } = await supabase
      .from('cargas')
      .insert([
        { id: idCarga, cliente, tipo_carga: tipoCarga, data_chegada: dataChegada, data_saida: dataSaida }
      ]);

    if (error) {
      console.error('Erro ao inserir carga:', error);
      return;
    }

    this.reset();
    document.getElementById('addModal').style.display = 'none';
    atualizarDashboard();
  });

  // Evento para filtrar os dados
  document.getElementById('btn-filtrar').addEventListener('click', () => {
    const filtros = {
      idCarga: document.getElementById('filtro-id').value,
      dataChegada: document.getElementById('filtro-data-chegada').value,
      dataSaida: document.getElementById('filtro-data-saida').value,
      cliente: document.getElementById('filtro-cliente').value,
      tipoCarga: document.getElementById('filtro-tipo-carga').value
    };

    const dadosFiltrados = filterData(containersData, filtros);
    populateTable('tabela-containers', dadosFiltrados, true, containersData, atualizarDashboard);
  });

  document.getElementById('btn-limpar-filtro').addEventListener('click', () => {
    document.getElementById('filtro-id').value = '';
    document.getElementById('filtro-data-chegada').value = '';
    document.getElementById('filtro-data-saida').value = '';
    document.getElementById('filtro-cliente').value = '';
    document.getElementById('filtro-tipo-carga').value = '';
    atualizarDashboard();
  });

  // Funções para editar e excluir cargas
  window.editContainer = function(idCarga, containersData, atualizarDashboard) {
    const container = containersData.find(item => item.id === idCarga);
    if (container) {
      openEditModal(container, containersData, atualizarDashboard);
    }
  };

  window.deleteContainer = function(idCarga, containersData, atualizarDashboard) {
    openDeleteConfirmation(idCarga, containersData, atualizarDashboard);
  };

  // Modal para edição
  function openEditModal(container, containersData, atualizarDashboard) {
    const modal = document.getElementById('editModal');
    document.getElementById('editIdCarga').value = container.id;
    document.getElementById('editCliente').value = container.cliente;
    document.getElementById('editTipoCarga').value = container.tipo_carga;
    document.getElementById('editDataChegada').value = container.data_chegada;
    document.getElementById('editDataSaida').value = container.data_saida;

    const oldSubmitButton = document.getElementById('editSubmitButton');
    const newSubmitButton = oldSubmitButton.cloneNode(true);
    oldSubmitButton.parentNode.replaceChild(newSubmitButton, oldSubmitButton);

    newSubmitButton.addEventListener('click', async function(event) {
      event.preventDefault();
      const idCarga = document.getElementById('editIdCarga').value;
      const cliente = document.getElementById('editCliente').value;
      const tipoCarga = document.getElementById('editTipoCarga').value;
      const dataChegada = document.getElementById('editDataChegada').value;
      const dataSaida = document.getElementById('editDataSaida').value;

      const { error } = await supabase
        .from('cargas')
        .update({
          cliente,
          tipo_carga: tipoCarga,
          data_chegada: dataChegada,
          data_saida: dataSaida
        })
        .eq('id', idCarga);

      if (error) {
        console.error('Erro ao atualizar carga:', error);
        return;
      }

      modal.style.display = 'none';
      atualizarDashboard();
    });

    modal.style.display = 'block';
    document.getElementById('editCloseButton').onclick = function() {
      modal.style.display = 'none';
    };
  }

  // Modal para confirmação de exclusão
  function openDeleteConfirmation(idCarga, containersData, atualizarDashboard) {
    const modal = document.getElementById('deleteConfirmationModal');
    modal.style.display = 'block';

    document.getElementById('confirmDeleteButton').onclick = async function() {
      const { error } = await supabase
        .from('cargas')
        .delete()
        .eq('id', idCarga);

      if (error) {
        console.error('Erro ao excluir carga:', error);
        return;
      }

      modal.style.display = 'none';
      atualizarDashboard();
    };

    document.getElementById('cancelDeleteButton').onclick = function() {
      modal.style.display = 'none';
    };
  }

  // Funções auxiliares para formatação de datas e aplicação de cores
  function daysUntilDueDate(date) {
    const dueDate = new Date(date);
    const today = new Date();
    const diff = dueDate.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  }

  function applyDueDateColor(days) {
    if (days < 0) return 'red';
    else if (days <= 7) return 'orange';
    else if (days <= 30) return 'yellow';
    else return '';
  }

  // Sobrescreve a função populateTable para adicionar cores e botões de ação
  window.populateTable = function(tableId, data, showEditDeleteButtons, containersData, atualizarDashboard, sortKey = null, sortOrder = 'asc') {
    const tableBody = document.getElementById(tableId).getElementsByTagName('tbody')[0];
    tableBody.innerHTML = '';

    function compareDates(a, b, sortOrder) {
      const dateA = new Date(a);
      const dateB = new Date(b);
      if (dateA < dateB) return sortOrder === 'asc' ? -1 : 1;
      if (dateA > dateB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    }

    if (sortKey) {
      data.sort((a, b) => {
        let valueA = a[sortKey], valueB = b[sortKey];
        if (sortKey === 'data_chegada' || sortKey === 'data_saida') return compareDates(valueA, valueB, sortOrder);
        if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
        if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    data.forEach(item => {
      const row = tableBody.insertRow();
      const idCell = row.insertCell();
      const clienteCell = row.insertCell();
      const tipoCargaCell = row.insertCell();
      const dataChegadaCell = row.insertCell();
      const dataSaidaCell = row.insertCell();

      idCell.textContent = item.id;
      clienteCell.textContent = item.cliente;
      tipoCargaCell.textContent = item.tipo_carga;
      dataChegadaCell.textContent = item.data_chegada;
      dataSaidaCell.textContent = item.data_saida;

      const days = daysUntilDueDate(item.data_saida);
      idCell.style.backgroundColor = applyDueDateColor(days);

      if (tableId === 'tabela-containers') {
        const statusCell = row.insertCell();
        statusCell.textContent = isOverdue(item.data_saida) ? 'Vencido' : 'Em dia';
        if (isOverdue(item.data_saida)) row.classList.add('vencido');

        if (showEditDeleteButtons) {
          const actionsCell = row.insertCell();
          const editButton = document.createElement('button');
          editButton.textContent = 'Editar';
          editButton.onclick = function() {
            window.editContainer(item.id, containersData, atualizarDashboard);
          };

          const deleteButton = document.createElement('button');
          deleteButton.textContent = 'Excluir';
          deleteButton.onclick = function() {
            window.deleteContainer(item.id, containersData, atualizarDashboard);
          };

          actionsCell.appendChild(editButton);
          actionsCell.appendChild(deleteButton);
        }
      }
    });
  };

  let currentSortKey = null;
  let currentSortOrder = 'asc';

  window.sortTable = function(tableId, key) {
    if (currentSortKey === key) currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
    else { currentSortKey = key; currentSortOrder = 'asc'; }
    window.populateTable(tableId, containersData, true, containersData, atualizarDashboard, currentSortKey, currentSortOrder);
  };

  // Eventos para abrir/fechar os modais
  document.getElementById('add-container-button').addEventListener('click', () => {
    document.getElementById('addModal').style.display = 'block';
  });
  document.getElementById('addCloseButton').addEventListener('click', () => {
    document.getElementById('addModal').style.display = 'none';
  });

  // Inicializa o dashboard
  atualizarDashboard();
});
