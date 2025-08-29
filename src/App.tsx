import React, { useState, useEffect, useCallback } from 'react';
import { TrophyTitle, Trophy, GameStats, ProfileSummary } from './types';
import { PSNService } from './services/psnService';
import GameCard from './components/GameCard';
import TrophyCard from './components/TrophyCard';
import MockDataWarning from './components/MockDataWarning';
import './App.css';

function App() {
  const [games, setGames] = useState<TrophyTitle[]>([]);
  const [selectedGame, setSelectedGame] = useState<TrophyTitle | null>(null);
  const [trophies, setTrophies] = useState<Trophy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(null);
  const [serverStatus, setServerStatus] = useState<boolean>(false);

  // Função para ordenar jogos por troféus
  const sortGamesByTrophies = (gamesData: TrophyTitle[]): TrophyTitle[] => {
    return gamesData.sort((a, b) => {
      // 1. Primeiro por platinas (decrescente)
      const platinumDiff = (b.earnedTrophies?.platinum || 0) - (a.earnedTrophies?.platinum || 0);
      if (platinumDiff !== 0) return platinumDiff;
      
      // 2. Depois por ouro (decrescente)
      const goldDiff = (b.earnedTrophies?.gold || 0) - (a.earnedTrophies?.gold || 0);
      if (goldDiff !== 0) return goldDiff;
      
      // 3. Depois por prata (decrescente)
      const silverDiff = (b.earnedTrophies?.silver || 0) - (a.earnedTrophies?.silver || 0);
      if (silverDiff !== 0) return silverDiff;
      
      // 4. Depois por bronze (decrescente)
      const bronzeDiff = (b.earnedTrophies?.bronze || 0) - (a.earnedTrophies?.bronze || 0);
      if (bronzeDiff !== 0) return bronzeDiff;
      
      // 5. Por último, por progresso (decrescente)
      return (b.progress || 0) - (a.progress || 0);
    });
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Verificar status do servidor
      const isServerRunning = await PSNService.checkServerStatus();
      setServerStatus(isServerRunning);
      
      if (!isServerRunning) {
        setError('Servidor proxy não está rodando. Por favor, inicie o servidor primeiro.');
        setLoading(false);
        return;
      }
      
      // Carregar dados em paralelo
      const [gamesData, profileData] = await Promise.all([
        PSNService.getTrophyTitles(),
        PSNService.getProfileSummary()
      ]);
      
      // Ordenar jogos por troféus
      const sortedGames = sortGamesByTrophies(gamesData);
      
      setGames(sortedGames);
      setProfileSummary(profileData);
      
      // Calcular stats baseado no perfil real
      if (profileData) {
        const gameStats: GameStats = {
          totalGames: gamesData.length,
          completedGames: gamesData.filter(game => game.progress === 100).length,
          totalTrophies: profileData.earnedTrophies.bronze + 
                        profileData.earnedTrophies.silver + 
                        profileData.earnedTrophies.gold + 
                        profileData.earnedTrophies.platinum,
          earnedTrophies: profileData.earnedTrophies.bronze + 
                         profileData.earnedTrophies.silver + 
                         profileData.earnedTrophies.gold + 
                         profileData.earnedTrophies.platinum,
          platinumTrophies: profileData.earnedTrophies.platinum,
          goldTrophies: profileData.earnedTrophies.gold,
          silverTrophies: profileData.earnedTrophies.silver,
          bronzeTrophies: profileData.earnedTrophies.bronze
        };
        setStats(gameStats);
      } else {
        // Fallback para stats estimados
        const gameStats = calculateStats(gamesData);
        setStats(gameStats);
      }
      
    } catch (err) {
      setError('Falha ao carregar dados. Por favor, tente novamente.');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const calculateStats = (gamesData: TrophyTitle[]): GameStats => {
    const totalGames = gamesData.length;
    const completedGames = gamesData.filter(game => game.progress === 100).length;
    
    // Note: We'll need to fetch individual trophies to get accurate trophy counts
    // For now, we'll estimate based on typical trophy counts
    const estimatedTrophiesPerGame = 50; // Average trophies per game
    const totalTrophies = totalGames * estimatedTrophiesPerGame;
    const earnedTrophies = Math.round(totalTrophies * (gamesData.reduce((sum, game) => sum + game.progress, 0) / totalGames / 100));
    
    return {
      totalGames,
      completedGames,
      totalTrophies,
      earnedTrophies,
      platinumTrophies: completedGames, // Each completed game has 1 platinum
      goldTrophies: Math.round(earnedTrophies * 0.1), // Estimate 10% gold
      silverTrophies: Math.round(earnedTrophies * 0.2), // Estimate 20% silver
      bronzeTrophies: Math.round(earnedTrophies * 0.7) // Estimate 70% bronze
    };
  };

  const handleGameClick = async (game: TrophyTitle) => {
    try {
      setLoading(true);
      setSelectedGame(game);
      
      const trophiesData = await PSNService.getTrophiesForTitle(game.npTitleId);
      setTrophies(trophiesData);
      
    } catch (err) {
      setError('Falha ao carregar troféus para este jogo.');
      console.error('Error loading trophies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToGames = () => {
    setSelectedGame(null);
    setTrophies([]);
  };

  if (loading && games.length === 0) {
    return (
      <div className="app">
        <MockDataWarning />
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>Carregando sua coleção de troféus...</h2>
          <p>Conectando à PlayStation Network...</p>
          {!serverStatus && (
            <div className="server-warning">
              <p>⚠️ Servidor proxy não está rodando. Por favor, inicie o servidor primeiro.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error && games.length === 0) {
    return (
      <div className="app">
        <MockDataWarning />
        <div className="error-container">
          <h2>❌ Erro</h2>
          <p>{error}</p>
          <button onClick={loadData} className="retry-button">
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <MockDataWarning />
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">
            <span className="title-icon">🏆</span>
            FS Trophy Hub
            <span className="title-subtitle">by Front Sennin</span>
          </h1>
          
          {profileSummary && (
            <div className="profile-summary">
              <div className="profile-level">
                <span className="level-number">{profileSummary.trophyLevel}</span>
                <span className="level-label">Nível</span>
              </div>
              <div className="profile-progress">
                <span className="progress-text">{profileSummary.progress}%</span>
                <span className="progress-label">para o próximo nível</span>
              </div>
            </div>
          )}
          
          {stats && (
            <div className="stats-container">
              <div className="stat-item">
                <span className="stat-number">{stats.totalGames}</span>
                <span className="stat-label">Jogos</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{stats.completedGames}</span>
                <span className="stat-label">Completados</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{stats.earnedTrophies}</span>
                <span className="stat-label">Troféus</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{stats.platinumTrophies}</span>
                <span className="stat-label">Platinas</span>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="app-main">
        {selectedGame ? (
          <div className="trophies-view">
            <div className="trophies-header">
              <button onClick={handleBackToGames} className="back-button">
                ← Voltar aos Jogos
              </button>
              <h2>{selectedGame.trophyTitleName}</h2>
              <div className="game-progress-info">
                <span>Progresso: {selectedGame.progress}%</span>
              </div>
            </div>
            
            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Carregando troféus...</p>
              </div>
            ) : (
              <div className="trophies-grid">
                {trophies.map((trophy) => (
                  <TrophyCard 
                    key={trophy.trophyId} 
                    trophy={trophy}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="games-view">
            <div className="games-header">
              <h2>Sua Coleção de Troféus</h2>
              <div className="games-count">
                {games.length} jogos encontrados
              </div>
            </div>
            
            <div className="games-grid">
              {games.map((game) => (
                <GameCard 
                  key={game.npTitleId} 
                  game={game}
                  onClick={() => handleGameClick(game)}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
