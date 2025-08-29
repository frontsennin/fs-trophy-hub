import React from 'react';
import { Trophy } from '../types';
import './TrophyCard.css';

interface TrophyCardProps {
  trophy: Trophy;
  onClick?: () => void;
}

const TrophyCard: React.FC<TrophyCardProps> = ({ trophy, onClick }) => {
  const getTrophyColor = (type: string) => {
    switch (type) {
      case 'platinum':
        return '#E5E4E2';
      case 'gold':
        return '#FFD700';
      case 'silver':
        return '#C0C0C0';
      case 'bronze':
        return '#CD7F32';
      default:
        return '#888';
    }
  };

  const getTrophyIcon = (type: string) => {
    switch (type) {
      case 'platinum':
        return '💎';
      case 'gold':
        return '🥇';
      case 'silver':
        return '🥈';
      case 'bronze':
        return '🥉';
      default:
        return '🏆';
    }
  };

  return (
    <div 
      className={`trophy-card ${trophy.earned ? 'earned' : 'unearned'}`}
      onClick={onClick}
    >
      <div className="trophy-header">
        <div className="trophy-icon" style={{ color: getTrophyColor(trophy.trophyType) }}>
          {getTrophyIcon(trophy.trophyType)}
        </div>
        <div className="trophy-info">
          <h3 className="trophy-name">{trophy.trophyName}</h3>
          <span className="trophy-type">{trophy.trophyType.toUpperCase()}</span>
        </div>
      </div>
      
      <div className="trophy-details">
        <p className="trophy-description">{trophy.trophyDetail}</p>
        {trophy.earned && (
          <p className="trophy-earned-status">
            <span className="earned-badge">✓ Conquistado</span>
          </p>
        )}
        <p className="trophy-rate">Taxa de Conquista: {trophy.trophyEarnedRate}%</p>
      </div>

      {trophy.trophyHidden && (
        <div className="trophy-hidden">
          <span>🔒 Troféu Oculto</span>
        </div>
      )}
    </div>
  );
};

export default TrophyCard;
