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
      console.log(`✅ Sincronizados ${trophyTitles.length} jogos com Firebase`);
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
      console.log(`✅ Sincronizados ${trophies.length} troféus para ${gameId}`);
    } catch (error) {
      console.error('❌ Erro ao sincronizar troféus:', error);
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
      const docRef = await addDoc(collection(db, 'gameSuggestions'), {
        ...suggestion,
        suggestedAt: serverTimestamp(),
        status: 'pending'
      });
      return docRef.id;
    } catch (error) {
      console.error('❌ Erro ao adicionar sugestão:', error);
      throw error;
    }
  }

  static async getGameSuggestions(status?: GameSuggestion['status']): Promise<GameSuggestion[]> {
    try {
      // Query simplificada - apenas filtrar por status, sem ordenação
      let q = query(collection(db, 'gameSuggestions'));
      
      if (status) {
        q = query(q, where('status', '==', status));
      }
      
      const querySnapshot = await getDocs(q);
      
      const suggestions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        suggestedAt: doc.data().suggestedAt?.toDate() || new Date(),
        completedAt: doc.data().completedAt?.toDate()
      })) as GameSuggestion[];
      
      // Ordenar localmente por data de sugestão (mais recente primeiro)
      return suggestions.sort((a, b) => {
        const dateA = a.suggestedAt instanceof Date ? a.suggestedAt : new Date(a.suggestedAt);
        const dateB = b.suggestedAt instanceof Date ? b.suggestedAt : new Date(b.suggestedAt);
        return dateB.getTime() - dateA.getTime();
      });
      
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
      console.log('🎮 Buscando jogo atual...');
      console.log('🔍 Firebase: Configuração para currentGames:', {
        projectId: db.app.options.projectId,
        collection: 'currentGames'
      });
      
      // Query simplificada - apenas filtrar por status, sem ordenação complexa
      const q = query(
        collection(db, 'currentGames'),
        where('status', '==', 'active'),
        limit(1) // Pegar apenas o primeiro jogo ativo
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log('ℹ️ Nenhum jogo ativo encontrado');
        return null;
      }
      
      // Pegar o primeiro documento (mais recente será o primeiro se houver apenas um ativo)
      const doc = querySnapshot.docs[0];
      const currentGame: CurrentGame = {
        id: doc.id,
        ...doc.data()
      } as CurrentGame;
      
      console.log('✅ Jogo atual encontrado:', currentGame.gameId);
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
      console.log(`✅ Sincronizada biblioteca com ${games.length} jogos`);
    } catch (error) {
      console.error('❌ Erro ao sincronizar biblioteca:', error);
      throw error;
    }
  }

  static async getGameLibrary(): Promise<GameLibrary[]> {
    try {
      console.log('🔍 Firebase: Buscando coleção trophyTitles...');
      console.log('🔍 Firebase: Configuração:', {
        projectId: db.app.options.projectId,
        apiKey: db.app.options.apiKey ? '***' : 'undefined'
      });
      
      // Query simplificada - sem ordenação para evitar necessidade de índice
      const querySnapshot = await getDocs(collection(db, 'trophyTitles'));
      
      console.log(`📊 Firebase: Encontrados ${querySnapshot.docs.length} documentos na coleção trophyTitles`);
      
      if (querySnapshot.docs.length === 0) {
        console.log('⚠️ Firebase: Coleção trophyTitles está vazia');
        return [];
      }
      
      const games = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log(`📄 Firebase: Documento ${doc.id}:`, data);
        
        return {
          id: doc.id,
          ...data,
          lastUpdated: data.lastUpdated?.toDate() || new Date()
        };
      }) as GameLibrary[];
      
      console.log(`✅ Firebase: ${games.length} jogos processados da biblioteca`);
      
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
  
  static async checkIfGameExists(gameTitle: string): Promise<boolean> {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, 'gameLibrary'),
          where('title', '==', gameTitle)
        )
      );
      return !querySnapshot.empty;
    } catch (error) {
      console.error('❌ Erro ao verificar jogo:', error);
      return false;
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
