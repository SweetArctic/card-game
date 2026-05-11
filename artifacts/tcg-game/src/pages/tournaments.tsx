import { useState } from "react";
import { useLocation } from "wouter";
import { usePlayer } from "@/hooks/use-player";
import { useCreateTournament, useJoinTournament, getGetPlayerStateQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trophy, Plus, Users, Crown, CalendarClock } from "lucide-react";
import { toast } from "sonner";

export default function Tournaments() {
  const { playerId, gameState } = usePlayer();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createTournamentMutation = useCreateTournament();
  const joinTournamentMutation = useJoinTournament();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState([8]);

  const handleCreateTournament = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerId || !name.trim()) return;

    createTournamentMutation.mutate({ data: { playerId, name: name.trim(), capacity: capacity[0] } }, {
      onSuccess: () => {
        toast.success("Tournament lobby opened!");
        setIsCreateOpen(false);
        setName("");
        setCapacity([8]);
        queryClient.invalidateQueries({ queryKey: getGetPlayerStateQueryKey(playerId) });
      },
      onError: () => toast.error("Failed to create tournament")
    });
  };

  const handleJoinTournament = (tournamentId: string) => {
    if (!playerId) return;

    joinTournamentMutation.mutate({ tournamentId, data: { playerId } }, {
      onSuccess: (newState) => {
        queryClient.setQueryData(getGetPlayerStateQueryKey(playerId), newState);
        toast.success("Joined tournament!");
      },
      onError: (err: any) => toast.error(err?.message || "Failed to join tournament")
    });
  };

  if (!gameState) return null;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <header className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3 text-primary">
            <Trophy size={36} />
            Grand Tournaments
          </h1>
          <p className="text-xl text-muted-foreground">Compete for glory, ranks, and exclusive rewards.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2 text-lg h-12 px-6 shadow-lg shadow-primary/20" data-testid="button-open-create-tournament">
              <Plus size={20} /> Host Tournament
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Host a Tournament</DialogTitle>
              <DialogDescription>Create a bracket for up to 32 players.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTournament} className="space-y-6 mt-4">
              <div className="space-y-2">
                <Label htmlFor="tournamentName">Event Name</Label>
                <Input 
                  id="tournamentName" 
                  placeholder="e.g. Weekend Championship" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-background/50 border-border"
                  autoFocus
                  data-testid="input-tournament-name"
                />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Player Capacity</Label>
                  <span className="font-bold text-primary text-xl">{capacity[0]}</span>
                </div>
                <Slider 
                  value={capacity} 
                  onValueChange={setCapacity} 
                  min={4} 
                  max={32} 
                  step={4}
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-muted-foreground px-1">
                  <span>4</span>
                  <span>16</span>
                  <span>32</span>
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={!name.trim() || createTournamentMutation.isPending}
                data-testid="button-create-tournament"
              >
                {createTournamentMutation.isPending ? "Setting up Bracket..." : "Open Registration"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {gameState.tournaments.length === 0 ? (
        <div className="py-32 text-center border border-border/50 rounded-2xl flex flex-col items-center justify-center bg-gradient-to-b from-card/30 to-background">
          <Crown size={64} className="mb-6 text-primary/20" />
          <h3 className="text-2xl font-bold mb-3">No Upcoming Tournaments</h3>
          <p className="text-muted-foreground text-lg max-w-md mb-8">The grand arena is currently empty. Host an event to gather the realm's best duelists.</p>
          <Button onClick={() => setIsCreateOpen(true)} variant="outline" size="lg" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
            Host Event
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {gameState.tournaments.map(tournament => {
            // Simplified check if user is already participating based on API constraints
            // Realistically we'd check participants list if we had it
            const isFull = tournament.participants >= tournament.capacity;
            
            return (
              <Card key={tournament.id} className="bg-card/40 border-primary/30 backdrop-blur-md overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-50 pointer-events-none" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110 duration-500" />
                
                <CardHeader className="pb-2 relative z-10">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl mb-2 font-bold tracking-wide">{tournament.name}</CardTitle>
                      <div className="flex items-center gap-4 text-sm font-medium">
                        <span className="flex items-center gap-1.5 text-accent">
                          <Users size={16}/> {tournament.participants} / {tournament.capacity} Registered
                        </span>
                        <span className="text-muted-foreground/30">|</span>
                        <span className="flex items-center gap-1.5 text-secondary">
                          <CalendarClock size={16}/> {tournament.status}
                        </span>
                      </div>
                    </div>
                    {tournament.status === 'open' && (
                      <div className="bg-primary/20 text-primary text-xs font-bold px-3 py-1 rounded-full border border-primary/30 animate-pulse">
                        REGISTRATION OPEN
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="relative z-10 py-6">
                  <div className="w-full bg-background/50 rounded-full h-3 overflow-hidden border border-border">
                    <div 
                      className="bg-primary h-full transition-all duration-1000 ease-out"
                      style={{ width: `${(tournament.participants / tournament.capacity) * 100}%` }}
                    />
                  </div>
                </CardContent>
                <CardFooter className="relative z-10 bg-background/20 pt-4 border-t border-border/50">
                  <Button 
                    className="w-full text-lg h-12 font-bold tracking-wider uppercase transition-all" 
                    disabled={isFull || tournament.status !== 'open' || joinTournamentMutation.isPending}
                    onClick={() => handleJoinTournament(tournament.id)}
                    variant={isFull ? "secondary" : "default"}
                    data-testid={`button-join-tournament-${tournament.id}`}
                  >
                    {isFull ? "Lobby Full" : tournament.status !== 'open' ? "Registration Closed" : "Join Tournament"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}