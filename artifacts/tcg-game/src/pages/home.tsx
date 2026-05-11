import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { usePlayer } from "@/hooks/use-player";
import { useLoginPlayer, useRegisterPlayer } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import Layout from "@/components/layout";
import { Trophy, Swords, Zap, Activity } from "lucide-react";
import { toast } from "sonner";

export default function Home() {
  const { playerId, setPlayerId, gameState, isLoading } = usePlayer();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center">
          <Swords size={48} className="text-primary mb-4 animate-bounce" />
          <p className="text-muted-foreground">Summoning Arena...</p>
        </div>
      </div>
    );
  }

  if (playerId && gameState) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto p-8 space-y-8">
          <header className="mb-12">
            <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">
              Welcome back, <span className="text-primary">{gameState.player.displayName}</span>
            </h1>
            <p className="text-xl text-muted-foreground">Ready your deck and enter the arena.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-card/50 border-primary/20 backdrop-blur-sm overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Trophy className="text-primary" /> Profile & Deck</CardTitle>
                <CardDescription>Manage your cards and view stats</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground mb-1">{gameState.player.rankTitle}</div>
                <div className="text-sm text-muted-foreground">{gameState.player.rankPoints} Rank Points</div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => setLocation('/profile')} data-testid="button-go-profile">Manage Deck</Button>
              </CardFooter>
            </Card>

            <Card className="bg-card/50 border-secondary/20 backdrop-blur-sm overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Activity className="text-secondary" /> Versus Rooms</CardTitle>
                <CardDescription>Jump into quick matches</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground mb-1">{gameState.rooms.length}</div>
                <div className="text-sm text-muted-foreground">Active Lobbies</div>
              </CardContent>
              <CardFooter>
                <Button variant="secondary" className="w-full" onClick={() => setLocation('/rooms')} data-testid="button-go-rooms">Find Match</Button>
              </CardFooter>
            </Card>

            <Card className="bg-card/50 border-accent/20 backdrop-blur-sm overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Zap className="text-accent" /> Active Match</CardTitle>
                <CardDescription>Resume your ongoing battle</CardDescription>
              </CardHeader>
              <CardContent>
                {gameState.activeMatch ? (
                  <div>
                    <div className="text-xl font-bold text-accent mb-1">Turn {gameState.activeMatch.turnNumber}</div>
                    <div className="text-sm text-muted-foreground">Battle in progress...</div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-16 text-muted-foreground italic">
                    No active match
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full border-accent text-accent hover:bg-accent hover:text-accent-foreground" 
                  disabled={!gameState.activeMatch}
                  onClick={() => setLocation('/battle')}
                  data-testid="button-go-battle"
                >
                  {gameState.activeMatch ? "Resume Battle" : "Join a Room First"}
                </Button>
              </CardFooter>
            </Card>
          </div>

          {gameState.activity.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Activity size={24} className="text-muted-foreground" />
                Recent Activity
              </h2>
              <Card className="bg-card/30 border-border backdrop-blur-sm">
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {gameState.activity.slice(0, 5).map((log, i) => (
                      <div key={i} className="p-4 text-sm text-muted-foreground hover:bg-white/5 transition-colors">
                        {log}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  // Registration Screen
  return <RegistrationScreen onRegister={setPlayerId} />;
}

function RegistrationScreen({ onRegister }: { onRegister: (id: string) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const registerMutation = useRegisterPlayer();
  const loginMutation = useLoginPlayer();

  const handleRegister = (e: FormEvent) => {
    e.preventDefault();
    if (username.trim().length < 3) {
      toast.error("El usuario debe tener al menos 3 caracteres");
      return;
    }
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (name.length < 3) {
      toast.error("El nombre debe tener al menos 3 caracteres");
      return;
    }

    registerMutation.mutate({ data: { username, password, displayName: name, region: "Global" } }, {
      onSuccess: (state) => {
        onRegister(state.player.id);
        toast.success("Cuenta creada. Bienvenido a la Arena.");
      },
      onError: (err: unknown) => {
        toast.error(err instanceof Error ? err.message : "No se pudo crear la cuenta");
      }
    });
  };

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (username.trim().length < 3 || password.length < 8) {
      toast.error("Ingresa usuario y contraseña válidos");
      return;
    }

    loginMutation.mutate({ data: { username, password } }, {
      onSuccess: (state) => {
        onRegister(state.player.id);
        toast.success("Sesión iniciada");
      },
      onError: (err: unknown) => {
        toast.error(err instanceof Error ? err.message : "Usuario o contraseña incorrectos");
      }
    });
  };

  const isPending = registerMutation.isPending || loginMutation.isPending;
  const isRegister = mode === "register";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-background to-background relative overflow-hidden p-4">
      {/* Decorative background elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-3xl mix-blend-screen" />
      
      <div className="pointer-events-none fixed inset-0 z-50 opacity-20 mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

      <Card className="w-full max-w-md bg-card/80 border-border/50 backdrop-blur-xl relative z-10 shadow-2xl">
        <CardHeader className="text-center pb-8 pt-10">
          <div className="mx-auto w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mb-6 shadow-inner ring-1 ring-primary/30">
            <Swords className="text-primary w-8 h-8" />
          </div>
          <CardTitle className="text-4xl font-bold tracking-tighter uppercase mb-2">TCG Arena</CardTitle>
          <CardDescription className="text-lg">
            {isRegister ? "Crea tu cuenta y reclama tus 20 cartas." : "Inicia sesión para volver a la arena."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 mb-6">
            <Button
              type="button"
              variant={!isRegister ? "default" : "outline"}
              onClick={() => setMode("login")}
              data-testid="button-mode-login"
            >
              Iniciar sesión
            </Button>
            <Button
              type="button"
              variant={isRegister ? "default" : "outline"}
              onClick={() => setMode("register")}
              data-testid="button-mode-register"
            >
              Crear cuenta
            </Button>
          </div>
          <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-muted-foreground uppercase text-xs font-bold tracking-widest">Usuario</Label>
              <Input 
                id="username" 
                placeholder="tu_usuario" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12 bg-background/50 border-border text-lg focus-visible:ring-primary"
                autoComplete="username"
                data-testid="input-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-muted-foreground uppercase text-xs font-bold tracking-widest">Contraseña</Label>
              <Input 
                id="password" 
                type="password"
                placeholder="mínimo 8 caracteres" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 bg-background/50 border-border text-lg focus-visible:ring-primary"
                autoComplete={isRegister ? "new-password" : "current-password"}
                data-testid="input-password"
              />
            </div>
            {isRegister && (
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-muted-foreground uppercase text-xs font-bold tracking-widest">Nombre de invocador</Label>
              <Input 
                id="displayName" 
                placeholder="Nombre visible en la arena" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 bg-background/50 border-border text-lg focus-visible:ring-primary"
                autoComplete="nickname"
                data-testid="input-summoner-name"
              />
            </div>
            )}
            <Button 
              type="submit" 
              className="w-full h-12 text-lg font-medium shadow-lg hover:shadow-primary/20 transition-all hover:-translate-y-0.5" 
              disabled={isPending || username.trim().length < 3 || password.length < 8 || (isRegister && name.length < 3)}
              data-testid={isRegister ? "button-register" : "button-login"}
            >
              {isPending ? "Validando..." : isRegister ? "Crear cuenta" : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}