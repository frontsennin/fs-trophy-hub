# 🚀 Guia de Deploy - FS Trophy Hub

## 📋 Pré-requisitos

- Conta no [Vercel](https://vercel.com)
- Projeto no GitHub/GitLab
- NPSSO Token válido da PlayStation Network

## 🔧 Configuração para Deploy

### 1. Preparar o Projeto

1. **Subir para GitHub:**
   ```bash
   git add .
   git commit -m "Preparando para deploy no Vercel"
   git push origin main
   ```

2. **Verificar arquivos:**
   - ✅ `api/psn-proxy.js` - Vercel Function
   - ✅ `vercel.json` - Configuração do Vercel
   - ✅ `package.json` - Scripts de build

### 2. Deploy no Vercel

1. **Conectar ao Vercel:**
   - Acesse [vercel.com](https://vercel.com)
   - Faça login com GitHub
   - Clique em "New Project"

2. **Importar repositório:**
   - Selecione o repositório `fs-trophy-hub`
   - Clique em "Import"

3. **Configurar projeto:**
   - **Framework Preset:** Create React App
   - **Root Directory:** `./` (padrão)
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`
   - **Install Command:** `npm install`

4. **Variáveis de Ambiente (Opcional):**
   - `NODE_ENV=production`
   - `NPSSO_TOKEN=sua_token_aqui` (se quiser usar env)

5. **Deploy:**
   - Clique em "Deploy"
   - Aguarde o build completar

### 3. Configurar URL da API

Após o deploy, você receberá uma URL como:
`https://fs-trophy-hub-abc123.vercel.app`

**Atualizar o PSNService:**
```typescript
// Em src/services/psnService.ts
const BASE_URL = isProduction 
  ? 'https://fs-trophy-hub-abc123.vercel.app/api/psn-proxy' 
  : 'http://localhost:3001/api';
```

## 🔍 Verificar Funcionamento

1. **Acesse a URL do deploy**
2. **Verifique os logs:**
   - Vercel Dashboard → Functions → Logs
3. **Teste as funcionalidades:**
   - Lista de jogos
   - Visualização de troféus
   - Perfil do usuário

## ⚠️ Limitações do Vercel

### ✅ **Funciona:**
- Frontend React
- Vercel Functions (API routes)
- CORS automático
- HTTPS automático
- CDN global

### ⚠️ **Limitações:**
- **Cold starts** nas functions
- **Timeout** de 30s por request
- **Cache** limitado (usar Redis para produção)
- **NPSSO Token** expira (renovar manualmente)

## 🔄 Manutenção

### Renovar NPSSO Token:
1. Acesse [PlayStation Network](https://ca.account.sony.com/api/authz/v3/oauth/authorize)
2. Copie o novo token
3. Atualize em `api/psn-proxy.js`

### Monitoramento:
- Vercel Dashboard → Analytics
- Functions → Logs
- Performance → Core Web Vitals

## 🚀 Próximos Passos

### Para Produção:
1. **Domínio customizado**
2. **Redis** para cache de tokens
3. **Monitoramento** avançado
4. **CDN** para assets

### Melhorias:
1. **Cache** inteligente
2. **Rate limiting**
3. **Error tracking**
4. **Analytics**

## 📞 Suporte

- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)
- **PSN API:** [github.com/andshrew/psn-api](https://github.com/andshrew/psn-api)
- **Issues:** GitHub do projeto

---

**🎮 FS Trophy Hub - Deployado com sucesso no Vercel!**
