const extrator = require('./extrator');

async function main() {
  console.log('============================================================');
  console.log('EXTRATOR DE EDITAIS PNCP');
  console.log('============================================================\n');
  
  try {
    const dados = await extrator.extrairEditaisDiaAnterior();
    await extrator.salvarSupabase(dados);
  } catch (error) {
    console.error('\n[ERRO FATAL] ' + error.message);
    process.exit(1);
  }
}

main();
