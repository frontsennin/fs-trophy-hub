import React, { useState, useEffect } from 'react';
import './App.css';
import GameCard from './components/GameCard';
import TrophyCard from './components/TrophyCard';
import PSNStatusIndicator from './components/PSNStatusIndicator';
import CurrentGameCard from './components/CurrentGameCard';
import GameSuggestionForm from './components/GameSuggestionForm';
import { PSNService } from './services/psnService';
import { FirebaseService } from './services/firebaseService';
import { SyncService } from './services/syncService';
import { TrophyTitle, Trophy, ProfileSummary, CurrentGame, GameSuggestion } from './types';

function App() {
  const [trophyTitles, setTrophyTitles] = useState<TrophyTitle[]>([]);
  
  // Debug: Log quando trophyTitles mudar
  useEffect(() => {
    console.log('🎮 trophyTitles atualizado:', trophyTitles.length, 'jogos');
  }, [trophyTitles]);
  const [selectedGame, setSelectedGame] = useState<TrophyTitle | null>(null);
  const [trophies, setTrophies] = useState<Trophy[]>([]);
  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(null);
  const [currentGame, setCurrentGame] = useState<CurrentGame | null>(null);
  const [gameSuggestions, setGameSuggestions] = useState<GameSuggestion[]>([]);

  const [showSuggestionForm, setShowSuggestionForm] = useState(false);
  const [currentView, setCurrentView] = useState<'games' | 'currentGame' | 'suggestions' | 'sync'>('games');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [envInfo, setEnvInfo] = useState<any>(null);
  const [serverStatus, setServerStatus] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<{ isSyncing: boolean; hasAutoSync: boolean }>({ isSyncing: false, hasAutoSync: false });

          useEffect(() => {
          loadData();
          loadEnvironmentInfo();
          loadFirebaseData();

          // Configurar sincronização automática a cada 30 minutos
          SyncService.setupAutoSync(30);

          // Atualizar status da sincronização a cada 5 segundos
          const syncStatusInterval = setInterval(() => {
            setSyncStatus(SyncService.getSyncStatus());
          }, 5000);

          return () => {
            clearInterval(syncStatusInterval);
            SyncService.stopAutoSync();
          };
        }, []);

  const loadEnvironmentInfo = () => {
    const info = PSNService.getEnvironmentInfo();
    setEnvInfo(info);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Verificar status do servidor
      const isServerRunning = await PSNService.checkServerStatus();
      setServerStatus(isServerRunning);
      
      if (!isServerRunning) {
        if (envInfo?.useProxy) {
          setError('Servidor proxy não está rodando. Execute "node server.js" em outro terminal.');
        } else {
          setError('Falha na autenticação PSN. Verifique as credenciais.');
        }
        setLoading(false);
        return;
      }
      
              // Carregar dados do Firebase primeiro
      try {
        await loadFirebaseData();
        
        // Se Firebase não retornou dados, carregar do PSN
        if (!trophyTitles || trophyTitles.length === 0) {
          console.log('🔄 Firebase vazio, carregando dados do PSN...');
          await loadPSNData();
        }
      } catch (firebaseError) {
        console.warn('⚠️ Erro ao carregar dados do Firebase, tentando PSN:', firebaseError);
        // Se Firebase falhar, carregar do PSN
        await loadPSNData();
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError('Erro ao carregar dados. Verifique o console para mais detalhes.');
    } finally {
      setLoading(false);
    }
  };

          const loadFirebaseData = async () => {
          try {
            console.log('🔄 Carregando dados do Firebase...');
            
            // Carregar dados do Firebase
            const [currentGameData, suggestionsData, gameLibraryData] = await Promise.all([
              FirebaseService.getCurrentGame(),
              FirebaseService.getGameSuggestions(),
              FirebaseService.getGameLibrary()
            ]);
            
            console.log('📊 Dados recebidos do Firebase:', {
              currentGame: currentGameData,
              suggestions: suggestionsData?.length || 0,
              gameLibrary: gameLibraryData?.length || 0
            });
            
            setCurrentGame(currentGameData);
            setGameSuggestions(suggestionsData || []);
            
            // Converter GameLibrary para TrophyTitle se disponível
            if (gameLibraryData && gameLibraryData.length > 0) {
              console.log('🔄 Convertendo GameLibrary para TrophyTitle...');
              const convertedTitles = gameLibraryData.map(game => ({
                npTitleId: game.id,
                trophyTitleName: game.title,
                trophyTitleIconUrl: game.iconUrl || '',
                trophyTitlePlatform: game.platform,
                hasTrophyGroups: false,
                progress: game.isCompleted ? 100 : 0,
                lastUpdatedDate: game.lastUpdated.toISOString()
              }));
              setTrophyTitles(convertedTitles);
              console.log(`✅ ${convertedTitles.length} jogos convertidos e definidos`);
            } else {
              console.log('⚠️ GameLibrary vazia ou nula, não há jogos para converter');
            }
            
            console.log('✅ Dados do Firebase carregados com sucesso');
            
          } catch (error) {
            console.warn('⚠️ Erro ao carregar dados do Firebase:', error);
            // Se Firebase falhar, continuar com PSN
            throw error; // Re-throw para garantir que o catch do loadData funcione
          }
        };

  const loadPSNData = async () => {
    console.log('🔄 Carregando dados do PSN...');
    
    try {
      // Carregar lista de jogos
      const titles = await PSNService.getTrophyTitles();
      console.log(`🎮 ${titles.length} jogos carregados do PSN`);
      setTrophyTitles(titles);
      
      // Carregar perfil do usuário
      const profile = await PSNService.getProfileSummary();
      console.log('👤 Perfil carregado do PSN:', profile?.trophyLevel);
      setProfileSummary(profile);
      
      console.log('✅ Dados do PSN carregados com sucesso');
    } catch (error) {
      console.error('❌ Erro ao carregar dados do PSN:', error);
      throw error;
    }
  };

  const handleGameClick = async (game: TrophyTitle) => {
    try {
      setSelectedGame(game);
      setLoading(true);
      
             const gameTrophies = await PSNService.getTrophiesForTitle(game.npTitleId);
      setTrophies(gameTrophies);
      
    } catch (error) {
      console.error('Error loading trophies:', error);
      setError('Erro ao carregar troféus do jogo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNow = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Iniciando sincronização manual...');
      await SyncService.syncAllData();
      
      // Recarregar dados após sincronização
      await loadData();
      
      console.log('✅ Sincronização manual concluída!');
      
    } catch (error) {
      console.error('❌ Erro na sincronização manual:', error);
      setError('Erro durante a sincronização. Verifique o console.');
    } finally {
      setLoading(false);
    }
  };

          const handleSyncGame = async (game: TrophyTitle) => {
          try {
            setLoading(true);
            setError(null);

            console.log(`🎮 Sincronizando jogo específico: ${game.trophyTitleName}`);
            await SyncService.syncSingleGame(game.npTitleId);

            console.log(`✅ Jogo ${game.trophyTitleName} sincronizado!`);

          } catch (error) {
            console.error('❌ Erro ao sincronizar jogo:', error);
            setError('Erro ao sincronizar jogo. Verifique o console.');
          } finally {
            setLoading(false);
          }
        };

        const toggleAutoSync = () => {
          if (syncStatus.hasAutoSync) {
            SyncService.stopAutoSync();
          } else {
            SyncService.setupAutoSync(30);
          }
          setSyncStatus(SyncService.getSyncStatus());
        };

        const handleSuggestionSubmit = async (suggestion: Omit<GameSuggestion, 'id' | 'suggestedAt' | 'status'>) => {
          try {
            const newSuggestion: GameSuggestion = {
              ...suggestion,
              id: Date.now().toString(),
              suggestedAt: new Date(),
              status: 'pending'
            };
            
            await FirebaseService.addGameSuggestion(newSuggestion);
            setGameSuggestions(prev => [...prev, newSuggestion]);
            setShowSuggestionForm(false);
            
          } catch (error) {
            console.error('Erro ao adicionar sugestão:', error);
            setError('Erro ao adicionar sugestão.');
          }
        };

  if (loading && trophyTitles.length === 0) {
    return (
      <div className="App">
              <header className="App-header">
        <h1 
          onDoubleClick={() => setCurrentView('sync')}
          title="Duplo clique para acessar sincronização"
          style={{ cursor: 'pointer' }}
        >
          🏆 FS Trophy Hub
        </h1>
        <PSNStatusIndicator />
        <div className="loading">Carregando...</div>
      </header>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1 
          onDoubleClick={() => setCurrentView('sync')}
          title="Duplo clique para acessar sincronização"
          style={{ cursor: 'pointer' }}
        >
          🏆 FS Trophy Hub
        </h1>

        {/* Navegação Principal */}
        <nav className="main-navigation">
          <button
            onClick={() => setCurrentView('games')}
            className={`nav-button ${currentView === 'games' ? 'active' : ''}`}
          >
            🎮 Jogos
          </button>
          <button
            onClick={() => setCurrentView('currentGame')}
            className={`nav-button ${currentView === 'currentGame' ? 'active' : ''}`}
          >
            🎯 Jogo Atual
          </button>
          <button
            onClick={() => setCurrentView('suggestions')}
            className={`nav-button ${currentView === 'suggestions' ? 'active' : ''}`}
          >
            💡 Sugestões
          </button>


        </nav>
      </header>

      {error && (
        <div className="error-message">
          {error}
            </div>
          )}
          
      

      <main className="App-main">
        {/* View: Jogos */}
        {currentView === 'games' && (
          <>
            <section className="games-section">
              <h2>🎮 Jogos ({trophyTitles.length})</h2>
              <div className="games-grid">
                {trophyTitles.map((game) => (
                  <div key={game.npTitleId} className="game-item">
                    <GameCard 
                      game={game} 
                      onClick={() => handleGameClick(game)}
                    />

              </div>
                ))}
              </div>
            </section>

            {selectedGame && (
              <section className="trophies-section">
                <h2>🏆 Troféus de {selectedGame.trophyTitleName}</h2>
                <div className="trophies-grid">
                  {trophies.map((trophy) => (
                    <TrophyCard key={trophy.trophyId} trophy={trophy} />
                  ))}
              </div>
              </section>
            )}
          </>
        )}

        {/* View: Jogo Atual */}
        {currentView === 'currentGame' && (
          <section className="current-game-section">
            <h2>🎯 Jogo Atual</h2>
            {currentGame ? (
              <CurrentGameCard currentGame={currentGame} />
            ) : (
              <div className="no-current-game">
                <p>Nenhum jogo ativo no momento.</p>
                <button className="set-current-game-btn">
                  🎮 Definir Jogo Atual
                </button>
              </div>
            )}
          </section>
        )}

        {/* View: Sugestões */}
        {currentView === 'suggestions' && (
          <section className="suggestions-section">
            <div className="suggestions-header">
              <h2>💡 Sugestões de Jogos</h2>
              <button
                onClick={() => setShowSuggestionForm(true)}
                className="add-suggestion-btn"
              >
                ➕ Adicionar Sugestão
              </button>
            </div>
            
            <div className="suggestions-grid">
              {gameSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="suggestion-card">
                  <h3>{suggestion.gameTitle}</h3>
                  <p><strong>Plataforma:</strong> {suggestion.platform}</p>
                  <p><strong>Sugerido por:</strong> {suggestion.suggestedBy}</p>
                  <p><strong>Status:</strong> 
                    <span className={`status ${suggestion.status}`}>
                      {suggestion.status}
                    </span>
                  </p>
                  <p><strong>Data:</strong> {suggestion.suggestedAt.toLocaleDateString()}</p>
                </div>
              ))}
              </div>
          </section>
        )}



        {/* View: Sincronização */}
        {currentView === 'sync' && (
          <section className="sync-section">
            <h2>🔄 Sincronização PSN → Firebase</h2>
            
            {/* Perfil do Usuário */}
            {profileSummary && (
              <div className="profile-summary">
                <h3>👤 Perfil do Usuário</h3>
                <div className="profile-stats">
                  <div className="stat">
                    <span className="label">Nível:</span>
                    <span className="value">{profileSummary.trophyLevel}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Progresso:</span>
                    <span className="value">{profileSummary.progress}%</span>
                  </div>
                  <div className="stat">
                    <span className="label">Tier:</span>
                    <span className="value">{profileSummary.tier}</span>
                  </div>
                </div>
                <div className="trophy-counts">
                  <div className="trophy bronze">🥉 {profileSummary.earnedTrophies.bronze}</div>
                  <div className="trophy silver">🥈 {profileSummary.earnedTrophies.silver}</div>
                  <div className="trophy gold">🥇 {profileSummary.earnedTrophies.gold}</div>
                  <div className="trophy platinum">💎 {profileSummary.earnedTrophies.platinum}</div>
                </div>
              </div>
            )}
            
            {/* Controles de Sincronização */}
            <div className="sync-controls">
              <button
                onClick={handleSyncNow}
                disabled={syncStatus.isSyncing}
                className="sync-button"
              >
                {syncStatus.isSyncing ? '🔄 Sincronizando...' : '🔄 Sincronizar Agora'}
              </button>

              <button
                onClick={toggleAutoSync}
                className={`auto-sync-button ${syncStatus.hasAutoSync ? 'active' : ''}`}
              >
                {syncStatus.hasAutoSync ? '⏹️ Parar Auto-Sync' : '⏰ Iniciar Auto-Sync'}
              </button>
          </div>

            {/* Status da Sincronização */}
            <div className="sync-status">
              <span className={`status-indicator ${syncStatus.isSyncing ? 'syncing' : 'idle'}`}>
                {syncStatus.isSyncing ? '🔄 Sincronizando...' : '✅ Em espera'}
              </span>
              <span className="auto-sync-status">
                {syncStatus.hasAutoSync ? '⏰ Auto-Sync ativo' : '⏹️ Auto-Sync parado'}
              </span>
            </div>
            
            {/* Informações de Sincronização */}
            <div className="sync-info">
              <h3>📊 Status da Sincronização</h3>
              <div className="sync-stats">
                <div className="sync-stat">
                  <span className="label">Última Sincronização:</span>
                  <span className="value">Em breve...</span>
                </div>
                <div className="sync-stat">
                  <span className="label">Próxima Sincronização:</span>
                  <span className="value">Em breve...</span>
                </div>
                <div className="sync-stat">
                  <span className="label">Jogos Sincronizados:</span>
                  <span className="value">{trophyTitles.length}</span>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Modal de Sugestão */}
      {showSuggestionForm && (
        <GameSuggestionForm
          onSuggestionSubmitted={handleSuggestionSubmit}
          onClose={() => setShowSuggestionForm(false)}
        />
      )}
    </div>
  );
}

export default App;
