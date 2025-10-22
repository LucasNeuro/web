const axios = require('axios');
const supabase = require('./config/supabase');
require('dotenv').config();

class ExtratorAPI {
  constructor() {
    this.apiConsulta = 'https://pncp.gov.br/api/consulta/v1';
    this.apiIntegracao = 'https://pncp.gov.br/api/pncp/v1';
    this.limiteRegistros = 6500; // Limite máximo
    this.registrosPorPagina = 50; // Máximo por página
    this.loteSupabase = 100; // Salvar de 100 em 100
    this.delayEntreRequisicoes = 300; // 300ms de delay entre requisições
  }

  // Função para aguardar (delay)
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Função para obter data de ontem
  obterDataOntem() {
    const hoje = new Date();
    hoje.setDate(hoje.getDate() - 1);
    
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    
    return `${ano}${mes}${dia}`;
  }

  // Função para obter data de N dias atrás no formato YYYYMMDD
  obterDataRetroativa(diasAtras) {
    const hoje = new Date();
    hoje.setDate(hoje.getDate() - diasAtras);
    
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    
    return `${ano}${mes}${dia}`;
  }

  // Função para buscar editais de um período com paginação completa (todas as modalidades)
  async buscarEditaisData(dataInicial, dataFinal = null, limite = null) {
    const dataFinalUsar = dataFinal || dataInicial;
    console.log(`🔍 Buscando editais do período: ${dataInicial} até ${dataFinalUsar} (TODAS AS MODALIDADES)`);
    
    const url = `${this.apiConsulta}/contratacoes/publicacao`;
    const tamanhoPagina = 50; // Máximo permitido pela API
    let todosEditais = [];
    let totalElementos = 0;
    
    // Modalidades disponíveis (baseado no teste anterior)
    const modalidades = [
      { codigo: 1, nome: 'Concorrência' },
      { codigo: 4, nome: 'Concurso' },
      { codigo: 5, nome: 'Leilão' },
      { codigo: 6, nome: 'Pregão Presencial' },
      { codigo: 7, nome: 'Pregão Eletrônico' },
      { codigo: 8, nome: 'Dispensa' },
      { codigo: 9, nome: 'Inexigibilidade' }
    ];
    
    try {
      for (const modalidade of modalidades) {
        console.log(`\n📋 Buscando modalidade ${modalidade.codigo} (${modalidade.nome})...`);
        
        let pagina = 1;
        let editaisModalidade = [];
        
        do {
          console.log(`📄 Página ${pagina} da modalidade ${modalidade.codigo}...`);
          
          const params = {
            dataInicial: dataInicial,
            dataFinal: dataFinalUsar,
            codigoModalidadeContratacao: modalidade.codigo,
            pagina: pagina,
            tamanhoPagina: tamanhoPagina
          };

          const response = await axios.get(url, { params });
          
          if (response.data && response.data.data) {
            const editaisPagina = response.data.data;
            editaisModalidade = editaisModalidade.concat(editaisPagina);
            totalElementos += response.data.totalRegistros || 0;
            
            console.log(`✅ ${modalidade.nome}: ${editaisPagina.length} editais (Total modalidade: ${editaisModalidade.length})`);
            
            // Se não há mais páginas, para
            if (editaisPagina.length < tamanhoPagina) {
              console.log(`📄 Última página da modalidade ${modalidade.codigo} alcançada`);
              break;
            }
            
            pagina++;
            
            // Delay entre páginas para não sobrecarregar a API
            await this.sleep(300);
            
          } else {
            console.log(`⚠️ Nenhum edital encontrado na modalidade ${modalidade.codigo}`);
            break;
          }
          
        } while (true);
        
        // Adicionar editais desta modalidade ao total
        todosEditais = todosEditais.concat(editaisModalidade);
        
        console.log(`📊 ${modalidade.nome}: ${editaisModalidade.length} editais adicionados`);
        console.log(`📈 Total acumulado: ${todosEditais.length} editais`);
        
        // Se atingiu o limite solicitado, para
        if (limite && todosEditais.length >= limite) {
          console.log(`🎯 Limite atingido: ${limite} editais`);
          todosEditais = todosEditais.slice(0, limite);
          break;
        }
        
        // Delay entre modalidades
        await this.sleep(500);
      }
      
      console.log(`🎉 Busca concluída: ${todosEditais.length} editais encontrados de todas as modalidades`);
      return { content: todosEditais, totalElements: totalElementos };
      
    } catch (error) {
      console.error('❌ Erro ao buscar editais:', error.message);
      throw error;
    }
  }

  // Função para extrair dados básicos
  async extrairDadosBasicos(cnpj, ano, sequencial) {
    const url = `${this.apiConsulta}/orgaos/${cnpj}/compras/${ano}/${sequencial}`;
    
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error(`❌ Erro ao extrair dados básicos: ${error.message}`);
      return null;
    }
  }

  // Função para extrair itens
  async extrairItens(cnpj, ano, sequencial) {
    const url = `${this.apiIntegracao}/orgaos/${cnpj}/compras/${ano}/${sequencial}/itens`;
    
    try {
      await this.sleep(this.delayEntreRequisicoes); // Delay para evitar rate limit
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error(`❌ Erro ao extrair itens: ${error.message}`);
      return [];
    }
  }

  // Função para extrair documentos
  async extrairDocumentos(cnpj, ano, sequencial) {
    const url = `${this.apiIntegracao}/orgaos/${cnpj}/compras/${ano}/${sequencial}/arquivos`;
    
    try {
      await this.sleep(this.delayEntreRequisicoes); // Delay para evitar rate limit
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error(`❌ Erro ao extrair documentos: ${error.message}`);
      return [];
    }
  }

  // Função para extrair histórico
  async extrairHistorico(cnpj, ano, sequencial) {
    const url = `${this.apiIntegracao}/orgaos/${cnpj}/compras/${ano}/${sequencial}/historico`;
    
    try {
      await this.sleep(this.delayEntreRequisicoes); // Delay para evitar rate limit
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error(`❌ Erro ao extrair histórico: ${error.message}`);
      return [];
    }
  }

  // Função para extrair com retry individual
  async extrairComRetry(funcaoExtracao, tipo) {
    const maxTentativas = 3;
    let tentativa = 0;
    
    while (tentativa < maxTentativas) {
      try {
        const resultado = await funcaoExtracao();
        return resultado;
      } catch (error) {
        tentativa++;
        
        if (error.response && error.response.status === 429) {
          // Rate limit - aguardar mais tempo
          const tempoEspera = 2000 * tentativa; // 2s, 4s, 6s
          console.log(`⏳ Rate limit em ${tipo}, aguardando ${tempoEspera}ms...`);
          await this.sleep(tempoEspera);
        } else {
          // Outro erro - aguardar menos tempo
          await this.sleep(500 * tentativa);
        }
        
        if (tentativa >= maxTentativas) {
          console.error(`❌ Falha definitiva ao extrair ${tipo}: ${error.message}`);
          return []; // Retorna array vazio em caso de falha
        }
      }
    }
  }

  // Função para extrair edital completo com retry
  async extrairEditalCompleto(edital) {
    const cnpj = edital.orgaoEntidade.cnpj;
    const ano = edital.anoCompra;
    const sequencial = edital.sequencialCompra;
    const numeroControle = edital.numeroControlePNCP;
    const razaoSocial = edital.orgaoEntidade.razaoSocial;
    
    console.log(`   📌 ${numeroControle} - ${razaoSocial}`);
    
    const startTime = Date.now();
    
    try {
      // Extrair dados básicos
      const dadosBasicos = await this.extrairDadosBasicos(cnpj, ano, sequencial);
      
      // Extrair itens, documentos e histórico com retry
      const itens = await this.extrairComRetry(() => this.extrairItens(cnpj, ano, sequencial), 'itens');
      const documentos = await this.extrairComRetry(() => this.extrairDocumentos(cnpj, ano, sequencial), 'documentos');
      const historico = await this.extrairComRetry(() => this.extrairHistorico(cnpj, ano, sequencial), 'histórico');
      
      const tempo = ((Date.now() - startTime) / 1000).toFixed(2);
      
      return {
        numero_controle_pncp: numeroControle,
        cnpj_orgao: cnpj,
        razao_social: razaoSocial,
        municipio: edital.unidadeOrgao?.municipioNome,
        uf: edital.unidadeOrgao?.ufSigla,
        ano: ano,
        sequencial: sequencial,
        numero_compra: edital.numeroCompra,
        processo: edital.processo,
        objeto: edital.objetoCompra,
        modalidade: edital.modalidadeNome,
        situacao: edital.situacaoCompraNome,
        valor_estimado: edital.valorTotalEstimado,
        valor_homologado: edital.valorTotalHomologado,
        data_publicacao: edital.dataPublicacaoPncp,
        data_abertura: edital.dataAberturaProposta, // Usar do objeto original (lista)
        data_encerramento: edital.dataEncerramentoProposta, // Usar do objeto original (lista)
        itens: itens,
        documentos: documentos,
        historico: historico,
        data_extracao: new Date().toISOString(),
        fonte: 'API_PNCP',
        tempo_extracao: parseFloat(tempo),
        processado: true,
        tentativas_processamento: 0,
        ultimo_erro: null
      };
      
    } catch (error) {
      console.error(`   ❌ Erro ao processar edital: ${error.message}`);
      return null;
    }
  }

  // Função para verificar editais já existentes
  async verificarEditaisExistentes(numerosControle) {
    try {
      const { data, error } = await supabase
        .from('editais_completos')
        .select('numero_controle_pncp')
        .in('numero_controle_pncp', numerosControle);
      
      if (error) {
        throw new Error(`Erro ao verificar editais existentes: ${error.message}`);
      }
      
      return new Set(data?.map(e => e.numero_controle_pncp) || []);
    } catch (error) {
      console.error('❌ Erro ao verificar editais existentes:', error.message);
      return new Set();
    }
  }

  // Função para salvar editais no banco
  async salvarEditais(editais) {
    if (!editais || editais.length === 0) {
      return 0;
    }

    try {
      const { data, error } = await supabase
        .from('editais_completos')
        .upsert(editais, { 
          onConflict: 'numero_controle_pncp',
          ignoreDuplicates: false 
        });

      if (error) {
        throw new Error(`Erro ao salvar editais: ${error.message}`);
      }

      console.log(`   💾 ${editais.length} editais salvos no banco`);
      return editais.length;
    } catch (error) {
      console.error('❌ Erro ao salvar editais:', error.message);
      throw error;
    }
  }

  // Função principal de extração
  async extrairEditaisCompleto(opcoes = {}) {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 EXTRAÇÃO COMPLETA VIA API PNCP');
    console.log('═══════════════════════════════════════════════════════');
    
    const limite = opcoes.limite || 5600; // Limite padrão de 5600 editais
    const diasRetroativos = opcoes.diasRetroativos || 1; // Padrão: 1 dia (scheduler)
    
    let dataInicial, dataFinal;
    
    if (diasRetroativos === 1) {
      // Modo scheduler: apenas ontem
      dataInicial = this.obterDataOntem();
      dataFinal = dataInicial;
      console.log(`📅 Modo Scheduler: Data de ontem: ${dataInicial}`);
    } else {
      // Modo histórico: período de N dias
      dataInicial = this.obterDataRetroativa(diasRetroativos);
      dataFinal = this.obterDataOntem();
      console.log(`📅 Modo Histórico: Período de ${diasRetroativos} dias (${dataInicial} até ${dataFinal})`);
    }
    
    console.log(`🔢 Limite configurado: ${limite} editais`);
    
    const startTime = Date.now();
    let totalEncontrados = 0;
    let totalNovos = 0;
    let totalAtualizados = 0;
    let totalErros = 0;
    
    try {
      // 1. Buscar editais do período
      console.log('\n🔍 ETAPA 1: Buscando editais do período...');
      const resultado = await this.buscarEditaisData(dataInicial, dataFinal, limite);
      
      if (!resultado || !resultado.content || resultado.content.length === 0) {
        console.log('❌ Nenhum edital encontrado para ontem');
        return {
          status: 'concluido',
          mensagem: 'Nenhum edital encontrado para ontem',
          totalEncontrados: 0,
          totalNovos: 0,
          totalAtualizados: 0,
          totalErros: 0
        };
      }
      
      totalEncontrados = resultado.totalElements;
      console.log(`✅ Encontrados ${resultado.content.length} editais (Total: ${totalEncontrados})`);
      
      // 2. Verificar editais já existentes
      console.log('\n🔍 ETAPA 2: Verificando editais já existentes...');
      const numerosControle = resultado.content.map(e => e.numeroControlePNCP);
      const editaisExistentes = await this.verificarEditaisExistentes(numerosControle);
      
      console.log(`📊 Editais já existentes: ${editaisExistentes.size}`);
      console.log(`📊 Editais novos: ${numerosControle.length - editaisExistentes.size}`);
      
      // 3. Processar apenas editais novos (limitado ao parâmetro limite)
      const editaisNovos = resultado.content
        .filter(e => !editaisExistentes.has(e.numeroControlePNCP))
        .slice(0, limite); // Limitar aos primeiros N editais
      
      if (editaisNovos.length === 0) {
        console.log('✅ Todos os editais já estão na base de dados');
        return {
          status: 'concluido',
          mensagem: 'Todos os editais já estão na base de dados',
          totalEncontrados,
          totalNovos: 0,
          totalAtualizados: 0,
          totalErros: 0
        };
      }
      
      console.log(`\n🔍 ETAPA 3: Processando ${editaisNovos.length} editais novos...`);
      
      // 4. Processar editais em lotes
      const lotes = [];
      for (let i = 0; i < editaisNovos.length; i += this.loteSupabase) {
        lotes.push(editaisNovos.slice(i, i + this.loteSupabase));
      }
      
      for (let i = 0; i < lotes.length; i++) {
        const lote = lotes[i];
        console.log(`\n📦 Processando lote ${i + 1}/${lotes.length} (${lote.length} editais)...`);
        
        const editaisProcessados = [];
        
        for (const edital of lote) {
          const editalCompleto = await this.extrairEditalCompleto(edital);
          
          if (editalCompleto) {
            editaisProcessados.push(editalCompleto);
            totalNovos++;
          } else {
            totalErros++;
          }
        }
        
        // Salvar lote no banco
        if (editaisProcessados.length > 0) {
          await this.salvarEditais(editaisProcessados);
        }
      }
      
      const tempoTotal = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('📊 RESUMO FINAL:');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`📅 Data: ${dataOntem}`);
      console.log(`⏱️ Tempo total: ${tempoTotal}s`);
      console.log(`📊 Total encontrados: ${totalEncontrados}`);
      console.log(`✅ Total novos: ${totalNovos}`);
      console.log(`🔄 Total atualizados: ${totalAtualizados}`);
      console.log(`❌ Total erros: ${totalErros}`);
      
      return {
        status: 'concluido',
        mensagem: 'Extração concluída com sucesso',
        totalEncontrados,
        totalNovos,
        totalAtualizados,
        totalErros,
        tempoTotal: parseFloat(tempoTotal)
      };
      
    } catch (error) {
      console.error('❌ Erro geral:', error.message);
      throw error;
    }
  }
}

module.exports = ExtratorAPI;
