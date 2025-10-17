const supabase = require('./config/supabase');
const ScraperRefinado = require('./scraper');

const scraper = new ScraperRefinado();

let isProcessing = false;
let processedCount = 0;
let totalToProcess = 0;
let currentUrl = '';

async function processarEditaisRefinado(limite = 10) {
  if (isProcessing) {
    return { status: 'em_andamento', mensagem: 'Já existe um processamento em andamento.' };
  }

  isProcessing = true;
  processedCount = 0;
  totalToProcess = 0;

  try {
    console.log(`[PROCESSADOR REFINADO] Buscando ${limite} editais para processar...`);
    
    // Buscar URLs da tabela editais_pncp
    const { data: urlsPendentes, error: fetchError } = await supabase
      .from('editais_pncp')
      .select('url, numero_controle_pncp')
      .limit(limite);

    if (fetchError) {
      throw new Error(`Erro ao buscar URLs pendentes: ${fetchError.message}`);
    }

    if (!urlsPendentes || urlsPendentes.length === 0) {
      isProcessing = false;
      return { status: 'concluido', mensagem: 'Nenhum edital pendente para processar.' };
    }

    totalToProcess = urlsPendentes.length;
    console.log(`[PROCESSADOR REFINADO] Encontrados ${totalToProcess} editais para processar.`);

    for (const item of urlsPendentes) {
      currentUrl = item.url;
      console.log(`[PROCESSADOR REFINADO] Processando: ${currentUrl}`);
      
      try {
        const resultadoScraper = await scraper.extrairEditalCompleto(currentUrl);

        if (resultadoScraper) {
          const resultadoSalvamento = await scraper.salvarEditalEstruturado(resultadoScraper);
          
          if (resultadoSalvamento.sucesso) {
            processedCount++;
            console.log(`[PROCESSADOR REFINADO] ✓ Edital processado com sucesso`);
          } else {
            console.error(`[PROCESSADOR REFINADO] ✗ Erro ao salvar: ${resultadoSalvamento.erro}`);
          }
        }
      } catch (error) {
        console.error(`[PROCESSADOR REFINADO] ✗ Erro ao processar ${currentUrl}: ${error.message}`);
      }
    }

    isProcessing = false;
    return {
      status: 'concluido',
      totalProcessados: processedCount,
      totalErros: totalToProcess - processedCount,
      mensagem: 'Processamento refinado concluído.'
    };

  } catch (error) {
    console.error(`[PROCESSADOR REFINADO] Erro fatal: ${error.message}`);
    isProcessing = false;
    return { status: 'erro', mensagem: error.message };
  } finally {
    currentUrl = '';
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
  }
}

function getStatusRefinado() {
  return {
    isProcessing,
    processedCount,
    totalToProcess,
    currentUrl,
    progresso: totalToProcess > 0 ? ((processedCount / totalToProcess) * 100).toFixed(2) + '%' : '0%'
  };
}

module.exports = {
  processarEditaisRefinado,
  processarUmaURLRefinada,
  getStatusRefinado
};
