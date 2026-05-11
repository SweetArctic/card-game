import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { usePlayer } from "@/hooks/use-player";
import { usePlayMatchAction, getGetPlayerStateQueryKey, MatchActionRequestActionType } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Sword, Shield, Heart, Zap, Play, Flame, Activity, Info } from "lucide-react";

export default function Battle() {
  const { playerId, gameState } = usePlayer();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const playActionMutation = usePlayMatchAction();

  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<MatchActionRequestActionType | null>(null);

  const match = gameState?.activeMatch;

  useEffect(() => {
    if (gameState && !match) {
      toast.info("No active match found");
      setLocation("/rooms");
    }
  }, [gameState, match, setLocation]);

  useEffect(() => {
    if (!match || !playerId) return;
    if (match.currentTurnPlayerId !== playerId && match.status === "active") {
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: getGetPlayerStateQueryKey(playerId) });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [match, playerId, queryClient]);

  if (!match || !playerId) return (
    <div className="flex h-screen items-center justify-center bg-background text-foreground">
      Loading battlefield...
    </div>
  );

  const isMyTurn = match.currentTurnPlayerId === playerId;
  const isGameOver = match.status === "finished";
  const iWon = match.winnerPlayerId === playerId;

  const myCards = match.battlefield.filter(c => c.ownerId === playerId && !c.defeated);
  const opponentCards = match.battlefield.filter(c => c.ownerId !== playerId && !c.defeated);

  const handleExecuteAction = () => {
    if (!selectedActorId || !selectedAction) return;

    playActionMutation.mutate({
      matchId: match.id,
      data: {
        playerId,
        actorInstanceId: selectedActorId,
        targetInstanceId: selectedTargetId || undefined,
        actionType: selectedAction
      }
    }, {
      onSuccess: (newMatch) => {
        queryClient.setQueryData(getGetPlayerStateQueryKey(playerId), (current: any) => current ? { ...current, activeMatch: newMatch } : current);
        setSelectedActorId(null);
        setSelectedTargetId(null);
        setSelectedAction(null);
        toast.success("Action executed!");
      },
      onError: (err: any) => {
        toast.error(err?.message || "Failed to execute action");
      }
    });
  };

  const actionIcons = {
    [MatchActionRequestActionType.attack]: <Sword size={16} />,
    [MatchActionRequestActionType.protect]: <Shield size={16} />,
    [MatchActionRequestActionType.heal]: <Heart size={16} />,
    [MatchActionRequestActionType.steal]: <Activity size={16} />,
    [MatchActionRequestActionType.empower]: <Zap size={16} />,
    [MatchActionRequestActionType.elemental]: <Flame size={16} />,
  };

  if (isGameOver) {
    return (
      <div className="flex h-screen items-center justify-center bg-background relative overflow-hidden">
        <div className={`absolute inset-0 opacity-20 ${iWon ? "bg-primary" : "bg-destructive"} blur-[100px]`} />
        <Card className="z-10 p-12 max-w-lg w-full text-center bg-card/80 backdrop-blur-xl border-2 shadow-2xl">
          <h1 className={`text-6xl font-bold mb-6 tracking-tighter uppercase ${iWon ? "text-primary" : "text-destructive"}`}>
            {iWon ? "VICTORY" : "DEFEAT"}
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            {iWon ? "You have crushed your opponent." : "Your squad has fallen."}
          </p>
          <Button size="lg" className="w-full text-lg h-14" onClick={() => setLocation("/")}>
            Return to Arena
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0a0f1a] relative overflow-hidden select-none">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none z-0" />
      <div className={`absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b ${isMyTurn ? "from-background to-transparent" : "from-destructive/10 to-transparent"} pointer-events-none z-0 transition-colors duration-1000`} />
      <div className={`absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t ${isMyTurn ? "from-primary/10 to-transparent" : "from-background to-transparent"} pointer-events-none z-0 transition-colors duration-1000`} />

      <header className="relative z-10 p-4 flex justify-between items-center bg-background/50 backdrop-blur-md border-b border-border/50">
        <div>
          <div className="text-xs text-muted-foreground font-bold tracking-widest uppercase">Match #{match.id.substring(0,6)}</div>
          <div className="text-lg font-bold">Turn <span className="text-primary">{match.turnNumber}</span></div>
        </div>
        <div className="text-center">
          <div className={`px-6 py-2 rounded-full border-2 font-bold tracking-widest uppercase transition-colors ${isMyTurn ? "bg-primary/20 border-primary text-primary shadow-[0_0_20px_rgba(251,191,36,0.3)]" : "bg-destructive/20 border-destructive text-destructive"}`}>
            {isMyTurn ? "YOUR TURN" : "OPPONENT TURN"}
          </div>
        </div>
        <div>
          <Button variant="outline" size="sm" onClick={() => setLocation("/")} className="border-border text-muted-foreground">
            Flee
          </Button>
        </div>
      </header>

      <div className="flex-1 relative z-10 flex flex-col justify-between py-6 px-4 sm:px-8 max-w-7xl mx-auto w-full overflow-y-auto">
        <div className="flex flex-wrap justify-center items-center gap-4 min-h-[260px]">
          {opponentCards.map(card => (
            <CombatCardView
              key={card.instanceId}
              card={card}
              isMine={false}
              isSelected={selectedTargetId === card.instanceId}
              onClick={() => {
                if (selectedActorId && isMyTurn) {
                  setSelectedTargetId(card.instanceId === selectedTargetId ? null : card.instanceId);
                }
              }}
            />
          ))}
          {opponentCards.length === 0 && <div className="text-muted-foreground/50 font-bold uppercase tracking-widest text-2xl">Field Empty</div>}
        </div>

        <div className="min-h-36 flex items-center justify-center relative py-4">
          <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
            <div className="w-full max-w-md h-[1px] bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
          <div className="bg-background/80 backdrop-blur-xl border border-border p-4 rounded-xl shadow-2xl max-w-2xl w-full flex flex-col items-center">
            {isMyTurn && selectedActorId ? (
              <div className="w-full">
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  {Object.values(MatchActionRequestActionType).map(action => (
                    <Button
                      key={action}
                      variant={selectedAction === action ? "default" : "outline"}
                      className={`capitalize ${selectedAction === action ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(251,191,36,0.4)]" : ""}`}
                      onClick={() => setSelectedAction(action)}
                      data-testid={`button-action-${action}`}
                    >
                      {actionIcons[action as keyof typeof actionIcons]} <span className="ml-2">{action}</span>
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button 
                    className="flex-1 text-lg font-bold tracking-wider" 
                    size="lg"
                    disabled={!selectedAction || playActionMutation.isPending}
                    onClick={handleExecuteAction}
                    data-testid="button-execute-action"
                  >
                    EXECUTE <Play size={18} className="ml-2" />
                  </Button>
                  <Button variant="ghost" onClick={() => { setSelectedActorId(null); setSelectedAction(null); setSelectedTargetId(null); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="w-full space-y-2">
                <div className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-1 border-b border-border/50 pb-1">Battle Log</div>
                <div className="h-16 overflow-y-auto flex flex-col-reverse text-sm font-mono">
                  {match.log.length > 0 ? (
                    match.log.slice(-3).reverse().map((log, i) => (
                      <div key={i} className={`${i === 0 ? "text-foreground" : "text-muted-foreground/60"}`}>{log}</div>
                    ))
                  ) : (
                    <div className="text-muted-foreground/50">The battle begins...</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-4 min-h-[260px]">
          {myCards.map(card => (
            <CombatCardView
              key={card.instanceId}
              card={card}
              isMine={true}
              isSelected={selectedActorId === card.instanceId || selectedTargetId === card.instanceId}
              onClick={() => {
                if (!isMyTurn) return;
                if (selectedActorId && selectedActorId !== card.instanceId) {
                  setSelectedTargetId(card.instanceId === selectedTargetId ? null : card.instanceId);
                } else {
                  if (card.charges > 0) {
                    setSelectedActorId(card.instanceId === selectedActorId ? null : card.instanceId);
                    if (selectedActorId === card.instanceId) {
                      setSelectedAction(null);
                      setSelectedTargetId(null);
                    }
                  } else {
                    toast.error("This card has no charges left this turn.");
                  }
                }
              }}
            />
          ))}
          {myCards.length === 0 && <div className="text-destructive/50 font-bold uppercase tracking-widest text-2xl">Squad Eliminated</div>}
        </div>
      </div>
    </div>
  );
}

function CombatCardView({ card, isMine, isSelected, onClick }: { card: any, isMine: boolean, isSelected: boolean, onClick: () => void }) {
  const roleColors: Record<string, string> = {
    infanteria: "border-red-500/50 bg-red-950/40 text-red-100",
    caballero: "border-blue-500/50 bg-blue-950/40 text-blue-100",
    centinela: "border-slate-500/50 bg-slate-900/40 text-slate-100",
    curador: "border-green-500/50 bg-green-950/40 text-green-100",
    saqueador: "border-purple-500/50 bg-purple-950/40 text-purple-100",
    hechizo: "border-pink-500/50 bg-pink-950/40 text-pink-100",
    artefacto: "border-amber-500/50 bg-amber-950/40 text-amber-100",
    piedra: "border-cyan-500/50 bg-cyan-950/40 text-cyan-100"
  };

  const roleIcons: Record<string, JSX.Element> = {
    infanteria: <Activity size={14} />,
    caballero: <Sword size={14} />,
    centinela: <Shield size={14} />,
    curador: <Heart size={14} />,
    saqueador: <Zap size={14} />,
    hechizo: <Flame size={14} />,
    artefacto: <Info size={14} />,
    piedra: <Zap size={14} />,
  };

  const elementIcons: Record<string, JSX.Element> = {
    fuego: <Flame size={14} />,
    ruby: <Flame size={14} />,
    aire: <Activity size={14} />,
    tierra: <Shield size={14} />,
    verde: <Heart size={14} />,
    aura: <Zap size={14} />,
    amatista: <Info size={14} />,
  };

  const style = roleColors[card.role] || "border-border bg-card/80 text-card-foreground";
  const healthPercent = Math.max(0, Math.min(100, (card.health / card.maxHealth) * 100));
  const canAct = isMine && card.charges > 0;

  return (
    <div 
      onClick={onClick}
      className={`relative w-44 sm:w-52 min-h-72 rounded-xl border-2 flex flex-col transition-all duration-300 select-none overflow-hidden
        ${style} 
        ${isSelected ? "ring-4 ring-primary shadow-[0_0_30px_rgba(251,191,36,0.6)] scale-105 z-20 translate-y-[-10px]" : "hover:border-foreground/50"}
        ${!isMine && !isSelected ? "hover:ring-2 hover:ring-destructive hover:border-destructive" : ""}
        ${canAct && !isSelected ? "shadow-[0_0_15px_rgba(251,191,36,0.2)] animate-pulse-slow" : ""}
        ${!isMine ? "opacity-90" : ""}
      `}
      data-testid={`combat-card-${card.instanceId}`}
    >
      <div className="absolute top-2 right-2 flex gap-1 z-10">
        {Array.from({ length: card.charges }).map((_, i) => (
          <div key={i} className="w-6 h-6 rounded-full bg-accent border-2 border-background flex items-center justify-center shadow-lg text-accent-foreground">
            <Zap size={12} fill="currentColor"/>
          </div>
        ))}
      </div>

      {card.shield > 0 && (
        <div className="absolute top-2 left-2 min-w-8 h-8 px-2 rounded-full bg-blue-500 border-2 border-background flex items-center justify-center shadow-lg text-white font-bold text-xs z-10">
          <Shield size={10} className="mr-0.5" /> {card.shield}
        </div>
      )}

      <div className="p-4 pt-12 flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="text-[11px] font-bold uppercase tracking-wider opacity-90 flex items-center gap-1.5">
            {roleIcons[card.role] || <Info size={14} />} {card.role}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider opacity-90 flex items-center gap-1.5">
            {elementIcons[card.element] || <Info size={14} />} {card.element || "neutral"}
          </div>
        </div>
        <h3 className="font-bold text-lg leading-tight mb-auto">{card.cardName}</h3>
        <div className="mt-5 grid grid-cols-2 gap-2 text-sm font-bold bg-background/50 p-2 rounded-lg border border-border/30">
          <div className="flex items-center justify-center gap-1 text-destructive">
            <Sword size={14} /> {card.attack}
          </div>
          <div className="flex items-center justify-center gap-1 text-blue-400">
            <Shield size={14} /> {card.defense}
          </div>
        </div>
      </div>

      <div className="h-8 bg-background border-t border-border flex items-center relative overflow-hidden">
        <div 
          className={`absolute left-0 top-0 bottom-0 transition-all duration-500 ${healthPercent > 50 ? "bg-green-500" : healthPercent > 25 ? "bg-amber-500" : "bg-red-500"}`}
          style={{ width: `${healthPercent}%` }}
        />
        <div className="relative z-10 w-full flex justify-center items-center text-xs font-bold text-white drop-shadow-md">
          <Heart size={12} className="mr-1 inline-block" fill={healthPercent > 25 ? "currentColor" : "none"} /> 
          {card.health} / {card.maxHealth}
        </div>
      </div>
    </div>
  );
}
