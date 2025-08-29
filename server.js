const express = require('express');
const cors = require('cors');
const { 
  exchangeNpssoForAccessCode, 
  exchangeAccessCodeForAuthTokens,
  exchangeRefreshTokenForAuthTokens,
  getUserTitles,
  getTitleTrophies,
  getUserTrophiesEarnedForTitle
} = require('psn-api');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// NPSSO token do Front
const NPSSO_TOKEN = 'C7EGmpvBTjuxGT5fOpGFXKBeNAWTl8Lo5fOWCYC4CMtu1elBaVHlkYLP9uz3cRE7';

// Cache para tokens
let cachedAuthorization = null;
let tokenExpiry = null;

// Função para obter tokens de autenticação
async function getAuthTokens() {
  try {
    console.log('🔐 Getting new authentication tokens...');
    
    // Step 1: Exchange NPSSO for access code
    const accessCode = await exchangeNpssoForAccessCode(NPSSO_TOKEN);
    
    // Step 2: Exchange access code for auth tokens
    const authorization = await exchangeAccessCodeForAuthTokens(accessCode);
    
    console.log('✅ Authentication successful!');
    return authorization;
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    throw error;
  }
}

// Função para renovar tokens usando refresh token
async function refreshAuthTokens(refreshToken) {
  try {
    console.log('🔄 Refreshing authentication tokens...');
    
    const newAuthorization = await exchangeRefreshTokenForAuthTokens(refreshToken);
    
    console.log('✅ Token refresh successful!');
    return newAuthorization;
  } catch (error) {
    console.error('❌ Token refresh error:', error.message);
    throw error;
  }
}

// Middleware para obter tokens válidos
async function getValidTokens() {
  const now = Date.now();
  
  // Se não temos tokens ou eles expiraram
  if (!cachedAuthorization || !tokenExpiry || now >= tokenExpiry) {
    if (cachedAuthorization?.refreshToken) {
      try {
        // Tentar renovar com refresh token
        cachedAuthorization = await refreshAuthTokens(cachedAuthorization.refreshToken);
      } catch (error) {
        console.log('🔄 Refresh failed, getting new tokens...');
        // Se falhar, obter novos tokens
        cachedAuthorization = await getAuthTokens();
      }
    } else {
      // Primeira vez, obter tokens iniciais
      cachedAuthorization = await getAuthTokens();
    }
    
    // Calcular expiração (55 minutos para ser seguro)
    tokenExpiry = now + (55 * 60 * 1000);
  }
  
  return cachedAuthorization;
}

// Rota para obter lista de jogos
app.get('/api/trophy-titles', async (req, res) => {
  try {
    const authorization = await getValidTokens();
    
    console.log('🎮 Fetching trophy titles...');
    
    const response = await getUserTitles(authorization, 'me');
    
    console.log(`✅ Found ${response.trophyTitles.length} games`);
    
    res.json(response);
  } catch (error) {
    console.error('❌ Error fetching trophy titles:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch trophy titles',
      details: error.message 
    });
  }
});

// Rota para obter troféus de um jogo
app.get('/api/trophies/:npCommunicationId', async (req, res) => {
  try {
    const { npCommunicationId } = req.params;
    const authorization = await getValidTokens();
    
    console.log(`🏆 Fetching trophies for ${npCommunicationId}...`);
    
    // Obter informações do jogo para determinar o npServiceName
    const titlesResponse = await getUserTitles(authorization, 'me');
    const gameInfo = titlesResponse.trophyTitles.find(
      title => title.npCommunicationId === npCommunicationId
    );
    
    if (!gameInfo) {
      throw new Error('Game not found');
    }
    
    // Determinar npServiceName baseado na plataforma
    const npServiceName = gameInfo.trophyTitlePlatform.includes('PS5') ? 'trophy2' : 'trophy';
    
    // Fazer requisições paralelas
    const [trophiesResponse, earnedResponse] = await Promise.all([
      getTitleTrophies(authorization, npCommunicationId, 'all', {
        npServiceName: npServiceName
      }),
      getUserTrophiesEarnedForTitle(authorization, 'me', npCommunicationId, 'all', {
        npServiceName: npServiceName
      })
    ]);
    
    console.log(`✅ Found ${trophiesResponse.trophies.length} trophies for ${gameInfo.trophyTitleName}`);
    
    res.json({
      gameInfo: gameInfo,
      trophies: trophiesResponse,
      earned: earnedResponse
    });
  } catch (error) {
    console.error('❌ Error fetching trophies:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch trophies',
      details: error.message 
    });
  }
});

// Rota para obter resumo do perfil
app.get('/api/profile-summary', async (req, res) => {
  try {
    const authorization = await getValidTokens();
    
    console.log('👤 Fetching profile summary...');
    
    // Importar a função necessária
    const { getUserTrophyProfileSummary } = require('psn-api');
    
    const summary = await getUserTrophyProfileSummary(authorization, 'me');
    
    console.log(`✅ Profile summary: Level ${summary.trophyLevel}, ${summary.progress}% progress`);
    
    res.json(summary);
  } catch (error) {
    console.error('❌ Error fetching profile summary:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch profile summary',
      details: error.message 
    });
  }
});

// Rota de teste
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'PSN Proxy Server is running!',
    status: 'connected',
    timestamp: new Date().toISOString()
  });
});

// Rota de status
app.get('/api/status', (req, res) => {
  const now = Date.now();
  const isTokenValid = cachedAuthorization && tokenExpiry && now < tokenExpiry;
  
  res.json({
    status: 'running',
    tokenValid: isTokenValid,
    tokenExpiry: tokenExpiry ? new Date(tokenExpiry).toISOString() : null,
    hasRefreshToken: !!cachedAuthorization?.refreshToken
  });
});

app.listen(PORT, () => {
  console.log(`🚀 PSN Proxy Server running on http://localhost:${PORT}`);
  console.log(`📡 Ready to proxy PSN API requests`);
  console.log(`🔐 Using NPSSO token for authentication`);
});
