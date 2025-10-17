# 🚀 PNCP API - Extrator de Editais

Sistema automatizado para extração e processamento de editais do Portal Nacional de Contratações Públicas (PNCP).

## 📋 Funcionalidades

- ✅ **Extração Automática**: Extrai editais do PNCP do dia anterior
- ✅ **Scraping Completo**: Navega e extrai dados detalhados (itens, anexos, histórico)
- ✅ **Scheduler Automático**: Execução diária programada
- ✅ **Anti-Duplicação**: Controle inteligente de duplicatas
- ✅ **API REST**: Endpoints completos para todas as operações
- ✅ **Documentação Swagger**: Interface interativa para testes

## 🛠️ Tecnologias

- **Node.js** + **Express**
- **Puppeteer** (Web Scraping)
- **Cheerio** (HTML Parsing)
- **Supabase** (PostgreSQL)
- **Swagger** (Documentação)

## 📦 Instalação Local

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais

# Rodar em desenvolvimento
npm run dev

# Rodar em produção
npm start
```

## 🔧 Variáveis de Ambiente

```env
PORT=3000
PNCP_API_BASE_URL=https://pncp.gov.br/api
SUPABASE_URL=sua_url_supabase
SUPABASE_ANON_KEY=sua_chave_supabase
```

## 🚀 Deploy no Render

### Passo 1: Criar conta no Render
1. Acesse [render.com](https://render.com)
2. Crie uma conta gratuita

### Passo 2: Conectar Repositório
1. Faça push do código para GitHub/GitLab
2. No Render, clique em "New +"
3. Selecione "Web Service"
4. Conecte seu repositório

### Passo 3: Configurar Variáveis
No painel do Render, adicione:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

### Passo 4: Deploy
O Render detectará automaticamente o `render.yaml` e fará o deploy!

## 📚 API Endpoints

### Extração
- `POST /api/extrair` - Extrai editais do dia anterior
- `GET /api/extrair/status` - Status da extração

### Processamento (Scraping)
- `POST /api/processar` - Processa editais pendentes
- `POST /api/processar-url` - Processa URL específica
- `GET /api/processar/status` - Status do processamento

### Scheduler (Automação)
- `POST /api/scheduler/executar` - Executa processo completo
- `POST /api/scheduler/configurar` - Configura horário e parâmetros
- `GET /api/scheduler/status` - Status do scheduler
- `GET /api/scheduler/historico` - Histórico de execuções

### Documentação
- `/api-docs` - Interface Swagger interativa
- `/swagger.json` - Especificação OpenAPI

## 🧪 Testes

```bash
# Teste de uma URL específica (scraping detalhado)
npm run teste-url

# Teste completo com Supabase
npm run teste

# Teste sem Supabase
npm run teste-simples

# Teste do scheduler
npm run teste-scheduler

# Extração manual
npm run extrair
```

### 🎯 Teste de URL Específica
Para testar o scraping detalhado de um edital:
1. Edite `src/teste-url-especifica.js` e altere a constante `URL_TESTE`
2. Execute: `npm run teste-url`
3. Veja o [Guia Completo](./TESTE-SCRAPING.md)

## 📊 Estrutura do Banco

### editais_pncp
Armazena URLs básicas dos editais extraídos da API

### editais_estruturados
Armazena dados completos extraídos via scraping (JSONB)

### scheduler_horario
Configuração do scheduler automático

### scheduler_execucoes
Histórico de execuções automáticas

## 🔄 Fluxo Automático

```
1. ⏰ SCHEDULER (08:00 diário)
   ├── Extrai URLs do dia anterior
   ├── Processa editais (scraping)
   ├── Salva dados estruturados
   └── Registra execução

2. 🛡️ ANTI-DUPLICAÇÃO
   ├── numero_controle_pncp (UNIQUE)
   ├── id_pncp (UNIQUE)
   └── UPSERT automático

3. 📈 MONITORAMENTO
   ├── Status em tempo real
   ├── Histórico completo
   └── Métricas detalhadas
```

## 📝 Scripts

- `npm start` - Inicia servidor em produção
- `npm run dev` - Desenvolvimento com nodemon
- `npm run extrair` - Extração manual
- `npm run teste` - Teste completo
- `npm run teste-simples` - Teste simples
- `npm run teste-scheduler` - Teste scheduler

## 🐛 Troubleshooting

### Erro no Puppeteer (Render)
O Render instala automaticamente Chromium. Se houver erro:
```bash
# Já configurado no render.yaml
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
```

### Timeout no Scraping
Ajuste o timeout no `src/scraper.js`:
```javascript
await page.goto(url, { 
  waitUntil: 'networkidle2', 
  timeout: 120000 
});
```

## 📄 Licença

MIT

## 👨‍💻 Autor

Elmar Tecnologia

---

**Sistema 100% automatizado para extração de editais do PNCP!** 🎊

