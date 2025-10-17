// API Base URL
const API_URL = window.location.origin;

// Variáveis do cronômetro
let cronometroIniciado = false;
let tempoInicio = null;
let intervaloCronometro = null;
let totalEditais = 0;
let editaisProcessados = 0;

// Funções do cronômetro
function iniciarCronometro(totalEditaisParaProcessar = 0) {
  if (cronometroIniciado) return;
  
  cronometroIniciado = true;
  tempoInicio = Date.now();
  totalEditais = totalEditaisParaProcessar;
  editaisProcessados = 0;
  
  // Mostrar cronômetro
  const cronometroContainer = document.getElementById('cronometro-container');
  if (cronometroContainer) {
    cronometroContainer.classList.remove('hidden');
  }
  
  // Iniciar atualização do cronômetro
  intervaloCronometro = setInterval(atualizarCronometro, 1000);
  
  console.log(`[CRONÔMETRO] Iniciado para ${totalEditais} editais`);
}

function pararCronometro() {
  if (!cronometroIniciado) return;
  
  cronometroIniciado = false;
  if (intervaloCronometro) {
    clearInterval(intervaloCronometro);
    intervaloCronometro = null;
  }
  
  // Esconder cronômetro após 3 segundos
  setTimeout(() => {
    const cronometroContainer = document.getElementById('cronometro-container');
    if (cronometroContainer) {
      cronometroContainer.classList.add('hidden');
    }
  }, 3000);
  
  console.log('[CRONÔMETRO] Parado');
}

function atualizarCronometro() {
  if (!cronometroIniciado || !tempoInicio) return;
  
  const agora = Date.now();
  const tempoDecorrido = agora - tempoInicio;
  
  // Atualizar tempo decorrido
  const tempoDecorridoFormatado = formatarTempo(tempoDecorrido);
  const tempoDecorridoEl = document.getElementById('tempo-decorrido');
  if (tempoDecorridoEl) {
    tempoDecorridoEl.textContent = tempoDecorridoFormatado;
  }
  
  // Calcular progresso e tempo estimado
  if (totalEditais > 0 && editaisProcessados > 0) {
    const percentual = Math.min((editaisProcessados / totalEditais) * 100, 100);
    const tempoEstimado = calcularTempoEstimado(tempoDecorrido, editaisProcessados, totalEditais);
    
    // Atualizar barra de progresso
    const barraProgresso = document.getElementById('barra-progresso');
    const percentualProgresso = document.getElementById('percentual-progresso');
    if (barraProgresso && percentualProgresso) {
      barraProgresso.style.width = `${percentual}%`;
      percentualProgresso.textContent = `${Math.round(percentual)}%`;
    }
    
    // Atualizar tempo estimado
    const tempoEstimadoEl = document.getElementById('tempo-estimado');
    if (tempoEstimadoEl) {
      tempoEstimadoEl.textContent = formatarTempo(tempoEstimado);
    }
  }
}

function formatarTempo(milissegundos) {
  const segundos = Math.floor(milissegundos / 1000);
  const minutos = Math.floor(segundos / 60);
  const horas = Math.floor(minutos / 60);
  
  const s = segundos % 60;
  const m = minutos % 60;
  const h = horas % 24;
  
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function calcularTempoEstimado(tempoDecorrido, processados, total) {
  if (processados === 0) return 0;
  
  const tempoPorEdital = tempoDecorrido / processados;
  const restantes = total - processados;
  
  return restantes * tempoPorEdital;
}

function atualizarProgressoCronometro(processados, total) {
  editaisProcessados = processados;
  totalEditais = total;
}

// Funcoes de utilidade
function showLoading(text = 'Processando...') {
  const modal = document.getElementById('loading-modal');
  const textEl = document.getElementById('loading-text');
  if (modal && textEl) {
    modal.classList.remove('hidden');
    textEl.textContent = text;
  }
}

function hideLoading() {
  const modal = document.getElementById('loading-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR');
}

function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('pt-BR');
}

// Atualizar status geral
async function atualizarStatus() {
  try {
    const response = await fetch(`${API_URL}/api/status-sistema`);
    const result = await response.json();
    
    if (result.sucesso && result.data) {
      const data = result.data;
      
      const totalExtraidosEl = document.getElementById('total-extraidos');
      const totalProcessadosEl = document.getElementById('total-processados');
      const totalPendentesEl = document.getElementById('total-pendentes');
      const percentualCoberturaEl = document.getElementById('percentual-cobertura');
      
      if (totalExtraidosEl) totalExtraidosEl.textContent = formatNumber(data.total_urls_extraidas);
      if (totalProcessadosEl) totalProcessadosEl.textContent = formatNumber(data.total_processados);
      if (totalPendentesEl) totalPendentesEl.textContent = formatNumber(data.total_pendentes);
      if (percentualCoberturaEl) percentualCoberturaEl.textContent = data.percentual_cobertura + '%';
      
      const ultimaAtualizacaoEl = document.getElementById('ultima-atualizacao');
      if (ultimaAtualizacaoEl) ultimaAtualizacaoEl.textContent = formatDate(result.timestamp);
    }
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
  }
}

// Atualizar editais pendentes
async function atualizarPendentes() {
  try {
    const response = await fetch(`${API_URL}/api/pendentes?limite=50`);
    const result = await response.json();
    
    const tbody = document.getElementById('pendentes-table');
    
    if (result.sucesso && result.data && result.data.length > 0) {
      tbody.innerHTML = result.data.map((item, index) => `
        <tr class="hover:bg-yellow-500/10 transition-colors ${index === 0 ? 'bg-green-500/5 border-l-4 border-green-500' : ''}">
          <td class="px-4 py-3">
            <div class="flex items-center space-x-3">
              <div class="flex-shrink-0">
                <span class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                  index === 0 ? 'bg-green-500 text-white' : 
                  index < 3 ? 'bg-yellow-500 text-white' : 
                  'bg-gray-500 text-white'
                }">
                  ${index + 1}
                </span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-white truncate">
                  ${item.razao_social?.substring(0, 40) || 'N/A'}...
                </div>
                <div class="text-xs text-gray-400 truncate">
                  ${item.url ? item.url.substring(0, 50) + '...' : 'N/A'}
                </div>
                ${index === 0 ? '<div class="text-xs text-green-400 font-semibold">🎯 PRÓXIMO NA FILA</div>' : ''}
              </div>
            </div>
          </td>
          <td class="px-4 py-3 text-center">
            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
              item.tentativas_processamento === 0 ? 'bg-blue-100 text-blue-800' : 
              item.tentativas_processamento < 3 ? 'bg-yellow-100 text-yellow-800' : 
              'bg-red-100 text-red-800'
            }">
              ${item.tentativas_processamento}/3
            </span>
          </td>
          <td class="px-4 py-3">
            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
              item.prioridade === 'NOVO' ? 'bg-green-100 text-green-800' : 
              item.prioridade === 'RETRY' ? 'bg-yellow-100 text-yellow-800' : 
              'bg-red-100 text-red-800'
            }">
              ${item.prioridade}
            </span>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="px-4 py-6 text-center text-gray-200 bg-gray-700/60 rounded-lg">
            <div class="flex items-center justify-center">
              <svg class="w-5 h-5 mr-2 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Nenhum edital pendente
            </div>
          </td>
        </tr>
      `;
    }
  } catch (error) {
    console.error('Erro ao atualizar pendentes:', error);
    document.getElementById('pendentes-table').innerHTML = '<tr><td colspan="3" class="px-4 py-4 text-center text-red-500">Erro ao carregar</td></tr>';
  }
}

// Atualizar execucoes
async function atualizarExecucoes() {
  try {
    const response = await fetch(`${API_URL}/api/scheduler/historico?limite=20`);
    const result = await response.json();
    
    const tbody = document.getElementById('execucoes-table');
    
    if (result.sucesso && result.execucoes && result.execucoes.length > 0) {
      tbody.innerHTML = result.execucoes.map(item => `
        <tr class="hover:bg-green-500/10 transition-colors">
          <td class="px-4 py-3 text-white font-medium">${formatDate(item.data_inicio)}</td>
          <td class="px-4 py-3">
            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
              item.status === 'concluido' ? 'bg-green-100 text-green-800' : 
              item.status === 'erro' ? 'bg-red-100 text-red-800' : 
              'bg-yellow-100 text-yellow-800'
            }">
              ${item.status}
            </span>
          </td>
          <td class="px-4 py-3 text-center">
            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
              ${formatNumber(item.total_novos || 0)}
            </span>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="px-4 py-6 text-center text-gray-200 bg-gray-700/60 rounded-lg">
            <div class="flex items-center justify-center">
              <svg class="w-5 h-5 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Nenhuma execução registrada
            </div>
          </td>
        </tr>
      `;
    }
  } catch (error) {
    console.error('Erro ao atualizar execuções:', error);
    document.getElementById('execucoes-table').innerHTML = '<tr><td colspan="3" class="px-4 py-4 text-center text-red-500">Erro ao carregar</td></tr>';
  }
}

// Atualizar dashboard completo
async function atualizarDashboard() {
  try {
    await Promise.all([
      atualizarStatus(),
      atualizarPendentes(),
      atualizarExecucoes()
    ]);
  } catch (error) {
    console.error('Erro ao atualizar dashboard:', error);
  }
}

// Executar scheduler
async function executarScheduler() {
  if (!confirm('Deseja executar o processo completo (Extração + Processamento)?')) {
    return;
  }

  // Iniciar cronômetro
  iniciarCronometro();

  // Mostrar no terminal do scheduler
  const terminalScheduler = document.getElementById('terminal-scheduler');
  if (terminalScheduler) {
    terminalScheduler.innerHTML = '';
    adicionarLogTerminal(terminalScheduler, '🚀 Iniciando processo completo...', 'text-yellow-400');
    adicionarLogTerminal(terminalScheduler, '⏳ Aguarde, isso pode demorar alguns minutos...', 'text-blue-400');
  }

  try {
    const response = await fetch(`${API_URL}/api/scheduler/executar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    if (result.status === 'concluido') {
      adicionarLogTerminal(terminalScheduler, '✅ Processo concluído com sucesso!', 'text-green-400');
      adicionarLogTerminal(terminalScheduler, `📊 Encontrados: ${result.total_encontrados}`, 'text-blue-400');
      adicionarLogTerminal(terminalScheduler, `📊 Processados: ${result.total_novos}`, 'text-green-400');
      adicionarLogTerminal(terminalScheduler, `⏱️ Tempo: ${result.tempo_execucao}s`, 'text-yellow-400');
      
      // Parar cronômetro
      pararCronometro();
      
      await atualizarDashboard();
    } else if (result.status === 'em_andamento') {
      adicionarLogTerminal(terminalScheduler, '⚠️ Processo já está em andamento!', 'text-yellow-400');
    } else {
      adicionarLogTerminal(terminalScheduler, '❌ Erro ao executar processo', 'text-red-400');
      pararCronometro();
    }
  } catch (error) {
    adicionarLogTerminal(terminalScheduler, '❌ Erro ao executar processo', 'text-red-400');
    pararCronometro();
    console.error('Erro:', error);
  }
}

// Processar pendentes
async function processarPendentes() {
  const limite = prompt('Quantos editais deseja processar?', '100');
  
  if (!limite || isNaN(limite)) {
    return;
  }

  // Iniciar cronômetro
  iniciarCronometro(parseInt(limite));

  // Mostrar no terminal de processamento
  const terminalProcessamento = document.getElementById('terminal-processamento');
  if (terminalProcessamento) {
    terminalProcessamento.innerHTML = '';
    adicionarLogTerminal(terminalProcessamento, '🚀 Iniciando processamento...', 'text-yellow-400');
    adicionarLogTerminal(terminalProcessamento, `📊 Processando ${limite} editais pendentes...`, 'text-blue-400');
  }

  try {
    const response = await fetch(`${API_URL}/api/processar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ limite: parseInt(limite) })
    });

    const result = await response.json();

    if (result.status === 'concluido') {
      adicionarLogTerminal(terminalProcessamento, '✅ Processamento concluído!', 'text-green-400');
      adicionarLogTerminal(terminalProcessamento, `📊 Processados: ${result.totalProcessados}`, 'text-green-400');
      adicionarLogTerminal(terminalProcessamento, `⏱️ Tempo: ${result.tempoTotal}s`, 'text-yellow-400');
      
      // Parar cronômetro
      pararCronometro();
      
      await atualizarDashboard();
    } else if (result.status === 'em_andamento') {
      adicionarLogTerminal(terminalProcessamento, '⚠️ Processamento já está em andamento!', 'text-yellow-400');
    } else {
      adicionarLogTerminal(terminalProcessamento, '❌ Erro ao processar', 'text-red-400');
      pararCronometro();
    }
  } catch (error) {
    adicionarLogTerminal(terminalProcessamento, '❌ Erro ao processar', 'text-red-400');
    pararCronometro();
    console.error('Erro:', error);
  }
}

// Auto-refresh a cada 5 segundos quando processando, 30 segundos quando parado
let autoRefreshInterval;
let isProcessing = false;

function iniciarAutoRefresh() {
  autoRefreshInterval = setInterval(async () => {
    await verificarProgresso();
    if (!isProcessing) {
      await atualizarDashboard();
    }
  }, 5000); // 5 segundos para progresso em tempo real
}

function pararAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }
}

// Verificar progresso em tempo real
async function verificarProgresso() {
  try {
    const response = await fetch(`${API_URL}/api/scheduler/progresso`);
    const result = await response.json();
    
    if (result.scheduler && result.scheduler.isRunning) {
      isProcessing = true;
      atualizarProgressoReal(result);
    } else {
      isProcessing = false;
    }
  } catch (error) {
    console.error('Erro ao verificar progresso:', error);
  }
}

// Atualizar progresso em tempo real
function atualizarProgressoReal(dados) {
  const scheduler = dados.scheduler;
  const processador = dados.processador;
  
  // Atualizar status do scheduler
  if (scheduler.isRunning) {
    document.getElementById('loading-text').textContent = 
      `Processando... ${scheduler.currentStep || 'Iniciando...'}`;
    
    // Mostrar progresso do processador se disponível
    if (processador.isProcessing && processador.totalToProcess > 0) {
      const progresso = ((processador.processedCount + processador.errorCount) / processador.totalToProcess * 100).toFixed(1);
      document.getElementById('loading-text').textContent = 
        `Processando editais... ${processador.processedCount + processador.errorCount}/${processador.totalToProcess} (${progresso}%)`;
    }
  }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
  atualizarDashboard();
  iniciarAutoRefresh();
  
  console.log('Dashboard PNCP carregado');
  console.log('Auto-refresh: 30 segundos');
});

// Parar auto-refresh quando sair da página
window.addEventListener('beforeunload', () => {
  pararAutoRefresh();
});

// Funções dos Terminais
function adicionarLogTerminal(terminalEl, mensagem, cor = 'text-gray-400') {
  const timestamp = new Date().toLocaleTimeString('pt-BR');
  const logEntry = document.createElement('div');
  logEntry.className = `${cor} text-xs`;
  logEntry.innerHTML = `<span class="text-gray-500">[${timestamp}]</span> ${mensagem}`;
  
  terminalEl.appendChild(logEntry);
  terminalEl.scrollTop = terminalEl.scrollHeight;
  
  // Manter apenas os últimos 20 logs
  while (terminalEl.children.length > 20) {
    terminalEl.removeChild(terminalEl.firstChild);
  }
}

async function atualizarTerminalScheduler() {
  const terminalEl = document.getElementById('terminal-scheduler');
  if (!terminalEl) return;
  
  try {
    const response = await fetch(`${API_URL}/api/scheduler/progresso`);
    if (!response.ok) throw new Error('Erro na resposta');
    
    const data = await response.json();
    terminalEl.innerHTML = '';
    
    if (data.scheduler && data.scheduler.isRunning) {
      adicionarLogTerminal(terminalEl, '🟢 Scheduler ATIVO', 'text-green-400');
      adicionarLogTerminal(terminalEl, `⏰ Próxima: ${formatDate(data.scheduler.proximaExecucao)}`, 'text-blue-400');
      
      if (data.scheduler.currentExecution) {
        adicionarLogTerminal(terminalEl, `🔄 Execução: ${data.scheduler.currentExecution}`, 'text-yellow-400');
      }
      
      if (data.scheduler.ultimaExecucao) {
        adicionarLogTerminal(terminalEl, `📊 Última: ${formatDate(data.scheduler.ultimaExecucao)}`, 'text-gray-400');
      }
    } else {
      adicionarLogTerminal(terminalEl, '🔴 Scheduler PARADO', 'text-red-400');
      if (data.scheduler && data.scheduler.proximaExecucao) {
        adicionarLogTerminal(terminalEl, `⏰ Próxima: ${formatDate(data.scheduler.proximaExecucao)}`, 'text-blue-400');
      }
    }
  } catch (error) {
    terminalEl.innerHTML = '';
    adicionarLogTerminal(terminalEl, '❌ Erro ao conectar com scheduler', 'text-red-400');
  }
}

async function atualizarTerminalProcessamento() {
  const terminalEl = document.getElementById('terminal-processamento');
  const statusEl = document.getElementById('status-processamento');
  const statusTextEl = document.getElementById('status-text');
  if (!terminalEl) return;
  
  try {
    const response = await fetch(`${API_URL}/api/processar/status`);
    if (!response.ok) throw new Error('Erro na resposta');
    
    const data = await response.json();
    terminalEl.innerHTML = '';
    
    if (data.isProcessing) {
      if (statusEl) statusEl.className = 'w-2 h-2 bg-green-500 rounded-full animate-pulse';
      if (statusTextEl) {
        statusTextEl.textContent = 'PROCESSANDO';
        statusTextEl.className = 'text-green-400 text-xs';
      }
      
      adicionarLogTerminal(terminalEl, '🟢 Processamento ATIVO', 'text-green-400');
      adicionarLogTerminal(terminalEl, `📊 Progresso: ${data.progresso || '0%'}`, 'text-blue-400');
      adicionarLogTerminal(terminalEl, `✅ Processados: ${data.processedCount || 0}`, 'text-green-400');
      adicionarLogTerminal(terminalEl, `❌ Erros: ${data.errorCount || 0}`, 'text-red-400');
      adicionarLogTerminal(terminalEl, `🎯 Taxa: ${data.taxa_sucesso || '0%'}`, 'text-yellow-400');
      
      // Atualizar cronômetro se estiver ativo
      if (cronometroIniciado && data.processedCount) {
        atualizarProgressoCronometro(data.processedCount, totalEditais);
      }
      
      if (data.currentUrl) {
        adicionarLogTerminal(terminalEl, `🔗 ${data.currentUrl}`, 'text-gray-400');
      }
    } else {
      if (statusEl) statusEl.className = 'w-2 h-2 bg-gray-500 rounded-full';
      if (statusTextEl) {
        statusTextEl.textContent = 'PARADO';
        statusTextEl.className = 'text-gray-400 text-xs';
      }
      
      adicionarLogTerminal(terminalEl, '🔴 Processamento PARADO', 'text-red-400');
      if (data.processedCount !== undefined) {
        adicionarLogTerminal(terminalEl, `📊 Total: ${data.processedCount || 0}`, 'text-blue-400');
        adicionarLogTerminal(terminalEl, `❌ Erros: ${data.errorCount || 0}`, 'text-red-400');
      }
    }
  } catch (error) {
    terminalEl.innerHTML = '';
    adicionarLogTerminal(terminalEl, '❌ Erro ao conectar com processador', 'text-red-400');
  }
}

function atualizarTerminalSistema() {
  const terminalEl = document.getElementById('terminal-sistema');
  
  fetch(`${API_URL}/api/status-sistema`)
    .then(response => response.json())
    .then(data => {
      terminalEl.innerHTML = '';
      
      adicionarLogTerminal(terminalEl, '🟢 Sistema ONLINE', 'text-green-400');
      adicionarLogTerminal(terminalEl, `📊 Total extraídos: ${data.data.total_urls_extraidas || 0}`, 'text-blue-400');
      adicionarLogTerminal(terminalEl, `✅ Total processados: ${data.data.total_processados || 0}`, 'text-green-400');
      adicionarLogTerminal(terminalEl, `⏳ Pendentes: ${data.data.total_pendentes || 0}`, 'text-yellow-400');
      adicionarLogTerminal(terminalEl, `❌ Falhados: ${data.data.total_falhados || 0}`, 'text-red-400');
    })
    .catch(error => {
      adicionarLogTerminal(terminalEl, '❌ Erro ao conectar com sistema', 'text-red-400');
    });
}

async function atualizarTodosTerminais() {
  try {
    await atualizarTerminalScheduler();
    await atualizarTerminalProcessamento();
    await atualizarTerminalSistema();
  } catch (error) {
    console.error('Erro ao atualizar terminais:', error);
  }
}

// Sistema de Tabs
function mostrarTab(tabName) {
  console.log('Mudando para tab:', tabName);
  
  // Esconder todas as tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.add('hidden');
    console.log('Escondendo tab:', tab.id);
  });
  
  // Remover classe ativa de todos os botões
  document.querySelectorAll('[id^="tab-"]').forEach(btn => {
    btn.className = 'px-4 py-2 rounded-md text-sm font-medium transition-colors text-gray-400 hover:text-white hover:bg-gray-700';
  });
  
  // Mostrar tab selecionada
  const tabSelecionada = document.getElementById(`content-${tabName}`);
  if (tabSelecionada) {
    tabSelecionada.classList.remove('hidden');
    console.log('Mostrando tab:', tabSelecionada.id);
  } else {
    console.error('Tab não encontrada:', `content-${tabName}`);
  }
  
  // Ativar botão selecionado
  const btnAtivo = document.getElementById(`tab-${tabName}`);
  if (btnAtivo) {
    btnAtivo.className = 'px-4 py-2 rounded-md text-sm font-medium transition-colors bg-accent-blue text-white';
  }
  
    // Carregar dados da tab se necessário
    if (tabName === 'final') {
      carregarTabelaFinal();
    }
}

// Variáveis para paginação e filtros
let paginaAtual = 1;
let itensPorPagina = 20;
let totalRegistros = 0;
let dadosEditais = [];
let ordenacaoAtual = { campo: 'data_extracao', direcao: 'desc' };

// Carregar editais estruturados
async function carregarEditaisEstruturados() {
  try {
    const response = await fetch(`${API_URL}/api/editais-estruturados?pagina=${paginaAtual}&limite=${itensPorPagina}&ordenacao=${ordenacaoAtual.campo}&direcao=${ordenacaoAtual.direcao}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.sucesso) {
      dadosEditais = result.dados;
      totalRegistros = result.total;
      renderizarTabelaEditais();
      atualizarPaginacao();
    } else {
      console.error('Erro ao carregar editais:', result.erro);
    }
  } catch (error) {
    console.error('Erro na requisição:', error);
  }
}

// Renderizar tabela de editais
function renderizarTabelaEditais() {
  const tbody = document.getElementById('tabela-editais-body');
  
  if (dadosEditais.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="px-4 py-8 text-center text-gray-400">
          Nenhum edital encontrado
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = dadosEditais.map(edital => `
    <tr class="hover:bg-gray-800 transition-colors">
      <td class="px-4 py-3 text-sm text-white">
        <div class="max-w-xs truncate" title="${edital.titulo_edital || 'N/A'}">
          ${edital.titulo_edital || 'N/A'}
        </div>
      </td>
      <td class="px-4 py-3 text-sm text-gray-300">
        <div class="max-w-xs truncate" title="${edital.orgao || 'N/A'}">
          ${edital.orgao || 'N/A'}
        </div>
      </td>
      <td class="px-4 py-3 text-sm text-gray-300">
        ${edital.cnpj_orgao || 'N/A'}
      </td>
      <td class="px-4 py-3 text-sm text-gray-300">
        ${edital.ano || 'N/A'}
      </td>
      <td class="px-4 py-3 text-sm text-gray-300">
        <div class="flex flex-wrap gap-1 max-w-xs">
          ${edital.anexos && edital.anexos.length > 0 ? 
            edital.anexos.map((anexo, index) => `
              <button onclick="baixarDocumento('${anexo.url || anexo.link}', '${anexo.nome || anexo.titulo || `Documento ${index + 1}`}')" 
                      class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors">
                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                ${anexo.nome || anexo.titulo || `Doc ${index + 1}`}
              </button>
            `).join('') : 
            '<span class="text-gray-500 text-xs">Nenhum documento</span>'
          }
        </div>
      </td>
      <td class="px-4 py-3 text-sm text-gray-300">
        <div class="flex flex-wrap gap-1 max-w-xs">
          ${edital.itens && edital.itens.length > 0 ? 
            edital.itens.map((item, index) => `
              <button onclick="verItem('${edital.id}', ${index})" 
                      class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 transition-colors">
                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                Item ${item.numero || index + 1}
              </button>
            `).join('') : 
            '<span class="text-gray-500 text-xs">Nenhum item</span>'
          }
        </div>
      </td>
      <td class="px-4 py-3 text-sm text-gray-300">
        <div class="flex flex-wrap gap-1 max-w-xs">
          ${edital.historico && edital.historico.length > 0 ? 
            edital.historico.map((historico, index) => `
              <button onclick="verHistorico('${edital.id}', ${index})" 
                      class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors">
                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                ${historico.data || historico.timestamp || `Hist ${index + 1}`}
              </button>
            `).join('') : 
            '<span class="text-gray-500 text-xs">Nenhum histórico</span>'
          }
        </div>
      </td>
      <td class="px-4 py-3 text-sm text-gray-300">
        ${edital.data_extracao ? formatDate(edital.data_extracao) : 'N/A'}
      </td>
      <td class="px-4 py-3 text-sm text-gray-300">
        <div class="flex space-x-2">
          <button onclick="verDetalhes('${edital.id}')" class="text-accent-blue hover:text-accent-blue/80">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
          </button>
          <button onclick="abrirEdital('${edital.url_edital}')" class="text-green-500 hover:text-green-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Atualizar paginação
function atualizarPaginacao() {
  const totalPaginas = Math.ceil(totalRegistros / itensPorPagina);
  const inicio = (paginaAtual - 1) * itensPorPagina + 1;
  const fim = Math.min(paginaAtual * itensPorPagina, totalRegistros);
  
  document.getElementById('pagina-inicio').textContent = inicio;
  document.getElementById('pagina-fim').textContent = fim;
  document.getElementById('total-registros').textContent = totalRegistros;
  
  // Botões anterior/próximo
  document.getElementById('btn-anterior').disabled = paginaAtual === 1;
  document.getElementById('btn-proximo').disabled = paginaAtual === totalPaginas;
  
  // Números das páginas
  const numerosPagina = document.getElementById('numeros-pagina');
  numerosPagina.innerHTML = '';
  
  const inicioPagina = Math.max(1, paginaAtual - 2);
  const fimPagina = Math.min(totalPaginas, paginaAtual + 2);
  
  for (let i = inicioPagina; i <= fimPagina; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      i === paginaAtual 
        ? 'bg-accent-blue text-white' 
        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
    }`;
    btn.onclick = () => irParaPagina(i);
    numerosPagina.appendChild(btn);
  }
}

// Funções de paginação
function mudarPagina(direcao) {
  if (direcao === 'anterior' && paginaAtual > 1) {
    paginaAtual--;
    carregarEditaisEstruturados();
  } else if (direcao === 'proximo' && paginaAtual < Math.ceil(totalRegistros / itensPorPagina)) {
    paginaAtual++;
    carregarEditaisEstruturados();
  }
}

function irParaPagina(pagina) {
  paginaAtual = pagina;
  carregarEditaisEstruturados();
}

// Ordenação
function ordenarTabela(campo) {
  if (ordenacaoAtual.campo === campo) {
    ordenacaoAtual.direcao = ordenacaoAtual.direcao === 'asc' ? 'desc' : 'asc';
  } else {
    ordenacaoAtual.campo = campo;
    ordenacaoAtual.direcao = 'asc';
  }
  carregarEditaisEstruturados();
}

// Ações
function verDetalhes(id) {
  // Implementar modal de detalhes
  console.log('Ver detalhes:', id);
}

function abrirEdital(url) {
  window.open(url, '_blank');
}

function atualizarTabelaEditais() {
  carregarEditaisEstruturados();
}

// Baixar documento
function baixarDocumento(url, nome) {
  if (url) {
    // Criar link temporário para download
    const link = document.createElement('a');
    link.href = url;
    link.download = nome || 'documento';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    alert('URL do documento não disponível');
  }
}

// Ver item detalhado
function verItem(editalId, itemIndex) {
  const edital = dadosEditais.find(e => e.id === editalId);
  if (edital && edital.itens && edital.itens[itemIndex]) {
    const item = edital.itens[itemIndex];
    
    // Criar modal com detalhes do item
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-dark-card border border-dark-border rounded-lg p-6 max-w-2xl w-full mx-4">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold text-white">Detalhes do Item ${item.numero || itemIndex + 1}</h3>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Descrição:</label>
            <p class="text-white bg-gray-800 p-3 rounded">${item.descricao || 'N/A'}</p>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Quantidade:</label>
              <p class="text-white">${item.quantidade || 'N/A'}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Unidade:</label>
              <p class="text-white">${item.unidade || 'N/A'}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Valor Unitário:</label>
              <p class="text-white">${item.valor_unitario ? 'R$ ' + item.valor_unitario : 'N/A'}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Valor Total:</label>
              <p class="text-white">${item.valor_total ? 'R$ ' + item.valor_total : 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
}

// Ver histórico detalhado
function verHistorico(editalId, historicoIndex) {
  const edital = dadosEditais.find(e => e.id === editalId);
  if (edital && edital.historico && edital.historico[historicoIndex]) {
    const historico = edital.historico[historicoIndex];
    
    // Criar modal com detalhes do histórico
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-dark-card border border-dark-border rounded-lg p-6 max-w-2xl w-full mx-4">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold text-white">Histórico - ${historico.data || historico.timestamp || 'Entrada ' + (historicoIndex + 1)}</h3>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-white">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="space-y-4">
          ${Object.keys(historico).map(key => `
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">${key.charAt(0).toUpperCase() + key.slice(1)}:</label>
              <p class="text-white bg-gray-800 p-3 rounded">${historico[key] || 'N/A'}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
}

// Exportar para Excel
function exportarPlanilha() {
  // Implementar exportação para Excel
  console.log('Exportar planilha');
}

// Inicializar sistema
function inicializarSistema() {
  // Garantir que apenas a tab dashboard esteja visível inicialmente
  mostrarTab('dashboard');
  
  // Inicializar terminais
  atualizarTodosTerminais();
  
  // Atualizar terminais a cada 5 segundos
  setInterval(atualizarTodosTerminais, 5000);
}

// =====================================================
// FUNÇÕES PARA TABELA FINAL
// =====================================================

// Variáveis para tabela final
let paginaFinalAtual = 1;
let itensPorPaginaFinal = 100;
let totalRegistrosFinal = 0;
let dadosTabelaFinal = [];
let ordenacaoFinalAtual = { campo: 'data_extracao', direcao: 'desc' };

// Carregar tabela final
async function carregarTabelaFinal() {
  try {
    const response = await fetch(`${API_URL}/api/editais-final?pagina=${paginaFinalAtual}&limite=${itensPorPaginaFinal}&ordenacao=${ordenacaoFinalAtual.campo}&direcao=${ordenacaoFinalAtual.direcao}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.sucesso) {
      dadosTabelaFinal = result.dados;
      totalRegistrosFinal = result.total;
      renderizarTabelaFinal();
      atualizarPaginacaoFinal();
    } else {
      console.error('Erro ao carregar tabela final:', result.erro);
    }
  } catch (error) {
    console.error('Erro na requisição da tabela final:', error);
  }
}

// Carregar resumo da tabela final
async function carregarResumoTabelaFinal() {
  try {
    const response = await fetch(`${API_URL}/api/editais-final/resumo`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.sucesso) {
      renderizarResumoTabelaFinal(result.resumo);
    }
  } catch (error) {
    console.error('Erro ao carregar resumo da tabela final:', error);
  }
}

// Renderizar resumo da tabela final
function renderizarResumoTabelaFinal(resumo) {
  const container = document.getElementById('resumo-tabela-final');
  if (!container) return;

  container.innerHTML = `
    <div class="bg-blue-600 rounded-lg p-4">
      <div class="text-blue-100 text-sm font-medium">Total Registros</div>
      <div class="text-white text-2xl font-bold">${resumo.total_registros || 0}</div>
    </div>
    <div class="bg-green-600 rounded-lg p-4">
      <div class="text-green-100 text-sm font-medium">Editais Únicos</div>
      <div class="text-white text-2xl font-bold">${resumo.total_editais_unicos || 0}</div>
    </div>
    <div class="bg-purple-600 rounded-lg p-4">
      <div class="text-purple-100 text-sm font-medium">Órgãos</div>
      <div class="text-white text-2xl font-bold">${resumo.total_orgaos || 0}</div>
    </div>
    <div class="bg-orange-600 rounded-lg p-4">
      <div class="text-orange-100 text-sm font-medium">Total Itens</div>
      <div class="text-white text-2xl font-bold">${resumo.total_itens_geral || 0}</div>
    </div>
  `;
}

// Renderizar tabela final
function renderizarTabelaFinal() {
  const tbody = document.getElementById('tabela-final-body');
  
  if (dadosTabelaFinal.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="px-4 py-8 text-center text-gray-400">
          Nenhum registro encontrado
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = dadosTabelaFinal.map(registro => `
    <tr class="hover:bg-gray-800 transition-colors">
      <td class="px-4 py-3 text-sm text-white">
        <div class="max-w-xs truncate" title="${registro.titulo_edital || 'N/A'}">
          ${registro.titulo_edital || 'N/A'}
        </div>
      </td>
      <td class="px-4 py-3 text-sm text-gray-300">
        <div class="max-w-xs truncate" title="${registro.orgao || 'N/A'}">
          ${registro.orgao || 'N/A'}
        </div>
      </td>
      <td class="px-4 py-3 text-sm text-gray-300">
        ${registro.cnpj_orgao || 'N/A'}
      </td>
      <td class="px-4 py-3 text-sm text-gray-300">
        ${registro.ano || 'N/A'}
      </td>
      <td class="px-4 py-3 text-sm text-gray-300">
        ${registro.item_numero ? 
          `<button onclick="mostrarModalItens('${registro.id_pncp}')" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500 text-white hover:bg-green-600 transition-colors cursor-pointer">
            Item ${registro.item_numero}
          </button>` : 
          '<span class="text-gray-500 text-xs">-</span>'
        }
      </td>
      <td class="px-4 py-3 text-sm text-gray-300">
        ${registro.anexo_nome ? 
          `<button onclick="mostrarModalAnexos('${registro.id_pncp}')" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 transition-colors cursor-pointer">
            Anexo
          </button>` : 
          '<span class="text-gray-500 text-xs">-</span>'
        }
      </td>
      <td class="px-4 py-3 text-sm text-gray-300">
        ${registro.historico_evento ? 
          `<button onclick="mostrarModalHistorico('${registro.id_pncp}')" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-500 text-white hover:bg-purple-600 transition-colors cursor-pointer">
            Histórico
          </button>` : 
          '<span class="text-gray-500 text-xs">-</span>'
        }
      </td>
      <td class="px-4 py-3 text-sm text-gray-300">
        ${registro.data_extracao ? formatDate(registro.data_extracao) : 'N/A'}
      </td>
    </tr>
  `).join('');
}

// Atualizar paginação da tabela final
function atualizarPaginacaoFinal() {
  const totalPaginas = Math.ceil(totalRegistrosFinal / itensPorPaginaFinal);
  const inicio = (paginaFinalAtual - 1) * itensPorPaginaFinal + 1;
  const fim = Math.min(paginaFinalAtual * itensPorPaginaFinal, totalRegistrosFinal);

  // Atualizar contadores
  document.getElementById('final-pagina-inicio').textContent = inicio;
  document.getElementById('final-pagina-fim').textContent = fim;
  document.getElementById('final-total-registros').textContent = totalRegistrosFinal;

  // Atualizar botões
  document.getElementById('btn-final-anterior').disabled = paginaFinalAtual <= 1;
  document.getElementById('btn-final-proximo').disabled = paginaFinalAtual >= totalPaginas;

  // Atualizar números das páginas
  const container = document.getElementById('final-numeros-pagina');
  container.innerHTML = '';

  const inicioPagina = Math.max(1, paginaFinalAtual - 2);
  const fimPagina = Math.min(totalPaginas, paginaFinalAtual + 2);

  for (let i = inicioPagina; i <= fimPagina; i++) {
    const button = document.createElement('button');
    button.textContent = i;
    button.className = `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      i === paginaFinalAtual 
        ? 'bg-accent-blue text-white' 
        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
    }`;
    button.onclick = () => irParaPaginaFinal(i);
    container.appendChild(button);
  }
}

// Mudar página da tabela final
function mudarPaginaFinal(direcao) {
  const totalPaginas = Math.ceil(totalRegistrosFinal / itensPorPaginaFinal);
  
  if (direcao === 'anterior' && paginaFinalAtual > 1) {
    paginaFinalAtual--;
    carregarTabelaFinal();
  } else if (direcao === 'proximo' && paginaFinalAtual < totalPaginas) {
    paginaFinalAtual++;
    carregarTabelaFinal();
  }
}

// Ir para página específica da tabela final
function irParaPaginaFinal(pagina) {
  const totalPaginas = Math.ceil(totalRegistrosFinal / itensPorPaginaFinal);
  if (pagina >= 1 && pagina <= totalPaginas) {
    paginaFinalAtual = pagina;
    carregarTabelaFinal();
  }
}

// Ordenar tabela final
function ordenarTabelaFinal(campo) {
  if (ordenacaoFinalAtual.campo === campo) {
    ordenacaoFinalAtual.direcao = ordenacaoFinalAtual.direcao === 'asc' ? 'desc' : 'asc';
  } else {
    ordenacaoFinalAtual.campo = campo;
    ordenacaoFinalAtual.direcao = 'asc';
  }
  carregarTabelaFinal();
}

// Popular tabela final
async function popularTabelaFinal() {
  if (!confirm('Deseja popular a tabela final com os dados estruturados? Isso pode demorar alguns minutos.')) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/popular-tabela-final`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    if (result.sucesso) {
      alert(`Tabela final populada com sucesso! ${result.total_registros} registros criados.`);
      carregarTabelaFinal();
      carregarResumoTabelaFinal();
    } else {
      alert('Erro ao popular tabela final: ' + result.erro);
    }
  } catch (error) {
    alert('Erro ao popular tabela final: ' + error.message);
  }
}

// Exportar tabela final
function exportarTabelaFinal(formato) {
  const url = `${API_URL}/api/editais-final?formato=${formato}&limite=10000`;
  window.open(url, '_blank');
}

// =====================================================
// FUNÇÕES PARA MODAIS
// =====================================================

// Mostrar modal de itens
async function mostrarModalItens(idPncp) {
  try {
    // Buscar dados completos do edital diretamente da tabela
    const response = await fetch(`${API_URL}/api/editais-estruturados?limite=1000`);
    const result = await response.json();
    
    if (result.sucesso && result.data.length > 0) {
      // Encontrar o edital específico pelo id_pncp
      const edital = result.data.find(e => e.id_pncp === idPncp);
      if (!edital) {
        mostrarModal('Erro', '<p class="text-red-400">Edital não encontrado</p>');
        return;
      }
      const itens = edital.itens || [];
      
      // Criar conteúdo do modal
      let conteudoItens = '';
      if (itens.length > 0) {
        conteudoItens = itens.map((item, index) => `
          <div class="bg-gray-700 rounded-lg p-4 mb-3">
            <h4 class="text-lg font-semibold text-white mb-2">Item ${item.numero || index + 1}</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-gray-400">Descrição:</span>
                <p class="text-white mt-1">${item.descricao || 'N/A'}</p>
              </div>
              <div>
                <span class="text-gray-400">Quantidade:</span>
                <p class="text-white mt-1">${item.quantidade || 'N/A'}</p>
              </div>
              <div>
                <span class="text-gray-400">Unidade:</span>
                <p class="text-white mt-1">${item.unidade || 'N/A'}</p>
              </div>
              <div>
                <span class="text-gray-400">Valor Unitário:</span>
                <p class="text-white mt-1">R$ ${item.valor_unitario || '0,00'}</p>
              </div>
              <div>
                <span class="text-gray-400">Valor Total:</span>
                <p class="text-white mt-1">R$ ${item.valor_total || '0,00'}</p>
              </div>
            </div>
          </div>
        `).join('');
      } else {
        conteudoItens = '<p class="text-gray-400 text-center py-8">Nenhum item encontrado</p>';
      }
      
      mostrarModal('Itens do Edital', conteudoItens);
    }
  } catch (error) {
    console.error('Erro ao carregar itens:', error);
    mostrarModal('Erro', '<p class="text-red-400">Erro ao carregar itens do edital</p>');
  }
}

// Mostrar modal de anexos
async function mostrarModalAnexos(idPncp) {
  try {
    const response = await fetch(`${API_URL}/api/editais-estruturados?limite=1000`);
    const result = await response.json();
    
    if (result.sucesso && result.data.length > 0) {
      // Encontrar o edital específico pelo id_pncp
      const edital = result.data.find(e => e.id_pncp === idPncp);
      if (!edital) {
        mostrarModal('Erro', '<p class="text-red-400">Edital não encontrado</p>');
        return;
      }
      const anexos = edital.anexos || [];
      
      let conteudoAnexos = '';
      if (anexos.length > 0) {
        conteudoAnexos = anexos.map((anexo, index) => `
          <div class="bg-gray-700 rounded-lg p-4 mb-3">
            <h4 class="text-lg font-semibold text-white mb-2">Anexo ${index + 1}</h4>
            <div class="space-y-2 text-sm">
              <div>
                <span class="text-gray-400">Nome:</span>
                <p class="text-white mt-1">${anexo.nome || 'N/A'}</p>
              </div>
              <div>
                <span class="text-gray-400">Tipo:</span>
                <p class="text-white mt-1">${anexo.tipo || 'N/A'}</p>
              </div>
              <div>
                <span class="text-gray-400">URL:</span>
                <p class="text-white mt-1 break-all">
                  ${anexo.url ? `<a href="${anexo.url}" target="_blank" class="text-blue-400 hover:text-blue-300 underline">${anexo.url}</a>` : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        `).join('');
      } else {
        conteudoAnexos = '<p class="text-gray-400 text-center py-8">Nenhum anexo encontrado</p>';
      }
      
      mostrarModal('Anexos do Edital', conteudoAnexos);
    }
  } catch (error) {
    console.error('Erro ao carregar anexos:', error);
    mostrarModal('Erro', '<p class="text-red-400">Erro ao carregar anexos do edital</p>');
  }
}

// Mostrar modal de histórico
async function mostrarModalHistorico(idPncp) {
  try {
    const response = await fetch(`${API_URL}/api/editais-estruturados?limite=1000`);
    const result = await response.json();
    
    if (result.sucesso && result.data.length > 0) {
      // Encontrar o edital específico pelo id_pncp
      const edital = result.data.find(e => e.id_pncp === idPncp);
      if (!edital) {
        mostrarModal('Erro', '<p class="text-red-400">Edital não encontrado</p>');
        return;
      }
      const historico = edital.historico || [];
      
      let conteudoHistorico = '';
      if (historico.length > 0) {
        conteudoHistorico = historico.map((evento, index) => `
          <div class="bg-gray-700 rounded-lg p-4 mb-3">
            <h4 class="text-lg font-semibold text-white mb-2">Evento ${index + 1}</h4>
            <div class="space-y-2 text-sm">
              <div>
                <span class="text-gray-400">Data:</span>
                <p class="text-white mt-1">${evento.data ? formatDate(evento.data) : 'N/A'}</p>
              </div>
              <div>
                <span class="text-gray-400">Evento:</span>
                <p class="text-white mt-1">${evento.evento || 'N/A'}</p>
              </div>
              <div>
                <span class="text-gray-400">Descrição:</span>
                <p class="text-white mt-1">${evento.descricao || 'N/A'}</p>
              </div>
            </div>
          </div>
        `).join('');
      } else {
        conteudoHistorico = '<p class="text-gray-400 text-center py-8">Nenhum evento no histórico</p>';
      }
      
      mostrarModal('Histórico do Edital', conteudoHistorico);
    }
  } catch (error) {
    console.error('Erro ao carregar histórico:', error);
    mostrarModal('Erro', '<p class="text-red-400">Erro ao carregar histórico do edital</p>');
  }
}

// Função genérica para mostrar modal
function mostrarModal(titulo, conteudo) {
  // Remover modal existente se houver
  const modalExistente = document.getElementById('modal-detalhes');
  if (modalExistente) {
    modalExistente.remove();
  }
  
  // Criar modal
  const modal = document.createElement('div');
  modal.id = 'modal-detalhes';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
      <div class="flex items-center justify-between p-6 border-b border-gray-700">
        <h3 class="text-xl font-semibold text-white">${titulo}</h3>
        <button onclick="fecharModal()" class="text-gray-400 hover:text-white transition-colors">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
        ${conteudo}
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Fechar modal ao clicar fora
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      fecharModal();
    }
  });
}

// Fechar modal
function fecharModal() {
  const modal = document.getElementById('modal-detalhes');
  if (modal) {
    modal.remove();
  }
}

// Atualizar tabela final
function atualizarTabelaFinal() {
  carregarTabelaFinal();
  carregarResumoTabelaFinal();
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
  console.log('Inicializando sistema...');
  inicializarSistema();
});

