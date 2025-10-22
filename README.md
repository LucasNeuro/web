# 🚀 PNCP API Extrator - Sistema Refatorado

## 📋 Descrição

Sistema automatizado para extração de editais do Portal Nacional de Contratações Públicas (PNCP) via API, com scheduler diário e armazenamento em banco de dados.

## ✨ Características

- **🔌 100% API-driven** - Sem web scraping
- **⏰ Scheduler automático** - Execução diária às 22:30
- **📊 Múltiplas modalidades** - Busca em todas as modalidades disponíveis
- **🎯 Limite controlado** - Até 5.600 editais por execução
- **💾 Armazenamento otimizado** - PostgreSQL com Supabase
- **📚 Documentação Swagger** - API totalmente documentada

## 🏗️ Arquitetura

### **📁 Estrutura do Projeto**
```
src/
├── config/
│   ├── supabase.js    # Configuração do banco
│   └── swagger.js     # Documentação da API
├── extrator-api.js    # Lógica de extração via API
├── index.js          # Servidor Express e endpoints
└── scheduler.js      # Gerenciador de execuções automáticas
```

### **🔌 Endpoints da API**

#### **Extração e Sistema**
- `POST /api/extrair` - Iniciar extração manual
- `GET /api/scheduler` - Status do scheduler
- `GET /api/health` - Health check
- `GET /api/docs` - Documentação Swagger

#### **Frontend - Dados Estruturados**
- `GET /api/editais` - Listar editais com filtros avançados
- `GET /api/editais/:numeroControle` - Detalhes completos de um edital
- `GET /api/editais/:numeroControle/itens` - Itens desestruturados
- `GET /api/editais/:numeroControle/documentos` - Documentos desestruturados
- `GET /api/editais/:numeroControle/historico` - Histórico desestruturado
- `GET /api/estatisticas` - Estatísticas gerais

## 🚀 Deploy no Render

### **📋 Pré-requisitos**
1. Conta no Render
2. Projeto no Supabase configurado
3. Variáveis de ambiente configuradas

### **🔧 Variáveis de Ambiente**
```bash
SUPABASE_URL=sua_url_do_supabase
SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
PNCP_API_BASE_URL=https://pncp.gov.br/api
NODE_ENV=production
PORT=10000
NODE_OPTIONS=--max-old-space-size=256
```

### **📦 Deploy**
1. **Fazer push** do código para o repositório
2. **Conectar** o repositório no Render
3. **Configurar** as variáveis de ambiente
4. **Deploy automático** via `render.yaml`

## ⚙️ Configuração

### **⏰ Scheduler**
- **Horário:** 22:30 (configurável)
- **Frequência:** Diária
- **Modalidades:** Todas (7 modalidades)
- **Limite:** 5.600 editais

### **📊 Modalidades Suportadas**
1. Concorrência
2. Concurso
3. Leilão
4. Pregão Presencial
5. Pregão Eletrônico
6. Dispensa
7. Inexigibilidade

## 🧪 Testes

### **🔍 Testar Extração**
```bash
curl -X POST https://sua-api.onrender.com/api/extrair \
  -H "Content-Type: application/json" \
  -d '{"dias": 1, "limite": 5600}'
```

### **📊 Verificar Status**
```bash
curl https://sua-api.onrender.com/api/scheduler
```

## 📈 Monitoramento

### **📊 Logs**
- Execuções do scheduler
- Extrações por modalidade
- Erros e retry attempts
- Performance metrics

### **💾 Banco de Dados**
- `editais_completos` - Dados dos editais
- `scheduler_execucoes` - Histórico de execuções
- `scheduler_horario` - Configurações do scheduler

## 🔧 Desenvolvimento

### **🚀 Executar Localmente**
```bash
npm install
npm start
```

### **📚 Documentação**
Acesse `/api/docs` para ver a documentação completa da API.

## 📝 Changelog

### **v2.0.0 - Sistema Refatorado**
- ✅ Removido web scraping (Puppeteer)
- ✅ Implementado sistema 100% API
- ✅ Adicionado suporte a múltiplas modalidades
- ✅ Otimizado scheduler para execução diária
- ✅ Simplificado arquitetura do sistema
- ✅ Melhorado sistema de logs e monitoramento

## 🤝 Suporte

Para dúvidas ou problemas, consulte a documentação da API em `/api/docs` ou verifique os logs do sistema.
