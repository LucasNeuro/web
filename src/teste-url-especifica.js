require('dotenv').config();
const processador = require('./processar');

// URLs dos editais para testar (uma por vez)
const URLS_TESTE = [
  'https://pncp.gov.br/app/editais/92220862000148/2025/1206', // Edital com 1 item
  'https://pncp.gov.br/app/editais/92220862000148/2025/1205', // Edital com 1 item  
  'https://pncp.gov.br/app/editais/83102277000152/2025/408'   // Edital com múltiplos itens
];

// Pegar URL da linha de comando ou usar a primeira
const URL_TESTE = process.argv[2] || URLS_TESTE[0];

async function testarScrapingDetalhado() {
  console.log('============================================================');
  console.log('🧪 TESTE DE SCRAPING DETALHADO');
  console.log('============================================================\n');
  
  console.log('📋 URL do Edital:');
  console.log(`   ${URL_TESTE}\n`);
  
  console.log('⏳ Iniciando extração...\n');
  
  const inicio = Date.now();
  
  try {
    // Processar a URL
    const resultado = await processador.processarUmaURLRefinada(URL_TESTE);
    
    const tempoTotal = ((Date.now() - inicio) / 1000).toFixed(2);
    
    console.log('\n============================================================');
    console.log('📊 RESULTADO DO TESTE');
    console.log('============================================================\n');
    
    if (resultado.sucesso) {
      console.log('✅ STATUS: Sucesso!\n');
      
      const dados = resultado.dados;
      
      console.log('📌 DADOS BÁSICOS:');
      console.log(`   ID PNCP: ${dados.id_pncp || 'N/A'}`);
      console.log(`   Título: ${dados.titulo_edital || 'N/A'}`);
      console.log(`   Órgão: ${dados.orgao || 'N/A'}`);
      console.log(`   CNPJ: ${dados.cnpj_orgao || 'N/A'}`);
      console.log(`   Modalidade: ${dados.modalidade || 'N/A'}`);
      console.log(`   Situação: ${dados.situacao || 'N/A'}`);
      console.log(`   Local: ${dados.local || 'N/A'}\n`);
      
      console.log('💰 DADOS FINANCEIROS:');
      if (dados.dados_financeiros) {
        console.log(`   Valor Total: ${dados.dados_financeiros.valor_total_texto || 'N/A'}`);
        console.log(`   Valor Numérico: R$ ${dados.dados_financeiros.valor_total_numerico?.toFixed(2) || 'N/A'}`);
        console.log(`   Fonte Orçamentária: ${dados.dados_financeiros.fonte_orcamentaria || 'N/A'}\n`);
      } else {
        console.log('   ⚠️ Nenhum dado financeiro extraído\n');
      }
      
      console.log('📝 OBJETO DA LICITAÇÃO:');
      if (dados.objeto_completo) {
        console.log(`   Descrição: ${dados.objeto_completo.descricao?.substring(0, 200) || 'N/A'}...`);
        console.log(`   Especificações: ${dados.objeto_completo.especificacoes?.length || 0} encontradas\n`);
      } else {
        console.log('   ⚠️ Nenhum objeto extraído\n');
      }
      
      console.log('📦 ITENS:');
      if (dados.itens && dados.itens.length > 0) {
        console.log(`   ✅ Total de itens extraídos: ${dados.itens.length}`);
        dados.itens.slice(0, 3).forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.descricao?.substring(0, 80) || 'N/A'}...`);
        });
        if (dados.itens.length > 3) {
          console.log(`   ... e mais ${dados.itens.length - 3} itens`);
        }
        console.log('');
      } else {
        console.log('   ⚠️ Nenhum item extraído\n');
      }
      
      console.log('📎 ANEXOS:');
      if (dados.anexos && dados.anexos.length > 0) {
        console.log(`   ✅ Total de anexos extraídos: ${dados.anexos.length}`);
        dados.anexos.slice(0, 5).forEach((anexo, index) => {
          console.log(`   ${index + 1}. ${anexo.nome} (${anexo.extensao || 'N/A'})`);
          console.log(`      URL: ${anexo.url}`);
        });
        if (dados.anexos.length > 5) {
          console.log(`   ... e mais ${dados.anexos.length - 5} anexos`);
        }
        console.log('');
      } else {
        console.log('   ⚠️ Nenhum anexo extraído\n');
      }
      
      console.log('📜 HISTÓRICO:');
      if (dados.historico && dados.historico.length > 0) {
        console.log(`   ✅ Total de eventos extraídos: ${dados.historico.length}`);
        dados.historico.slice(0, 3).forEach((evento, index) => {
          console.log(`   ${index + 1}. ${evento.evento?.substring(0, 80) || 'N/A'}...`);
        });
        if (dados.historico.length > 3) {
          console.log(`   ... e mais ${dados.historico.length - 3} eventos`);
        }
        console.log('');
      } else {
        console.log('   ⚠️ Nenhum histórico extraído\n');
      }
      
      console.log('⚙️ METADADOS:');
      console.log(`   Método de Extração: ${dados.metodo_extracao || 'N/A'}`);
      console.log(`   Data de Extração: ${dados.data_extracao || 'N/A'}`);
      console.log(`   Tempo de Extração: ${dados.tempo_extracao || 0}s`);
      
      console.log('\n💾 SALVAMENTO NO BANCO:');
      console.log('   ✅ Dados salvos com sucesso na tabela "editais_estruturados"');
      console.log(`   🔑 Chave: ${dados.id_pncp}`);
      
      console.log('\n⏱️ TEMPO TOTAL: ' + tempoTotal + 's');
      
      console.log('\n============================================================');
      console.log('🎉 TESTE CONCLUÍDO COM SUCESSO!');
      console.log('============================================================\n');
      
      // Resumo final
      console.log('📊 RESUMO FINAL:');
      console.log(`   ✅ Dados básicos: ${dados.titulo_edital ? 'OK' : 'FALHA'}`);
      console.log(`   ✅ Dados financeiros: ${dados.dados_financeiros?.valor_total_texto ? 'OK' : 'PARCIAL'}`);
      console.log(`   ✅ Objeto: ${dados.objeto_completo?.descricao ? 'OK' : 'PARCIAL'}`);
      console.log(`   ✅ Itens: ${dados.itens?.length > 0 ? 'OK (' + dados.itens.length + ')' : 'NENHUM'}`);
      console.log(`   ✅ Anexos: ${dados.anexos?.length > 0 ? 'OK (' + dados.anexos.length + ')' : 'NENHUM'}`);
      console.log(`   ✅ Histórico: ${dados.historico?.length > 0 ? 'OK (' + dados.historico.length + ')' : 'NENHUM'}`);
      console.log(`   ✅ Salvamento: OK`);
      
    } else {
      console.log('❌ STATUS: Falha!\n');
      console.log(`Erro: ${resultado.erro}`);
      console.log('\n⏱️ TEMPO TOTAL: ' + tempoTotal + 's');
    }
    
  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:');
    console.error(error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
  }
  
  console.log('\n🔚 Encerrando teste...\n');
  process.exit(0);
}

// Executar teste
testarScrapingDetalhado();

