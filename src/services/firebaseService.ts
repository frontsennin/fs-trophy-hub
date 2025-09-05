import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  TrophyTitle, 
  Trophy, 
  Follower, 
  GameSuggestion, 
  CurrentGame, 
  YouTubeVideo,
  GameLibrary,
  Notification,
  AppSettings
} from '../types';

export class FirebaseService {
  
  // ===== SINCRONIZAÇÃO PSN → FIREBASE =====
  
  static async syncTrophyTitles(trophyTitles: TrophyTitle[]): Promise<void> {
    try {
      const batch = [];
      
      for (const title of trophyTitles) {
        const docRef = doc(db, 'trophyTitles', title.npTitleId);
        const data = {
          ...title,
          lastUpdatedDate: new Date(title.lastUpdatedDate),
          syncedAt: serverTimestamp()
        };
        batch.push(setDoc(docRef, data, { merge: true }));
      }
      
      await Promise.all(batch);
    } catch (error) {
      console.error('❌ Erro ao sincronizar trophy titles:', error);
      throw error;
    }
  }

  static async syncTrophiesForGame(gameId: string, trophies: Trophy[]): Promise<void> {
    try {
      const batch = [];
      
      for (const trophy of trophies) {
        const docRef = doc(db, 'trophies', `${gameId}_${trophy.trophyId}`);
        const data = {
          ...trophy,
          gameId,
          earnedDate: trophy.earnedDate ? new Date(trophy.earnedDate) : null,
          syncedAt: serverTimestamp()
        };
        batch.push(setDoc(docRef, data, { merge: true }));
      }
      
      await Promise.all(batch);
    } catch (error) {
      console.error('❌ Erro ao sincronizar troféus:', error);
      throw error;
    }
  }

  /**
   * Buscar troféus de um jogo específico do Firebase
   */
  static async getTrophiesForGame(gameId: string): Promise<Trophy[]> {
    try {
      console.log(`🔍 Buscando troféus do jogo ${gameId} no Firebase...`);
      
      const trophiesRef = collection(db, 'trophies');
      const q = query(trophiesRef, where('gameId', '==', gameId));
      const querySnapshot = await getDocs(q);
      
      const trophies: Trophy[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        trophies.push({
          trophyId: data.trophyId,
          trophyHidden: data.trophyHidden || false,
          trophyType: data.trophyType,
          trophyName: data.trophyName || 'Troféu sem nome',
          trophyDetail: data.trophyDetail || '',
          trophyIconUrl: data.trophyIconUrl || '',
          trophyRare: data.trophyRare || 0,
          trophyEarnedRate: data.trophyEarnedRate || '0.0',
          earned: data.earned || false,
          earnedDate: data.earnedDate ? data.earnedDate.toDate().toISOString() : undefined
        });
      });
      
      console.log(`✅ Encontrados ${trophies.length} troféus para o jogo ${gameId}`);
      return trophies;
      
    } catch (error) {
      console.error(`❌ Erro ao buscar troféus do jogo ${gameId}:`, error);
      throw error;
    }
  }

  // ===== SEGUIDORES =====
  
  static async addFollower(follower: Omit<Follower, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'followers'), {
        ...follower,
        followedAt: serverTimestamp(),
        lastSeen: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('❌ Erro ao adicionar seguidor:', error);
      throw error;
    }
  }

  static async getFollowers(): Promise<Follower[]> {
    try {
      // Query simplificada - sem ordenação para evitar necessidade de índice
      const querySnapshot = await getDocs(collection(db, 'followers'));
      
      const followers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        followedAt: doc.data().followedAt?.toDate() || new Date(),
        lastSeen: doc.data().lastSeen?.toDate() || new Date()
      })) as Follower[];
      
      // Ordenar localmente por data de seguimento (mais recente primeiro)
      return followers.sort((a, b) => {
        const dateA = a.followedAt instanceof Date ? a.followedAt : new Date(a.followedAt);
        const dateB = b.followedAt instanceof Date ? b.followedAt : new Date(b.followedAt);
        return dateB.getTime() - dateA.getTime();
      });
      
    } catch (error) {
      console.error('❌ Erro ao buscar seguidores:', error);
      return [];
    }
  }

  static async updateFollowerLastSeen(followerId: string): Promise<void> {
    try {
      const docRef = doc(db, 'followers', followerId);
      await updateDoc(docRef, { lastSeen: serverTimestamp() });
    } catch (error) {
      console.error('❌ Erro ao atualizar último acesso:', error);
      throw error;
    }
  }

  // ===== SUGESTÕES DE JOGOS =====
  
  static async addGameSuggestion(suggestion: Omit<GameSuggestion, 'id'>): Promise<string> {
    try {
      // Filtrar campos undefined antes de enviar para o Firebase
      const cleanSuggestion = Object.fromEntries(
        Object.entries(suggestion).filter(([_, value]) => value !== undefined)
      );
      
      // Limpar campos undefined aninhados
      if (cleanSuggestion.userInfo) {
        cleanSuggestion.userInfo = Object.fromEntries(
          Object.entries(cleanSuggestion.userInfo).filter(([_, value]) => value !== undefined)
        );
      }
      
      const docRef = await addDoc(collection(db, 'gameSuggestions'), {
        ...cleanSuggestion,
        points: 0, // Inicializar com 0 pontos
        votedBy: [], // Array vazio de votos
        suggestedAt: serverTimestamp(),
        status: 'pending'
      });
      return docRef.id;
    } catch (error) {
      console.error('❌ Erro ao adicionar sugestão:', error);
      throw error;
    }
  }

  static async updateSuggestionPoints(suggestionId: string, userIP: string): Promise<void> {
    try {
      const docRef = doc(db, 'gameSuggestions', suggestionId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Sugestão não encontrada');
      }
      
      const currentData = docSnap.data();
      const currentPoints = currentData.points || 0;
      const votedBy = currentData.votedBy || [];
      
      // Verificar se já votou
      if (votedBy.includes(userIP)) {
        throw new Error('Usuário já votou nesta sugestão');
      }
      
      // Adicionar voto e incrementar pontos
      await updateDoc(docRef, {
        points: currentPoints + 1,
        votedBy: [...votedBy, userIP]
      });
      
      console.log('✅ Voto adicionado com sucesso para sugestão:', suggestionId);
    } catch (error) {
      console.error('❌ Erro ao atualizar pontos da sugestão:', error);
      throw error;
    }
  }

  static async getGameSuggestions(status?: GameSuggestion['status']): Promise<GameSuggestion[]> {
    try {
      console.log('🔍 FirebaseService.getGameSuggestions - Iniciando busca...');
      
      // Query simplificada - apenas filtrar por status, sem ordenação
      let q = query(collection(db, 'gameSuggestions'));
      
      if (status) {
        q = query(q, where('status', '==', status));
        console.log('🔍 Filtro por status aplicado:', status);
      }
      
      console.log('🔍 Executando query no Firestore...');
      const querySnapshot = await getDocs(q);
      
      console.log('🔍 Query executada:', {
        empty: querySnapshot.empty,
        size: querySnapshot.size,
        docs: querySnapshot.docs.length
      });
      
      if (querySnapshot.empty) {
        console.log('🔍 Nenhuma sugestão encontrada no Firestore');
        return [];
      }
      
      const suggestions = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('🔍 Processando documento:', {
          id: doc.id,
          data: data
        });
        
        return {
          id: doc.id,
          ...data,
          suggestedAt: data.suggestedAt?.toDate() || new Date(),
          completedAt: data.completedAt?.toDate()
        };
      }) as GameSuggestion[];
      
      console.log('🔍 Sugestões processadas:', suggestions);
      
      // Ordenar localmente por data de sugestão (mais recente primeiro)
      const sortedSuggestions = suggestions.sort((a, b) => {
        const dateA = a.suggestedAt instanceof Date ? a.suggestedAt : new Date(a.suggestedAt);
        const dateB = b.suggestedAt instanceof Date ? b.suggestedAt : new Date(b.suggestedAt);
        return dateB.getTime() - dateA.getTime();
      });
      
      console.log('🔍 Sugestões ordenadas retornadas:', sortedSuggestions);
      return sortedSuggestions;
      
    } catch (error) {
      console.error('❌ Erro ao buscar sugestões:', error);
      return [];
    }
  }

  static async updateSuggestionStatus(suggestionId: string, status: GameSuggestion['status'], reason?: string): Promise<void> {
    try {
      const docRef = doc(db, 'gameSuggestions', suggestionId);
      const updateData: any = { status };
      
      if (status === 'completed') {
        updateData.completedAt = serverTimestamp();
      }
      
      if (reason) {
        updateData.reason = reason;
      }
      
      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('❌ Erro ao atualizar status da sugestão:', error);
      throw error;
    }
  }

  // ===== JOGO ATUAL =====
  
  static async setCurrentGame(game: Omit<CurrentGame, 'id' | 'lastUpdated'>): Promise<string> {
    try {
      // Remove jogo atual anterior se existir
      const currentGames = await getDocs(
        query(collection(db, 'currentGames'), where('status', 'in', ['playing', 'platinating']))
      );
      
      const batch: Promise<void>[] = [];
      currentGames.docs.forEach(doc => {
        batch.push(updateDoc(doc.ref, { status: 'completed' }));
      });
      
      // Adiciona novo jogo atual
      const docRef = await addDoc(collection(db, 'currentGames'), {
        ...game,
        startedAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });
      
      if (batch.length > 0) {
        await Promise.all(batch);
      }
      
      return docRef.id;
    } catch (error) {
      console.error('❌ Erro ao definir jogo atual:', error);
      throw error;
    }
  }

  static async getCurrentGame(): Promise<CurrentGame | null> {
    try {
      // Query simplificada - apenas filtrar por status, sem ordenação complexa
      const q = query(
        collection(db, 'currentGames'),
        where('status', '==', 'active'),
        limit(1) // Pegar apenas o primeiro jogo ativo
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      // Pegar o primeiro documento (mais recente será o primeiro se houver apenas um ativo)
      const doc = querySnapshot.docs[0];
      const currentGame: CurrentGame = {
        id: doc.id,
        ...doc.data()
      } as CurrentGame;
      
      return currentGame;
      
    } catch (error) {
      console.error('❌ Erro ao buscar jogo atual:', error);
      
      // Tratamento específico de erros do Firebase
      if (error instanceof Error) {
        console.error('❌ Detalhes do erro getCurrentGame:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        
        // Verificar se é erro de permissão
        if (error.message.includes('permission') || error.message.includes('Permission denied')) {
          console.error('🚫 Erro de permissão do Firestore - verificar regras de segurança');
        }
        
        // Verificar se é erro de rede
        if (error.message.includes('network') || error.message.includes('timeout')) {
          console.error('🌐 Erro de rede - verificar conectividade');
        }
      }
      
      return null;
    }
  }

  static async updateCurrentGameProgress(gameId: string, progress: number, status?: CurrentGame['status']): Promise<void> {
    try {
      const docRef = doc(db, 'currentGames', gameId);
      const updateData: any = { 
        progress, 
        lastUpdated: serverTimestamp() 
      };
      
      if (status) {
        updateData.status = status;
      }
      
      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('❌ Erro ao atualizar progresso:', error);
      throw error;
    }
  }

  // ===== INTEGRAÇÃO YOUTUBE =====
  
  static async addYouTubeVideo(video: Omit<YouTubeVideo, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'youtubeVideos'), {
        ...video,
        publishedAt: serverTimestamp(),
        syncedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('❌ Erro ao adicionar vídeo:', error);
      throw error;
    }
  }

  static async getYouTubeVideosForGame(gameId: string, limitCount: number = 10): Promise<YouTubeVideo[]> {
    try {
      // Query simplificada - apenas filtrar por gameId, sem ordenação
      const querySnapshot = await getDocs(
        query(
          collection(db, 'youtubeVideos'),
          where('gameId', '==', gameId),
          limit(limitCount)
        )
      );
      
      // Ordenar localmente após buscar os dados
      const videos = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as YouTubeVideo[];
      
      // Ordenar por data de publicação (mais recente primeiro)
      return videos.sort((a, b) => {
        const dateA = a.publishedAt instanceof Date ? a.publishedAt : new Date(a.publishedAt);
        const dateB = b.publishedAt instanceof Date ? b.publishedAt : new Date(b.publishedAt);
        return dateB.getTime() - dateA.getTime();
      });
      
    } catch (error) {
      console.error('❌ Erro ao buscar vídeos do YouTube:', error);
      return [];
    }
  }

  // ===== BIBLIOTECA DE JOGOS =====
  
  static async syncGameLibrary(games: GameLibrary[]): Promise<void> {
    try {
      const batch = [];
      
      for (const game of games) {
        const docRef = doc(db, 'gameLibrary', game.id);
        const data = {
          ...game,
          lastUpdated: serverTimestamp(),
          syncedAt: serverTimestamp()
        };
        batch.push(setDoc(docRef, data, { merge: true }));
      }
      
      await Promise.all(batch);
    } catch (error) {
      console.error('❌ Erro ao sincronizar biblioteca:', error);
      throw error;
    }
  }

  static async getGameLibrary(): Promise<GameLibrary[]> {
    try {
      
      // Query simplificada - sem ordenação para evitar necessidade de índice
      const querySnapshot = await getDocs(collection(db, 'trophyTitles'));
      
      
      if (querySnapshot.docs.length === 0) {
        return [];
      }
      
      const games = querySnapshot.docs.map(doc => {
        const data = doc.data();
        
        return {
          id: doc.id,
          ...data,
          lastUpdated: data.lastUpdated?.toDate() || new Date()
        };
      }) as GameLibrary[];
      
      
      // Ordenar localmente por data de atualização (mais recente primeiro)
      return games.sort((a, b) => {
        const dateA = a.lastUpdated instanceof Date ? a.lastUpdated : new Date(a.lastUpdated);
        const dateB = b.lastUpdated instanceof Date ? b.lastUpdated : new Date(b.lastUpdated);
        return dateB.getTime() - dateA.getTime();
      });
      
    } catch (error) {
      console.error('❌ Erro ao buscar trophyTitles:', error);
      
      // Tratamento específico de erros do Firebase
      if (error instanceof Error) {
        console.error('❌ Detalhes do erro:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        
        // Verificar se é erro de permissão
        if (error.message.includes('permission') || error.message.includes('Permission denied')) {
          console.error('🚫 Erro de permissão do Firestore - verificar regras de segurança');
        }
        
        // Verificar se é erro de rede
        if (error.message.includes('network') || error.message.includes('timeout')) {
          console.error('🌐 Erro de rede - verificar conectividade');
        }
        
        // Verificar se é erro de configuração
        if (error.message.includes('config') || error.message.includes('Permission denied')) {
          console.error('⚙️ Erro de configuração do Firebase');
        }
      }
      
      // Log adicional para debugging
      console.error('🔍 Firebase Debug Info:', {
        dbExists: !!db,
        appExists: !!db?.app,
        projectId: db?.app?.options?.projectId,
        timestamp: new Date().toISOString()
      });
      
      return [];
    }
  }

  // ===== NOTIFICAÇÕES =====
  
  static async addNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'notifications'), {
        ...notification,
        createdAt: serverTimestamp(),
        read: false
      });
      return docRef.id;
    } catch (error) {
      console.error('❌ Erro ao adicionar notificação:', error);
      throw error;
    }
  }

  static async getNotifications(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    try {
      // Query simplificada - apenas filtrar por userId, sem ordenação
      let q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId)
      );
      
      if (unreadOnly) {
        q = query(
          collection(db, 'notifications'),
          where('userId', '==', userId),
          where('read', '==', false)
        );
      }
      
      const querySnapshot = await getDocs(q);
      
      const notifications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        readAt: doc.data().readAt?.toDate()
      })) as Notification[];
      
      // Ordenar localmente por data de criação (mais recente primeiro)
      return notifications.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
      
    } catch (error) {
      console.error('❌ Erro ao buscar notificações:', error);
      return [];
    }
  }

  static async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const docRef = doc(db, 'notifications', notificationId);
      await updateDoc(docRef, { 
        read: true, 
        readAt: serverTimestamp() 
      });
    } catch (error) {
      console.error('❌ Erro ao marcar notificação como lida:', error);
      throw error;
    }
  }

  // ===== CONFIGURAÇÕES =====
  
  static async getAppSettings(userId: string): Promise<AppSettings | null> {
    try {
      const docRef = doc(db, 'appSettings', userId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) return null;
      
      return {
        id: docSnap.id,
        ...docSnap.data(),
        lastUpdated: docSnap.data().lastUpdated?.toDate() || new Date()
      } as AppSettings;
    } catch (error) {
      console.error('❌ Erro ao buscar configurações:', error);
      throw error;
    }
  }

  static async updateAppSettings(userId: string, settings: Partial<AppSettings>): Promise<void> {
    try {
      const docRef = doc(db, 'appSettings', userId);
      await setDoc(docRef, {
        ...settings,
        lastUpdated: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('❌ Erro ao atualizar configurações:', error);
      throw error;
    }
  }

  // ===== UTILITÁRIOS =====
  
  static async checkGameSuggestion(gameTitle: string, platform: string): Promise<{ exists: boolean; similarSuggestions: GameSuggestion[] }> {
    try {
      const normalizedTitle = gameTitle.toLowerCase().trim();
      
      // Verificar se já existe na biblioteca
      const libraryQuery = await getDocs(
        query(
          collection(db, 'trophyTitles'),
          where('trophyTitleName', '==', gameTitle)
        )
      );
      
      if (!libraryQuery.empty) {
        return { exists: true, similarSuggestions: [] };
      }
      
      // Verificar sugestões existentes
      const suggestionsQuery = await getDocs(collection(db, 'gameSuggestions'));
      const similarSuggestions: GameSuggestion[] = [];
      
      suggestionsQuery.docs.forEach(doc => {
        const suggestion = doc.data();
        const suggestionTitle = suggestion.gameTitle.toLowerCase().trim();
        
        // Verificar similaridade (nome similar ou igual)
        if (suggestionTitle === normalizedTitle || 
            suggestionTitle.includes(normalizedTitle) || 
            normalizedTitle.includes(suggestionTitle)) {
          similarSuggestions.push({
            id: doc.id,
            ...suggestion
          } as GameSuggestion);
        }
      });
      
      return { 
        exists: false, 
        similarSuggestions: similarSuggestions.sort((a, b) => 
          new Date(b.suggestedAt).getTime() - new Date(a.suggestedAt).getTime()
        )
      };
      
    } catch (error) {
      console.error('❌ Erro ao verificar sugestão de jogo:', error);
      return { exists: false, similarSuggestions: [] };
    }
  }

  static async getGameSuggestionsCount(): Promise<number> {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, 'gameSuggestions'), where('status', '==', 'pending'))
      );
      return querySnapshot.size;
    } catch (error) {
      console.error('❌ Erro ao contar sugestões:', error);
      return 0;
    }
  }


}
