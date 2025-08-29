import { TrophyTitle, Trophy } from '../types';

// Dados mockados para desenvolvimento
export const mockTrophyTitles: TrophyTitle[] = [
  {
    npTitleId: 'NPWR12345_00',
    trophyTitleName: 'God of War Ragnarök',
    trophyTitleIconUrl: 'https://image.api.playstation.com/vulcan/ap/rnd/202207/1210/4xJtXB3biDoQoGohZDcqIdmi.jpg',
    trophyTitlePlatform: 'PS5',
    hasTrophyGroups: true,
    progress: 85,
    lastUpdatedDate: '2024-01-15T10:30:00Z'
  },
  {
    npTitleId: 'NPWR67890_00',
    trophyTitleName: 'Spider-Man 2',
    trophyTitleIconUrl: 'https://image.api.playstation.com/vulcan/ap/rnd/202306/1214/2c7c3c3c3c3c3c3c3c3c3c3c3c3c3c3c.jpg',
    trophyTitlePlatform: 'PS5',
    hasTrophyGroups: true,
    progress: 100,
    lastUpdatedDate: '2024-01-10T15:45:00Z'
  },
  {
    npTitleId: 'NPWR11111_00',
    trophyTitleName: 'Final Fantasy XVI',
    trophyTitleIconUrl: 'https://image.api.playstation.com/vulcan/ap/rnd/202306/1214/4c7c3c3c3c3c3c3c3c3c3c3c3c3c3c3c.jpg',
    trophyTitlePlatform: 'PS5',
    hasTrophyGroups: true,
    progress: 60,
    lastUpdatedDate: '2024-01-05T09:20:00Z'
  },
  {
    npTitleId: 'NPWR22222_00',
    trophyTitleName: 'Baldur\'s Gate 3',
    trophyTitleIconUrl: 'https://image.api.playstation.com/vulcan/ap/rnd/202306/1214/5c7c3c3c3c3c3c3c3c3c3c3c3c3c3c3c.jpg',
    trophyTitlePlatform: 'PS5',
    hasTrophyGroups: true,
    progress: 45,
    lastUpdatedDate: '2024-01-12T14:15:00Z'
  },
  {
    npTitleId: 'NPWR33333_00',
    trophyTitleName: 'Cyberpunk 2077',
    trophyTitleIconUrl: 'https://image.api.playstation.com/vulcan/ap/rnd/202306/1214/6c7c3c3c3c3c3c3c3c3c3c3c3c3c3c3c.jpg',
    trophyTitlePlatform: 'PS5',
    hasTrophyGroups: true,
    progress: 75,
    lastUpdatedDate: '2024-01-08T11:30:00Z'
  },
  {
    npTitleId: 'NPWR44444_00',
    trophyTitleName: 'Elden Ring',
    trophyTitleIconUrl: 'https://image.api.playstation.com/vulcan/ap/rnd/202306/1214/7c7c3c3c3c3c3c3c3c3c3c3c3c3c3c3c.jpg',
    trophyTitlePlatform: 'PS5',
    hasTrophyGroups: true,
    progress: 100,
    lastUpdatedDate: '2024-01-03T16:45:00Z'
  }
];

export const mockTrophies: { [key: string]: Trophy[] } = {
  'NPWR12345_00': [
    {
      trophyId: 1,
      trophyHidden: false,
      trophyType: 'platinum',
      trophyName: 'God of War Ragnarök',
      trophyDetail: 'Collect all trophies',
      trophyIconUrl: 'https://image.api.playstation.com/trophy/np/NPWR12345_00_00_1.png',
      trophyRare: 5,
      trophyEarnedRate: '2.3%',
      earned: false
    },
    {
      trophyId: 2,
      trophyHidden: false,
      trophyType: 'gold',
      trophyName: 'The Bear and the Wolf',
      trophyDetail: 'Complete the main story',
      trophyIconUrl: 'https://image.api.playstation.com/trophy/np/NPWR12345_00_00_2.png',
      trophyRare: 15,
      trophyEarnedRate: '8.7%',
      earned: true
    },
    {
      trophyId: 3,
      trophyHidden: false,
      trophyType: 'silver',
      trophyName: 'Collector',
      trophyDetail: 'Collect all artifacts',
      trophyIconUrl: 'https://image.api.playstation.com/trophy/np/NPWR12345_00_00_3.png',
      trophyRare: 25,
      trophyEarnedRate: '12.4%',
      earned: true
    },
    {
      trophyId: 4,
      trophyHidden: true,
      trophyType: 'bronze',
      trophyName: 'Hidden Trophy',
      trophyDetail: 'Complete a secret objective',
      trophyIconUrl: 'https://image.api.playstation.com/trophy/np/NPWR12345_00_00_4.png',
      trophyRare: 35,
      trophyEarnedRate: '18.9%',
      earned: false
    }
  ],
  'NPWR67890_00': [
    {
      trophyId: 1,
      trophyHidden: false,
      trophyType: 'platinum',
      trophyName: 'Spider-Man 2',
      trophyDetail: 'Collect all trophies',
      trophyIconUrl: 'https://image.api.playstation.com/trophy/np/NPWR67890_00_00_1.png',
      trophyRare: 3,
      trophyEarnedRate: '1.8%',
      earned: true
    },
    {
      trophyId: 2,
      trophyHidden: false,
      trophyType: 'gold',
      trophyName: 'Amazing Spider-Man',
      trophyDetail: 'Complete the main story',
      trophyIconUrl: 'https://image.api.playstation.com/trophy/np/NPWR67890_00_00_2.png',
      trophyRare: 12,
      trophyEarnedRate: '7.2%',
      earned: true
    },
    {
      trophyId: 3,
      trophyHidden: false,
      trophyType: 'silver',
      trophyName: 'Web of Life',
      trophyDetail: 'Complete all side missions',
      trophyIconUrl: 'https://image.api.playstation.com/trophy/np/NPWR67890_00_00_3.png',
      trophyRare: 20,
      trophyEarnedRate: '11.5%',
      earned: true
    }
  ]
};

// Função para simular delay da API
export const simulateApiDelay = (ms: number = 1000): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
