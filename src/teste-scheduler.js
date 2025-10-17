const scheduler = require('./scheduler');

async function main() {
  console.log('============================================================');
  console.log('TESTE DO SCHEDULER - PROCESSO COMPLETO');
  console.log('============================================================\n');

  try {
    // 1. Inicializar scheduler
    console.log('🔧 [PASSO 1] Inicializando scheduler...');
    await scheduler.inicializar();
    console.log('✅ [PASSO 1] Scheduler inicializado');

    // 2. Verificar status
    console.log('\n📊 [PASSO 2] Status do scheduler:');
    const status = scheduler.getStatus();
    console.log(JSON.stringify(status, null, 2));

    // 3. Executar processo completo
    console.log('\n🚀 [PASSO 3] Executando processo completo...');
    const resultado = await scheduler.executarProcessoCompleto();
    
    console.log('\n✅ [PASSO 3] Processo completo finalizado!');
    console.log('\n📈 RESULTADO:');
    console.log(JSON.stringify(resultado, null, 2));

    // 4. Verificar histórico
    console.log('\n📋 [PASSO 4] Histórico de execuções:');
    const historico = await scheduler.getHistoricoExecucoes(5);
    if (historico.sucesso) {
      console.log(`   Últimas ${historico.execucoes.length} execuções:`);
      historico.execucoes.forEach((exec, index) => {
        console.log(`   ${index + 1}. ${exec.data_inicio} - ${exec.status}`);
        console.log(`      Encontrados: ${exec.total_encontrados || 0}`);
        console.log(`      Novos: ${exec.total_novos || 0}`);
        console.log(`      Erros: ${exec.total_erros || 0}`);
        console.log(`      Tempo: ${exec.tempo_execucao || 0}s`);
      });
    } else {
      console.log('   ❌ Erro ao buscar histórico:', historico.erro);
    }

    console.log('\n============================================================');
    console.log('✅ TESTE DO SCHEDULER FINALIZADO COM SUCESSO!');
    console.log('============================================================');

  } catch (error) {
    console.error('\n❌ [ERRO FATAL] ' + error.message);
    process.exit(1);
  }
}

main();
