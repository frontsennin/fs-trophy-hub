import {
  exchangeNpssoForAccessCode,
  exchangeAccessCodeForAuthTokens,
  exchangeRefreshTokenForAuthTokens,
  getUserTitles,
  getTitleTrophies,
  getUserTrophiesEarnedForTitle,
  getUserTrophyProfileSummary
} from 'psn-api';

// NPSSO token do Front
const NPSSO_TOKEN = 'C7EGmpvBTjuxGT5fOpGFXKBeNAWTl8Lo5fOWCYC4CMtu1elBaVHlkYLP9uz3cRE7';

// Cache para tokens (em produção, usar Redis ou similar)
let cachedAuthorization = null;
let tokenExpiry = null;

// Função para obter tokens de autenticação
async function getAuthTokens() {
  try {
    console.log('🔐 Getting new authentication tokens...');
    
    const accessCode = await exchangeNpssoForAccessCode(NPSSO_TOKEN);
    const authorization = await exchangeAccessCodeForAuthTokens(accessCode);
    
    console.log('✅ Authentication successful!');
    return authorization;
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    throw error;
  }
}

// Função para renovar tokens
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
  
  if (!cachedAuthorization || !tokenExpiry || now >= tokenExpiry) {
    if (cachedAuthorization?.refreshToken) {
      try {
        cachedAuthorization = await refreshAuthTokens(cachedAuthorization.refreshToken);
      } catch (error) {
        console.log('🔄 Refresh failed, getting new tokens...');
        cachedAuthorization = await getAuthTokens();
      }
    } else {
      cachedAuthorization = await getAuthTokens();
    }
    
    tokenExpiry = now + (55 * 60 * 1000); // 55 minutos
  }
  
  return cachedAuthorization;
}

export default async function handler(req, res) {
  // Configurar timeout para 30 segundos
  res.setTimeout(30000);
  
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { path } = req.query;

  try {
    switch (path) {
      case 'trophy-titles':
        const authorization = await getValidTokens();
        console.log('🎮 Fetching trophy titles...');
        
        // Tentar buscar com diferentes parâmetros para obter mais jogos
        console.log('🔄 Tentando buscar jogos com parâmetros padrão...');
        let response = await getUserTitles(authorization, 'me');
        
        // Se retornou menos de 100 jogos, tentar com parâmetros diferentes
        if (response.trophyTitles.length < 100) {
          console.log('⚠️ Poucos jogos encontrados, tentando com parâmetros alternativos...');
          try {
            // Tentar buscar com offset e limit
            const alternativeResponse = await getUserTitles(authorization, 'me', { 
              limit: 100,
              offset: 0,
              npLanguage: 'pt-BR'
            });
            
            if (alternativeResponse.trophyTitles.length > response.trophyTitles.length) {
              console.log(`✅ Encontrados ${alternativeResponse.trophyTitles.length} jogos com parâmetros alternativos`);
              response = alternativeResponse;
            }
          } catch (error) {
            console.log('⚠️ Parâmetros alternativos falharam, usando resposta padrão');
          }
        }
        
        console.log(`✅ Found ${response.trophyTitles.length} games`);
        console.log('🔍 Response completo:', JSON.stringify(response, null, 2));
        
        // Log detalhado dos primeiros jogos
        if (response.trophyTitles && response.trophyTitles.length > 0) {
          console.log('🎮 Primeiros 5 jogos:');
          response.trophyTitles.slice(0, 5).forEach((game, index) => {
            console.log(`  ${index + 1}. ${game.trophyTitleName} (${game.trophyTitlePlatform}) - Progresso: ${game.progress}%`);
            if (game.earnedTrophies) {
              console.log(`     Troféus: P:${game.earnedTrophies.platinum} G:${game.earnedTrophies.gold} S:${game.earnedTrophies.silver} B:${game.earnedTrophies.bronze}`);
            }
          });
        }
        
        res.status(200).json(response);
        break;
        
      case 'trophy-titles-detailed':
        const auth = await getValidTokens();
        console.log('🎮 Fetching detailed trophy titles...');
        
        // Buscar com parâmetros mais detalhados
        const detailedResponse = await getUserTitles(auth, 'me', {
          limit: 1000, // Tentar buscar mais jogos
          offset: 0,
          npLanguage: 'pt-BR',
          sortBy: 'lastUpdatedDate',
          sortOrder: 'desc'
        });
        
        console.log(`✅ Found ${detailedResponse.trophyTitles.length} games with detailed search`);
        
        res.status(200).json(detailedResponse);
        break;

      case 'trophies':
        const { npCommunicationId } = req.query;
        const auth = await getValidTokens();
        
        console.log(`🏆 Fetching trophies for ${npCommunicationId}...`);
        
        const titlesResponse = await getUserTitles(auth, 'me');
        const gameInfo = titlesResponse.trophyTitles.find(
          title => title.npCommunicationId === npCommunicationId
        );
        
        if (!gameInfo) {
          throw new Error('Game not found');
        }
        
        const npServiceName = gameInfo.trophyTitlePlatform.includes('PS5') ? 'trophy2' : 'trophy';
        
        const [trophiesResponse, earnedResponse] = await Promise.all([
          getTitleTrophies(auth, npCommunicationId, 'all', {
            npServiceName: npServiceName
          }),
          getUserTrophiesEarnedForTitle(auth, 'me', npCommunicationId, 'all', {
            npServiceName: npServiceName
          })
        ]);
        
        console.log(`✅ Found ${trophiesResponse.trophies.length} trophies for ${gameInfo.trophyTitleName}`);
        
        res.status(200).json({
          gameInfo: gameInfo,
          trophies: trophiesResponse,
          earned: earnedResponse
        });
        break;

      case 'profile-summary':
        const authProfile = await getValidTokens();
        
        console.log('👤 Fetching profile summary...');
        
        const summary = await getUserTrophyProfileSummary(authProfile, 'me');
        
        console.log(`✅ Profile summary: Level ${summary.trophyLevel}, ${summary.progress}% progress`);
        
        res.status(200).json(summary);
        break;

      case 'status':
        const now = Date.now();
        const isTokenValid = cachedAuthorization && tokenExpiry && now < tokenExpiry;
        
        res.status(200).json({
          status: 'running',
          tokenValid: isTokenValid,
          tokenExpiry: tokenExpiry ? new Date(tokenExpiry).toISOString() : null,
          hasRefreshToken: !!cachedAuthorization?.refreshToken
        });
        break;

      default:
        res.status(404).json({ error: 'Endpoint not found' });
    }
  } catch (error) {
    console.error('❌ API Error:', error.message);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
