import { 
  exchangeNpssoForAccessCode,
  exchangeAccessCodeForAuthTokens,
  exchangeRefreshTokenForAuthTokens,
  getUserTitles,
  getTitleTrophies,
  getUserTrophiesEarnedForTitle,
  getUserTrophyProfileSummary,
  makeUniversalSearch
} from 'psn-api';
import { TrophyTitle, Trophy, ProfileSummary } from '../types';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshTokenExpiresIn: number;
}

export class PSNService {
  private static authTokens: AuthTokens | null = null;
  private static tokenExpiry: Date | null = null;
  private static refreshTokenExpiry: Date | null = null;
  
  // NPSSO token - deve ser obtido manualmente do PlayStation
  private static readonly NPSSO_TOKEN = 'C7EGmpvBTjuxGT5fOpGFXKBeNAWTl8Lo5fOWCYC4CMtu1elBaVHlkYLP9uz3cRE7';
  
  // Detectar ambiente
  private static readonly isDevelopment = process.env.NODE_ENV === 'development';
  private static readonly isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  private static readonly isVercel = window.location.hostname.includes('vercel.app');
  private static readonly useProxy = this.isDevelopment && this.isLocalhost && !this.isVercel;
  
  // URLs base
  private static readonly PROXY_URL = 'http://localhost:3001/api';
  private static readonly PRODUCTION_URL = 'https://fs-trophy-hub.vercel.app/api/psn-proxy';
  
  /**
   * Inicializar e logar informações do ambiente
   */
  private static initializeEnvironment() {
    console.log('🔍 PSNService - Detecção de Ambiente:');
    console.log('  - NODE_ENV:', process.env.NODE_ENV);
    console.log('  - Hostname:', window.location.hostname);
    console.log('  - isDevelopment:', this.isDevelopment);
    console.log('  - isLocalhost:', this.isLocalhost);
    console.log('  - useProxy:', this.useProxy);
    console.log('  - PROXY_URL:', this.PROXY_URL);
  }
  
  /**
   * Verifica se o servidor está rodando
   */
  static async checkServerStatus(): Promise<boolean> {
    // Inicializar ambiente na primeira chamada
    this.initializeEnvironment();
    
    try {
      // Se estamos em desenvolvimento local, verificar proxy
      if (this.useProxy) {
        return await this.checkProxyStatus();
      }
      
      // Em produção (Vercel), NÃO tentar acessar PSN API
      if (this.isVercel) {
        console.log('🌐 Ambiente Vercel detectado - usando apenas Firebase');
        return false; // Retorna false para forçar uso do Firebase
      }
      
      // Em outros ambientes de produção, verificar se temos tokens válidos
      return await this.ensureValidTokens();
    } catch (error) {
      console.error('❌ Erro ao verificar status da API:', error);
      return false;
    }
  }
  
  /**
   * Verificar status do servidor proxy local
   */
  private static async checkProxyStatus(): Promise<boolean> {
    try {
      console.log('🔄 Verificando status do proxy local...');
      const response = await fetch(`${this.PROXY_URL}/status`);
      console.log('✅ Proxy local respondendo:', response.status);
      return response.ok;
    } catch (error) {
      console.error('❌ Servidor proxy não está rodando:', error);
      return false;
    }
  }
  
  /**
   * Garante que temos tokens válidos para usar
   */
  private static async ensureValidTokens(): Promise<boolean> {
    try {
      // Se não temos tokens, fazemos a autenticação inicial
      if (!this.authTokens) {
        return await this.authenticate();
      }
      
      // Se o access token expirou, tentamos renovar
      if (this.tokenExpiry && new Date() >= this.tokenExpiry) {
        return await this.refreshTokens();
      }
      
      // Se o refresh token expirou, precisamos reautenticar
      if (this.refreshTokenExpiry && new Date() >= this.refreshTokenExpiry) {
        return await this.authenticate();
      }
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao garantir tokens válidos:', error);
      return false;
    }
  }
  
  /**
   * Autenticação inicial usando NPSSO
   */
  private static async authenticate(): Promise<boolean> {
    try {
      console.log('🔐 Iniciando autenticação PSN...');
      
      // Se estamos usando proxy, fazer via proxy
      if (this.useProxy) {
        return await this.authenticateViaProxy();
      }
      
      // Autenticação direta (produção)
      console.log('🌐 Usando autenticação direta PSN...');
      
      // 1. Trocar NPSSO por access code
      const accessCode = await exchangeNpssoForAccessCode(this.NPSSO_TOKEN);
      console.log('✅ Access code obtido');
      
      // 2. Trocar access code por tokens
      const authResponse = await exchangeAccessCodeForAuthTokens(accessCode);
      console.log('✅ Tokens de autenticação obtidos');
      
      // 3. Salvar tokens e calcular expiração
      this.authTokens = {
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
        expiresIn: authResponse.expiresIn,
        refreshTokenExpiresIn: authResponse.refreshTokenExpiresIn
      };
      
      // Calcular datas de expiração
      const now = new Date();
      this.tokenExpiry = new Date(now.getTime() + authResponse.expiresIn * 1000);
      this.refreshTokenExpiry = new Date(now.getTime() + authResponse.refreshTokenExpiresIn * 1000);
      
      console.log('✅ Autenticação PSN concluída com sucesso!');
      return true;
      
    } catch (error) {
      console.error('❌ Erro na autenticação PSN:', error);
      return false;
    }
  }
  
  /**
   * Autenticação via proxy local
   */
  private static async authenticateViaProxy(): Promise<boolean> {
    try {
      console.log('🔄 Usando proxy local para autenticação...');
      
      const response = await fetch(`${this.PROXY_URL}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ npsso: this.NPSSO_TOKEN })
      });
      
      if (!response.ok) {
        throw new Error(`Proxy auth failed: ${response.status}`);
      }
      
      const authData = await response.json();
      
      // Salvar tokens
      this.authTokens = {
        accessToken: authData.accessToken,
        refreshToken: authData.refreshToken,
        expiresIn: authData.expiresIn,
        refreshTokenExpiresIn: authData.refreshTokenExpiresIn
      };
      
      // Calcular datas de expiração
      const now = new Date();
      this.tokenExpiry = new Date(now.getTime() + authData.expiresIn * 1000);
      this.refreshTokenExpiry = new Date(now.getTime() + authData.refreshTokenExpiresIn * 1000);
      
      console.log('✅ Autenticação via proxy concluída!');
      return true;
      
    } catch (error) {
      console.error('❌ Erro na autenticação via proxy:', error);
      return false;
    }
  }
  
  /**
   * Renovar tokens usando refresh token
   */
  private static async refreshTokens(): Promise<boolean> {
    try {
      if (!this.authTokens?.refreshToken) {
        throw new Error('Refresh token não disponível');
      }
      
      console.log('🔄 Renovando tokens PSN...');
      
      // Se estamos usando proxy, renovar via proxy
      if (this.useProxy) {
        return await this.refreshTokensViaProxy();
      }
      
      // Renovação direta
      const authResponse = await exchangeRefreshTokenForAuthTokens(this.authTokens.refreshToken);
      
      // Atualizar tokens
      this.authTokens = {
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
        expiresIn: authResponse.expiresIn,
        refreshTokenExpiresIn: authResponse.refreshTokenExpiresIn
      };
      
      // Calcular nova expiração
      const now = new Date();
      this.tokenExpiry = new Date(now.getTime() + authResponse.expiresIn * 1000);
      this.refreshTokenExpiry = new Date(now.getTime() + authResponse.refreshTokenExpiresIn * 1000);
      
      console.log('✅ Tokens PSN renovados com sucesso!');
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao renovar tokens PSN:', error);
      // Se falhar, tentamos reautenticar
      return await this.authenticate();
    }
  }
  
  /**
   * Renovar tokens via proxy local
   */
  private static async refreshTokensViaProxy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.PROXY_URL}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.authTokens!.refreshToken })
      });
      
      if (!response.ok) {
        throw new Error(`Proxy refresh failed: ${response.status}`);
      }
      
      const authData = await response.json();
      
      // Atualizar tokens
      this.authTokens = {
        accessToken: authData.accessToken,
        refreshToken: authData.refreshToken,
        expiresIn: authData.expiresIn,
        refreshTokenExpiresIn: authData.refreshTokenExpiresIn
      };
      
      // Calcular nova expiração
      const now = new Date();
      this.tokenExpiry = new Date(now.getTime() + authData.expiresIn * 1000);
      this.refreshTokenExpiry = new Date(now.getTime() + authData.refreshTokenExpiresIn * 1000);
      
      console.log('✅ Tokens renovados via proxy!');
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao renovar tokens via proxy:', error);
      return await this.authenticate();
    }
  }
  
  /**
   * Obter payload de autorização para as chamadas da API
   */
  private static getAuthorizationPayload() {
    if (!this.authTokens?.accessToken) {
      throw new Error('Access token não disponível');
    }
    
    return { accessToken: this.authTokens.accessToken };
  }
  
  /**
   * Obter lista de jogos do usuário
   */
  static async getTrophyTitles(): Promise<TrophyTitle[]> {
    try {
      // Se estamos usando proxy, fazer via proxy
      if (this.useProxy) {
        return await this.getTrophyTitlesViaProxy();
      }
      
      // Verificar tokens válidos
      const isValid = await this.ensureValidTokens();
      if (!isValid) {
        throw new Error('Falha na autenticação PSN');
      }
      
      console.log('🎮 Buscando lista de jogos do PSN...');
      
      const response = await getUserTitles(this.getAuthorizationPayload(), 'me');
      
      // Converter para o formato que esperamos
      const trophyTitles: TrophyTitle[] = response.trophyTitles.map(title => ({
        npTitleId: title.npCommunicationId, // Usar npCommunicationId como npTitleId
        trophyTitleName: title.trophyTitleName,
        trophyTitleDetail: title.trophyTitleDetail || '',
        trophyTitleIconUrl: title.trophyTitleIconUrl || '',
        trophyTitlePlatform: title.trophyTitlePlatform,
        hasTrophyGroups: title.hasTrophyGroups || false,
        definedTrophies: {
          bronze: title.definedTrophies?.bronze || 0,
          silver: title.definedTrophies?.silver || 0,
          gold: title.definedTrophies?.gold || 0,
          platinum: title.definedTrophies?.platinum || 0
        },
        earnedTrophies: {
          bronze: title.earnedTrophies?.bronze || 0,
          silver: title.earnedTrophies?.silver || 0,
          gold: title.earnedTrophies?.gold || 0,
          platinum: title.earnedTrophies?.platinum || 0
        },
        progress: title.progress || 0,
        lastUpdatedDate: title.lastUpdatedDateTime || new Date().toISOString()
      }));
      
      console.log(`✅ ${trophyTitles.length} jogos encontrados no PSN`);
      return trophyTitles;
      
    } catch (error) {
      console.error('❌ Erro ao buscar jogos do PSN:', error);
      throw error;
    }
  }
  
  /**
   * Obter lista de jogos via proxy local
   */
  private static async getTrophyTitlesViaProxy(): Promise<TrophyTitle[]> {
    try {
      console.log('🔄 Buscando jogos via proxy local...');
      
      const response = await fetch(`${this.PROXY_URL}/trophy-titles`);
      
      if (!response.ok) {
        throw new Error(`Proxy request failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Converter para o formato que esperamos
      const trophyTitles: TrophyTitle[] = data.trophyTitles
        .filter((title: any) => title && title.npCommunicationId) // Filtrar apenas títulos válidos
        .map((title: any) => ({
          npTitleId: title.npCommunicationId || `game_${Date.now()}_${Math.random()}`,
          trophyTitleName: title.trophyTitleName || 'Jogo sem nome',
          trophyTitleDetail: title.trophyTitleDetail || '',
          trophyTitleIconUrl: title.trophyTitleIconUrl || 'https://via.placeholder.com/100x100?text=🎮',
          trophyTitlePlatform: title.trophyTitlePlatform || 'PS5',
          hasTrophyGroups: title.hasTrophyGroups || false,
          definedTrophies: {
            bronze: title.definedTrophies?.bronze || 0,
            silver: title.definedTrophies?.silver || 0,
            gold: title.definedTrophies?.gold || 0,
            platinum: title.definedTrophies?.platinum || 0
          },
          earnedTrophies: {
            bronze: title.earnedTrophies?.bronze || 0,
            silver: title.earnedTrophies?.silver || 0,
            gold: title.earnedTrophies?.gold || 0,
            platinum: title.earnedTrophies?.platinum || 0
          },
          progress: title.progress || 0,
          lastUpdatedDate: title.lastUpdatedDateTime || new Date().toISOString()
        }));
      
      // DEBUG: Log dos dados convertidos
      console.log('🔍 Dados convertidos:', trophyTitles.slice(0, 3).map(t => ({
        npTitleId: t.npTitleId,
        trophyTitleName: t.trophyTitleName,
        trophyTitlePlatform: t.trophyTitlePlatform
      })));
      
      console.log(`✅ ${trophyTitles.length} jogos encontrados via proxy`);
      return trophyTitles;
      
    } catch (error) {
      console.error('❌ Erro ao buscar jogos via proxy:', error);
      throw error;
    }
  }

  /**
   * Obter troféus de um jogo específico
   */
  static async getTrophiesForTitle(npTitleId: string): Promise<Trophy[]> {
    try {
      // Se estamos usando proxy, fazer via proxy
      if (this.useProxy) {
        return await this.getTrophiesViaProxy(npTitleId);
      }
      
      // Verificar tokens válidos
      const isValid = await this.ensureValidTokens();
      if (!isValid) {
        throw new Error('Falha na autenticação PSN');
      }
      
      console.log(`🏆 Buscando troféus para jogo ${npTitleId}...`);
      
      // Determinar se é PS4/PS3/PSVita (precisa de npServiceName: "trophy")
      const isLegacyPlatform = npTitleId.includes('NPWR') || npTitleId.includes('NPXX');
      
      const response = await getTitleTrophies(
        this.getAuthorizationPayload(),
        npTitleId,
        'all',
        isLegacyPlatform ? { npServiceName: 'trophy' } : undefined
      );
      
      // Converter para o formato que esperamos
      const trophies: Trophy[] = response.trophies.map(trophy => ({
        trophyId: trophy.trophyId,
        trophyHidden: trophy.trophyHidden || false,
        trophyType: trophy.trophyType,
        trophyName: trophy.trophyName || 'Troféu sem nome',
        trophyDetail: trophy.trophyDetail || '',
        trophyIconUrl: trophy.trophyIconUrl || '',
        trophyRare: 0, // Valor padrão, será atualizado se disponível
        trophyEarnedRate: '0.0', // Valor padrão, será atualizado se disponível
        earned: false, // Será preenchido pelo getUserTrophiesEarnedForTitle
        earnedDate: undefined,
        trophyGroupId: trophy.trophyGroupId || 'default'
      }));
      
      // Buscar troféus conquistados para este jogo
      const earnedResponse = await getUserTrophiesEarnedForTitle(
        this.getAuthorizationPayload(),
        'me',
        npTitleId,
        'all',
        isLegacyPlatform ? { npServiceName: 'trophy' } : undefined
      );
      
      // Mesclar informações dos troféus conquistados
      earnedResponse.trophies.forEach(earnedTrophy => {
        const trophy = trophies.find(t => t.trophyId === earnedTrophy.trophyId);
        if (trophy) {
          trophy.earned = earnedTrophy.earned || false;
          trophy.earnedDate = earnedTrophy.earnedDateTime || undefined;
        }
      });
      
      console.log(`✅ ${trophies.length} troféus encontrados para o jogo`);
      return trophies;
      
    } catch (error) {
      console.error(`❌ Erro ao buscar troféus para jogo ${npTitleId}:`, error);
      throw error;
    }
  }
  
  /**
   * Obter troféus via proxy local
   */
  private static async getTrophiesViaProxy(npTitleId: string): Promise<Trophy[]> {
    try {
      console.log(`🔄 Buscando troféus via proxy para ${npTitleId}...`);
      
      const response = await fetch(`${this.PROXY_URL}/trophies/${npTitleId}`);
      
      if (!response.ok) {
        throw new Error(`Proxy request failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      // DEBUG: Log da estrutura dos dados retornados
      console.log('🔍 Dados retornados pelo proxy:', data);
      console.log('🔍 Estrutura dos títulos:', data.trophyTitles?.map((t: any) => ({
        npCommunicationId: t.npCommunicationId,
        trophyTitleName: t.trophyTitleName,
        trophyTitlePlatform: t.trophyTitlePlatform
      })));
      console.log('🔍 Tipo de data:', typeof data);
      console.log('🔍 Chaves de data:', Object.keys(data));
      console.log('🔍 data.trophies existe?', !!data.trophies);
      console.log('🔍 Tipo de data.trophies:', typeof data.trophies);
      console.log('🔍 É array?', Array.isArray(data.trophies));
      
      // Validação robusta da estrutura dos dados
      if (!data || typeof data !== 'object') {
        throw new Error('Dados inválidos retornados pelo proxy');
      }
      
      // Verificar se temos a estrutura esperada
      if (!data.trophies || !Array.isArray(data.trophies)) {
        console.error('❌ Estrutura inesperada dos dados:', data);
        
        // Tentar encontrar troféus em outras estruturas possíveis
        if (Array.isArray(data)) {
          console.log('🔄 Dados são um array direto, tratando como lista de troféus');
          return this.convertTrophyData(data);
        }
        
        // Se não conseguirmos encontrar troféus, retornar array vazio
        console.warn('⚠️ Nenhuma estrutura de troféus encontrada, retornando array vazio');
        return [];
      }
      
      console.log(`✅ ${data.trophies.length} troféus encontrados via proxy`);
      return this.convertTrophyData(data.trophies);
      
    } catch (error) {
      console.error(`❌ Erro ao buscar troféus via proxy para ${npTitleId}:`, error);
      throw error;
    }
  }

  /**
   * Converter dados de troféus para o formato esperado
   */
  private static convertTrophyData(trophyData: any[]): Trophy[] {
    return trophyData.map((trophy: any) => ({
      trophyId: trophy.trophyId || trophy.id || 'unknown',
      trophyHidden: trophy.trophyHidden || trophy.hidden || false,
      trophyType: trophy.trophyType || trophy.type || 'bronze',
      trophyName: trophy.trophyName || trophy.name || 'Troféu sem nome',
      trophyDetail: trophy.trophyDetail || trophy.detail || '',
      trophyIconUrl: trophy.trophyIconUrl || trophy.iconUrl || '',
      trophyRare: trophy.trophyRare || trophy.rare || 0,
      trophyEarnedRate: trophy.trophyEarnedRate || trophy.earnedRate || '0.0',
      earned: trophy.earned || false,
      earnedDate: trophy.earnedDate || trophy.earnedDateTime || undefined,
      trophyGroupId: trophy.trophyGroupId || trophy.groupId || 'default'
    }));
  }
  
  /**
   * Obter resumo do perfil do usuário
   */
  static async getProfileSummary(): Promise<ProfileSummary | null> {
    try {
      // Se estamos usando proxy, fazer via proxy
      if (this.useProxy) {
        return await this.getProfileSummaryViaProxy();
      }
      
      // Verificar tokens válidos
      const isValid = await this.ensureValidTokens();
      if (!isValid) {
        throw new Error('Falha na autenticação PSN');
      }
      
      console.log('👤 Buscando resumo do perfil PSN...');
      
      const response = await getUserTrophyProfileSummary(this.getAuthorizationPayload(), 'me');
      
      const profileSummary: ProfileSummary = {
        accountId: response.accountId,
        trophyLevel: response.trophyLevel.toString(), // Converter para string
        progress: response.progress,
        tier: response.tier,
        earnedTrophies: {
          bronze: response.earnedTrophies.bronze,
          silver: response.earnedTrophies.silver,
          gold: response.earnedTrophies.gold,
          platinum: response.earnedTrophies.platinum
        }
      };
      
      console.log('✅ Resumo do perfil PSN obtido com sucesso!');
      return profileSummary;
      
    } catch (error) {
      console.error('❌ Erro ao buscar resumo do perfil PSN:', error);
      return null;
    }
    }

  /**
   * Obter resumo do perfil via proxy local
   */
  private static async getProfileSummaryViaProxy(): Promise<ProfileSummary | null> {
    try {
      console.log('🔄 Buscando perfil via proxy local...');
        
      const response = await fetch(`${this.PROXY_URL}/profile-summary`);
      
      if (!response.ok) {
        throw new Error(`Proxy request failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      const profileSummary: ProfileSummary = {
        accountId: data.accountId,
        trophyLevel: data.trophyLevel.toString(),
        progress: data.progress,
        tier: data.tier,
        earnedTrophies: {
          bronze: data.earnedTrophies.bronze,
          silver: data.earnedTrophies.silver,
          gold: data.earnedTrophies.gold,
          platinum: data.earnedTrophies.platinum
        }
      };
      
      console.log('✅ Resumo do perfil obtido via proxy!');
      return profileSummary;
      
    } catch (error) {
      console.error('❌ Erro ao buscar perfil via proxy:', error);
      return null;
    }
  }

  /**
   * Buscar usuário por username
   */
  static async searchUser(username: string): Promise<string | null> {
    try {
      // Se estamos usando proxy, fazer via proxy
      if (this.useProxy) {
        return await this.searchUserViaProxy(username);
      }
      
      // Verificar tokens válidos
      const isValid = await this.ensureValidTokens();
      if (!isValid) {
        throw new Error('Falha na autenticação PSN');
      }
      
      console.log(`🔍 Buscando usuário: ${username}...`);
      
      const response = await makeUniversalSearch(
        this.getAuthorizationPayload(),
        username,
        'SocialAllAccounts'
      );
      
      if (response.domainResponses[0]?.results?.[0]?.socialMetadata?.accountId) {
        const accountId = response.domainResponses[0].results[0].socialMetadata.accountId;
        console.log(`✅ Usuário encontrado: ${accountId}`);
        return accountId;
      }
      
      console.log('❌ Usuário não encontrado');
      return null;
      
    } catch (error) {
      console.error(`❌ Erro ao buscar usuário ${username}:`, error);
      return null;
    }
  }
  
  /**
   * Buscar usuário via proxy local
   */
  private static async searchUserViaProxy(username: string): Promise<string | null> {
    try {
      console.log(`🔄 Buscando usuário via proxy: ${username}...`);
      
      const response = await fetch(`${this.PROXY_URL}/search-user?username=${encodeURIComponent(username)}`);
      
      if (!response.ok) {
        throw new Error(`Proxy request failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.accountId) {
        console.log(`✅ Usuário encontrado via proxy: ${data.accountId}`);
        return data.accountId;
      }
      
      console.log('❌ Usuário não encontrado via proxy');
      return null;
      
    } catch (error) {
      console.error(`❌ Erro ao buscar usuário via proxy: ${username}`, error);
      return null;
    }
  }
  
  /**
   * Limpar tokens (para logout)
   */
  static clearTokens(): void {
    this.authTokens = null;
    this.tokenExpiry = null;
    this.refreshTokenExpiry = null;
    console.log('🗑️ Tokens PSN limpos');
  }
  
  /**
   * Verificar status dos tokens
   */
  static getTokenStatus(): {
    hasTokens: boolean;
    accessTokenExpired: boolean;
    refreshTokenExpired: boolean;
    expiresIn: number | null;
  } {
    const now = new Date();
    
    return {
      hasTokens: !!this.authTokens,
      accessTokenExpired: this.tokenExpiry ? now >= this.tokenExpiry : true,
      refreshTokenExpired: this.refreshTokenExpiry ? now >= this.refreshTokenExpiry : true,
      expiresIn: this.tokenExpiry ? Math.max(0, this.tokenExpiry.getTime() - now.getTime()) / 1000 : null
    };
  }
  
  /**
   * Obter informações do ambiente atual
   */
  static getEnvironmentInfo(): {
    isDevelopment: boolean;
    isLocalhost: boolean;
    isVercel: boolean;
    useProxy: boolean;
    proxyUrl: string;
    productionUrl: string;
  } {
    return {
      isDevelopment: this.isDevelopment,
      isLocalhost: this.isLocalhost,
      isVercel: this.isVercel,
      useProxy: this.useProxy,
      proxyUrl: this.PROXY_URL,
      productionUrl: this.PRODUCTION_URL
    };
  }
}
