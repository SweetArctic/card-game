import { useState, useEffect } from "react";
import { useGetPlayerState, getGetPlayerStateQueryKey } from "@workspace/api-client-react";

export function usePlayer() {
  const [playerId, setPlayerId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("tcg_player_id");
    }
    return null;
  });

  useEffect(() => {
    if (playerId) {
      localStorage.setItem("tcg_player_id", playerId);
    } else {
      localStorage.removeItem("tcg_player_id");
    }
  }, [playerId]);

  const { data: gameState, isLoading, error } = useGetPlayerState(playerId || "", {
    query: {
      enabled: !!playerId,
      queryKey: getGetPlayerStateQueryKey(playerId || ""),
      staleTime: 5000,
    },
  });

  const logout = () => setPlayerId(null);

  return {
    playerId,
    setPlayerId,
    gameState,
    isLoading: !!playerId && isLoading,
    error,
    logout,
  };
}