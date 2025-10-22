# 🚀 Instruções de Deploy no Render

## 📋 Checklist Pré-Deploy

### ✅ **1. Código Atualizado**
- [x] Sistema refatorado para 100% API
- [x] Puppeteer removido
- [x] Múltiplas modalidades implementadas
- [x] Scheduler configurado para 5.600 editais
- [x] Dockerfile otimizado
- [x] Dependências atualizadas

### ✅ **2. Arquivos de Configuração**
- [x] `render.yaml` configurado
- [x] `Dockerfile` otimizado
- [x] `package.json` atualizado
- [x] `README.md` documentado

## 🔧 **Passos para Deploy**

### **1. 📤 Fazer Push do Código**
```bash
git add .
git commit -m "feat: sistema refatorado para 100% API com múltiplas modalidades"
git push origin main
```

### **2. 🌐 Configurar no Render**

#### **A. Conectar Repositório**
1. Acesse [render.com](https://render.com)
2. Clique em "New +" → "Web Service"
3. Conecte seu repositório GitHub
4. Selecione o branch `main`

#### **B. Configurar Serviço**
- **Name:** `pncp-api-extrator`
- **Environment:** `Docker`
- **Region:** `Oregon (US West)`
- **Plan:** `Free`
- **Dockerfile Path:** `./Dockerfile`

#### **C. Variáveis de Ambiente**
```bash
NODE_ENV=production
PORT=10000
PNCP_API_BASE_URL=https://pncp.gov.br/api
NODE_OPTIONS=--max-old-space-size=256
SUPABASE_URL=sua_url_do_supabase
SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

### **3. 🚀 Deploy Automático**
- O Render detectará o `render.yaml` automaticamente
- O deploy será iniciado automaticamente
- Aguarde a conclusão (5-10 minutos)

## 🧪 **Testes Pós-Deploy**

### **1. 🔍 Health Check**
```bash
curl https://sua-api.onrender.com/api/health
```

### **2. 📊 Status do Scheduler**
```bash
curl https://sua-api.onrender.com/api/scheduler
```

### **3. 🚀 Teste de Extração**
```bash
curl -X POST https://sua-api.onrender.com/api/extrair \
  -H "Content-Type: application/json" \
  -d '{"dias": 1, "limite": 100}'
```

### **4. 📚 Documentação**
Acesse: `https://sua-api.onrender.com/api/docs`

## 📊 **Monitoramento**

### **📈 Logs do Render**
- Acesse o dashboard do Render
- Vá em "Logs" para ver os logs em tempo real
- Monitore execuções do scheduler

### **💾 Banco de Dados**
- Verifique tabelas no Supabase:
  - `editais_completos`
  - `scheduler_execucoes`
  - `scheduler_horario`

## ⚠️ **Possíveis Problemas**

### **🔴 Erro de Build**
- Verifique se todas as dependências estão no `package.json`
- Confirme se o `Dockerfile` está correto

### **🔴 Erro de Variáveis**
- Verifique se `SUPABASE_URL` e `SUPABASE_ANON_KEY` estão configuradas
- Confirme se as variáveis estão no formato correto

### **🔴 Erro de Conexão**
- Verifique se o banco Supabase está acessível
- Confirme se as credenciais estão corretas

## 🎯 **Resultado Esperado**

Após o deploy bem-sucedido:
- ✅ API funcionando em `https://sua-api.onrender.com`
- ✅ Scheduler executando diariamente às 22:30
- ✅ Extração de até 5.600 editais por dia
- ✅ Documentação disponível em `/api/docs`
- ✅ Logs detalhados no dashboard do Render

## 📞 **Suporte**

Se houver problemas:
1. Verifique os logs no Render
2. Teste os endpoints manualmente
3. Confirme as variáveis de ambiente
4. Verifique a conectividade com o Supabase
