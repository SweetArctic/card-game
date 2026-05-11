import { useEffect, useState } from "react";
import { usePlayer } from "@/hooks/use-player";
import { useUpdateDeck } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Activity, Flame, Shield, Sword, Heart, Zap, Info } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetPlayerStateQueryKey } from "@workspace/api-client-react";

export default function Profile() {
  const { playerId, gameState } = usePlayer();
  const updateDeckMutation = useUpdateDeck();
  const queryClient = useQueryClient();

  const [localDeckIds, setLocalDeckIds] = useState<string[]>(
    () => gameState?.collection.filter(c => c.inDeck).map(c => c.id) || []
  );

  useEffect(() => {
    if (gameState) {
      setLocalDeckIds(gameState.collection.filter(c => c.inDeck).map(c => c.id));
    }
  }, [gameState]);

  const handleToggleCard = (playerCardId: string) => {
    setLocalDeckIds(prev => {
      if (prev.includes(playerCardId)) {
        return prev.filter(id => id !== playerCardId);
      }
      if (prev.length >= 6) {
        toast.error("Your deck can only contain 6 cards.");
        return prev;
      }
      return [...prev, playerCardId];
    });
  };

  const handleSaveDeck = () => {
    if (!playerId) return;
    if (localDeckIds.length !== 6) {
      toast.error("Deck must contain exactly 6 cards.");
      return;
    }

    updateDeckMutation.mutate({ playerId, data: { playerCardIds: localDeckIds } }, {
      onSuccess: (newState) => {
        toast.success("Deck saved successfully!");
        queryClient.setQueryData(getGetPlayerStateQueryKey(playerId), newState);
      },
      onError: () => toast.error("Failed to save deck")
    });
  };

  if (!gameState) return null;

  const deckCards = gameState.collection.filter(c => localDeckIds.includes(c.id));
  const collectionCards = gameState.collection.filter(c => !localDeckIds.includes(c.id));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-24">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold mb-2">Summoner Profile</h1>
          <p className="text-muted-foreground">Manage your collection and perfect your strategy.</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground uppercase tracking-wider font-bold mb-1">Rank / Points</div>
          <div className="text-2xl font-bold text-primary">{gameState.player.rankTitle} <span className="text-foreground ml-2">{gameState.player.rankPoints}</span></div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Wins</span>
              <span className="font-bold text-accent">{gameState.player.wins}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/50">
              <span className="text-muted-foreground">Losses</span>
              <span className="font-bold text-destructive">{gameState.player.losses}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Win Rate</span>
              <span className="font-bold">
                {gameState.player.wins + gameState.player.losses > 0 
                  ? Math.round((gameState.player.wins / (gameState.player.wins + gameState.player.losses)) * 100) 
                  : 0}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 bg-card/50 border-primary/30">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-xl">Active Deck</CardTitle>
              <CardDescription>Select exactly 6 cards for battle ({localDeckIds.length}/6)</CardDescription>
            </div>
            <Button 
              onClick={handleSaveDeck} 
              disabled={localDeckIds.length !== 6 || updateDeckMutation.isPending}
              className="shadow-lg"
              data-testid="button-save-deck"
            >
              {updateDeckMutation.isPending ? "Saving..." : "Save Deck"}
            </Button>
          </CardHeader>
          <CardContent>
            {deckCards.length === 0 ? (
              <div className="h-32 flex items-center justify-center border-2 border-dashed border-border rounded-lg text-muted-foreground">
                No cards selected. Choose from your collection below.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {deckCards.map(pc => (
                  <CardView 
                    key={pc.id} 
                    playerCard={pc} 
                    onClick={() => handleToggleCard(pc.id)}
                    selected={true}
                  />
                ))}
                {Array.from({ length: 6 - deckCards.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-72 border-2 border-dashed border-border/50 rounded-xl flex items-center justify-center bg-black/20">
                    <span className="text-muted-foreground/50 font-bold text-2xl">+</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="pt-8 border-t border-border">
        <h2 className="text-2xl font-bold mb-6">Card Collection</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {collectionCards.map(pc => (
            <CardView 
              key={pc.id} 
              playerCard={pc} 
              onClick={() => handleToggleCard(pc.id)}
              selected={false}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function CardView({ playerCard, onClick, selected }: { playerCard: any, onClick: () => void, selected: boolean }) {
  const { card } = playerCard;
  
  const rarityColors: Record<string, string> = {
    'comun': 'border-slate-500 bg-slate-500/10 text-slate-300',
    'raro': 'border-blue-500 bg-blue-500/10 text-blue-300',
    'epico': 'border-purple-500 bg-purple-500/10 text-purple-300',
    'legendario': 'border-amber-500 bg-amber-500/10 text-amber-300',
  };

  const roleColors: Record<string, string> = {
    'infanteria': 'text-orange-300 bg-orange-500/10 border-orange-400/30',
    'caballero': 'text-blue-300 bg-blue-500/10 border-blue-300/30',
    'centinela': 'text-slate-300 bg-slate-500/10 border-slate-300/30',
    'curador': 'text-green-300 bg-green-500/10 border-green-300/30',
    'saqueador': 'text-purple-300 bg-purple-500/10 border-purple-300/30',
    'hechizo': 'text-pink-300 bg-pink-500/10 border-pink-300/30',
    'artefacto': 'text-amber-300 bg-amber-500/10 border-amber-300/30',
    'piedra': 'text-cyan-300 bg-cyan-500/10 border-cyan-300/30'
  };

  const rarityClass = rarityColors[card.rarity] || rarityColors['comun'];
  const roleColor = roleColors[card.role] || 'text-foreground';
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

  return (
    <div 
      onClick={onClick}
      className={`relative min-h-72 rounded-xl border-2 cursor-pointer transition-all duration-200 overflow-hidden flex flex-col bg-background/80 backdrop-blur-sm group
        ${selected ? 'border-primary ring-2 ring-primary/50 shadow-[0_0_15px_rgba(251,191,36,0.3)]' : 'border-border hover:border-primary/50 hover:-translate-y-1'}`}
      data-testid={`card-${playerCard.id}`}
    >
      <div className={`absolute top-0 inset-x-0 h-1.5 ${rarityClass.split(' ')[0].replace('border', 'bg')}`} />
      
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <div className={`text-[11px] font-bold uppercase tracking-wider border rounded-full px-2.5 py-1 flex items-center gap-1.5 ${roleColor}`}>
            {roleIcons[card.role] || <Info size={14} />} {card.role}
          </div>
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold text-accent border border-accent/30 shadow-[0_0_10px_rgba(45,212,191,0.2)]">
            {card.cost}
          </div>
        </div>
        
        <h3 className="font-bold text-xl leading-tight mb-2 text-foreground">{card.name}</h3>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="capitalize gap-1 border-primary/30 bg-primary/10 text-primary">
            {elementIcons[card.element] || <Info size={14} />} {card.element || "neutral"}
          </Badge>
          <Badge variant="outline" className={`capitalize ${rarityClass}`}>
            {card.rarity}
          </Badge>
        </div>
        
        <div className="text-sm leading-relaxed text-muted-foreground/90 mb-auto group-hover:text-muted-foreground transition-colors">
          {card.effect}
        </div>
        
        <div className="mt-4 pt-3 border-t border-border/50 grid grid-cols-3 gap-2 text-sm font-bold">
          <div className="flex items-center justify-center gap-1.5 rounded-lg bg-destructive/10 py-2 text-destructive/90" title="Attack">
            <Sword size={16} /> {card.attack}
          </div>
          <div className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-500/10 py-2 text-blue-400/90" title="Defense">
            <Shield size={16} /> {card.defense}
          </div>
          <div className="flex items-center justify-center gap-1.5 rounded-lg bg-green-500/10 py-2 text-green-400/90" title="Health">
            <Heart size={16} /> {card.health}
          </div>
        </div>
      </div>
      
      {selected && (
        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Badge variant="destructive" className="shadow-lg">Remove</Badge>
        </div>
      )}
      {!selected && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Badge className="shadow-lg bg-primary text-primary-foreground hover:bg-primary">Add to Deck</Badge>
        </div>
      )}
    </div>
  );
}