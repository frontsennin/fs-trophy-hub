import React from 'react';
import './MockDataWarning.css';

const MockDataWarning: React.FC = () => {
  return (
    <div className="mock-data-warning">
      <div className="warning-content">
        <span className="warning-icon">🎮</span>
        <div className="warning-text">
          <strong>Dados PSN ao Vivo</strong>
          <p>Conectado à PlayStation Network via servidor proxy!</p>
        </div>
      </div>
    </div>
  );
};

export default MockDataWarning;
