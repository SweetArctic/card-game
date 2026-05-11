import { useState } from "react";
import { usePlayer } from "@/hooks/use-player";
import { useAddFriend, useRemoveFriend, getGetPlayerStateQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, UserMinus, Users, Search } from "lucide-react";
import { toast } from "sonner";

export default function Social() {
  const { playerId, gameState } = usePlayer();
  const queryClient = useQueryClient();
  const addFriendMutation = useAddFriend();
  const removeFriendMutation = useRemoveFriend();
  
  const [friendCode, setFriendCode] = useState("");

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerId || friendCode.trim().length < 2) return;
    
    addFriendMutation.mutate({ playerId, data: { query: friendCode.trim() } }, {
      onSuccess: (newState) => {
        toast.success(`Friend added successfully`);
        setFriendCode("");
        queryClient.setQueryData(getGetPlayerStateQueryKey(playerId), newState);
      },
      onError: (err: any) => {
        toast.error(err?.message || "Could not add friend. Check the code.");
      }
    });
  };

  const handleRemoveFriend = (friendId: string, name: string) => {
    if (!playerId) return;
    
    removeFriendMutation.mutate({ playerId, friendId }, {
      onSuccess: (newState) => {
        toast.success(`Removed ${name} from friends`);
        queryClient.setQueryData(getGetPlayerStateQueryKey(playerId), newState);
      },
      onError: () => toast.error("Failed to remove friend")
    });
  };

  if (!gameState) return null;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <header className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Users className="text-primary" />
            Social Hub
          </h1>
          <p className="text-muted-foreground">Manage your allies and rivals.</p>
        </div>
        <div className="bg-card/50 border border-border rounded-lg p-3 text-right">
          <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Your Player Code</div>
          <div className="font-mono text-xl tracking-widest text-primary font-bold">{gameState.player.playerCode}</div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="bg-card/50 border-primary/20 h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus size={18} className="text-primary" /> Add Friend
            </CardTitle>
            <CardDescription>Enter a player code or exact name</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddFriend} className="flex gap-2">
              <Input
                placeholder="e.g. TCG-1234 or PlayerName"
                value={friendCode}
                onChange={(e) => setFriendCode(e.target.value)}
                className="bg-background/50 border-border font-mono"
                data-testid="input-friend-code"
              />
              <Button 
                type="submit" 
                disabled={friendCode.length < 2 || addFriendMutation.isPending}
                className="px-3"
                data-testid="button-add-friend"
              >
                {addFriendMutation.isPending ? <Search size={18} className="animate-spin" /> : <Search size={18} />}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 bg-card/50 border-border">
          <CardHeader>
            <CardTitle>Friends List ({gameState.friends.length})</CardTitle>
            <CardDescription>Your current allies in the arena</CardDescription>
          </CardHeader>
          <CardContent>
            {gameState.friends.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-border rounded-lg text-muted-foreground flex flex-col items-center">
                <Users size={32} className="mb-3 text-muted-foreground/50" />
                <p>You haven't added any friends yet.</p>
                <p className="text-sm mt-1">Share your player code to connect with others.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {gameState.friends.map(friend => (
                  <div key={friend.id} className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border/50 hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold border border-secondary/30">
                        {friend.displayName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-foreground">{friend.displayName}</div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground font-mono">{friend.playerCode}</span>
                          <span className="text-muted-foreground/50">•</span>
                          <span className="text-primary/80 font-medium">{friend.rankTitle}</span>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveFriend(friend.id, friend.displayName)}
                      data-testid={`button-remove-friend-${friend.id}`}
                    >
                      <UserMinus size={18} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}