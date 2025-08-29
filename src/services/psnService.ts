import { 
  exchangeNpssoForAccessCode, 
  exchangeAccessCodeForAuthTokens, 
  getUserTitles,
  getUserTrophiesEarnedForTitle,
  getTitleTrophies
} from 'psn-api';
import { mockTrophyTitles, mockTrophies, simulateApiDelay } from './mockData';

// NPSSO token do Front
const NPSSO_TOKEN = 'C7EGmpvBTjuxGT5fOpGFXKBeNAWTl8Lo5fOWCYC4CMtu1elBaVHlkYLP9uz3cRE7';

// Flag para usar dados mockados (true para desenvolvimento)
const USE_MOCK_DATA = false;

// URL base - detecta se está em produção ou desenvolvimento
const isProduction = process.env.NODE_ENV === 'production';
const BASE_URL = isProduction 
  ? 'https://your-vercel-domain.vercel.app/api/psn-proxy' 
  : 'http://localhost:3001/api';

export interface TrophyTitle {
  npTitleId: string;
  trophyTitleName: string;
  trophyTitleIconUrl: string;
  trophyTitlePlatform: string;
  hasTrophyGroups: boolean;
  progress: number;
  lastUpdatedDate: string;
  earnedTrophies?: {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
  };
}

export interface Trophy {
  trophyId: number;
  trophyHidden: boolean;
  trophyType: 'bronze' | 'silver' | 'gold' | 'platinum';
  trophyName: string;
  trophyDetail: string;
  trophyIconUrl: string;
  trophyRare: number;
  trophyEarnedRate: string;
  earned: boolean;
  earnedDate?: string;
}

export interface ProfileSummary {
  accountId: string;
  trophyLevel: string;
  progress: number;
  tier: number;
  earnedTrophies: {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
  };
}

export class PSNService {
  private static authorization: any = null;

  static async authenticate(): Promise<void> {
    if (USE_MOCK_DATA) {
      console.log('Using mock data for development');
      return;
    }

    try {
      // Exchange NPSSO for access code
      const accessCode = await exchangeNpssoForAccessCode(NPSSO_TOKEN);
      
      // Exchange access code for auth tokens
      this.authorization = await exchangeAccessCodeForAuthTokens(accessCode);
      
      console.log('PSN Authentication successful!');
    } catch (error) {
      console.error('PSN Authentication failed:', error);
      throw error;
    }
  }

  static async getTrophyTitles(): Promise<TrophyTitle[]> {
    if (USE_MOCK_DATA) {
      // Simular delay da API
      await simulateApiDelay(800);
      return mockTrophyTitles;
    }

    try {
      const url = isProduction 
        ? `${BASE_URL}?path=trophy-titles`
        : `${BASE_URL}/trophy-titles`;
        
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return data.trophyTitles.map((title: any) => ({
        npTitleId: title.npCommunicationId,
        trophyTitleName: title.trophyTitleName,
        trophyTitleIconUrl: title.trophyTitleIconUrl,
        trophyTitlePlatform: title.trophyTitlePlatform,
        hasTrophyGroups: title.hasTrophyGroups,
        progress: title.progress,
        lastUpdatedDate: title.lastUpdatedDateTime,
        earnedTrophies: title.earnedTrophies
      }));
    } catch (error) {
      console.error('Error fetching trophy titles:', error);
      throw error;
    }
  }

  static async getTrophiesForTitle(npTitleId: string): Promise<Trophy[]> {
    if (USE_MOCK_DATA) {
      // Simular delay da API
      await simulateApiDelay(600);
      
      // Retornar troféus mockados ou array vazio se não existir
      return mockTrophies[npTitleId] || [];
    }

    try {
      const url = isProduction 
        ? `${BASE_URL}?path=trophies&npCommunicationId=${npTitleId}`
        : `${BASE_URL}/trophies/${npTitleId}`;
        
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      const earnedTrophyIds = new Set(
        data.earned.trophies.map((trophy: any) => trophy.trophyId)
      );

      return data.trophies.trophies.map((trophy: any) => {
        const earnedTrophy = data.earned.trophies.find(
          (et: any) => et.trophyId === trophy.trophyId
        );

        return {
          trophyId: trophy.trophyId,
          trophyHidden: trophy.trophyHidden,
          trophyType: trophy.trophyType,
          trophyName: trophy.trophyName,
          trophyDetail: trophy.trophyDetail,
          trophyIconUrl: trophy.trophyIconUrl,
          trophyRare: earnedTrophy?.trophyRare || 0,
          trophyEarnedRate: earnedTrophy?.trophyEarnedRate || '0.0',
          earned: earnedTrophyIds.has(trophy.trophyId),
          earnedDate: earnedTrophy?.earnedDateTime
        };
      });
    } catch (error) {
      console.error('Error fetching trophies for title:', error);
      throw error;
    }
  }

  static async getProfileSummary(): Promise<ProfileSummary | null> {
    if (USE_MOCK_DATA) {
      return null;
    }

    try {
      const url = isProduction 
        ? `${BASE_URL}?path=profile-summary`
        : `${BASE_URL}/profile-summary`;
        
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        accountId: data.accountId,
        trophyLevel: data.trophyLevel,
        progress: data.progress,
        tier: data.tier,
        earnedTrophies: data.earnedTrophies
      };
    } catch (error) {
      console.error('Error fetching profile summary:', error);
      return null;
    }
  }

  static async checkServerStatus(): Promise<boolean> {
    try {
      const url = isProduction 
        ? `${BASE_URL}?path=status`
        : `${BASE_URL}/status`;
        
      const response = await fetch(url);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}
