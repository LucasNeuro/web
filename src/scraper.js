const puppeteer = require('puppeteer');
const supabase = require('./config/supabase');

class ScraperEstruturaReal {
  constructor() {
    this.timeoutPagina = 120000;
    this.delayEntreCliques = 2000;
    this.browser = null;
  }

  async iniciarBrowser() {
    if (!this.browser) {
      console.log('[BROWSER] Iniciando navegador headless...');
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
      console.log('[BROWSER] Navegador iniciado com sucesso');
    }
    return this.browser;
  }

  async fecharBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('[BROWSER] Navegador fechado');
    }
  }

  async extrairEditalCompleto(url) {
    const inicioExtracao = Date.now();
    console.log(`\n[SCRAPER ESTRUTURA REAL] Processando: ${url}`);
    
    const browser = await this.iniciarBrowser();
    const page = await browser.newPage();
    
    try {
      // Configurar página
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setDefaultTimeout(this.timeoutPagina);
      
      // Acessar página
      console.log('  [1/5] Acessando página do edital...');
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: this.timeoutPagina 
      });
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Extrair dados básicos
      console.log('  [2/5] Extraindo dados básicos...');
      const dadosBasicos = await this.extrairDadosBasicos(page, url);
      
      // Extrair objeto completo
      console.log('  [3/5] Extraindo objeto completo...');
      const objetoCompleto = await this.extrairObjetoCompleto(page);
      
      // Extrair dados financeiros
      console.log('  [4/5] Extraindo dados financeiros...');
      const dadosFinanceiros = await this.extrairDadosFinanceiros(page);
      
      // Extrair conteúdo das abas
      console.log('  [5/5] Extraindo conteúdo das abas...');
      const conteudoAbas = await this.extrairConteudoAbas(page);
      
      const tempoExtracao = ((Date.now() - inicioExtracao) / 1000).toFixed(2);
      
      console.log(`  [OK] Extração concluída em ${tempoExtracao}s`);
      console.log(`       - Itens: ${conteudoAbas.itens.length}`);
      console.log(`       - Anexos: ${conteudoAbas.anexos.length}`);
      console.log(`       - Histórico: ${conteudoAbas.historico.length}`);
      
      await page.close();
      
      return {
        ...dadosBasicos,
        ...conteudoAbas,
        objeto_completo: objetoCompleto,
        dados_financeiros: dadosFinanceiros,
        data_extracao: new Date().toISOString(),
        metodo_extracao: 'puppeteer-estrutura-real',
        tempo_extracao: parseFloat(tempoExtracao)
      };
      
    } catch (error) {
      console.error(`  [ERRO] ${error.message}`);
      await page.close();
      throw error;
    }
  }

  async extrairDadosBasicos(page, url) {
    // Extrair ID PNCP da URL
    const matchUrl = url.match(/editais\/(\d+)\/(\d+)\/(\d+)/);
    
    const dados = await page.evaluate(() => {
      const result = {};
      
      // Buscar título do edital
      const tituloEl = document.querySelector('h1, h2, [class*="titulo"], [class*="edital"]');
      if (tituloEl) {
        result.titulo_edital = tituloEl.innerText.trim();
      }
      
      // Buscar todos os campos da página usando a estrutura real
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
            else if (chaveLimpa.includes('unidade compradora')) result.unidade_compradora = valor;
            else if (chaveLimpa.includes('modalidade')) result.modalidade = valor;
            else if (chaveLimpa.includes('amparo legal')) result.amparo_legal = valor;
            else if (chaveLimpa.includes('tipo')) result.tipo = valor;
            else if (chaveLimpa.includes('data de divulgação')) result.data_divulgacao = valor;
            else if (chaveLimpa.includes('situação') || chaveLimpa.includes('situacao')) result.situacao = valor;
            else if (chaveLimpa.includes('data de início')) result.data_inicio = valor;
            else if (chaveLimpa.includes('data fim')) result.data_fim = valor;
          }
        }
      });
      
      return result;
    });
    
    if (matchUrl) {
      dados.id_pncp = `${matchUrl[1]}-${matchUrl[2]}-${matchUrl[3]}`;
      dados.cnpj_orgao = matchUrl[1];
      dados.ano = parseInt(matchUrl[2]);
      dados.numero = parseInt(matchUrl[3]);
    }
    
    dados.url_edital = url;
    
    return dados;
  }

  async extrairObjetoCompleto(page) {
    return await page.evaluate(() => {
      const objeto = {};
      
      // Buscar descrição do objeto - procurar texto longo
      const textosLongos = Array.from(document.querySelectorAll('div, p, span')).filter(el => {
        const texto = el.innerText?.trim();
        return texto && texto.length > 100 && (
          texto.includes('CONTRATAÇÃO') || 
          texto.includes('AQUISIÇÃO') || 
          texto.includes('SERVIÇOS') ||
          texto.includes('FORNECIMENTO') ||
          texto.includes('CREDENCIAMENTO')
        );
      });
      
      if (textosLongos.length > 0) {
        objeto.descricao = textosLongos[0].innerText.trim();
      }
      
      // Buscar especificações técnicas
      const especificacoes = [];
      const elementos = document.querySelectorAll('div, p, span, li');
      elementos.forEach(el => {
        const texto = el.innerText?.trim();
        if (texto && texto.length > 20 && texto.length < 500) {
          if (texto.includes('ESPECIFICAÇÃO') || 
              texto.includes('REQUISITOS') || 
              texto.includes('CARACTERÍSTICAS') ||
              texto.includes('CONDIÇÕES')) {
            especificacoes.push(texto);
          }
        }
      });
      
      objeto.especificacoes = especificacoes;
      
      return objeto;
    });
  }

  async extrairDadosFinanceiros(page) {
    return await page.evaluate(() => {
      const financeiros = {};
      
      // Buscar valor total estimado - procurar por texto específico
      const elementos = Array.from(document.querySelectorAll('div, span, p, h1, h2, h3, h4, strong, b'));
      
      // Primeiro: procurar por "VALOR TOTAL ESTIMADO DA COMPRA"
      elementos.forEach(el => {
        const texto = el.innerText?.trim();
        
        if (texto && texto.includes('VALOR TOTAL ESTIMADO DA COMPRA')) {
          // Procurar o valor no mesmo elemento ou no próximo
          const valorNoMesmoElemento = texto.match(/R\$\s*[\d.,]+/);
          if (valorNoMesmoElemento) {
            financeiros.valor_total_texto = valorNoMesmoElemento[0];
            const valorNumerico = valorNoMesmoElemento[0].replace(/[^\d,]/g, '').replace(',', '.');
            financeiros.valor_total_numerico = parseFloat(valorNumerico) || null;
          } else {
            // Procurar no próximo elemento
            const proximoEl = el.nextElementSibling || el.parentElement.nextElementSibling;
            if (proximoEl) {
              const valorTexto = proximoEl.innerText?.trim();
              const match = valorTexto.match(/R\$\s*[\d.,]+/);
              if (match) {
                financeiros.valor_total_texto = match[0];
                const valorNumerico = match[0].replace(/[^\d,]/g, '').replace(',', '.');
                financeiros.valor_total_numerico = parseFloat(valorNumerico) || null;
              }
            }
          }
        }
      });
      
      // Se não encontrou, procurar por todos os valores R$ e pegar o maior
      if (!financeiros.valor_total_texto) {
        const valoresEncontrados = [];
        
        elementos.forEach(el => {
          const texto = el.innerText?.trim();
          if (texto && texto.includes('R$')) {
            const matches = texto.match(/R\$\s*[\d.,]+/g);
            if (matches) {
              matches.forEach(match => {
                const valorNumerico = parseFloat(match.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
                if (valorNumerico > 1000) { // Filtrar valores muito pequenos
                  valoresEncontrados.push({
                    texto: match,
                    numerico: valorNumerico
                  });
                }
              });
            }
          }
        });
        
        // Pegar o maior valor encontrado
        if (valoresEncontrados.length > 0) {
          const maiorValor = valoresEncontrados.reduce((max, atual) => 
            atual.numerico > max.numerico ? atual : max
          );
          financeiros.valor_total_texto = maiorValor.texto;
          financeiros.valor_total_numerico = maiorValor.numerico;
        }
      }
      
      // Buscar informações orçamentárias
      const orcamentoEl = elementos.find(el => {
        const texto = el.innerText?.trim();
        return texto && (
          texto.includes('ORÇAMENTO') || 
          texto.includes('RECURSOS') ||
          texto.includes('FONTE')
        );
      });
      
      if (orcamentoEl) {
        financeiros.fonte_orcamentaria = orcamentoEl.innerText.trim();
      }
      
      return financeiros;
    });
  }

  async extrairConteudoAbas(page) {
    const resultado = {
      itens: [],
      anexos: [],
      historico: []
    };

    try {
      // Tentar extrair itens
      console.log('    [ITENS] Analisando conteúdo...');
      resultado.itens = await this.extrairItensEstruturaReal(page);
      
      // Tentar extrair anexos
      console.log('    [ANEXOS] Analisando conteúdo...');
      resultado.anexos = await this.extrairAnexosEstruturaReal(page);
      
      // Tentar extrair histórico
      console.log('    [HISTÓRICO] Analisando conteúdo...');
      resultado.historico = await this.extrairHistoricoEstruturaReal(page);
      
    } catch (error) {
      console.error(`  [AVISO] Erro ao extrair conteúdo das abas: ${error.message}`);
    }
    
    return resultado;
  }

  async extrairItensEstruturaReal(page) {
    // Clicar na aba Itens
    const abaItens = await page.evaluateHandle(() => {
      const links = Array.from(document.querySelectorAll('a, button, [role="tab"], [class*="tab"]'));
      return links.find(el => 
        el.innerText?.toLowerCase().trim() === 'itens'
      );
    });
    
    if (abaItens && await abaItens.evaluate(el => el !== null)) {
      await abaItens.click();
      await new Promise(resolve => setTimeout(resolve, this.delayEntreCliques));
      console.log('    ✓ Clicou na aba "Itens"');
    }
    
    // Extrair itens da estrutura real da página
    return await page.evaluate(() => {
      const items = [];
      
      // Buscar elementos que podem conter itens
      const elementos = document.querySelectorAll('div, p, span, li');
      
      elementos.forEach((el, index) => {
        const texto = el.innerText?.trim();
        
        // Verificar se parece um item (texto longo com características de item)
        if (texto && 
            texto.length > 50 && 
            !texto.includes('Portal Nacional') &&
            !texto.includes('Buscar no') &&
            !texto.includes('Planos de') &&
            !texto.includes('Tabelas de') &&
            !texto.includes('Catálogo') &&
            (texto.includes('CONTRATAÇÃO') || 
             texto.includes('AQUISIÇÃO') || 
             texto.includes('SERVIÇOS') ||
             texto.includes('FORNECIMENTO') ||
             texto.includes('REFEIÇÃO') ||
             texto.includes('ALMOÇO') ||
             texto.includes('JANTAR'))) {
          
          items.push({
            numero: items.length + 1,
            descricao: texto,
            quantidade: null,
            unidade: null,
            valor_unitario: null,
            valor_total: null
          });
        }
      });
      
      return items;
    });
  }

  async extrairAnexosEstruturaReal(page) {
    // Clicar na aba Arquivos
    const abaArquivos = await page.evaluateHandle(() => {
      const links = Array.from(document.querySelectorAll('a, button, [role="tab"], [class*="tab"]'));
      return links.find(el => 
        el.innerText?.toLowerCase().trim() === 'arquivos'
      );
    });
    
    if (abaArquivos && await abaArquivos.evaluate(el => el !== null)) {
      await abaArquivos.click();
      await new Promise(resolve => setTimeout(resolve, this.delayEntreCliques));
      console.log('    ✓ Clicou na aba "Arquivos"');
    }
    
    // Extrair arquivos da estrutura real
    return await page.evaluate(() => {
      const arquivos = [];
      
      // Buscar links de download
      const links = document.querySelectorAll('a[href*="download"], a[href*="arquivo"], a[href*=".pdf"], a[href*=".doc"], a[href*=".docx"]');
      
      links.forEach((link, index) => {
        if (link.href && link.href.length > 10) {
          arquivos.push({
            numero: index + 1,
            nome: link.innerText.trim() || link.getAttribute('title') || `Arquivo ${index + 1}`,
            data: null,
            tipo: null,
            url: link.href,
            extensao: link.href.split('.').pop()?.toLowerCase() || null
          });
        }
      });
      
      return arquivos;
    });
  }

  async extrairHistoricoEstruturaReal(page) {
    // Clicar na aba Histórico
    const abaHistorico = await page.evaluateHandle(() => {
      const links = Array.from(document.querySelectorAll('a, button, [role="tab"], [class*="tab"]'));
      return links.find(el => 
        el.innerText?.toLowerCase().trim() === 'histórico'
      );
    });
    
    if (abaHistorico && await abaHistorico.evaluate(el => el !== null)) {
      await abaHistorico.click();
      await new Promise(resolve => setTimeout(resolve, this.delayEntreCliques));
      console.log('    ✓ Clicou na aba "Histórico"');
    }
    
    // Extrair histórico da estrutura real
    return await page.evaluate(() => {
      const eventos = [];
      
      // Buscar elementos que podem conter histórico
      const elementos = document.querySelectorAll('div, p, span, li');
      
      elementos.forEach((el, index) => {
        const texto = el.innerText?.trim();
        
        // Verificar se parece um evento de histórico
        if (texto && 
            texto.includes('Inclusão') && 
            texto.includes('Data') &&
            texto.length > 20) {
          
          eventos.push({
            numero: eventos.length + 1,
            evento: texto,
            data_hora: null,
            responsavel: null,
            links_download: null
          });
        }
      });
      
      return eventos;
    });
  }

  async salvarEditalEstruturado(dados) {
    try {
      const { data, error } = await supabase
        .from('editais_estruturados')
        .upsert({
          id_pncp: dados.id_pncp,
          url_edital: dados.url_edital,
          cnpj_orgao: dados.cnpj_orgao,
          orgao: dados.orgao,
          ano: dados.ano,
          numero: dados.numero,
          titulo_edital: dados.titulo_edital,
          itens: dados.itens,
          anexos: dados.anexos,
          historico: dados.historico,
          objeto_completo: dados.objeto_completo,
          dados_financeiros: dados.dados_financeiros,
          data_extracao: dados.data_extracao,
          metodo_extracao: dados.metodo_extracao,
          tempo_extracao: dados.tempo_extracao
        }, {
          onConflict: 'id_pncp'
        });
      
      if (error) {
        throw error;
      }
      
      console.log(`    ✓ Registro salvo na tabela editais_estruturados (ID: ${dados.id_pncp})`);
      return { sucesso: true };
      
    } catch (error) {
      console.error(`[ERRO SUPABASE] ${error.message}`);
      return { sucesso: false, erro: error.message };
    }
  }
}

module.exports = ScraperEstruturaReal;
