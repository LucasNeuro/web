const supabase = require('./config/supabase');
const ScraperRefinado = require('./scraper');

const scraper = new ScraperRefinado();

let isProcessing = false;
let processedCount = 0;
let errorCount = 0;
let totalToProcess = 0;
let currentUrl = '';

async function processarEditaisRefinado(limite = 10) {
  if (isProcessing) {
    return { status: 'em_andamento', mensagem: 'Já existe um processamento em andamento.' };
  }

  isProcessing = true;
  processedCount = 0;
  errorCount = 0;
  totalToProcess = 0;
  const startTime = Date.now();

  try {
    console.log(`[PROCESSADOR REFINADO] Buscando ${limite} editais para processar...`);
    
    // Buscar apenas editais nao processados, com menos de 3 tentativas
    const { data: urlsPendentes, error: fetchError } = await supabase
      .from('editais_pncp')
      .select('id, url, numero_controle_pncp, tentativas_processamento')
      .eq('processado', false)
      .lt('tentativas_processamento', 3)
      .order('created_at', { ascending: true })
      .limit(limite);

    if (fetchError) {
      throw new Error(`Erro ao buscar URLs pendentes: ${fetchError.message}`);
    }

    if (!urlsPendentes || urlsPendentes.length === 0) {
      isProcessing = false;
      return { status: 'concluido', mensagem: 'Nenhum edital pendente para processar.', totalProcessados: 0, totalErros: 0 };
    }

    totalToProcess = urlsPendentes.length;
    console.log(`[PROCESSADOR REFINADO] Encontrados ${totalToProcess} editais para processar.`);

    for (const item of urlsPendentes) {
      currentUrl = item.url;
      console.log(`\n[PROCESSADOR REFINADO] [${processedCount + errorCount + 1}/${totalToProcess}] Processando: ${currentUrl}`);
      
      try {
        const resultadoScraper = await scraper.extrairEditalCompleto(currentUrl);

        if (resultadoScraper) {
          const resultadoSalvamento = await scraper.salvarEditalEstruturado(resultadoScraper);
          
          if (resultadoSalvamento.sucesso) {
            await marcarEditalProcessado(item.id, true);
            processedCount++;
            console.log(`[PROCESSADOR REFINADO] ✓ Edital processado com sucesso`);
          } else {
            await marcarEditalProcessado(item.id, false, resultadoSalvamento.erro);
            errorCount++;
            console.error(`[PROCESSADOR REFINADO] ✗ Erro ao salvar: ${resultadoSalvamento.erro}`);
          }
        } else {
          await marcarEditalProcessado(item.id, false, 'Erro desconhecido na extracao');
          errorCount++;
        }
      } catch (error) {
        await marcarEditalProcessado(item.id, false, error.message);
        errorCount++;
        console.error(`[PROCESSADOR REFINADO] ✗ Erro ao processar ${currentUrl}: ${error.message}`);
      }
    }

    const tempoTotal = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n[PROCESSADOR REFINADO] Concluido: ${processedCount} ok, ${errorCount} erros em ${tempoTotal}s`);

    // Popular tabela final se houve processamentos bem-sucedidos
    if (processedCount > 0) {
      try {
        console.log(`[PROCESSADOR REFINADO] 🔄 Populando tabela final estruturada...`);
        const { data: totalRegistros, error: errorPopulacao } = await supabase.rpc('popular_tabela_final_estruturados');
        
        if (errorPopulacao) {
          console.error(`[PROCESSADOR REFINADO] ❌ Erro ao popular tabela final:`, errorPopulacao.message);
        } else {
          console.log(`[PROCESSADOR REFINADO] ✅ Tabela final populada com ${totalRegistros} registros`);
        }
      } catch (error) {
        console.error(`[PROCESSADOR REFINADO] ❌ Erro ao popular tabela final:`, error.message);
      }
    }

    isProcessing = false;
    return {
      status: 'concluido',
      totalProcessados: processedCount,
      totalErros: errorCount,
      totalSalvos: processedCount,
      tempoTotal: parseFloat(tempoTotal),
      mensagem: 'Processamento refinado concluído.'
    };

  } catch (error) {
    console.error(`[PROCESSADOR REFINADO] Erro fatal: ${error.message}`);
    isProcessing = false;
    return { status: 'erro', mensagem: error.message, totalProcessados: processedCount, totalErros: errorCount };
  } finally {
    currentUrl = '';
    try {
      await scraper.fecharBrowser();
      console.log('[PROCESSADOR REFINADO] Browser fechado');
    } catch (err) {
      console.error('[PROCESSADOR REFINADO] Erro ao fechar browser:', err.message);
    }
  }
}

async function marcarEditalProcessado(editalId, sucesso, erro = null) {
  try {
    if (sucesso) {
      const { error } = await supabase
        .from('editais_pncp')
        .update({
          processado: true,
          data_processamento: new Date().toISOString(),
          status_processamento: 'sucesso',
          ultimo_erro: null
        })
        .eq('id', editalId);

      if (error) {
        console.error(`[PROCESSADOR] Erro ao marcar sucesso: ${error.message}`);
      }
    } else {
      const { data: edital } = await supabase
        .from('editais_pncp')
        .select('tentativas_processamento')
        .eq('id', editalId)
        .single();

      const novasTentativas = (edital?.tentativas_processamento || 0) + 1;
      const statusFinal = novasTentativas >= 3 ? 'falhado' : 'erro';

      const { error } = await supabase
        .from('editais_pncp')
        .update({
          tentativas_processamento: novasTentativas,
          ultimo_erro: erro?.substring(0, 500),
          status_processamento: statusFinal
        })
        .eq('id', editalId);

      if (error) {
        console.error(`[PROCESSADOR] Erro ao marcar erro: ${error.message}`);
      }
    }
  } catch (error) {
    console.error(`[PROCESSADOR] Erro ao atualizar status: ${error.message}`);
  }
}

async function processarUmaURLRefinada(url) {
  try {
    console.log(`[PROCESSADOR REFINADO] Processando URL única: ${url}`);
    const resultadoScraper = await scraper.extrairEditalCompleto(url);

    if (resultadoScraper) {
      const resultadoSalvamento = await scraper.salvarEditalEstruturado(resultadoScraper);
      
      if (resultadoSalvamento.sucesso) {
        return { 
          sucesso: true, 
          mensagem: 'URL processada e salva com sucesso.', 
          dados: resultadoScraper 
        };
      } else {
        throw new Error(`Erro ao salvar: ${resultadoSalvamento.erro}`);
      }
    } else {
      throw new Error('Erro desconhecido ao processar URL.');
    }
  } catch (error) {
    console.error(`[PROCESSADOR REFINADO] Erro ao processar URL única ${url}: ${error.message}`);
    return { sucesso: false, erro: error.message };
  } finally {
    try {
      await scraper.fecharBrowser();
    } catch (err) {
      console.error('[PROCESSADOR REFINADO] Erro ao fechar browser:', err.message);
    }
  }
}

function getStatusRefinado() {
  return {
    isProcessing,
    processedCount,
    errorCount,
    totalToProcess,
    currentUrl,
    progresso: totalToProcess > 0 ? (((processedCount + errorCount) / totalToProcess) * 100).toFixed(2) + '%' : '0%',
    taxa_sucesso: totalToProcess > 0 ? ((processedCount / totalToProcess) * 100).toFixed(2) + '%' : '0%'
  };
}

module.exports = {
  processarEditaisRefinado,
  processarUmaURLRefinada,
  getStatusRefinado
};
