// script.js
import { supabase } from './config.js';
import { isOverdue, updateChart, calculateDaysInCompany } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  
  // Busca os dados da tabela "cargas" no Supabase
  async function fetchContainersData() {
    const { data, error } = await supabase.from('cargas').select('*');
    if (error) {
      console.error('Erro ao buscar dados:', error);
      return [];
    }
    return data;
  }
  
  // Atualiza o dashboard: preenche tabelas e atualiza gráficos
  async function atualizarDashboard() {
    const containersData = await fetchContainersData();
    
    // Popula a tabela de "Todos" os containers
    populateTable('tabela-containers', containersData, true, atualizarDashboard);
    
    // Popula a tabela de containers vencidos
    const expiredData = containersData.filter(container => isOverdue(container.datasaida));
    populateTable('tabela-containers-vencidos', expiredData, false, atualizarDashboard);
    
    // Atualiza o gráfico de cargas por cliente
    const clientes = [...new Set(containersData.map(c => c.cliente))];
    const contagens = clientes.map(cliente => containersData.filter(c => c.cliente === cliente).length);
    updateChart(chartTiposCarga, clientes, contagens);
    
    // Atualiza o gráfico de próximos ao vencimento (exibe os 5 primeiros)
    const proximos = [...containersData]
      .sort((a, b) => new Date(a.datasaida) - new Date(b.datasaida))
      .slice(0, 5);
    const labelsVencimento = proximos.map(c => c.idcarga);
    const diasRestantes = proximos.map(c =>
      Math.ceil((new Date(c.datasaida) - new Date()) / (1000 * 3600 * 24))
    );
    updateChart(chartProximosVencimento, labelsVencimento, diasRestantes);
  }
  
  // Inicializa os gráficos
  const chartTiposCarga = new Chart(
    document.getElementById('chart-tipos-carga').getContext('2d'),
    {
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
          y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } }
        }
      }
    }
  );
  
  const chartProximosVencimento = new Chart(
    document.getElementById('chart-proximos-vencimento').getContext('2d'),
    {
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
          y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } }
        }
      }
    }
  );
  
  // Funções CRUD via Supabase
  async function addContainer(novo) {
    const { error } = await supabase.from('cargas').insert([novo]);
    if (error) console.error('Erro ao inserir container:', error);
  }
  
  async function updateContainer(idcarga, updated) {
    const { error } = await supabase.from('cargas').update(updated).eq('idcarga', idcarga);
    if (error) console.error('Erro ao atualizar container:', error);
  }
  
  async function removeContainer(idcarga) {
    const { error } = await supabase.from('cargas').delete().eq('idcarga', idcarga);
    if (error) console.error('Erro ao excluir container:', error);
  }
  
  // Preenche a tabela com os dados (ordenar e filtrar se necessário)
  function populateTable(tableId, data, showEditDeleteButtons, atualizarDashboard, sortKey = null, sortOrder = 'asc', searchTerm = '') {
    const tableBody = document.getElementById(tableId).getElementsByTagName('tbody')[0];
    tableBody.innerHTML = '';
    
    // Filtragem por termo de busca
    const filteredData = data.filter(item => {
      if (!searchTerm) return true;
      return Object.values(item).some(val =>
        typeof val === 'string' && val.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
    
    // Ordenação (se sortKey for especificado)
    if (sortKey) {
      filteredData.sort((a, b) => {
        let vA = a[sortKey], vB = b[sortKey];
        if (sortKey === 'datachegada' || sortKey === 'datasaida') {
          return sortOrder === 'asc' ? new Date(vA) - new Date(vB) : new Date(vB) - new Date(vA);
        }
        return sortOrder === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
      });
    }
    
    filteredData.forEach(item => {
      const row = tableBody.insertRow();
      const idCell = row.insertCell();
      const clienteCell = row.insertCell();
      const tipoCargaCell = row.insertCell();
      const dataChegadaCell = row.insertCell();
      const dataSaidaCell = row.insertCell();
      const diasNaEmpresaCell = row.insertCell();
      
      idCell.textContent = item.idcarga;
      clienteCell.textContent = item.cliente;
      tipoCargaCell.textContent = item.tipocarga;
      dataChegadaCell.textContent = item.datachegada;
      dataSaidaCell.textContent = item.datasaida;
      diasNaEmpresaCell.textContent = calculateDaysInCompany(item.datachegada);
      
      // Define a cor do ID conforme a proximidade do vencimento
      const diasParaVencer = Math.ceil((new Date(item.datasaida) - new Date()) / (1000 * 3600 * 24));
      idCell.style.backgroundColor =
        diasParaVencer < 0 ? 'red' :
        (diasParaVencer <= 7 ? 'orange' : (diasParaVencer <= 30 ? 'yellow' : ''));
      
      if (tableId === 'tabela-containers') {
        const statusCell = row.insertCell();
        statusCell.textContent = isOverdue(item.datasaida) ? 'Vencido' : 'Em dia';
        if (isOverdue(item.datasaida)) row.classList.add('vencido');
        
        if (showEditDeleteButtons) {
          const actionsCell = row.insertCell();
          const editButton = document.createElement('button');
          editButton.textContent = 'Editar';
          editButton.onclick = () => window.editContainer(item.idcarga);
          const deleteButton = document.createElement('button');
          deleteButton.textContent = 'Excluir';
          deleteButton.onclick = () => window.deleteContainer(item.idcarga);
          actionsCell.appendChild(editButton);
          actionsCell.appendChild(deleteButton);
        }
      }
    });
  }
  
  // Abre o modal de edição e preenche o formulário
  async function openEditModal(item) {
    document.getElementById('editIdCarga').value = item.idcarga;
    document.getElementById('editCliente').value = item.cliente;
    document.getElementById('editTipoCarga').value = item.tipocarga;
    document.getElementById('editDataChegada').value = item.datachegada;
    document.getElementById('editDataSaida').value = item.datasaida;
    document.getElementById('editModal').style.display = 'block';
  }
  
  // Expor funções para os botões de editar e excluir
  window.editContainer = function(idcarga) {
    fetchContainersData().then(containersData => {
      const item = containersData.find(c => c.idcarga === idcarga);
      if (item) {
        openEditModal(item);
      }
    });
  };
  
  window.deleteContainer = async function(idcarga) {
    document.getElementById('deleteConfirmationModal').style.display = 'block';
    document.getElementById('confirmDeleteButton').onclick = async () => {
      await removeContainer(idcarga);
      document.getElementById('deleteConfirmationModal').style.display = 'none';
      atualizarDashboard();
    };
    document.getElementById('cancelDeleteButton').onclick = () => {
      document.getElementById('deleteConfirmationModal').style.display = 'none';
    };
  };
  
  // Eventos dos formulários de edição e adição
  document.getElementById('editForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const idcarga = document.getElementById('editIdCarga').value;
    const updated = {
      cliente: document.getElementById('editCliente').value,
      tipocarga: document.getElementById('editTipoCarga').value,
      datachegada: document.getElementById('editDataChegada').value,
      datasaida: document.getElementById('editDataSaida').value
    };
    await updateContainer(idcarga, updated);
    document.getElementById('editModal').style.display = 'none';
    atualizarDashboard();
  });
  
  document.getElementById('addForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const novo = {
      idcarga: document.getElementById('addIdCarga').value,
      cliente: document.getElementById('addCliente').value,
      tipocarga: document.getElementById('addTipoCarga').value,
      datachegada: document.getElementById('addDataChegada').value,
      datasaida: document.getElementById('addDataSaida').value
    };
    await addContainer(novo);
    this.reset();
    document.getElementById('addModal').style.display = 'none';
    atualizarDashboard();
  });
  
  // Eventos para abrir/fechar modais
  document.getElementById('add-container-button').addEventListener('click', () => {
    document.getElementById('addModal').style.display = 'block';
  });
  document.getElementById('addCloseButton').addEventListener('click', () => {
    document.getElementById('addModal').style.display = 'none';
  });
  document.getElementById('editCloseButton').addEventListener('click', () => {
    document.getElementById('editModal').style.display = 'none';
  });
  
  // Função para trocar de abas (caso sua interface use tabs)
  window.openTab = function(tabName) {
    const tabContents = document.getElementsByClassName("tab-content");
    const tabButtons = document.getElementsByClassName("tab-button");
    for (let i = 0; i < tabContents.length; i++) {
      tabContents[i].classList.remove("active");
    }
    for (let i = 0; i < tabButtons.length; i++) {
      tabButtons[i].classList.remove("active");
    }
    document.getElementById(tabName).classList.add("active");
    event.currentTarget.classList.add("active");
    atualizarDashboard();
  };

  atualizarDashboard();
});
