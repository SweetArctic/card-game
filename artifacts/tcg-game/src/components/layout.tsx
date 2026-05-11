import { Link } from "wouter";
import { LogOut, Home, User, Users, Swords, Trophy, Activity } from "lucide-react";
import { usePlayer } from "@/hooks/use-player";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { logout, gameState } = usePlayer();

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold">
            <Swords size={20} />
          </div>
          <h1 className="font-bold text-xl tracking-wider uppercase text-primary">TCG ARENA</h1>
        </div>
        
        <ScrollArea className="flex-1 py-6 px-4">
          <nav className="space-y-2">
            <NavItem href="/" icon={<Home size={18} />} label="Arena Hub" />
            <NavItem href="/profile" icon={<User size={18} />} label="Profile & Deck" />
            <NavItem href="/social" icon={<Users size={18} />} label="Friends" />
            <NavItem href="/rooms" icon={<Activity size={18} />} label="Versus Rooms" />
            <NavItem href="/tournaments" icon={<Trophy size={18} />} label="Tournaments" />
          </nav>
        </ScrollArea>

        {gameState?.player && (
          <div className="p-4 border-t border-border mt-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold">
                {gameState.player.displayName.substring(0, 2).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">{gameState.player.displayName}</p>
                <p className="text-xs text-muted-foreground">{gameState.player.rankTitle}</p>
              </div>
            </div>
            <Button variant="outline" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={logout} data-testid="button-logout">
              <LogOut size={16} className="mr-2" />
              Abandon Run
            </Button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-background to-background relative">
        {/* Subtle noise texture */}
        <div className="pointer-events-none fixed inset-0 z-50 opacity-20 mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
        {children}
      </main>
    </div>
  );
}

function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent/10 hover:text-accent transition-colors" data-testid={`nav-${label.toLowerCase().replace(/ /g, "-")}`}>
      {icon}
      {label}
    </Link>
  );
}