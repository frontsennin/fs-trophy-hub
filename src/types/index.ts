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

export interface TrophySuggestion {
  id: string;
  gameTitle: string;
  trophyName: string;
  suggestedBy: string;
  suggestedAt: Date;
  status: 'pending' | 'completed' | 'rejected';
  completedAt?: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface GameStats {
  totalGames: number;
  completedGames: number;
  totalTrophies: number;
  earnedTrophies: number;
  platinumTrophies: number;
  goldTrophies: number;
  silverTrophies: number;
  bronzeTrophies: number;
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
