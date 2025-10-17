# 🚀 Guia de Deploy no Render

## 📋 Pré-requisitos

1. ✅ Conta no [Render.com](https://render.com) (gratuita)
2. ✅ Conta no [Supabase](https://supabase.com) (gratuita)
3. ✅ Repositório Git (GitHub, GitLab ou Bitbucket)

---

## 🎯 PASSO 1: Configurar Supabase

### 1.1 Criar Projeto
1. Acesse [app.supabase.com](https://app.supabase.com)
2. Clique em "New Project"
3. Escolha um nome e senha
4. Aguarde a criação (1-2 minutos)

### 1.2 Executar SQL das Tabelas
Acesse o **SQL Editor** e execute os seguintes arquivos:

#### Tabela de URLs básicas:
```sql
CREATE TABLE public.editais_pncp (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  url text NOT NULL UNIQUE,
  cnpj character varying NOT NULL,
  razao_social text NOT NULL,
  ano integer NOT NULL,
  sequencial integer NOT NULL,
  numero_controle_pncp character varying NOT NULL UNIQUE,
  objeto text,
  modalidade character varying,
  situacao character varying,
  valor_estimado numeric,
  data_publicacao timestamp with time zone,
  data_referencia date,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT editais_pncp_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_editais_url ON public.editais_pncp(url);
CREATE INDEX idx_editais_numero_controle ON public.editais_pncp(numero_controle_pncp);
CREATE INDEX idx_editais_data_referencia ON public.editais_pncp(data_referencia);
```

#### Tabela de dados completos:
```sql
CREATE TABLE public.editais_estruturados (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  id_pncp character varying NOT NULL UNIQUE,
  url_edital text NOT NULL,
  cnpj_orgao character varying,
  orgao character varying,
  ano integer,
  numero integer,
  titulo_edital character varying,
  itens jsonb DEFAULT '[]'::jsonb,
  anexos jsonb DEFAULT '[]'::jsonb,
  historico jsonb DEFAULT '[]'::jsonb,
  objeto_completo jsonb DEFAULT '{}'::jsonb,
  dados_financeiros jsonb DEFAULT '{}'::jsonb,
  data_extracao timestamp with time zone DEFAULT now(),
  metodo_extracao character varying DEFAULT 'puppeteer'::character varying,
  tempo_extracao numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT editais_estruturados_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_editais_estruturados_id_pncp ON public.editais_estruturados(id_pncp);
```

#### Execute também o arquivo `sql/scheduler_tables.sql` completo!

### 1.3 Obter Credenciais
1. Vá em **Settings** → **API**
2. Copie:
   - `Project URL` → será o `SUPABASE_URL`
   - `anon/public` key → será o `SUPABASE_ANON_KEY`

---

## 🎯 PASSO 2: Preparar Repositório Git

### 2.1 Inicializar Git (se ainda não fez)
```bash
git init
git add .
git commit -m "Initial commit - PNCP API"
```

### 2.2 Criar Repositório no GitHub
1. Acesse [github.com/new](https://github.com/new)
2. Crie um novo repositório (público ou privado)
3. Copie a URL do repositório

### 2.3 Fazer Push
```bash
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git branch -M main
git push -u origin main
```

---

## 🎯 PASSO 3: Deploy no Render

### 3.1 Criar Web Service
1. Acesse [dashboard.render.com](https://dashboard.render.com)
2. Clique em **"New +"** → **"Web Service"**
3. Conecte seu repositório Git
4. Selecione o repositório da API

### 3.2 Configurar Service
Preencha os campos:

- **Name**: `pncp-api-extrator` (ou outro nome)
- **Region**: `Oregon` (gratuito)
- **Branch**: `main`
- **Root Directory**: (deixe vazio)
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: `Free`

### 3.3 Adicionar Variáveis de Ambiente
Clique em **"Advanced"** → **"Add Environment Variable"**

Adicione as seguintes variáveis:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `PNCP_API_BASE_URL` | `https://pncp.gov.br/api` |
| `SUPABASE_URL` | `sua_url_do_supabase` |
| `SUPABASE_ANON_KEY` | `sua_chave_anon` |
| `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` | `true` |
| `PUPPETEER_EXECUTABLE_PATH` | `/usr/bin/google-chrome-stable` |

### 3.4 Instalar Chromium (para Puppeteer)
No campo **"Build Command"**, altere para:
```bash
npm install && apt-get update && apt-get install -y chromium
```

Ou use o script de build:
```bash
chmod +x build.sh && ./build.sh
```

### 3.5 Deploy!
Clique em **"Create Web Service"**

O Render vai:
1. ✅ Clonar seu repositório
2. ✅ Instalar dependências
3. ✅ Instalar Chromium
4. ✅ Iniciar o servidor
5. ✅ Gerar URL pública (ex: `https://pncp-api-extrator.onrender.com`)

---

## 🎯 PASSO 4: Verificar Deploy

### 4.1 Acessar API
Após o deploy, acesse:
- **API Base**: `https://sua-api.onrender.com`
- **Swagger**: `https://sua-api.onrender.com/api-docs`
- **Health Check**: `https://sua-api.onrender.com/api/extrair/status`

### 4.2 Testar Endpoints
```bash
# Testar extração
curl -X POST https://sua-api.onrender.com/api/extrair

# Ver status do scheduler
curl https://sua-api.onrender.com/api/scheduler/status

# Configurar horário
curl -X POST https://sua-api.onrender.com/api/scheduler/configurar \
  -H "Content-Type: application/json" \
  -d '{"horaExecucao": "08:00", "ativo": true}'
```

---

## ⚙️ Configurações Importantes

### Auto-Deploy
O Render faz **deploy automático** quando você faz push no repositório!

### Logs
Acesse os logs em tempo real no painel do Render:
- Dashboard → Seu Service → **"Logs"**

### Sleep Mode (Plano Free)
⚠️ **Importante**: No plano gratuito, o Render coloca o serviço em "sleep" após 15 minutos de inatividade.

**Soluções**:
1. **Upgrade para plano pago** ($7/mês) - sem sleep
2. **Usar cron externo** para fazer ping a cada 14 minutos:
   - [cron-job.org](https://cron-job.org)
   - [uptimerobot.com](https://uptimerobot.com)
3. **Aceitar o cold start** (primeiro request demora 30-60s)

### Scheduler no Render
O scheduler funciona perfeitamente no Render, mas lembre-se:
- ✅ Se o serviço estiver ativo, roda normalmente
- ⚠️ Se entrar em sleep, não executa (plano free)
- ✅ No plano pago, roda 24/7 sem interrupções

---

## 🔧 Troubleshooting

### Erro: "Cannot find module"
**Solução**: Verifique se o `package.json` está correto e faça rebuild

### Erro: "Puppeteer Chrome not found"
**Solução**: Adicione as variáveis de ambiente do Puppeteer

### Erro: "Connection timeout"
**Solução**: Aumente o timeout no código:
```javascript
timeout: 120000 // 2 minutos
```

### Erro: "Out of memory"
**Solução**: Plano free tem limite de 512MB RAM. Considere:
- Processar menos editais por vez
- Upgrade para plano pago (1GB RAM)

### Service em Sleep
**Solução**: Configure um serviço de ping ou upgrade para plano pago

---

## 📊 Monitoramento

### Logs do Render
```bash
# No dashboard do Render
Logs → Events → Real-time logs
```

### Métricas
```bash
# CPU, RAM, Requests
Metrics → Overview
```

### Supabase
```bash
# Monitore inserts no banco
Database → Tables → editais_pncp / editais_estruturados
```

---

## 🎉 Pronto!

Sua API está rodando 24/7 (com exceção do sleep no plano free) e o scheduler vai executar automaticamente todos os dias!

**URL da API**: `https://sua-api.onrender.com`  
**Swagger**: `https://sua-api.onrender.com/api-docs`

---

## 💡 Dicas Finais

1. ✅ Use o **Swagger** para testar os endpoints
2. ✅ Configure o **scheduler** para o horário desejado
3. ✅ Monitore os **logs** regularmente
4. ✅ Verifique o **histórico de execuções** no Supabase
5. ✅ Considere o **plano pago** se precisar de 24/7 real

**Sistema pronto para produção!** 🚀

