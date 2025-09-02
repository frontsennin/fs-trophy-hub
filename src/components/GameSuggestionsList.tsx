import React, { useState, useEffect } from 'react';
import { GameSuggestion } from '../types';
import { FirebaseService } from '../services/firebaseService';
import './GameSuggestionsList.css';

interface GameSuggestionsListProps {
  onClose?: () => void;
}

const GameSuggestionsList: React.FC<GameSuggestionsListProps> = ({ onClose }) => {
  const [suggestions, setSuggestions] = useState<GameSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userIP, setUserIP] = useState<string>('');

  useEffect(() => {
    loadSuggestions();
    getUserIP();
  }, []);

  const getUserIP = async () => {
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

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      const allSuggestions = await FirebaseService.getGameSuggestions();
      
      // Ordenar por pontos (maior para menor) e depois por data (mais recente)
      const sortedSuggestions = allSuggestions.sort((a, b) => {
        const aPoints = a.points ?? 0;
        const bPoints = b.points ?? 0;
        
        if (bPoints !== aPoints) {
          return bPoints - aPoints;
        }
        return new Date(b.suggestedAt).getTime() - new Date(a.suggestedAt).getTime();
      });
      
      setSuggestions(sortedSuggestions);
    } catch (error) {
      setError('Erro ao carregar sugestões');
      console.error('Erro ao carregar sugestões:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (suggestionId: string) => {
    if (!userIP) {
      alert('Aguarde um momento para poder votar...');
      return;
    }

    try {
      const suggestion = suggestions.find(s => s.id === suggestionId);
      if (!suggestion) return;

      // Verificar se já votou
      if ((suggestion.votedBy ?? []).includes(userIP)) {
        alert('Você já votou nesta sugestão!');
        return;
      }

      // Atualizar pontos
      await FirebaseService.updateSuggestionPoints(suggestionId, userIP);
      
      // Recarregar sugestões
      await loadSuggestions();
      
    } catch (error) {
      console.error('Erro ao votar:', error);
      alert('Erro ao votar. Tente novamente.');
    }
  };

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

  if (loading) {
    return (
      <div className="game-suggestions-list">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Carregando sugestões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="game-suggestions-list">
      <div className="list-header">
        <h2>🎮 Sugestões de Jogos</h2>
        <button className="close-button" onClick={onClose}>
          ✕
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {suggestions.length === 0 ? (
        <div className="no-suggestions">
          <p>Nenhuma sugestão encontrada.</p>
          <p>Seja o primeiro a sugerir um jogo!</p>
        </div>
      ) : (
        <div className="suggestions-container">
          {suggestions.map((suggestion) => (
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
                  <strong>Sugerido por:</strong> {suggestion.userInfo.name}
                </p>
                <p className="suggestion-date">
                  <strong>Data:</strong> {new Date(suggestion.suggestedAt).toLocaleDateString('pt-BR')}
                </p>
                {suggestion.reason && (
                  <p className="suggestion-reason">
                    <strong>Motivo:</strong> {suggestion.reason}
                  </p>
                )}
                {suggestion.userInfo.contact && (
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
                    className={`vote-button ${(suggestion.votedBy ?? []).includes(userIP) ? 'voted' : ''}`}
                    onClick={() => handleVote(suggestion.id)}
                    disabled={(suggestion.votedBy ?? []).includes(userIP)}
                    title={(suggestion.votedBy ?? []).includes(userIP) ? 'Você já votou!' : 'Clique para dar um ponto!'}
                  >
                    {(suggestion.votedBy ?? []).includes(userIP) ? '⭐ Votado' : '⭐ Votar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GameSuggestionsList;
