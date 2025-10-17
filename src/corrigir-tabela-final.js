const supabase = require('./config/supabase');
const fs = require('fs');

async function corrigirTabelaFinal() {
  try {
    console.log('🔄 Corrigindo tabela final estruturada...');
    
    // Ler o SQL corrigido
    const sql = fs.readFileSync('./sql/tabela_final_estruturada.sql', 'utf8');
    
    // Dividir o SQL em comandos individuais
    const comandos = sql.split(';').filter(cmd => cmd.trim().length > 0);
    
    for (const comando of comandos) {
      if (comando.trim()) {
        try {
          console.log('📝 Executando comando SQL...');
          const { data, error } = await supabase.rpc('exec', { sql: comando.trim() + ';' });
          
          if (error) {
            console.error('❌ Erro no comando:', error.message);
          } else {
            console.log('✅ Comando executado com sucesso');
          }
        } catch (err) {
          console.error('❌ Erro ao executar comando:', err.message);
        }
      }
    }
    
    console.log('🎯 Tentando popular a tabela...');
    
    // Tentar popular a tabela
    const { data: resultado, error: erroPopulacao } = await supabase.rpc('popular_tabela_final_estruturados');
    
    if (erroPopulacao) {
      console.error('❌ Erro ao popular tabela:', erroPopulacao.message);
    } else {
      console.log('✅ Tabela populada com sucesso! Total de registros:', resultado);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

corrigirTabelaFinal();
