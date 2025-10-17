const puppeteer = require('puppeteer');

// URL de teste
const URL_TESTE = 'https://pncp.gov.br/app/editais/11040888000102/2025/132';

async function main() {
  console.log('============================================================');
  console.log('TESTE SIMPLES - EXTRAÇÃO SEM SUPABASE');
  console.log('============================================================\n');

  console.log(`URL: ${URL_TESTE}\n`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // Acessar página
    console.log('🔍 Acessando página do edital...');
    await page.goto(URL_TESTE, { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Extrair dados básicos
    console.log('📊 Extraindo dados básicos...');
    const dadosBasicos = await page.evaluate(() => {
      const result = {};
      
      // Buscar título do edital
      const tituloEl = document.querySelector('h1, h2, [class*="titulo"], [class*="edital"]');
      if (tituloEl) {
        result.titulo_edital = tituloEl.innerText.trim();
      }
      
      // Buscar todos os campos da página
      const elementos = document.querySelectorAll('div, span, p');
      elementos.forEach(el => {
        const texto = el.innerText?.trim();
        if (texto && texto.includes(':')) {
          const [chave, ...valores] = texto.split(':');
          const valor = valores.join(':').trim();
          
          if (valor && valor.length > 0) {
            const chaveLimpa = chave.trim().toLowerCase();
            
            if (chaveLimpa.includes('local')) result.local = valor;
            else if (chaveLimpa.includes('órgão') || chaveLimpa.includes('orgao')) result.orgao = valor;
            else if (chaveLimpa.includes('modalidade')) result.modalidade = valor;
            else if (chaveLimpa.includes('situação') || chaveLimpa.includes('situacao')) result.situacao = valor;
          }
        }
      });
      
      return result;
    });
    
    // Extrair valor total
    console.log('💰 Extraindo valor total...');
    const valorTotal = await page.evaluate(() => {
      const elementos = Array.from(document.querySelectorAll('div, span, p, h1, h2, h3, h4, strong, b'));
      
      for (const el of elementos) {
        const texto = el.innerText?.trim();
        
        if (texto && texto.includes('VALOR TOTAL ESTIMADO DA COMPRA')) {
          const valorNoMesmoElemento = texto.match(/R\$\s*[\d.,]+/);
          if (valorNoMesmoElemento) {
            return valorNoMesmoElemento[0];
          }
          
          const proximoEl = el.nextElementSibling || el.parentElement.nextElementSibling;
          if (proximoEl) {
            const valorTexto = proximoEl.innerText?.trim();
            const match = valorTexto.match(/R\$\s*[\d.,]+/);
            if (match) {
              return match[0];
            }
          }
        }
      }
      
      return null;
    });
    
    console.log('\n✅ Dados extraídos com sucesso!');
    console.log('\n📊 RESUMO DOS DADOS:');
    console.log(`   - Título: ${dadosBasicos.titulo_edital || 'N/A'}`);
    console.log(`   - Órgão: ${dadosBasicos.orgao || 'N/A'}`);
    console.log(`   - Local: ${dadosBasicos.local || 'N/A'}`);
    console.log(`   - Modalidade: ${dadosBasicos.modalidade || 'N/A'}`);
    console.log(`   - Situação: ${dadosBasicos.situacao || 'N/A'}`);
    console.log(`   - Valor Total: ${valorTotal || 'N/A'}`);
    
    console.log('\n============================================================');
    console.log('✅ TESTE SIMPLES FINALIZADO COM SUCESSO!');
    console.log('============================================================');
    
  } catch (error) {
    console.error('\n❌ [ERRO FATAL] ' + error.message);
  } finally {
    await browser.close();
  }
}

main();
