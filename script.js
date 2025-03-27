// script.js
import { supabase } from './config.js';
import { isOverdue, filterData, updateChart } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {

  // Função para buscar os dados da tabela "cargas" no Supabase
  async function fetchContainersData() {
    const { data, error } = await supabase.from('cargas').select('*');
    if (error) {
      console.error('Erro ao buscar dados:', error);
      return [];
    }
    return data;
  }

  // Atualiza o dashboard: busca dados, popula tabelas e atualiza gráficos
  async function atualizarDashboard() {
    const containersData = await fetchContainersData();

    // 1. Filtrar containers vencidos
    const containersVencidos = containersData.filter(container => isOverdue(container.dataSaida));

    // 2. Popular tabela de containers vencidos
    populateTable('tabela-containers-vencidos', containersVencidos, false, atualizarDashboard);

    // 3. Popular tabela principal
    populateTable('tabela-containers', containersData, true, atualizarDashboard);

    // 4. Dados para o gráfico de cargas por cliente
    const clientes = [...new Set(containersData.map(container => container.cliente))];
    const contagens = clientes.map(cliente => containersData.filter(container => container.cliente === cliente).length);
    updateChart(chartTiposCarga, clientes, contagens);

    // 5. Dados para o gráfico de próximos ao vencimento (5 primeiros)
    const proximosVencimento = [...containersData]
      .sort((a, b) => new Date(a.dataSaida) - new Date(b.dataSaida))
      .slice(0, 5);
    const labelsVencimento = proximosVencimento.map(container => container.idCarga);
    const diasRestantes = proximosVencimento.map(container => {
      const diff = new Date(container.dataSaida).getTime() - new Date().getTime();
      return Math.ceil(diff / (1000 * 3600 * 24));
    });
    updateChart(chartProximosVencimento, labelsVencimento, diasRestantes);
  }

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
          ticks: { stepSize: 1, precision: 0 }
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
          ticks: { stepSize: 1, precision: 0 }
        }
      }
    }
  });

  // Evento de envio do formulário de adição
  document.getElementById('addForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const novo = {
      idCarga: document.getElementById('addIdCarga').value,
      cliente: document.getElementById('addCliente').value,
      tipoCarga: document.getElementById('addTipoCarga').value,
      dataChegada: document.getElementById('addDataChegada').value,
      dataSaida: document.getElementById('addDataSaida').value
    };

    const { error } = await supabase.from('cargas').insert([novo]);
    if (error) {
      console.error('Erro ao inserir carga:', error);
      return;
    }
    this.reset();
    document.getElementById('addModal').style.display = 'none';
    atualizarDashboard();
  });

  // Evento de filtro
  document.getElementById('btn-filtrar').addEventListener('click', async () => {
    const filtros = {
      idCarga: document.getElementById('filtro-id').value.trim(),
      dataChegada: document.getElementById('filtro-data-chegada').value.trim(),
      dataSaida: document.getElementById('filtro-data-saida').value.trim(),
      cliente: document.getElementById('filtro-cliente').value.trim(),
      tipoCarga: document.getElementById('filtro-tipo-carga').value.trim()
    };

    // Filtrar localmente (os dados já foram buscados)
    const containersData = await fetchContainersData();
    const dadosFiltrados = containersData.filter(item =>
      Object.keys(filtros).every(key => 
        !filtros[key] || (item[key] && item[key].toLowerCase().includes(filtros[key].toLowerCase()))
      )
    );
    populateTable('tabela-containers', dadosFiltrados, true, atualizarDashboard);
  });

  // Evento de limpar filtro
  document.getElementById('btn-limpar-filtro').addEventListener('click', () => {
    document.getElementById('filtro-id').value = '';
    document.getElementById('filtro-data-chegada').value = '';
    document.getElementById('filtro-data-saida').value = '';
    document.getElementById('filtro-cliente').value = '';
    document.getElementById('filtro-tipo-carga').value = '';
    atualizarDashboard();
  });

  // Função para calcular dias na empresa
  function calculateDaysInCompany(dataChegada) {
    const chegada = new Date(dataChegada);
    const hoje = new Date();
    return Math.floor((hoje - chegada) / (1000 * 60 * 60 * 24));
  }

  // IMPLEMENTAÇÃO DA POPULATE TABLE VIA SUPABASE
  // Nesta versão, ela busca os dados do Supabase e monta as linhas da tabela
  async function populateTable(tableId, data, showEditDeleteButtons, atualizarDashboard, sortKey = null, sortOrder = 'asc') {
    const tableBody = document.getElementById(tableId).getElementsByTagName('tbody')[0];
    tableBody.innerHTML = '';

    // Se desejar, implemente ordenação (opcional)
    if (sortKey) {
      data.sort((a, b) => {
        let vA = a[sortKey], vB = b[sortKey];
        if (sortKey === 'dataChegada' || sortKey === 'dataSaida') {
          return sortOrder === 'asc' ? new Date(vA) - new Date(vB) : new Date(vB) - new Date(vA);
        }
        return sortOrder === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
      });
    }

    data.forEach(item => {
      const row = tableBody.insertRow();

      const idCell = row.insertCell();
      const clienteCell = row.insertCell();
      const tipoCargaCell = row.insertCell();
      const dataChegadaCell = row.insertCell();
      const dataSaidaCell = row.insertCell();
      const diasNaEmpresaCell = row.insertCell();

      idCell.textContent = item.idCarga;
      clienteCell.textContent = item.cliente;
      tipoCargaCell.textContent = item.tipoCarga;
      dataChegadaCell.textContent = item.dataChegada;
      dataSaidaCell.textContent = item.dataSaida;
      diasNaEmpresaCell.textContent = calculateDaysInCompany(item.dataChegada);

      // Colore a célula do ID conforme a proximidade do vencimento
      const diasParaVencer = Math.ceil((new Date(item.dataSaida) - new Date()) / (1000 * 3600 * 24));
      idCell.style.backgroundColor = diasParaVencer < 0 ? 'red' : (diasParaVencer <= 7 ? 'orange' : (diasParaVencer <= 30 ? 'yellow' : ''));

      if (tableId === 'tabela-containers') {
        const statusCell = row.insertCell();
        statusCell.textContent = isOverdue(item.dataSaida) ? 'Vencido' : 'Em dia';
        if (isOverdue(item.dataSaida)) row.classList.add('vencido');

        if (showEditDeleteButtons) {
          const actionsCell = row.insertCell();
          const editButton = document.createElement('button');
          editButton.textContent = 'Editar';
          editButton.onclick = () => editContainer(item.idCarga);

          const deleteButton = document.createElement('button');
          deleteButton.textContent = 'Excluir';
          deleteButton.onclick = () => deleteContainer(item.idCarga);

          actionsCell.appendChild(editButton);
          actionsCell.appendChild(deleteButton);
        }
      }
    });
  }

  // Funções para editar e excluir cargas usando Supabase
  async function editContainer(idCarga) {
    // Busca o container para preencher o formulário de edição
    const { data: container } = await supabase.from('cargas').select('*').eq('idCarga', idCarga).single();
    if (container) {
      document.getElementById('editIdCarga').value = container.idCarga;
      document.getElementById('editCliente').value = container.cliente;
      document.getElementById('editTipoCarga').value = container.tipoCarga;
      document.getElementById('editDataChegada').value = container.dataChegada;
      document.getElementById('editDataSaida').value = container.dataSaida;
      document.getElementById('editModal').style.display = 'block';
    }
  }

  async function deleteContainer(idCarga) {
    document.getElementById('deleteConfirmationModal').style.display = 'block';
    document.getElementById('confirmDeleteButton').onclick = async () => {
      const { error } = await supabase.from('cargas').delete().eq('idCarga', idCarga);
      if (error) {
        console.error('Erro ao excluir:', error);
      }
      document.getElementById('deleteConfirmationModal').style.display = 'none';
      atualizarDashboard();
    };
    document.getElementById('cancelDeleteButton').onclick = () => {
      document.getElementById('deleteConfirmationModal').style.display = 'none';
    };
  }

  // Evento para salvar a edição (no modal de edição)
  document.getElementById('editForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const idCarga = document.getElementById('editIdCarga').value;
    const cliente = document.getElementById('editCliente').value;
    const tipoCarga = document.getElementById('editTipoCarga').value;
    const dataChegada = document.getElementById('editDataChegada').value;
    const dataSaida = document.getElementById('editDataSaida').value;
    const { error } = await supabase.from('cargas')
      .update({ cliente, tipoCarga, dataChegada, dataSaida })
      .eq('idCarga', idCarga);
    if (error) {
      console.error('Erro ao atualizar:', error);
      return;
    }
    document.getElementById('editModal').style.display = 'none';
    atualizarDashboard();
  });

  // Eventos para abrir/fechar os modais
  document.getElementById('add-container-button').addEventListener('click', () => {
    document.getElementById('addModal').style.display = 'block';
  });
  document.getElementById('addCloseButton').addEventListener('click', () => {
    document.getElementById('addModal').style.display = 'none';
  });
  document.getElementById('editCloseButton').addEventListener('click', () => {
    document.getElementById('editModal').style.display = 'none';
  });

  // Inicializa o dashboard
  atualizarDashboard();

  // Expor as funções para uso nos botões (se necessário)
  window.editContainer = editContainer;
  window.deleteContainer = deleteContainer;
  
  // Função para ordenação (opcional)
  let currentSortKey = null;
  let currentSortOrder = 'asc';
  window.sortTable = function(tableId, key) {
    if (currentSortKey === key) {
      currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      currentSortKey = key;
      currentSortOrder = 'asc';
    }
    fetchContainersData().then(data => {
      populateTable(tableId, data, true, atualizarDashboard, currentSortKey, currentSortOrder);
    });
  };
});
