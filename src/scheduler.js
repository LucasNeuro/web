// Scheduler simples sem dependências externas
const extrator = require('./extrator');
const processador = require('./processar');
const supabase = require('./config/supabase');

class SchedulerPNCP {
  constructor() {
    this.isRunning = false;
    this.currentExecution = null;
    this.config = {
      horaExecucao: '08:00',
      ativo: true,
      diasRetroativos: 1,
      limiteProcessamento: 100
    };
    this.cronJob = null;
  }

  async inicializar() {
    console.log('[SCHEDULER] Inicializando scheduler...');
    
    // Carregar configuração do banco
    await this.carregarConfiguracao();
    
    // Configurar execução automática
    if (this.config.ativo) {
      this.configurarExecucaoAutomatica();
    }
    
    console.log('[SCHEDULER] Scheduler inicializado');
    console.log(`[SCHEDULER] Hora: ${this.config.horaExecucao}`);
    console.log(`[SCHEDULER] Ativo: ${this.config.ativo}`);
    console.log(`[SCHEDULER] Dias retroativos: ${this.config.diasRetroativos}`);
  }

  async carregarConfiguracao() {
    try {
      const { data: config, error } = await supabase
        .from('scheduler_horario')
        .select('*')
        .eq('id', 1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('[SCHEDULER] Erro ao carregar configuração:', error.message);
        return;
      }

      if (config) {
        this.config.horaExecucao = config.hora_execucao || '08:00';
        this.config.ativo = config.ativo !== false;
        this.config.ultimaExecucao = config.ultima_execucao;
        this.config.proximaExecucao = config.proxima_execucao;
      } else {
        // Criar configuração padrão
        await this.criarConfiguracaoPadrao();
      }
    } catch (error) {
      console.error('[SCHEDULER] Erro ao carregar configuração:', error.message);
    }
  }

  async criarConfiguracaoPadrao() {
    try {
      const { error } = await supabase
        .from('scheduler_horario')
        .insert({
          id: 1,
          hora_execucao: '08:00:00',
          ativo: true
        });

      if (error) {
        console.error('[SCHEDULER] Erro ao criar configuração padrão:', error.message);
      } else {
        console.log('[SCHEDULER] Configuração padrão criada');
      }
    } catch (error) {
      console.error('[SCHEDULER] Erro ao criar configuração padrão:', error.message);
    }
  }

  configurarExecucaoAutomatica() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    console.log(`[SCHEDULER] Configurando execução automática para ${this.config.horaExecucao}`);

    // Calcular próxima execução
    this.calcularProximaExecucao();
    
    // Configurar timeout para próxima execução
    this.agendarProximaExecucao();
  }

  agendarProximaExecucao() {
    if (!this.config.proximaExecucao) return;

    const proximaExec = new Date(this.config.proximaExecucao);
    const agora = new Date();
    const tempoParaExecucao = proximaExec.getTime() - agora.getTime();

    if (tempoParaExecucao > 0) {
      console.log(`[SCHEDULER] Próxima execução agendada para: ${proximaExec.toLocaleString('pt-BR')}`);
      
      this.timeoutId = setTimeout(async () => {
        console.log('[SCHEDULER] ⏰ Execução automática iniciada');
        await this.executarProcessoCompleto();
        
        // Agendar próxima execução (amanhã)
        this.calcularProximaExecucao();
        this.agendarProximaExecucao();
      }, tempoParaExecucao);
    } else {
      // Se já passou, agendar para amanhã
      this.calcularProximaExecucao();
      this.agendarProximaExecucao();
    }
  }

  calcularProximaExecucao() {
    const agora = new Date();
    const [hora, minuto] = this.config.horaExecucao.split(':');
    
    const proximaExecucao = new Date();
    proximaExecucao.setHours(parseInt(hora), parseInt(minuto), 0, 0);
    
    // Se já passou hoje, agendar para amanhã
    if (proximaExecucao <= agora) {
      proximaExecucao.setDate(proximaExecucao.getDate() + 1);
    }
    
    this.config.proximaExecucao = proximaExecucao.toISOString();
    
    // Atualizar no banco
    this.atualizarProximaExecucao(proximaExecucao);
  }

  async atualizarProximaExecucao(proximaExecucao) {
    try {
      await supabase
        .from('scheduler_horario')
        .update({
          proxima_execucao: proximaExecucao.toISOString()
        })
        .eq('id', 1);
    } catch (error) {
      console.error('[SCHEDULER] Erro ao atualizar próxima execução:', error.message);
    }
  }

  async executarProcessoCompleto() {
    if (this.isRunning) {
      console.log('[SCHEDULER] ⚠️ Processo já está em execução');
      return { status: 'em_andamento', mensagem: 'Processo já está em execução' };
    }

    this.isRunning = true;
    const inicioExecucao = Date.now();
    
    try {
      // Criar registro de execução
      const execucaoId = await this.criarRegistroExecucao();
      this.currentExecution = execucaoId;

      console.log('[SCHEDULER] 🚀 Iniciando processo completo...');
      
      // 1. Extrair URLs do dia anterior
      console.log('[SCHEDULER] 📥 Passo 1: Extraindo URLs...');
      const dadosExtracao = await extrator.extrairEditaisDiaAnterior();
      const resultadoExtracao = await extrator.salvarSupabase(dadosExtracao);
      
      // 2. Processar editais (scraping completo)
      console.log('[SCHEDULER] 🔍 Passo 2: Processando editais...');
      const resultadoProcessamento = await processador.processarEditaisRefinado(this.config.limiteProcessamento);
      
      const fimExecucao = Date.now();
      const tempoExecucao = ((fimExecucao - inicioExecucao) / 1000).toFixed(2);
      
      // 3. Finalizar registro de execução
      await this.finalizarRegistroExecucao(execucaoId, {
        status: 'concluido',
        tempo_execucao: parseFloat(tempoExecucao),
        total_encontrados: dadosExtracao.totalEditais,
        total_novos: resultadoExtracao.totalSalvos,
        total_erros: resultadoExtracao.totalErros + (resultadoProcessamento.totalErros || 0),
        detalhes: {
          extracao: resultadoExtracao,
          processamento: resultadoProcessamento
        }
      });

      // 4. Atualizar última execução
      await this.atualizarUltimaExecucao();
      
      console.log(`[SCHEDULER] ✅ Processo completo finalizado em ${tempoExecucao}s`);
      
      return {
        status: 'concluido',
        tempo_execucao: parseFloat(tempoExecucao),
        total_encontrados: dadosExtracao.totalEditais,
        total_novos: resultadoExtracao.totalSalvos,
        total_erros: resultadoExtracao.totalErros + (resultadoProcessamento.totalErros || 0)
      };

    } catch (error) {
      console.error('[SCHEDULER] ❌ Erro no processo completo:', error.message);
      
      if (this.currentExecution) {
        await this.finalizarRegistroExecucao(this.currentExecution, {
          status: 'erro',
          mensagem: error.message
        });
      }
      
      return { status: 'erro', mensagem: error.message };
    } finally {
      this.isRunning = false;
      this.currentExecution = null;
    }
  }

  async criarRegistroExecucao() {
    try {
      const { data, error } = await supabase
        .from('scheduler_execucoes')
        .insert({
          scheduler_id: 1,
          data_inicio: new Date().toISOString(),
          status: 'em_andamento',
          dias_retroativos: this.config.diasRetroativos
        })
        .select('id')
        .single();

      if (error) {
        console.error('[SCHEDULER] Erro ao criar registro de execução:', error.message);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('[SCHEDULER] Erro ao criar registro de execução:', error.message);
      return null;
    }
  }

  async finalizarRegistroExecucao(execucaoId, dados) {
    if (!execucaoId) return;

    try {
      await supabase
        .from('scheduler_execucoes')
        .update({
          data_fim: new Date().toISOString(),
          ...dados
        })
        .eq('id', execucaoId);
    } catch (error) {
      console.error('[SCHEDULER] Erro ao finalizar registro de execução:', error.message);
    }
  }

  async atualizarUltimaExecucao() {
    try {
      await supabase
        .from('scheduler_horario')
        .update({
          ultima_execucao: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', 1);
    } catch (error) {
      console.error('[SCHEDULER] Erro ao atualizar última execução:', error.message);
    }
  }

  async configurarScheduler(novaConfig) {
    try {
      const configAtualizada = {
        hora_execucao: novaConfig.horaExecucao + ':00',
        ativo: novaConfig.ativo !== false,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('scheduler_horario')
        .update(configAtualizada)
        .eq('id', 1);

      if (error) {
        throw new Error(error.message);
      }

      // Atualizar configuração local
      this.config.horaExecucao = novaConfig.horaExecucao;
      this.config.ativo = novaConfig.ativo;
      
      if (novaConfig.limiteProcessamento) {
        this.config.limiteProcessamento = novaConfig.limiteProcessamento;
      }
      
      if (novaConfig.diasRetroativos) {
        this.config.diasRetroativos = novaConfig.diasRetroativos;
      }

      // Reconfigurar execução automática
      if (this.config.ativo) {
        this.configurarExecucaoAutomatica();
      } else {
        this.parar();
      }

      return { sucesso: true, configuracao: this.config };
    } catch (error) {
      console.error('[SCHEDULER] Erro ao configurar scheduler:', error.message);
      return { sucesso: false, erro: error.message };
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      config: this.config,
      currentExecution: this.currentExecution,
      proximaExecucao: this.config.proximaExecucao,
      ultimaExecucao: this.config.ultimaExecucao
    };
  }

  async getHistoricoExecucoes(limite = 10) {
    try {
      const { data, error } = await supabase
        .from('scheduler_execucoes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limite);

      if (error) {
        throw new Error(error.message);
      }

      return { sucesso: true, execucoes: data || [] };
    } catch (error) {
      console.error('[SCHEDULER] Erro ao buscar histórico:', error.message);
      return { sucesso: false, erro: error.message };
    }
  }

  parar() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    console.log('[SCHEDULER] Scheduler parado');
  }
}

module.exports = new SchedulerPNCP();
