const axios = require('axios');
const supabase = require('./config/supabase');
require('dotenv').config();

class ExtratorEditais {
  constructor() {
    this.baseURL = 'https://pncp.gov.br/api/consulta';
    this.limiteRegistros = 4700;
    this.registrosPorPagina = 50;
    this.loteSupabase = 100; // Salvar de 100 em 100 registros
  }

  obterDiaAnterior() {
    const hoje = new Date();
    hoje.setDate(hoje.getDate() - 1);
    
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    
    return `${ano}${mes}${dia}`;
  }

  obterDataInicialCompleta() {
    // Buscar editais dos últimos 30 dias para pegar mais dados
    const hoje = new Date();
    const dataInicial = new Date();
    dataInicial.setDate(hoje.getDate() - 30);
    
    const ano = dataInicial.getFullYear();
    const mes = String(dataInicial.getMonth() + 1).padStart(2, '0');
    const dia = String(dataInicial.getDate()).padStart(2, '0');
    
    return `${ano}${mes}${dia}`;
  }

  formatarData(dataStr) {
    return `${dataStr.substring(6, 8)}/${dataStr.substring(4, 6)}/${dataStr.substring(0, 4)}`;
  }

  async buscarContratacoes(dataInicial, dataFinal, pagina, tentativa = 1) {
    const url = `${this.baseURL}/v1/contratacoes/publicacao`;
    const params = {
      dataInicial,
      dataFinal,
      codigoModalidadeContratacao: 8,
      pagina,
      tamanhoPagina: this.registrosPorPagina
    };
    
    try {
      const response = await axios.get(url, {
        params,
        timeout: 60000
      });
      
      return response.data;
    } catch (error) {
      if (error.code === 'ECONNABORTED' && tentativa < 3) {
        console.log(`  [TIMEOUT] Tentativa ${tentativa + 1}/3...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        return this.buscarContratacoes(dataInicial, dataFinal, pagina, tentativa + 1);
      }
      throw new Error(`Erro ao buscar contratacoes: ${error.message}`);
    }
  }

  gerarUrlEdital(cnpj, ano, sequencial) {
    return `https://pncp.gov.br/app/editais/${cnpj}/${ano}/${sequencial}`;
  }

  async extrairEditaisDiaAnterior() {
    console.log('[INICIO] Extraindo editais do dia anterior\n');
    
    const data = this.obterDiaAnterior();
    console.log(`[DATA] ${this.formatarData(data)}`);
    console.log(`[LIMITE] ${this.limiteRegistros} registros\n`);
    
    let pagina = 1;
    let todosEditais = [];
    let continuar = true;
    
    while (continuar && todosEditais.length < this.limiteRegistros) {
      console.log(`[PAGINA ${pagina}] Buscando...`);
      
      try {
        const resultado = await this.buscarContratacoes(data, data, pagina);
        
        if (!resultado || !resultado.data || resultado.data.length === 0) {
          console.log('[FIM] Nao ha mais registros');
          continuar = false;
          break;
        }
        
        const editais = resultado.data.map(item => ({
          url: this.gerarUrlEdital(
            item.orgaoEntidade.cnpj,
            item.anoCompra,
            item.sequencialCompra
          ),
          cnpj: item.orgaoEntidade.cnpj,
          razao_social: item.orgaoEntidade.razaoSocial,
          data_referencia: data,
          numero_controle_pncp: `${item.orgaoEntidade.cnpj}-${item.anoCompra}-${item.sequencialCompra}`
        }));
        
        todosEditais = todosEditais.concat(editais);
        console.log(`  [OK] ${editais.length} editais encontrados (Total: ${todosEditais.length})`);
        
        if (resultado.data.length < this.registrosPorPagina) {
          console.log('[FIM] Ultima pagina alcancada');
          continuar = false;
        } else {
          pagina++;
        }
        
      } catch (error) {
        console.error(`  [ERRO] ${error.message}`);
        continuar = false;
      }
    }
    
    if (todosEditais.length === 0) {
      console.log('[AVISO] Nenhum edital encontrado');
      return { sucesso: true, totalSalvos: 0, totalErros: 0 };
    }
    
    console.log(`\n[RESULTADO] ${todosEditais.length} editais extraidos`);
    return await this.salvarEditais(todosEditais, data);
  }

  async extrairEditaisCompleto() {
    console.log('[INICIO] Extraindo TODOS os editais (últimos 30 dias)\n');
    
    const dataInicial = this.obterDataInicialCompleta();
    const dataFinal = this.obterDiaAnterior();
    console.log(`[PERÍODO] ${this.formatarData(dataInicial)} até ${this.formatarData(dataFinal)}`);
    console.log(`[LIMITE] ${this.limiteRegistros} registros\n`);
    
    let pagina = 1;
    let todosEditais = [];
    let continuar = true;
    
    while (continuar && todosEditais.length < this.limiteRegistros) {
      console.log(`[PAGINA ${pagina}] Buscando...`);
      
      try {
        const resultado = await this.buscarContratacoes(dataInicial, dataFinal, pagina);
        
        if (!resultado || !resultado.data || resultado.data.length === 0) {
          console.log('[FIM] Nao ha mais registros');
          continuar = false;
          break;
        }
        
        const editais = resultado.data.map(item => ({
          url: this.gerarUrlEdital(
            item.orgaoEntidade.cnpj,
            item.anoCompra,
            item.sequencialCompra
          ),
          cnpj: item.orgaoEntidade.cnpj,
          razaoSocial: item.orgaoEntidade.razaoSocial,
          ano: item.anoCompra,
          sequencial: item.sequencialCompra,
          numeroControlePNCP: item.numeroControlePNCP,
          objeto: item.objetoCompra,
          modalidade: item.modalidadeNome,
          situacao: item.situacaoCompraNome,
          valorEstimado: item.valorTotalEstimado,
          dataPublicacao: item.dataPublicacaoPncp
        }));
        
        todosEditais = todosEditais.concat(editais);
        console.log(`  > Encontrados: ${editais.length}`);
        console.log(`  > Total acumulado: ${todosEditais.length}`);
        
        if (editais.length < this.registrosPorPagina) {
          continuar = false;
        }
        
        if (todosEditais.length >= this.limiteRegistros) {
          console.log(`\n[LIMITE] Atingido limite de ${this.limiteRegistros}`);
          todosEditais = todosEditais.slice(0, this.limiteRegistros);
          continuar = false;
        }
        
        pagina++;
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`[ERRO] ${error.message}`);
        
        if (todosEditais.length > 0) {
          console.log(`\n[AVISO] Salvando ${todosEditais.length} editais extraidos antes do erro`);
          break;
        }
        
        throw error;
      }
    }
    
    return {
      dataExtracao: new Date().toISOString(),
      dataReferencia: data,
      totalEditais: todosEditais.length,
      editais: todosEditais
    };
  }

  formatarDataParaSupabase(dataReferencia) {
    // Converte YYYYMMDD para YYYY-MM-DD
    const ano = dataReferencia.substring(0, 4);
    const mes = dataReferencia.substring(4, 6);
    const dia = dataReferencia.substring(6, 8);
    return `${ano}-${mes}-${dia}`;
  }

  async salvarSupabase(dados) {
    console.log('\n============================================================');
    console.log('[SUPABASE] Iniciando salvamento no banco de dados');
    console.log('============================================================\n');
    
    const dataReferenciaFormatada = this.formatarDataParaSupabase(dados.dataReferencia);
    let totalSalvos = 0;
    let totalErros = 0;
    
    // Processar editais em lotes
    for (let i = 0; i < dados.editais.length; i += this.loteSupabase) {
      const lote = dados.editais.slice(i, i + this.loteSupabase);
      const numeroLote = Math.floor(i / this.loteSupabase) + 1;
      const totalLotes = Math.ceil(dados.editais.length / this.loteSupabase);
      
      console.log(`[LOTE ${numeroLote}/${totalLotes}] Salvando ${lote.length} editais...`);
      
      // Formatar dados para o formato do Supabase
      const editaisFormatados = lote.map(edital => ({
        url: edital.url,
        cnpj: edital.cnpj,
        razao_social: edital.razaoSocial,
        ano: edital.ano,
        sequencial: edital.sequencial,
        numero_controle_pncp: edital.numeroControlePNCP,
        objeto: edital.objeto,
        modalidade: edital.modalidade,
        situacao: edital.situacao,
        valor_estimado: edital.valorEstimado,
        data_publicacao: edital.dataPublicacao,
        data_referencia: dataReferenciaFormatada
      }));
      
      try {
        const { data, error } = await supabase
          .from('editais_pncp')
          .upsert(editaisFormatados, { 
            onConflict: 'numero_controle_pncp',
            ignoreDuplicates: false 
          });
        
        if (error) {
          console.error(`  [ERRO] ${error.message}`);
          totalErros += lote.length;
        } else {
          console.log(`  [OK] ${lote.length} editais salvos`);
          totalSalvos += lote.length;
        }
        
        // Pequeno delay entre lotes para não sobrecarregar
        if (i + this.loteSupabase < dados.editais.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
      } catch (error) {
        console.error(`  [ERRO] Falha ao salvar lote: ${error.message}`);
        totalErros += lote.length;
      }
    }
    
    console.log('\n============================================================');
    console.log('[SUCESSO] Salvamento concluido');
    console.log('============================================================');
    console.log(`[TOTAL SALVOS] ${totalSalvos} editais`);
    console.log(`[TOTAL ERROS] ${totalErros} editais`);
    console.log(`[DATA] ${this.formatarData(dados.dataReferencia)}`);
    console.log(`[TABELA] editais_pncp`);
    
    return {
      sucesso: totalErros === 0,
      totalSalvos,
      totalErros
    };
  }
}

module.exports = new ExtratorEditais();
