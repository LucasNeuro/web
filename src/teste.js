const ScraperEstruturaReal = require('./scraper');

// URL de teste
const URL_TESTE = 'https://pncp.gov.br/app/editais/11040888000102/2025/132';

async function main() {
  console.log('============================================================');
  console.log('TESTE COMPLETO - EXTRAÇÃO + SALVAMENTO');
  console.log('============================================================\n');

  console.log(`URL: ${URL_TESTE}\n`);

  const scraper = new ScraperEstruturaReal();

  try {
    // 1. Extrair dados
    console.log('🔍 [PASSO 1] Extraindo dados...');
    const resultado = await scraper.extrairEditalCompleto(URL_TESTE);
    
    console.log('\n✅ [PASSO 1] Dados extraídos com sucesso!');
    console.log('\n📊 RESUMO DOS DADOS:');
    console.log(`   - ID PNCP: ${resultado.id_pncp || 'N/A'}`);
    console.log(`   - Título: ${resultado.titulo_edital || 'N/A'}`);
    console.log(`   - Órgão: ${resultado.orgao || 'N/A'}`);
    console.log(`   - Local: ${resultado.local || 'N/A'}`);
    console.log(`   - Modalidade: ${resultado.modalidade || 'N/A'}`);
    console.log(`   - Situação: ${resultado.situacao || 'N/A'}`);
    console.log(`   - Itens: ${resultado.itens?.length || 0}`);
    console.log(`   - Anexos: ${resultado.anexos?.length || 0}`);
    console.log(`   - Histórico: ${resultado.historico?.length || 0}`);
    console.log(`   - Tempo: ${resultado.tempo_extracao}s`);
    
    // Verificar dados financeiros
    if (resultado.dados_financeiros) {
      console.log(`   - Valor Total: ${resultado.dados_financeiros.valor_total_texto || 'N/A'}`);
      console.log(`   - Valor Numérico: ${resultado.dados_financeiros.valor_total_numerico || 'N/A'}`);
      console.log(`   - Fonte Orçamentária: ${resultado.dados_financeiros.fonte_orcamentaria || 'N/A'}`);
    }
    
    // 2. Salvar na tabela
    console.log('\n💾 [PASSO 2] Salvando na tabela editais_estruturados...');
    const resultadoSalvamento = await scraper.salvarEditalEstruturado(resultado);
    
    if (resultadoSalvamento.sucesso) {
      console.log('✅ [PASSO 2] Dados salvos com sucesso na tabela!');
      
      console.log('\n📋 DETALHES DOS ITENS EXTRAÍDOS:');
      if (resultado.itens && resultado.itens.length > 0) {
        // Mostrar apenas os itens reais (filtrar duplicatas)
        const itensUnicos = resultado.itens.filter((item, index, arr) => 
          arr.findIndex(i => i.descricao === item.descricao) === index
        ).slice(0, 10); // Limitar a 10 itens para não sobrecarregar
        
        itensUnicos.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.descricao?.substring(0, 100)}...`);
          console.log(`      Quantidade: ${item.quantidade || 'N/A'}`);
          console.log(`      Valor Unitário: ${item.valor_unitario || 'N/A'}`);
          console.log(`      Valor Total: ${item.valor_total || 'N/A'}`);
        });
        
        if (resultado.itens.length > 10) {
          console.log(`   ... e mais ${resultado.itens.length - 10} itens`);
        }
      } else {
        console.log('   ⚠ Nenhum item encontrado');
      }
      
      console.log('\n📎 DETALHES DOS ANEXOS:');
      if (resultado.anexos && resultado.anexos.length > 0) {
        resultado.anexos.forEach((anexo, index) => {
          console.log(`   ${index + 1}. ${anexo.nome}`);
          console.log(`      Tipo: ${anexo.tipo || 'N/A'}`);
          console.log(`      Data: ${anexo.data || 'N/A'}`);
          console.log(`      URL: ${anexo.url?.substring(0, 80)}...`);
        });
      } else {
        console.log('   ⚠ Nenhum anexo encontrado');
      }
      
      console.log('\n📈 DADOS FINANCEIROS EXTRAÍDOS:');
      if (resultado.dados_financeiros) {
        console.log(`   Valor Total: ${resultado.dados_financeiros.valor_total_texto || 'N/A'}`);
        console.log(`   Valor Numérico: ${resultado.dados_financeiros.valor_total_numerico || 'N/A'}`);
        console.log(`   Fonte Orçamentária: ${resultado.dados_financeiros.fonte_orcamentaria || 'N/A'}`);
      }
      
      console.log('\n🗃️ OBJETO COMPLETO:');
      if (resultado.objeto_completo && resultado.objeto_completo.descricao) {
        console.log(`   Descrição: ${resultado.objeto_completo.descricao.substring(0, 200)}...`);
        if (resultado.objeto_completo.especificacoes && resultado.objeto_completo.especificacoes.length > 0) {
          console.log(`   Especificações: ${resultado.objeto_completo.especificacoes.length} encontradas`);
        }
      }
      
    } else {
      console.log('❌ [PASSO 2] Erro ao salvar:', resultadoSalvamento.erro);
    }
    
    console.log('\n============================================================');
    console.log('✅ TESTE COMPLETO FINALIZADO COM SUCESSO!');
    console.log('============================================================');
    
  } catch (error) {
    console.error('\n❌ [ERRO FATAL] ' + error.message);
    process.exit(1);
  } finally {
    await scraper.fecharBrowser();
  }
}

main();
