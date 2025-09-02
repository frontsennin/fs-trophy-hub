import { PSNService } from './psnService';
import { FirebaseService } from './firebaseService';


export class SyncService {
  private static isSyncing = false;
  private static syncInterval: NodeJS.Timeout | null = null;
  
  /**
   * Sincronizar todos os dados do PSN para Firebase
   */
  static async syncAllData(): Promise<void> {
    if (this.isSyncing) {
      return;
    }
    
    try {
      this.isSyncing = true;      
      // 1. Sincronizar perfil do usuário
      await this.syncProfileData();
      
      // 2. Sincronizar lista de jogos
      await this.syncTrophyTitles();
      
      // 3. Sincronizar troféus dos jogos (primeiros 5 para não sobrecarregar)
      await this.syncTopGamesTrophies();
            
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
    } finally {
      this.isSyncing = false;
    }
  }
  
  /**
   * Sincronizar dados do perfil
   */
  private static async syncProfileData(): Promise<void> {
    try {
      const profile = await PSNService.getProfileSummary();
      
      if (profile) {
        // Salvar perfil no Firebase (você pode criar uma coleção 'userProfiles')
      }
      
    } catch (error) {
      console.error('❌ Erro ao sincronizar perfil:', error);
    }
  }
  
  /**
   * Sincronizar lista de jogos
   */
  private static async syncTrophyTitles(): Promise<void> {
    try {
      const trophyTitles = await PSNService.getTrophyTitles();
      
      if (trophyTitles.length > 0) {
        await FirebaseService.syncTrophyTitles(trophyTitles);
      }
      
    } catch (error) {
      console.error('❌ Erro ao sincronizar jogos:', error);
    }
  }
  
  /**
   * Sincronizar troféus dos jogos mais importantes
   */
  private static async syncTopGamesTrophies(): Promise<void> {
    try {
      const trophyTitles = await PSNService.getTrophyTitles();
      
      // Pegar apenas os primeiros 5 jogos para não sobrecarregar
      const topGames = trophyTitles.slice(0, 5);
      
      for (const game of topGames) {
        try {
          const trophies = await PSNService.getTrophiesForTitle(game.npTitleId);
          
          if (trophies.length > 0) {
            await FirebaseService.syncTrophiesForGame(game.npTitleId, trophies);
          }
          
          // Pequena pausa para não sobrecarregar a API
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`❌ Erro ao sincronizar troféus de ${game.trophyTitleName}:`, error);
        }
      }
      
    } catch (error) {
      console.error('❌ Erro ao sincronizar troféus:', error);
    }
  }
  
  /**
   * Sincronizar um jogo específico
   */
  static async syncSingleGame(npTitleId: string): Promise<void> {
    try {
      
      const trophies = await PSNService.getTrophiesForTitle(npTitleId);
      
      if (trophies.length > 0) {
        await FirebaseService.syncTrophiesForGame(npTitleId, trophies);
      }
      
    } catch (error) {
      console.error('❌ Erro ao sincronizar jogo específico:', error);
    }
  }
  
  /**
   * Verificar se há atualizações disponíveis
   */
  static async checkForUpdates(): Promise<boolean> {
    try {
      // Aqui você pode implementar lógica para verificar se há novos dados
      // Por exemplo, comparar timestamps de última sincronização
      // TODO: Implementar lógica de verificação real
    } catch (error) {
      console.error('❌ Erro ao verificar atualizações:', error);
      return false;
    }
    
    // Por enquanto, sempre retorna true (sem atualizações)
    return true;
  }
  
  /**
   * Configurar sincronização automática
   */
  static setupAutoSync(intervalMinutes: number = 30): void {
    if (this.syncInterval) {
      this.stopAutoSync();
    }
    
    
    this.syncInterval = setInterval(async () => {
      await this.syncAllData();
    }, intervalMinutes * 60 * 1000);
  }
  
  /**
   * Parar sincronização automática
   */
  static stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
  
  /**
   * Obter status da sincronização
   */
  static getSyncStatus(): { isSyncing: boolean; hasAutoSync: boolean } {
    return {
      isSyncing: this.isSyncing,
      hasAutoSync: !!this.syncInterval
    };
  }
}
