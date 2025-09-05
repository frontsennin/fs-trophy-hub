import React, { useState, useEffect, useCallback } from "react";
import "./App.css";
import GameCard from "./components/GameCard";
import PSNStatusIndicator from "./components/PSNStatusIndicator";
import CurrentGameCard from "./components/CurrentGameCard";
import GameSuggestionForm from "./components/GameSuggestionForm";
import CurrentGameForm from "./components/CurrentGameForm";
import GameDetails from "./components/GameDetails";
import { PSNService } from "./services/psnService";
import { FirebaseService } from "./services/firebaseService";
import { SyncService } from "./services/syncService";
import {
  TrophyTitle,
  ProfileSummary,
  CurrentGame,
  GameSuggestion,
} from "./types";

function App() {
  const [trophyTitles, setTrophyTitles] = useState<TrophyTitle[]>([]);
  const [filteredTrophyTitles, setFilteredTrophyTitles] = useState<TrophyTitle[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'trophies' | 'name' | 'progress' | 'platform' | 'date'>('trophies');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [selectedGame, setSelectedGame] = useState<TrophyTitle | null>(null);
  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(
    null
  );
  const [currentGame, setCurrentGame] = useState<CurrentGame | null>(null);
  const [gameSuggestions, setGameSuggestions] = useState<GameSuggestion[]>([]);

  const [showSuggestionForm, setShowSuggestionForm] = useState(false);
  const [showCurrentGameForm, setShowCurrentGameForm] = useState(false);
  const [currentView, setCurrentView] = useState<
    "games" | "currentGame" | "suggestions" | "sync" | "gameDetails"
  >("games");
  const [userIP, setUserIP] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [envInfo, setEnvInfo] = useState<any>(null);
  const [isVercel, setIsVercel] = useState(false);

  const [syncStatus, setSyncStatus] = useState<{
    isSyncing: boolean;
    hasAutoSync: boolean;
  }>({ isSyncing: false, hasAutoSync: false });

  const loadEnvironmentInfo = () => {
    const info = PSNService.getEnvironmentInfo();
    setEnvInfo(info);
    setIsVercel(info.isVercel);
  };

  // Funções auxiliares para o sistema de sugestões
  const getUserIP = () => userIP;

  const getStatusColor = (status: GameSuggestion['status']) => {
    switch (status) {
      case 'pending': return '#ffa500';
      case 'approved': return '#4caf50';
      case 'rejected': return '#f44336';
      case 'completed': return '#2196f3';
      default: return '#9e9e9e';
    }
  };

  const getStatusText = (status: GameSuggestion['status']) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'approved': return 'Aprovado';
      case 'rejected': return 'Rejeitado';
      case 'completed': return 'Completo';
      default: return 'Desconhecido';
    }
  };

  const getUserIPFromAPI = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      setUserIP(data.ip);
    } catch (error) {
      console.error('Erro ao obter IP:', error);
      // Fallback para IP local
      setUserIP('local-' + Math.random().toString(36).substr(2, 9));
    }
  };

  const handleVote = async (suggestionId: string) => {
    if (!userIP) {
      alert('Aguarde um momento para poder votar...');
      return;
    }

    try {
      const suggestion = gameSuggestions.find(s => s.id === suggestionId);
      if (!suggestion) return;

      // Verificar se já votou
      if ((suggestion.votedBy ?? []).includes(userIP)) {
        alert('Você já votou nesta sugestão!');
        return;
      }

      // Atualizar pontos
      await FirebaseService.updateSuggestionPoints(suggestionId, userIP);
      
      // Recarregar sugestões
      const updatedSuggestions = await FirebaseService.getGameSuggestions();
      setGameSuggestions(updatedSuggestions);
      
    } catch (error) {
      console.error('Erro ao votar:', error);
      alert('Erro ao votar. Tente novamente.');
    }
  };

  // Função para filtrar e ordenar jogos
  const filterAndSortGames = useCallback(() => {
    let filtered = [...trophyTitles];
    
    // Aplicar filtro de busca
    if (searchTerm) {
      filtered = filtered.filter(game => 
        game.trophyTitleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        game.trophyTitlePlatform.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    
    // Aplicar ordenação
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'trophies':
          // Ordenação por troféus: Platina > Ouro > Prata > Bronze
          const aTrophies = a.earnedTrophies || { platinum: 0, gold: 0, silver: 0, bronze: 0 };
          const bTrophies = b.earnedTrophies || { platinum: 0, gold: 0, silver: 0, bronze: 0 };
          
          // Calcular pontuação baseada nos troféus (pesos: Platina=1000, Ouro=100, Prata=10, Bronze=1)
          const aScore = (aTrophies.platinum * 1000) + (aTrophies.gold * 100) + (aTrophies.silver * 10) + aTrophies.bronze;
          const bScore = (bTrophies.platinum * 1000) + (bTrophies.gold * 100) + (bTrophies.silver * 10) + bTrophies.bronze;
          
          aValue = aScore;
          bValue = bScore;
          break;
        case 'name':
          aValue = a.trophyTitleName.toLowerCase();
          bValue = b.trophyTitleName.toLowerCase();
          break;
        case 'progress':
          aValue = a.progress;
          bValue = b.progress;
          break;
        case 'platform':
          aValue = a.trophyTitlePlatform.toLowerCase();
          bValue = b.trophyTitlePlatform.toLowerCase();
          break;
        case 'date':
          aValue = new Date(a.lastUpdatedDate).getTime();
          bValue = new Date(b.lastUpdatedDate).getTime();
          break;
        default:
          aValue = a.trophyTitleName.toLowerCase();
          bValue = b.trophyTitleName.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
    
    setFilteredTrophyTitles(filtered);
  }, [trophyTitles, searchTerm, sortBy, sortOrder]);

  // Atualizar lista filtrada quando trophyTitles ou filtros mudarem
  useEffect(() => {
    filterAndSortGames();
  }, [filterAndSortGames]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Se estamos no ambiente local (com proxy), carregar do PSN
      if (envInfo?.useProxy) {
        await loadPSNData();
      } else {
        // Se estamos no Vercel, tentar Firebase primeiro
        try {
          await loadFirebaseData();

          // Verificar se Firebase retornou dados
          const currentTitles = await FirebaseService.getGameLibrary();
          if (!currentTitles || currentTitles.length === 0) {
            setError("Firebase não possui dados. Sincronize localmente primeiro, depois faça deploy.");
          }
        } catch (firebaseError) {
          console.warn("⚠️ Erro ao carregar dados do Firebase:", firebaseError);
          setError("Firebase falhou. Verifique a configuração e tente novamente.");
        }
      }
      
      // SEMPRE carregar sugestões e jogo atual do Firebase, independente do ambiente
      try {
        console.log("🔍 Carregando sugestões do Firebase em todos os ambientes...");
        const suggestionsData = await FirebaseService.getGameSuggestions();
        setGameSuggestions(suggestionsData || []);
        console.log("🔍 Sugestões carregadas:", suggestionsData);
      } catch (error) {
        console.warn("⚠️ Erro ao carregar sugestões:", error);
        setGameSuggestions([]);
      }
      
      // SEMPRE carregar jogo atual do Firebase, independente do ambiente
      try {
        console.log("🔍 Carregando jogo atual do Firebase em todos os ambientes...");
        const currentGameData = await FirebaseService.getCurrentGame();
        setCurrentGame(currentGameData);
        console.log("🔍 Jogo atual carregado:", currentGameData);
      } catch (error) {
        console.warn("⚠️ Erro ao carregar jogo atual:", error);
        setCurrentGame(null);
      }

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setError(
        "Erro ao carregar dados. Verifique o console para mais detalhes."
      );
    } finally {
      setLoading(false);
    }
  }, [envInfo?.useProxy]);

  useEffect(() => {
    // 1. Carregar informações do ambiente primeiro
    loadEnvironmentInfo();
    
    // 2. Obter IP do usuário
    getUserIPFromAPI();
    
    // 3. Configurar sincronização automática
    SyncService.setupAutoSync(30);

    // 3. Atualizar status da sincronização a cada 5 segundos
    const syncStatusInterval = setInterval(() => {
      setSyncStatus(SyncService.getSyncStatus());
    }, 5000);

    // 4. Processar hash da URL para navegação
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'sync') {
        setCurrentView('sync');
      } else if (hash === 'games') {
        setCurrentView('games');
      } else if (hash === 'currentGame') {
        setCurrentView('currentGame');
      } else if (hash === 'suggestions') {
        setCurrentView('suggestions');
      }
    };

    // Processar hash inicial
    handleHashChange();

    // Adicionar listener para mudanças no hash
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      clearInterval(syncStatusInterval);
      SyncService.stopAutoSync();
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // useEffect separado para loadData (depende de envInfo)
  useEffect(() => {
    if (envInfo) {
    loadData();
    }
  }, [envInfo, loadData]);

  // Debug das sugestões
  useEffect(() => {
    console.log('🔍 Estado das sugestões mudou:', {
      gameSuggestions,
      length: gameSuggestions.length,
      timestamp: new Date().toISOString()
    });
  }, [gameSuggestions]);

  const loadFirebaseData = async () => {
    try {
      console.log("🔍 loadFirebaseData - INICIANDO EXECUÇÃO!");
      console.log("🔍 loadFirebaseData - Iniciando...");

      // Carregar dados do Firebase (exceto sugestões e jogo atual)
      const [gameLibraryData] =
        await Promise.all([
          FirebaseService.getGameLibrary(),
        ]);
      
      console.log("🔍 Dados retornados do Firebase:", {
        gameLibraryData,
        gameLibraryLength: gameLibraryData?.length || 0
      });


      // setCurrentGame removido daqui - agora é carregado separadamente
      // setGameSuggestions removido daqui - agora é carregado separadamente
      
      console.log('🔍 Dados do Firebase carregados:', {
        gameLibraryData,
        gameLibraryLength: gameLibraryData?.length || 0
      });

      // Os dados já estão no formato correto (TrophyTitle), não precisamos converter!
      if (gameLibraryData && gameLibraryData.length > 0) {
        
        // Os dados já são TrophyTitle, só precisamos mapear alguns campos
        const processedTitles = gameLibraryData.map((game: any) => {
          
          return {
            npTitleId: game.npTitleId || game.npCommunicationId || game.id,
            trophyTitleName: game.trophyTitleName || game.trophyTitleDetail || "Jogo sem nome",
            trophyTitleIconUrl: game.trophyTitleIconUrl || "https://via.placeholder.com/100x100?text=🎮",
            trophyTitlePlatform: game.trophyTitlePlatform || "PS4",
            hasTrophyGroups: game.hasTrophyGroups || false,
            progress: game.progress || 0,
            lastUpdatedDate: game.lastUpdatedDate || game.lastUpdated?.toISOString() || new Date().toISOString(),
            earnedTrophies: game.earnedTrophies || { platinum: 0, gold: 0, silver: 0, bronze: 0 }
          };
        });
        
        setTrophyTitles(processedTitles);
      }

    } catch (error) {
      console.warn("⚠️ Erro ao carregar dados do Firebase:", error);
      
      // Tratamento específico de erros do Firebase
      if (error instanceof Error) {
        console.error("❌ Detalhes do erro Firebase:", {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        
        // Verificar se é erro de permissão
        if (error.message.includes('permission') || error.message.includes('Permission denied')) {
          console.error("🚫 Erro de permissão do Firestore - verificar regras de segurança");
          setError("Erro de permissão do Firebase. Verifique as regras de segurança.");
          return;
        }
        
        // Verificar se é erro de rede
        if (error.message.includes('network') || error.message.includes('timeout')) {
          console.error("🌐 Erro de rede - verificar conectividade");
          setError("Erro de rede ao conectar com Firebase. Verifique sua conexão.");
          return;
        }
        
        // Verificar se é erro de configuração
        if (error.message.includes('config') || error.message.includes('invalid')) {
          console.error("⚙️ Erro de configuração do Firebase");
          setError("Erro de configuração do Firebase. Verifique as credenciais.");
          return;
        }
      }
      
      // Se Firebase falhar, continuar com PSN
      throw error; // Re-throw para garantir que o catch do loadData funcione
    }
  };

  const loadPSNData = async () => {

    try {
      // Carregar lista de jogos
      const titles = await PSNService.getTrophyTitles();
      setTrophyTitles(titles);

      // Carregar perfil do usuário
      const profile = await PSNService.getProfileSummary();
      setProfileSummary(profile);

    } catch (error) {
      console.error("❌ Erro ao carregar dados do PSN:", error);
      throw error;
    }
  };

  const handleGameClick = async (game: TrophyTitle) => {
    try {
      // Verificação de segurança
      if (!game || !game.npTitleId) {
        console.error('❌ Tentativa de clicar em jogo inválido:', game);
        setError("Jogo inválido selecionado.");
        return;
      }
      
      setSelectedGame(game);
      setCurrentView("gameDetails");
    } catch (error) {
      console.error("Error selecting game:", error);
      setError("Erro ao selecionar jogo.");
    }
  };

  const handleBackToGames = () => {
    setCurrentView("games");
    setSelectedGame(null);
  };

  const handleSyncNow = async () => {
    try {
      setLoading(true);
      setError(null);

      await SyncService.syncAllData();

      // Recarregar dados após sincronização
      await loadData();

    } catch (error) {
      console.error("❌ Erro na sincronização manual:", error);
      setError("Erro durante a sincronização. Verifique o console.");
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

  const handleSuggestionSubmit = async (
    suggestion: Omit<GameSuggestion, "id" | "suggestedAt" | "status">
  ) => {
    try {
      const newSuggestion: GameSuggestion = {
        ...suggestion,
        id: Date.now().toString(),
        suggestedAt: new Date(),
        status: "pending",
      };

      await FirebaseService.addGameSuggestion(newSuggestion);
      setGameSuggestions((prev) => [...prev, newSuggestion]);
      setShowSuggestionForm(false);
    } catch (error) {
      console.error("Erro ao adicionar sugestão:", error);
      setError("Erro ao adicionar sugestão.");
    }
  };

  const handleCurrentGameUpdated = async () => {
    try {
      // Recarregar jogo atual
      const updatedCurrentGame = await FirebaseService.getCurrentGame();
      setCurrentGame(updatedCurrentGame);
      console.log("✅ Jogo atual recarregado:", updatedCurrentGame);
    } catch (error) {
      console.error("❌ Erro ao recarregar jogo atual:", error);
    }
  };

  if (loading && trophyTitles.length === 0) {
    return (
      <div className="App">
        <header className="App-header">
          <h1
            onDoubleClick={() => {
              setCurrentView("sync");
              window.location.hash = 'sync';
            }}
            title="Duplo clique para acessar sincronização"
            style={{ cursor: "pointer" }}
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
          onDoubleClick={() => setCurrentView("sync")}
          title="Duplo clique para acessar sincronização"
          style={{ cursor: "pointer" }}
        >
          🏆 FS Trophy Hub
          </h1>
          
        {/* Navegação Principal */}
        <nav className="main-navigation">
          <button
            onClick={() => {
              setCurrentView("games");
              window.location.hash = 'games';
            }}
            className={`nav-button ${currentView === "games" ? "active" : ""}`}
          >
            🎮 Jogos
          </button>
          <button
            onClick={() => {
              setCurrentView("suggestions");
              window.location.hash = 'suggestions';
            }}
            className={`nav-button ${
              currentView === "suggestions" ? "active" : ""}`}
          >
            💡 Sugestões
          </button>
          {!isVercel && (
          <button
            onClick={() => {
              setCurrentView("sync");
              window.location.hash = 'sync';
            }}
            className={`nav-button ${
              currentView === "sync" ? "active" : ""}`}
          >
            🔄 Sync
          </button>
          )}
        </nav>
      </header>

      {error && <div className="error-message">{error}</div>}

      <main className="App-main">
        {/* View: Jogos */}
        {currentView === "games" && (
          <>
            <section className="games-section">
              <div className="games-header">
                <h2>🎮 Jogos ({filteredTrophyTitles.length} de {trophyTitles.length})</h2>
                
                {/* Controles de Busca e Ordenação */}
                <div className="games-controls">
                  {/* Input de Busca */}
                  <div className="search-container">
                    <input
                      type="text"
                      placeholder="🔍 Buscar jogos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                    />
                  </div>
                  
                  {/* Ordenação */}
                  <div className="sort-container">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="sort-select"
                    >
                      <option value="trophies">🏆 Troféus</option>
                      <option value="name">📝 Nome</option>
                      <option value="progress">📊 Progresso</option>
                      <option value="platform">🎮 Plataforma</option>
                      <option value="date">📅 Data</option>
                    </select>
                    
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="sort-order-btn"
                      title={`Ordenar ${sortOrder === 'asc' ? 'decrescente' : 'crescente'}`}
                    >
                      {sortOrder === 'asc' ? '⬆️' : '⬇️'}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="games-grid">
                {filteredTrophyTitles.map((game) => {
                  // Verificação de segurança
                  if (!game || !game.npTitleId) {
                    console.error('❌ Jogo inválido encontrado:', game);
                    return null;
                  }
                  
                  return (
                  <div key={game.npTitleId} className="game-item">
                    <GameCard
                      game={game}
                      onClick={() => handleGameClick(game)}
                    />
                  </div>
                  );
                })}
              </div>
              
              {/* Mensagem quando não há resultados */}
              {filteredTrophyTitles.length === 0 && searchTerm && (
                <div className="no-results">
                  <p>🔍 Nenhum jogo encontrado para "{searchTerm}"</p>
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="clear-search-btn"
                  >
                    Limpar busca
                  </button>
                </div>
              )}
            </section>

          </>
        )}

        {/* View: Detalhes do Jogo */}
        {currentView === "gameDetails" && selectedGame && (
          <GameDetails 
            game={selectedGame} 
            onBack={handleBackToGames}
          />
        )}

        {/* View: Jogo Atual */}
        {currentView === "currentGame" && (
          <section className="current-game-section">
            <h2>🎯 Jogo Atual</h2>
            {(() => {
              console.log('🎯 Renderizando página de jogo atual:', {
                currentGame,
                hasCurrentGame: !!currentGame,
                currentView
              });
              return null;
            })()}
            {currentGame ? (
              <CurrentGameCard currentGame={currentGame} />
            ) : (
              <div className="no-current-game">
                <p>Nenhum jogo ativo no momento.</p>
                <p className="info-text">Para definir um jogo atual, vá para a aba "🔄 Sync" → "🎮 Gerenciar Jogo Atual"</p>
              </div>
            )}
          </section>
        )}

        {/* View: Sugestões */}
        {currentView === "suggestions" && (
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
              {gameSuggestions.length === 0 ? (
                <div className="no-suggestions">
                  <p>Nenhuma sugestão encontrada.</p>
                  <p>Seja o primeiro a sugerir um jogo!</p>
                </div>
              ) : (
                gameSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="suggestion-card">
                    <div className="suggestion-header">
                      <div className="game-info">
                        <h3 className="game-title">{suggestion.gameTitle}</h3>
                        <div className="platform-badge">
                          {suggestion.platform}
                        </div>
                      </div>
                      <div className="status-badge" style={{ backgroundColor: getStatusColor(suggestion.status) }}>
                        {getStatusText(suggestion.status)}
                      </div>
                    </div>

                    <div className="suggestion-details">
                      <p className="suggested-by">
                        <strong>Sugerido por:</strong> {suggestion.userInfo?.name || suggestion.suggestedBy}
                      </p>
                      <p className="suggestion-date">
                        <strong>Data:</strong> {new Date(suggestion.suggestedAt).toLocaleDateString('pt-BR')}
                      </p>
                      {suggestion.reason && (
                        <p className="suggestion-reason">
                          <strong>Motivo:</strong> {suggestion.reason}
                        </p>
                      )}
                      {suggestion.userInfo?.contact && (
                        <p className="suggestion-contact">
                          <strong>Contato:</strong> {suggestion.userInfo.contact}
                        </p>
                      )}
                    </div>

                    <div className="suggestion-footer">
                      <div className="points-section">
                        <span className="points-label">Pontos:</span>
                        <span className="points-value">{suggestion.points ?? 0}</span>
                        <button
                          className={`vote-button ${(suggestion.votedBy ?? []).includes(getUserIP()) ? 'voted' : ''}`}
                          onClick={() => handleVote(suggestion.id)}
                          disabled={(suggestion.votedBy ?? []).includes(getUserIP())}
                          title={(suggestion.votedBy ?? []).includes(getUserIP()) ? 'Você já votou!' : 'Clique para dar um ponto!'}
                        >
                          {(suggestion.votedBy ?? []).includes(getUserIP()) ? '⭐ Votado' : '⭐ Votar'}
                        </button>
                      </div>
                    </div>
                </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* View: Sincronização */}
        {currentView === "sync" && (
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
                  <div className="trophy bronze">
                    🥉 {profileSummary.earnedTrophies.bronze}
                  </div>
                  <div className="trophy silver">
                    🥈 {profileSummary.earnedTrophies.silver}
              </div>
                  <div className="trophy gold">
                    🥇 {profileSummary.earnedTrophies.gold}
              </div>
                  <div className="trophy platinum">
                    💎 {profileSummary.earnedTrophies.platinum}
              </div>
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
                {syncStatus.isSyncing
                  ? "🔄 Sincronizando..."
                  : "🔄 Sincronizar Agora"}
              </button>

              <button
                onClick={toggleAutoSync}
                className={`auto-sync-button ${
                  syncStatus.hasAutoSync ? "active" : ""
                }`}
              >
                {syncStatus.hasAutoSync
                  ? "⏹️ Parar Auto-Sync"
                  : "⏰ Iniciar Auto-Sync"}
              </button>
              

              </div>

            {/* Status da Sincronização */}
            <div className="sync-status">
              <span
                className={`status-indicator ${
                  syncStatus.isSyncing ? "syncing" : "idle"
                }`}
              >
                {syncStatus.isSyncing ? "🔄 Sincronizando..." : "✅ Em espera"}
              </span>
              <span className="auto-sync-status">
                {syncStatus.hasAutoSync
                  ? "⏰ Auto-Sync ativo"
                  : "⏹️ Auto-Sync parado"}
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

            {/* Gerenciamento do Jogo Atual */}
            <div className="current-game-management">
              <h3>🎮 Gerenciar Jogo Atual</h3>
              <p>Defina ou atualize o jogo que você está jogando atualmente.</p>
              
              {currentGame ? (
                <div className="current-game-info">
                  <h4>🎯 Jogo Atual: {currentGame.gameTitle}</h4>
                  <div className="game-details">
                    <p><strong>Plataforma:</strong> {currentGame.platform}</p>
                    <p><strong>Progresso:</strong> {currentGame.progress}%</p>
                    <p><strong>Status:</strong> {currentGame.status}</p>
                    {currentGame.notes && <p><strong>Notas:</strong> {currentGame.notes}</p>}
                  </div>
                </div>
              ) : (
                <div className="no-current-game">
                  <p>Nenhum jogo atual definido.</p>
                </div>
              )}
              
              <button
                onClick={() => setShowCurrentGameForm(true)}
                className="manage-game-button"
              >
                {currentGame ? '✏️ Editar Jogo Atual' : '➕ Definir Jogo Atual'}
              </button>
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

      {/* Modal de Formulário - Jogo Atual */}
      {showCurrentGameForm && (
        <CurrentGameForm
          onClose={() => setShowCurrentGameForm(false)}
          onGameUpdated={handleCurrentGameUpdated}
        />
      )}

    </div>
  );
}

export default App;
