create table if not exists tcg_players (
  id uuid primary key,
  username text not null unique,
  password_hash text not null,
  display_name text not null,
  player_code text not null unique,
  region text,
  wins integer not null default 0,
  losses integer not null default 0,
  rank_points integer not null default 1000,
  created_at timestamptz not null default now()
);

create unique index if not exists tcg_players_username_lower_idx
  on tcg_players (lower(username))
  where username is not null;

create table if not exists tcg_cards (
  id text primary key,
  name text not null,
  role text not null check (role in ('centinela', 'caballero', 'infanteria', 'curador', 'saqueador', 'artefacto', 'hechizo', 'piedra')),
  element text,
  rarity text not null,
  attack integer not null,
  defense integer not null,
  health integer not null,
  cost integer not null default 1,
  effect text not null
);

create table if not exists tcg_player_cards (
  id uuid primary key,
  player_id uuid not null references tcg_players(id) on delete cascade,
  card_id text not null references tcg_cards(id),
  in_deck boolean not null default false,
  acquired_at timestamptz not null default now()
);

create table if not exists tcg_friendships (
  player_id uuid not null references tcg_players(id) on delete cascade,
  friend_id uuid not null references tcg_players(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (player_id, friend_id),
  check (player_id <> friend_id)
);

create table if not exists tcg_rooms (
  id uuid primary key,
  name text not null,
  host_player_id uuid not null references tcg_players(id) on delete cascade,
  guest_player_id uuid references tcg_players(id) on delete set null,
  status text not null default 'waiting',
  is_ranked boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists tcg_tournaments (
  id uuid primary key,
  name text not null,
  host_player_id uuid not null references tcg_players(id) on delete cascade,
  capacity integer not null check (capacity between 4 and 32),
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists tcg_tournament_participants (
  tournament_id uuid not null references tcg_tournaments(id) on delete cascade,
  player_id uuid not null references tcg_players(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (tournament_id, player_id)
);

create table if not exists tcg_matches (
  id uuid primary key,
  room_id uuid references tcg_rooms(id) on delete set null,
  player_one_id uuid not null references tcg_players(id) on delete cascade,
  player_two_id uuid not null references tcg_players(id) on delete cascade,
  current_turn_player_id uuid not null references tcg_players(id) on delete cascade,
  turn_number integer not null default 1,
  status text not null default 'active',
  winner_player_id uuid references tcg_players(id) on delete set null,
  log jsonb not null default '[]'::jsonb,
  battlefield jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into tcg_cards (id, name, role, element, rarity, attack, defense, health, cost, effect) values
('centinela-alba', 'Centinela del Alba', 'centinela', 'aura', 'comun', 3, 7, 22, 1, 'Otorga escudos protectores al equipo.'),
('caballero-bronce', 'Caballero de Bronce', 'caballero', 'tierra', 'comun', 8, 4, 24, 1, 'Golpea con fuerza y recibe apoyo de infantería.'),
('infanteria-lanza', 'Infantería de Lanza', 'infanteria', 'aire', 'comun', 5, 5, 20, 1, 'Potencia a los caballeros y sostiene la línea.'),
('curadora-verde', 'Curadora Verde', 'curador', 'verde', 'comun', 2, 5, 21, 1, 'Restaura salud de aliados heridos.'),
('saqueador-sombras', 'Saqueador de Sombras', 'saqueador', 'amatista', 'rara', 6, 3, 19, 1, 'Roba cargas y defensas del enemigo.'),
('maza-hierro', 'Maza de Hierro', 'artefacto', 'tierra', 'comun', 7, 2, 18, 1, 'Artefacto ofensivo de impacto pesado.'),
('lanza-viento', 'Lanza de Viento', 'artefacto', 'aire', 'comun', 6, 4, 18, 1, 'Artefacto rápido que perfora escudos.'),
('hechizo-fuego', 'Hechizo Elemental de Fuego', 'hechizo', 'fuego', 'comun', 7, 2, 16, 1, 'Inflige daño directo ardiente.'),
('hechizo-aire', 'Hechizo Elemental de Aire', 'hechizo', 'aire', 'comun', 5, 3, 16, 1, 'Desestabiliza protecciones rivales.'),
('hechizo-tierra', 'Hechizo Elemental de Tierra', 'hechizo', 'tierra', 'comun', 3, 8, 20, 1, 'Levanta defensas resistentes.'),
('hechizo-verde', 'Hechizo Elemental Verde', 'hechizo', 'verde', 'comun', 2, 5, 18, 1, 'Recupera vitalidad natural.'),
('hechizo-aura', 'Hechizo de Aura', 'hechizo', 'aura', 'rara', 4, 5, 18, 1, 'Recarga y fortalece al equipo.'),
('piedra-ruby', 'Piedra Ruby', 'piedra', 'ruby', 'rara', 6, 2, 17, 1, 'Canaliza poder de fuego concentrado.'),
('piedra-amatista', 'Piedra Amatista', 'piedra', 'amatista', 'rara', 5, 4, 17, 1, 'Absorbe energía del enemigo.'),
('caballero-ruby', 'Caballero Ruby', 'caballero', 'ruby', 'rara', 9, 3, 23, 1, 'Ataque feroz con ventaja elemental.'),
('centinela-roble', 'Centinela de Roble', 'centinela', 'verde', 'comun', 2, 9, 25, 1, 'Protección resistente para turnos largos.'),
('infanteria-escudo', 'Infantería con Escudo', 'infanteria', 'tierra', 'comun', 4, 7, 22, 1, 'Apoya defensas y prepara contraataques.'),
('curador-aura', 'Curador de Aura', 'curador', 'aura', 'rara', 3, 6, 20, 1, 'Cura y estabiliza cargas aliadas.'),
('saqueadora-ruby', 'Saqueadora Ruby', 'saqueador', 'ruby', 'rara', 7, 3, 18, 1, 'Roba recursos y castiga cartas debilitadas.'),
('lanza-amatista', 'Lanza de Amatista', 'artefacto', 'amatista', 'rara', 6, 5, 19, 1, 'Roba energía mediante ataques precisos.')
on conflict (id) do update set
  name = excluded.name,
  role = excluded.role,
  element = excluded.element,
  rarity = excluded.rarity,
  attack = excluded.attack,
  defense = excluded.defense,
  health = excluded.health,
  cost = excluded.cost,
  effect = excluded.effect;