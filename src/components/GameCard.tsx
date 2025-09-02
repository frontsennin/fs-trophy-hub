import React, { useEffect } from 'react';
import { TrophyTitle } from '../types';
import './GameCard.css';

interface GameCardProps {
  game: TrophyTitle;
  onClick: () => void;
}

const GameCard: React.FC<GameCardProps> = ({ game, onClick }) => {
  // Debug: Log dos dados recebidos usando useEffect
  useEffect(() => {
    if (game) {
    }
  }, [game]);
  
  // Verificação de segurança
  if (!game) {
    console.error('❌ GameCard recebeu game undefined/null');
    return <div className="game-card error">Erro: Dados do jogo inválidos</div>;
  }
  const getPlatformIcon = (platform?: string) => {
    if (!platform) return '🎮';
    if (platform.includes('PS5')) return '🎮';
    if (platform.includes('PS4')) return '🎮';
    if (platform.includes('PS3')) return '🎮';
    return '🎮';
  };

  const getProgressColor = (progress: number) => {
    if (progress === 100) return '#4CAF50';
    if (progress >= 75) return '#FF9800';
    if (progress >= 50) return '#FFC107';
    if (progress >= 25) return '#FF5722';
    return '#F44336';
  };

  return (
    <div className="game-card" onClick={onClick}>
      <div className="game-header">
        <img 
          src={game.trophyTitleIconUrl || 'https://via.placeholder.com/100x100?text=🎮'} 
          alt={game.trophyTitleName || 'Jogo'}
          className="game-icon"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
        <div className="game-info">
          <h3 className="game-title">
            {game.trophyTitleName || 'Jogo sem nome'}
          </h3>
          <div className="game-platform">
            <span className="platform-icon">{getPlatformIcon(game.trophyTitlePlatform)}</span>
            <span className="platform-name">
              {game.trophyTitlePlatform || 'Plataforma não especificada'}
            </span>
          </div>
        </div>
      </div>

      <div className="game-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ 
              width: `${game.progress}%`,
              backgroundColor: getProgressColor(game.progress)
            }}
          ></div>
        </div>
        <span className="progress-text">
          {game.progress || 0}%
        </span>
      </div>

      <div className="game-footer">
        <div className="trophy-counts">
          {game.earnedTrophies && (
            <>
              <span className="trophy-count platinum">💎 {game.earnedTrophies.platinum}</span>
              <span className="trophy-count gold">🥇 {game.earnedTrophies.gold}</span>
              <span className="trophy-count silver">🥈 {game.earnedTrophies.silver}</span>
              <span className="trophy-count bronze">🥉 {game.earnedTrophies.bronze}</span>
            </>
          )}
        </div>
        <span className="last-updated">
          Atualizado: {new Date(game.lastUpdatedDate || new Date()).toLocaleDateString('pt-BR')}
        </span>
      </div>

      <div className="game-overlay">
        <span className="view-trophies">Ver Troféus</span>
      </div>
    </div>
  );
};

export default GameCard;
