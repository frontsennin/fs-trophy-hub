import React, { useState, useEffect } from 'react';
import { CurrentGame } from '../types';
import { FirebaseService } from '../services/firebaseService';
import './CurrentGameForm.css';

interface CurrentGameFormProps {
  onClose: () => void;
  onGameUpdated: () => void;
}

const CurrentGameForm: React.FC<CurrentGameFormProps> = ({ onClose, onGameUpdated }) => {
  const [formData, setFormData] = useState<Partial<CurrentGame>>({
    gameTitle: '',
    platform: '',
    youtubePlaylist: '',
    notes: '',
    progress: 0,
    status: 'playing',
    priority: 'medium'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentGame();
  }, []);

  const loadCurrentGame = async () => {
    try {
      const currentGame = await FirebaseService.getCurrentGame();
      if (currentGame) {
        setFormData({
          gameTitle: currentGame.gameTitle || '',
          platform: currentGame.platform || '',
          youtubePlaylist: currentGame.youtubePlaylist || '',
          notes: currentGame.notes || '',
          progress: currentGame.progress || 0,
          status: currentGame.status || 'playing',
          priority: currentGame.priority || 'medium'
        });
      }
    } catch (error) {
      console.error('Erro ao carregar jogo atual:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Criar ou atualizar jogo atual
      if (formData.gameTitle && formData.platform) {
        await FirebaseService.setCurrentGame({
          gameTitle: formData.gameTitle,
          platform: formData.platform,
          gameId: formData.gameId || `game_${Date.now()}`,
          startedAt: new Date(),
          progress: formData.progress || 0,
          status: formData.status || 'playing',
          priority: formData.priority || 'medium',
          notes: formData.notes || '',
          youtubePlaylist: formData.youtubePlaylist || ''
        });

        setSuccess('✅ Jogo atual definido com sucesso!');
        
        // Limpar mensagem de sucesso após 3 segundos
        setTimeout(() => {
          setSuccess(null);
          onGameUpdated();
        }, 3000);
      } else {
        setError('❌ Nome do jogo e plataforma são obrigatórios!');
      }
    } catch (error) {
      console.error('Erro ao salvar jogo atual:', error);
      setError('❌ Erro ao salvar jogo atual. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CurrentGame, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="current-game-form">
      <div className="form-header">
        <h2>🎮 Gerenciar Jogo Atual</h2>
        <button className="close-button" onClick={onClose}>
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="game-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="gameTitle">🎯 Nome do Jogo *</label>
            <input
              type="text"
              id="gameTitle"
              value={formData.gameTitle || ''}
              onChange={(e) => handleInputChange('gameTitle', e.target.value)}
              placeholder="Digite o nome do jogo"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="platform">🎮 Plataforma *</label>
            <select
              id="platform"
              value={formData.platform || ''}
              onChange={(e) => handleInputChange('platform', e.target.value)}
              required
            >
              <option value="">Selecione a plataforma</option>
              <option value="PS5">PS5</option>
              <option value="PS4">PS4</option>
              <option value="PS3">PS3</option>
              <option value="PS Vita">PS Vita</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="youtubePlaylist">📺 Link da Playlist YouTube</label>
            <input
              type="url"
              id="youtubePlaylist"
              value={formData.youtubePlaylist || ''}
              onChange={(e) => handleInputChange('youtubePlaylist', e.target.value)}
              placeholder="https://www.youtube.com/playlist?list=..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="progress">📊 Progresso (%)</label>
            <input
              type="number"
              id="progress"
              min="0"
              max="100"
              value={formData.progress || 0}
              onChange={(e) => handleInputChange('progress', parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="status">📈 Status</label>
            <select
              id="status"
              value={formData.status || 'playing'}
              onChange={(e) => handleInputChange('status', e.target.value)}
            >
              <option value="playing">🎮 Jogando</option>
              <option value="platinating">🏆 Platinando</option>
              <option value="completed">✅ Completo</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="priority">⭐ Prioridade</label>
            <select
              id="priority"
              value={formData.priority || 'medium'}
              onChange={(e) => handleInputChange('priority', e.target.value)}
            >
              <option value="high">🔥 Alta</option>
              <option value="medium">⚡ Média</option>
              <option value="low">💤 Baixa</option>
            </select>
          </div>
        </div>

        <div className="form-group full-width">
          <label htmlFor="notes">📝 Informações Adicionais</label>
          <textarea
            id="notes"
            value={formData.notes || ''}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Dicas, truques, objetivos, metas, etc..."
            rows={4}
          />
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        {success && (
          <div className="success-message">
            <span className="success-icon">✅</span>
            {success}
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={onClose}
            disabled={loading}
          >
            ❌ Cancelar
          </button>
          
          <button
            type="submit"
            className="save-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="loading-spinner"></div>
                Salvando...
              </>
            ) : (
              '💾 Salvar Jogo Atual'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CurrentGameForm;
