import React, { useState } from 'react';
import { GameSuggestion } from '../types';
import { FirebaseService } from '../services/firebaseService';
import './GameSuggestionForm.css';

interface GameSuggestionFormProps {
  onSuggestionSubmitted?: (suggestion: GameSuggestion) => void;
  onClose?: () => void;
}

const GameSuggestionForm: React.FC<GameSuggestionFormProps> = ({ 
  onSuggestionSubmitted, 
  onClose 
}) => {
  const [formData, setFormData] = useState({
    gameTitle: '',
    platform: 'PS5' as GameSuggestion['platform'],
    suggestedBy: '',
    isAnonymous: false,
    contact: '',
    reason: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const platforms = [
    { value: 'PS5', label: 'PlayStation 5' },
    { value: 'PS4', label: 'PlayStation 4' },
    { value: 'PS3', label: 'PlayStation 3' },
    { value: 'PS Vita', label: 'PlayStation Vita' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateForm = (): boolean => {
    if (!formData.gameTitle.trim()) {
      setError('Nome do jogo é obrigatório');
      return false;
    }
    
    if (!formData.suggestedBy.trim() && !formData.isAnonymous) {
      setError('Nome é obrigatório ou marque como anônimo');
      return false;
    }
    
    if (formData.isAnonymous && !formData.contact.trim()) {
      setError('Contato é obrigatório para sugestões anônimas');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Verificar se o jogo já existe na biblioteca ou se há sugestões similares
      const { exists, similarSuggestions } = await FirebaseService.checkGameSuggestion(formData.gameTitle, formData.platform);
      
      if (exists) {
        setError('Este jogo já está na biblioteca!');
        return;
      }
      
      if (similarSuggestions.length > 0) {
        const similarNames = similarSuggestions.map(s => s.gameTitle).join(', ');
        setError(`Jogo similar já foi sugerido: ${similarNames}. Verifique se não é o mesmo jogo!`);
        return;
      }
      
      // Criar sugestão
      const suggestion: Omit<GameSuggestion, 'id'> = {
        gameTitle: formData.gameTitle.trim(),
        platform: formData.platform,
        suggestedBy: formData.isAnonymous ? 'Anônimo' : formData.suggestedBy.trim(),
        suggestedAt: new Date(),
        status: 'pending',
        userInfo: {
          name: formData.isAnonymous ? 'Anônimo' : formData.suggestedBy.trim(),
          isAnonymous: formData.isAnonymous
        }
      };
      
      // Adicionar campos opcionais apenas se tiverem valor
      if (formData.contact.trim()) {
        suggestion.userInfo.contact = formData.contact.trim();
      }
      
      if (formData.reason.trim()) {
        suggestion.reason = formData.reason.trim();
      }
      
      // Log para debug
      console.log('🔍 Sugestão sendo enviada:', suggestion);
      
      const suggestionId = await FirebaseService.addGameSuggestion(suggestion);
      
      // Criar sugestão completa com ID
      const completeSuggestion: GameSuggestion = {
        id: suggestionId,
        ...suggestion
      };
      
      setSuccess(true);
      setFormData({
        gameTitle: '',
        platform: 'PS5',
        suggestedBy: '',
        isAnonymous: false,
        contact: '',
        reason: ''
      });
      
      // Callback para componente pai
      onSuggestionSubmitted?.(completeSuggestion);
      
      // Auto-close após 3 segundos
      setTimeout(() => {
        setSuccess(false);
        onClose?.();
      }, 3000);
      
    } catch (err) {
      setError('Erro ao enviar sugestão. Tente novamente.');
      console.error('Erro ao enviar sugestão:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose?.();
    }
  };

  if (success) {
    return (
      <div className="game-suggestion-form success">
        <div className="success-content">
          <div className="success-icon">✅</div>
          <h3>Sugestão Enviada!</h3>
          <p>Obrigado pela sugestão! Vou analisar e responder em breve.</p>
          <button className="close-button" onClick={handleClose}>
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-suggestion-form">
      <div className="form-container">
        <div className="form-header">
          <h2>🎮 Sugerir Jogo</h2>
          <button className="close-button" onClick={handleClose} disabled={loading}>
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="gameTitle">Nome do Jogo *</label>
          <input
            type="text"
            id="gameTitle"
            name="gameTitle"
            value={formData.gameTitle}
            onChange={handleInputChange}
            placeholder="Ex: God of War Ragnarök"
            disabled={loading}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="platform">Plataforma *</label>
          <select
            id="platform"
            name="platform"
            value={formData.platform}
            onChange={handleInputChange}
            disabled={loading}
            required
          >
            {platforms.map(platform => (
              <option key={platform.value} value={platform.value}>
                {platform.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="isAnonymous"
              checked={formData.isAnonymous}
              onChange={handleInputChange}
              disabled={loading}
            />
            <span className="checkmark"></span>
            Sugestão Anônima
          </label>
        </div>
        
        {!formData.isAnonymous && (
          <div className="form-group">
            <label htmlFor="suggestedBy">Seu Nome *</label>
            <input
              type="text"
              id="suggestedBy"
              name="suggestedBy"
              value={formData.suggestedBy}
              onChange={handleInputChange}
              placeholder="Como você gostaria de ser chamado?"
              disabled={loading}
            />
          </div>
        )}
        
        <div className="form-group">
          <label htmlFor="contact">Contato (Opcional)</label>
          <input
            type="text"
            id="contact"
            name="contact"
            value={formData.contact}
            onChange={handleInputChange}
            placeholder="Email, Discord, Twitter, etc."
            disabled={loading}
          />
          {formData.isAnonymous && (
            <small className="help-text">
              Para sugestões anônimas, o contato é obrigatório para eu poder responder
            </small>
          )}
        </div>
        
        <div className="form-group">
          <label htmlFor="reason">Por que você sugere este jogo?</label>
          <textarea
            id="reason"
            name="reason"
            value={formData.reason}
            onChange={handleInputChange}
            placeholder="Conte um pouco sobre o jogo e por que seria legal eu jogar..."
            rows={4}
            disabled={loading}
          />
        </div>
        
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}
        
        <div className="form-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="submit-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Enviando...
              </>
            ) : (
              'Enviar Sugestão'
            )}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
};

export default GameSuggestionForm;
