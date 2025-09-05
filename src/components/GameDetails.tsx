import React, { useState, useEffect, useCallback } from "react";
import { TrophyTitle, Trophy } from "../types";
import { PSNService } from "../services/psnService";
import TrophyCard from "./TrophyCard";
import "./GameDetails.css";

interface GameDetailsProps {
  game: TrophyTitle;
  onBack: () => void;
}

const GameDetails: React.FC<GameDetailsProps> = ({ game, onBack }) => {
  const [trophies, setTrophies] = useState<Trophy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trophyFilter] = useState<
    "all" | "bronze" | "silver" | "gold" | "platinum" | "earned" | "unearned"
  >("all");
  const [sortBy] = useState<"type" | "name" | "earned" | "rate">("type");

  const loadGameTrophies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(
        `🎮 Carregando troféus do jogo ${game.trophyTitleName} (${game.npTitleId}) via proxy...`
      );

      const gameTrophies = await PSNService.getTrophiesForTitle(game.npTitleId);
      setTrophies(gameTrophies);

      if (gameTrophies.length === 0) {
        setError(
          "Nenhum troféu encontrado para este jogo. Pode ser um jogo muito antigo ou com problemas de sincronização."
        );
      } else {
        console.log(
          `✅ Carregados ${gameTrophies.length} troféus para ${game.trophyTitleName}`
        );
      }
    } catch (error) {
      console.error("Erro ao carregar troféus via proxy:", error);

      // Tratamento específico para diferentes tipos de erro
      if (error instanceof Error) {
        if (error.message.includes("Game not found")) {
          setError(
            "Jogo não encontrado na PlayStation Network. Pode ser um jogo muito antigo ou com problemas de sincronização."
          );
        } else if (error.message.includes("500")) {
          setError(
            "Erro temporário do servidor. Tente novamente em alguns minutos."
          );
        } else if (error.message.includes("Proxy request failed")) {
          setError(
            "Erro de conexão com o servidor proxy. Verifique se o servidor está rodando em localhost:3001."
          );
        } else {
          setError(`Erro ao carregar troféus: ${error.message}`);
        }
      } else {
        setError("Erro desconhecido ao carregar troféus do jogo");
      }
    } finally {
      setLoading(false);
    }
  }, [game]);

  useEffect(() => {
    loadGameTrophies();
  }, [loadGameTrophies]);

  const getFilteredTrophies = () => {
    let filtered = [...trophies];

    // Aplicar filtro por tipo
    if (trophyFilter !== "all") {
      if (trophyFilter === "earned") {
        filtered = filtered.filter((trophy) => trophy.earned);
      } else if (trophyFilter === "unearned") {
        filtered = filtered.filter((trophy) => !trophy.earned);
      } else {
        filtered = filtered.filter(
          (trophy) => trophy.trophyType === trophyFilter
        );
      }
    }

    // Aplicar ordenação
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "type":
          const typeOrder = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
          return typeOrder[a.trophyType] - typeOrder[b.trophyType];
        case "name":
          return a.trophyName.localeCompare(b.trophyName);
        case "earned":
          return b.earned ? 1 : -1;
        case "rate":
          return (
            parseFloat(b.trophyEarnedRate) - parseFloat(a.trophyEarnedRate)
          );
        default:
          return 0;
      }
    });
  };

  const filteredTrophies = getFilteredTrophies();

  const getPlatformIcon = (platform: string) => {
    if (platform.includes("PS5")) return "🎮";
    if (platform.includes("PS4")) return "🎮";
    if (platform.includes("PS3")) return "🎮";
    if (platform.includes("PS Vita")) return "📱";
    return "🎮";
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  };

  return (
    <div className="game-details">
      {/* Botão Voltar */}
      <div className="back-button-container">
        <button className="back-button" onClick={onBack}>
          ← Voltar aos Jogos
        </button>
      </div>

      {/* SEÇÃO 1: DETALHES DO JOGO */}
      <div className="game-details-section">
        <h2 className="section-title">DETALHES DO JOGO</h2>

        <div className="game-banner">
          <div className="game-banner-content">
            <div className="game-icon-large">
              <img
                src={
                  game.trophyTitleIconUrl ||
                  "https://via.placeholder.com/200x200?text=🎮"
                }
                alt={game.trophyTitleName}
                className="game-details-icon"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://via.placeholder.com/200x200?text=🎮";
                }}
              />
            </div>

            <div className="game-info-content">
              <h1 className="game-title">{game.trophyTitleName}</h1>
              <div className="game-platform-info">
                <span className="platform-icon">
                  {getPlatformIcon(game.trophyTitlePlatform)}
                </span>
                <span className="platform-name">
                  {game.trophyTitlePlatform}
                </span>
              </div>
              <div className="game-meta">
                <span className="last-updated">
                  Última atualização: {formatDate(game.lastUpdatedDate)}
                </span>
              </div>
            </div>
            <div className="progress-overview">
              <div
                className="progress-circle"
                style={
                  {
                    "--progress": `${game.progress * 3.6}deg`,
                  } as React.CSSProperties
                }
              >
                <div className="progress-percentage">{game.progress}%</div>
                <div className="progress-label">Completo</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: RESUMO DOS TROFÉUS */}
      <div className="trophy-summary-section">
        <h2 className="section-title">RESUMO DOS TROFÉUS</h2>

        <div className="trophy-summary-content">
          <div className="trophy-breakdown">
            <div className="trophy-counts-grid">
              <div className="trophy-count-card bronze">
                <div className="trophy-icon">🥉</div>
                <div className="trophy-count">
                  <div className="count">
                    {game.earnedTrophies?.bronze || 0}/
                    {game.definedTrophies?.bronze || 0}
                  </div>
                  <div className="label">Bronze</div>
                </div>
              </div>

              <div className="trophy-count-card silver">
                <div className="trophy-icon">🥈</div>
                <div className="trophy-count">
                  <div className="count">
                    {game.earnedTrophies?.silver || 0}/
                    {game.definedTrophies?.silver || 0}
                  </div>
                  <div className="label">Prata</div>
                </div>
              </div>

              <div className="trophy-count-card gold">
                <div className="trophy-icon">🥇</div>
                <div className="trophy-count">
                  <div className="count">
                    {game.earnedTrophies?.gold || 0}/
                    {game.definedTrophies?.gold || 0}
                  </div>
                  <div className="label">Ouro</div>
                </div>
              </div>

              <div className="trophy-count-card platinum">
                <div className="trophy-icon">💎</div>
                <div className="trophy-count">
                  <div className="count">
                    {game.earnedTrophies?.platinum || 0}/
                    {game.definedTrophies?.platinum || 0}
                  </div>
                  <div className="label">Platina</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO 3: TROFÉUS */}
      <div className="trophies-section">
        <h2 className="section-title">TROFÉUS ({filteredTrophies.length})</h2>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Carregando troféus...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <h3>Não foi possível carregar os troféus</h3>
            <p>{error}</p>
            <div className="error-actions">
              <button onClick={loadGameTrophies} className="retry-button">
                🔄 Tentar Novamente
              </button>
              <button onClick={onBack} className="back-to-games-button">
                ← Voltar aos Jogos
              </button>
            </div>
          </div>
        ) : (
          <div className="trophies-grid">
            {filteredTrophies.map((trophy) => (
              <TrophyCard key={trophy.trophyId} trophy={trophy} />
            ))}
          </div>
        )}

        {!loading && !error && filteredTrophies.length === 0 && (
          <div className="no-trophies">
            <p>🔍 Nenhum troféu encontrado com os filtros aplicados.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameDetails;
