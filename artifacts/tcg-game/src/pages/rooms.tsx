import { useState } from "react";
import { useLocation } from "wouter";
import { usePlayer } from "@/hooks/use-player";
import { useCreateRoom, useJoinRoom, getGetPlayerStateQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Swords, Plus, Play, ShieldAlert, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function Rooms() {
  const { playerId, gameState } = usePlayer();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createRoomMutation = useCreateRoom();
  const joinRoomMutation = useJoinRoom();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [isRanked, setIsRanked] = useState(false);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerId || !roomName.trim()) return;

    createRoomMutation.mutate({ data: { playerId, name: roomName.trim(), isRanked } }, {
      onSuccess: (room) => {
        toast.success("Room created successfully!");
        setIsCreateOpen(false);
        setRoomName("");
        setIsRanked(false);
        queryClient.setQueryData(getGetPlayerStateQueryKey(playerId), (current: any) => current ? { ...current, rooms: [room, ...current.rooms.filter((item: any) => item.id !== room.id)] } : current);
        queryClient.invalidateQueries({ queryKey: getGetPlayerStateQueryKey(playerId) });
      },
      onError: () => toast.error("Failed to create room")
    });
  };

  const handleJoinRoom = (roomId: string) => {
    if (!playerId) return;

    // If joining a room we created and it's already active/waiting, we might just want to go to battle
    const room = gameState?.rooms.find(r => r.id === roomId);
    if (room?.hostPlayerId === playerId && room?.status === "active") {
      setLocation("/battle");
      return;
    }

    joinRoomMutation.mutate({ roomId, data: { playerId } }, {
      onSuccess: (newState) => {
        queryClient.setQueryData(getGetPlayerStateQueryKey(playerId), newState);
        if (newState.activeMatch) {
          toast.success("Match started!");
          setLocation("/battle");
        } else {
          toast.success("Joined room. Waiting for match to start...");
        }
      },
      onError: (err: any) => toast.error(err?.message || "Failed to join room")
    });
  };

  const refetch = () => {
    if (playerId) {
      queryClient.invalidateQueries({ queryKey: getGetPlayerStateQueryKey(playerId) });
    }
  };

  if (!gameState) return null;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <header className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Swords className="text-secondary" />
            Versus Rooms
          </h1>
          <p className="text-muted-foreground">Find opponents or create your own battleground.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="icon" onClick={refetch} data-testid="button-refresh-rooms">
            <RefreshCw size={18} />
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-open-create-room">
                <Plus size={18} /> Create Room
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Versus Room</DialogTitle>
                <DialogDescription>Set up a new battleground for challengers to join.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateRoom} className="space-y-6 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="roomName">Room Name</Label>
                  <Input 
                    id="roomName" 
                    placeholder="e.g. Casual Duel, Epic Showdown..." 
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="bg-background/50 border-border"
                    autoFocus
                    data-testid="input-room-name"
                  />
                </div>
                <div className="flex items-center space-x-2 bg-background/50 p-4 rounded-lg border border-border">
                  <Checkbox 
                    id="isRanked" 
                    checked={isRanked} 
                    onCheckedChange={(c) => setIsRanked(c as boolean)} 
                    data-testid="checkbox-is-ranked"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="isRanked" className="font-bold flex items-center gap-2">
                      Ranked Match <ShieldAlert size={14} className="text-primary" />
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Rank points will be on the line.
                    </p>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={!roomName.trim() || createRoomMutation.isPending}
                  data-testid="button-create-room"
                >
                  {createRoomMutation.isPending ? "Creating..." : "Open Room"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {gameState.rooms.length === 0 ? (
        <div className="py-24 text-center border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center bg-card/20">
          <Swords size={48} className="mb-4 text-muted-foreground/30" />
          <h3 className="text-xl font-bold mb-2">No Active Rooms</h3>
          <p className="text-muted-foreground mb-6">The arena is quiet. Be the first to open a room.</p>
          <Button onClick={() => setIsCreateOpen(true)} variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
            Create Room
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gameState.rooms.map(room => {
            const isHost = room.hostPlayerId === playerId;
            const isGuest = room.guestPlayerId === playerId;
            const isParticipant = isHost || isGuest;
            const isFull = room.status !== 'waiting' && room.status !== 'open'; // Simplified check
            
            return (
              <Card key={room.id} className={`bg-card/50 backdrop-blur-sm border-t-4 transition-all hover:-translate-y-1 hover:shadow-lg ${
                room.isRanked ? 'border-t-primary border-x-border border-b-border shadow-[0_4px_20px_-10px_rgba(251,191,36,0.2)]' : 'border-t-secondary border-x-border border-b-border'
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-xl line-clamp-1">{room.name}</CardTitle>
                      <div className="flex items-center gap-2 text-xs font-medium">
                        {room.isRanked ? (
                          <span className="text-primary flex items-center gap-1"><ShieldAlert size={12}/> Ranked</span>
                        ) : (
                          <span className="text-secondary flex items-center gap-1"><Swords size={12}/> Casual</span>
                        )}
                        <span className="text-muted-foreground/50">•</span>
                        <span className={`flex items-center gap-1 ${room.status === 'waiting' || room.status === 'open' ? 'text-green-400' : 'text-amber-400'}`}>
                          <Clock size={12} /> {room.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="flex items-center justify-between text-sm bg-background/50 p-3 rounded-md border border-border/50">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-accent" />
                      <span className="font-medium text-foreground">Host</span>
                    </div>
                    {isHost ? <span className="text-primary font-bold">You</span> : <span className="text-muted-foreground truncate max-w-[100px]">Player {room.hostPlayerId.substring(0,4)}</span>}
                  </div>
                  
                  {room.guestPlayerId && (
                    <div className="flex items-center justify-between text-sm bg-background/50 p-3 rounded-md border border-border/50 mt-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-destructive" />
                        <span className="font-medium text-foreground">Guest</span>
                      </div>
                      {isGuest ? <span className="text-primary font-bold">You</span> : <span className="text-muted-foreground truncate max-w-[100px]">Player {room.guestPlayerId.substring(0,4)}</span>}
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  {isHost && room.status === "waiting" ? (
                    <Button 
                      className="w-full" 
                      variant="outline"
                      disabled
                      data-testid={`button-waiting-room-${room.id}`}
                    >
                      <Clock size={16} className="mr-2" /> 
                      Waiting for rival
                    </Button>
                  ) : isParticipant ? (
                    <Button 
                      className="w-full bg-accent text-accent-foreground hover:bg-accent/90" 
                      onClick={() => handleJoinRoom(room.id)}
                      data-testid={`button-enter-room-${room.id}`}
                    >
                      <Play size={16} className="mr-2" /> 
                      {room.status === 'active' ? "Rejoin Match" : "Enter Room"}
                    </Button>
                  ) : (
                    <Button 
                      className="w-full" 
                      variant="secondary"
                      disabled={isFull || joinRoomMutation.isPending}
                      onClick={() => handleJoinRoom(room.id)}
                      data-testid={`button-join-room-${room.id}`}
                    >
                      <Swords size={16} className="mr-2" /> 
                      {isFull ? "Room Full" : "Join Duel"}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}