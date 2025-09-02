import React, { useState, useEffect } from 'react';
import { CurrentGame, YouTubeVideo } from '../types';
import { FirebaseService } from '../services/firebaseService';
import './CurrentGameCard.css';

interface CurrentGameCardProps {
  currentGame: CurrentGame;
  onUpdateProgress?: (progress: number) => void;
}

const CurrentGameCard: React.FC<CurrentGameCardProps> = ({ currentGame, onUpdateProgress }) => {
  const [youtubeVideos, setYoutubeVideos] = useState<YouTubeVideo[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [showVideos, setShowVideos] = useState(false);

  useEffect(() => {
    if (currentGame?.youtubePlaylist) {
      loadYouTubeVideos();
    }
  }, [currentGame, currentGame?.youtubePlaylist]);

  const loadYouTubeVideos = async () => {
    if (!currentGame?.id) return;
    
    try {
      setLoadingVideos(true);
      const videos = await FirebaseService.getYouTubeVideosForGame(currentGame.id, 5);
      setYoutubeVideos(videos);
    } catch (error) {
      console.error('Erro ao carregar vídeos:', error);
    } finally {
      setLoadingVideos(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'platinating': return '#E5E4E2';
      case 'playing': return '#00d4ff';
      case 'completed': return '#4CAF50';
      default: return '#888';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'platinating': return 'Platinando';
      case 'playing': return 'Jogando';
      case 'completed': return 'Completado';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ff6b6b';
      case 'medium': return '#ffa726';
      case 'low': return '#66bb6a';
      default: return '#888';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const calculateDaysPlaying = () => {
    const startDate = new Date(currentGame.startedAt);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="current-game-card">
      <div className="current-game-header">
        <div className="game-info">
          <h2 className="game-title">{currentGame.gameTitle}</h2>
          <div className="game-meta">
            <span className="platform">{currentGame.platform}</span>
            <span className="status" style={{ color: getStatusColor(currentGame.status) }}>
              {getStatusText(currentGame.status)}
            </span>
            <span className="priority" style={{ color: getPriorityColor(currentGame.priority) }}>
              {currentGame.priority.toUpperCase()}
            </span>
          </div>
        </div>
        
        <div className="game-progress-section">
          <div className="progress-circle">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="35"
                fill="none"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="6"
              />
              <circle
                cx="40"
                cy="40"
                r="35"
                fill="none"
                stroke="#00d4ff"
                strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 35}`}
                strokeDashoffset={`${2 * Math.PI * 35 * (1 - currentGame.progress / 100)}`}
                transform="rotate(-90 40 40)"
                strokeLinecap="round"
              />
            </svg>
            <div className="progress-text">
              <span className="percentage">{currentGame.progress}%</span>
              <span className="label">Completo</span>
            </div>
          </div>
        </div>
      </div>

      <div className="current-game-details">
        <div className="detail-row">
          <div className="detail-item">
            <span className="label">Iniciado em:</span>
            <span className="value">{formatDate(currentGame.startedAt)}</span>
          </div>
          <div className="detail-item">
            <span className="label">Dias jogando:</span>
            <span className="value">{calculateDaysPlaying()} dias</span>
          </div>
        </div>
        
        {currentGame.targetCompletion && (
          <div className="detail-row">
            <div className="detail-item">
              <span className="label">Meta de conclusão:</span>
              <span className="value">{formatDate(currentGame.targetCompletion)}</span>
            </div>
          </div>
        )}
        
        {currentGame.notes && (
          <div className="detail-row">
            <div className="detail-item full-width">
              <span className="label">Notas:</span>
              <span className="value notes">{currentGame.notes}</span>
            </div>
          </div>
        )}
      </div>

      {currentGame.youtubePlaylist && (
        <div className="youtube-section">
          <button 
            className="youtube-toggle"
            onClick={() => setShowVideos(!showVideos)}
          >
            <span className="icon">📺</span>
            {showVideos ? 'Ocultar' : 'Mostrar'} Vídeos Recentes
            {loadingVideos && <span className="loading">...</span>}
          </button>
          
          {showVideos && (
            <div className="youtube-videos">
              {youtubeVideos.length > 0 ? (
                youtubeVideos.map((video) => (
                  <div key={video.id} className="youtube-video">
                    <div className="video-thumbnail">
                      <img src={video.thumbnailUrl} alt={video.title} />
                      <div className="video-duration">{video.duration}</div>
                    </div>
                    <div className="video-info">
                      <h4 className="video-title">{video.title}</h4>
                      <div className="video-meta">
                        <span className="video-date">
                          {formatDate(video.publishedAt)}
                        </span>
                        <span className="video-views">
                          {video.viewCount.toLocaleString()} visualizações
                        </span>
                      </div>
                    </div>
                    <a 
                      href={`https://www.youtube.com/watch?v=${video.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="watch-button"
                    >
                      Assistir
                    </a>
                  </div>
                ))
              ) : (
                <div className="no-videos">
                  <p>Nenhum vídeo encontrado para este jogo</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="current-game-actions">
        <button 
          className="action-button update-progress"
          onClick={() => onUpdateProgress?.(currentGame.progress)}
        >
          📊 Atualizar Progresso
        </button>
        
        <button className="action-button view-trophies">
          🏆 Ver Troféus
        </button>
      </div>
    </div>
  );
};

export default CurrentGameCard;
