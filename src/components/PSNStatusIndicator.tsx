import React, { useState, useEffect } from 'react';
import { PSNService } from '../services/psnService';
import './PSNStatusIndicator.css';

const PSNStatusIndicator: React.FC = () => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [tokenInfo, setTokenInfo] = useState<{
    hasTokens: boolean;
    accessTokenExpired: boolean;
    refreshTokenExpired: boolean;
    expiresIn: number | null;
  } | null>(null);
  const [environmentInfo, setEnvironmentInfo] = useState<{
    isDevelopment: boolean;
    isLocalhost: boolean;
    isVercel: boolean;
    useProxy: boolean;
    proxyUrl: string;
    productionUrl: string;
  } | null>(null);

  useEffect(() => {
    checkPSNStatus();
    // Obter informações do ambiente
    const envInfo = PSNService.getEnvironmentInfo();
    setEnvironmentInfo(envInfo);
  }, []);

  const checkPSNStatus = async () => {
    try {
      setStatus('checking');
      const isWorking = await PSNService.checkServerStatus();
      
      if (isWorking) {
        setStatus('connected');
        const tokenStatus = PSNService.getTokenStatus();
        setTokenInfo(tokenStatus);
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
      console.error('Erro ao verificar status PSN:', error);
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'checking':
        return 'Verificando PSN...';
      case 'connected':
        return 'Conectado à PSN';
      case 'error':
        return 'Erro na conexão PSN';
      default:
        return 'Status desconhecido';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
        return '⏳';
      case 'connected':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '❓';
    }
  };

  const getExpiryText = () => {
    if (!tokenInfo?.expiresIn) return '';
    
    const minutes = Math.floor(tokenInfo.expiresIn / 60);
    const seconds = Math.floor(tokenInfo.expiresIn % 60);
    
    if (minutes > 0) {
      return `Expira em ${minutes}m ${seconds}s`;
    }
    return `Expira em ${seconds}s`;
  };

  const getConnectionMode = () => {
    if (!environmentInfo) return '';
    
    if (environmentInfo.isVercel) {
      return '🌐 Vercel + Firebase';
    } else if (environmentInfo.useProxy) {
      return '🔄 Via Proxy Local';
    } else {
      return '🌐 Direto PSN';
    }
  };

  const getEnvironmentBadge = () => {
    if (!environmentInfo) return null;
    
    if (environmentInfo.isVercel) {
      return (
        <div className="environment-badge vercel">
          <span className="badge-icon">🚀</span>
          <span className="badge-text">Vercel + Firebase</span>
        </div>
      );
    } else if (environmentInfo.useProxy) {
      return (
        <div className="environment-badge proxy">
          <span className="badge-icon">🔄</span>
          <span className="badge-text">Local + Proxy</span>
        </div>
      );
    } else {
      return (
        <div className="environment-badge production">
          <span className="badge-icon">🌐</span>
          <span className="badge-text">Produção + Firebase</span>
        </div>
      );
    }
  };

  return (
    <div className="psn-status-indicator">
      {/* Badge de ambiente */}
      {getEnvironmentBadge()}
      
      {/* Status da conexão */}
      <div className={`status-badge ${status}`}>
        <span className="status-icon">{getStatusIcon()}</span>
        <span className="status-text">{getStatusText()}</span>
      </div>
      
      {/* Modo de conexão */}
      <div className="connection-mode">
        <span className="mode-text">{getConnectionMode()}</span>
      </div>
      
      {status === 'connected' && tokenInfo && (
        <div className="token-info">
          <div className="token-status">
            <span className="token-label">Access Token:</span>
            <span className={`token-value ${tokenInfo.accessTokenExpired ? 'expired' : 'valid'}`}>
              {tokenInfo.accessTokenExpired ? 'Expirado' : 'Válido'}
            </span>
          </div>
          
          {!tokenInfo.accessTokenExpired && tokenInfo.expiresIn && (
            <div className="token-expiry">
              <span className="expiry-text">{getExpiryText()}</span>
            </div>
          )}
          
          <button 
            className="refresh-button"
            onClick={checkPSNStatus}
            title="Verificar status novamente"
          >
            🔄
          </button>
        </div>
      )}
      
      {status === 'error' && (
        <div className="error-actions">
          <button 
            className="retry-button"
            onClick={checkPSNStatus}
          >
            Tentar Novamente
          </button>
        </div>
      )}
      
      {/* Informações do ambiente */}
      {environmentInfo && (
        <div className="environment-info">
          <div className="env-details">
            <span className="env-label">Ambiente:</span>
            <span className="env-value">
              {environmentInfo.isDevelopment ? 'Desenvolvimento' : 'Produção'}
            </span>
          </div>
          <div className="env-details">
            <span className="env-label">Host:</span>
            <span className="env-value">
              {environmentInfo.isLocalhost ? 'Localhost' : 'Vercel'}
            </span>
          </div>
          <div className="env-details">
            <span className="env-label">Modo:</span>
            <span className="env-value">
              {environmentInfo.useProxy ? 'Proxy Local' : 'API Direta'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PSNStatusIndicator;
