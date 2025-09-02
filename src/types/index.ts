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

// ===== NOVOS TIPOS PARA O SISTEMA =====

export interface Follower {
  id: string;
  userId: string;
  name: string;
  email?: string;
  avatar?: string;
  isAnonymous: boolean;
  followedAt: Date;
  lastSeen: Date;
  preferences: {
    notifications: boolean;
    gameUpdates: boolean;
    trophyAlerts: boolean;
  };
}

export interface GameSuggestion {
  id: string;
  gameTitle: string;
  gameId?: string; // PSN ID se existir
  platform: 'PS5' | 'PS4' | 'PS3' | 'PS Vita';
  suggestedBy: string;
  suggestedAt: Date;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  reason?: string;
  completedAt?: Date;
  gameData?: {
    iconUrl?: string;
    description?: string;
    genre?: string;
    releaseDate?: string;
  };
  userInfo: {
    name: string;
    isAnonymous: boolean;
    contact?: string;
  };
}

export interface CurrentGame {
  id: string;
  gameTitle: string;
  gameId: string;
  platform: string;
  startedAt: Date;
  targetCompletion?: Date;
  progress: number;
  status: 'playing' | 'platinating' | 'completed';
  priority: 'high' | 'medium' | 'low';
  notes?: string;
  youtubePlaylist?: string;
  lastUpdated: Date;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: Date;
  videoId: string;
  duration: string;
  viewCount: number;
  gameId?: string; // Relacionado ao jogo atual
}

export interface GameLibrary {
  id: string;
  title: string;
  platform: string;
  iconUrl?: string;
  genre?: string;
  releaseDate?: string;
  lastUpdated: Date;
  isOwned: boolean;
  isCompleted: boolean;
  completionDate?: Date;
}

export interface TrophyProgress {
  gameId: string;
  totalTrophies: number;
  earnedTrophies: number;
  platinum: boolean;
  lastUpdated: Date;
  trophies: Trophy[];
}

export interface Notification {
  id: string;
  userId: string;
  type: 'trophy_earned' | 'game_completed' | 'suggestion_approved' | 'follower_update';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: Date;
  readAt?: Date;
}

export interface AppSettings {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'cyberpunk';
  language: 'pt-BR' | 'en-US';
  notifications: {
    email: boolean;
    push: boolean;
    browser: boolean;
  };
  privacy: {
    showProgress: boolean;
    showTrophies: boolean;
    allowSuggestions: boolean;
    showFollowers: boolean;
  };
  lastUpdated: Date;
}
