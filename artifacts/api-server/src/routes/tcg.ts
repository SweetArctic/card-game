import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import {
  AddFriendBody,
  AddFriendParams,
  CreateRoomBody,
  CreateTournamentBody,
  GetPlayerStateParams,
  JoinRoomBody,
  JoinRoomParams,
  JoinTournamentBody,
  JoinTournamentParams,
  LoginPlayerBody,
  PlayMatchActionBody,
  PlayMatchActionParams,
  RegisterPlayerBody,
  RemoveFriendParams,
  UpdateDeckBody,
  UpdateDeckParams,
} from "@workspace/api-zod";

const router = Router();
const scryptAsync = promisify(scryptCallback);
type QueryExecutor = Pick<typeof pool, "query">;

const starterCards = [
  ["centinela-alba", "Centinela del Alba", "centinela", "aura", "comun", 3, 7, 22, 1, "Otorga escudos protectores al equipo."],
  ["caballero-bronce", "Caballero de Bronce", "caballero", "tierra", "comun", 8, 4, 24, 1, "Golpea con fuerza y recibe apoyo de infantería."],
  ["infanteria-lanza", "Infantería de Lanza", "infanteria", "aire", "comun", 5, 5, 20, 1, "Potencia a los caballeros y sostiene la línea."],
  ["curadora-verde", "Curadora Verde", "curador", "verde", "comun", 2, 5, 21, 1, "Restaura salud de aliados heridos."],
  ["saqueador-sombras", "Saqueador de Sombras", "saqueador", "amatista", "rara", 6, 3, 19, 1, "Roba cargas y defensas del enemigo."],
  ["maza-hierro", "Maza de Hierro", "artefacto", "tierra", "comun", 7, 2, 18, 1, "Artefacto ofensivo de impacto pesado."],
  ["lanza-viento", "Lanza de Viento", "artefacto", "aire", "comun", 6, 4, 18, 1, "Artefacto rápido que perfora escudos."],
  ["hechizo-fuego", "Hechizo Elemental de Fuego", "hechizo", "fuego", "comun", 7, 2, 16, 1, "Inflige daño directo ardiente."],
  ["hechizo-aire", "Hechizo Elemental de Aire", "hechizo", "aire", "comun", 5, 3, 16, 1, "Desestabiliza protecciones rivales."],
  ["hechizo-tierra", "Hechizo Elemental de Tierra", "hechizo", "tierra", "comun", 3, 8, 20, 1, "Levanta defensas resistentes."],
  ["hechizo-verde", "Hechizo Elemental Verde", "hechizo", "verde", "comun", 2, 5, 18, 1, "Recupera vitalidad natural."],
  ["hechizo-aura", "Hechizo de Aura", "hechizo", "aura", "rara", 4, 5, 18, 1, "Recarga y fortalece al equipo."],
  ["piedra-ruby", "Piedra Ruby", "piedra", "ruby", "rara", 6, 2, 17, 1, "Canaliza poder de fuego concentrado."],
  ["piedra-amatista", "Piedra Amatista", "piedra", "amatista", "rara", 5, 4, 17, 1, "Absorbe energía del enemigo."],
  ["caballero-ruby", "Caballero Ruby", "caballero", "ruby", "rara", 9, 3, 23, 1, "Ataque feroz con ventaja elemental."],
  ["centinela-roble", "Centinela de Roble", "centinela", "verde", "comun", 2, 9, 25, 1, "Protección resistente para turnos largos."],
  ["infanteria-escudo", "Infantería con Escudo", "infanteria", "tierra", "comun", 4, 7, 22, 1, "Apoya defensas y prepara contraataques."],
  ["curador-aura", "Curador de Aura", "curador", "aura", "rara", 3, 6, 20, 1, "Cura y estabiliza cargas aliadas."],
  ["saqueadora-ruby", "Saqueadora Ruby", "saqueador", "ruby", "rara", 7, 3, 18, 1, "Roba recursos y castiga cartas debilitadas."],
  ["lanza-amatista", "Lanza de Amatista", "artefacto", "amatista", "rara", 6, 5, 19, 1, "Roba energía mediante ataques precisos."],
];

type PlayerRow = {
  id: string;
  username: string | null;
  password_hash: string | null;
  display_name: string;
  player_code: string;
  region: string | null;
  wins: number;
  losses: number;
  rank_points: number;
  created_at: Date | string;
};

type CardRow = {
  id: string;
  name: string;
  role: string;
  element: string | null;
  rarity: string;
  attack: number;
  defense: number;
  health: number;
  cost: number;
  effect: string;
};

type CombatCard = {
  instanceId: string;
  ownerId: string;
  cardName: string;
  role: string;
  element: string | null;
  attack: number;
  defense: number;
  health: number;
  maxHealth: number;
  charges: number;
  shield: number;
  defeated: boolean;
};

type MatchRow = {
  id: string;
  room_id: string | null;
  player_one_id: string;
  player_two_id: string;
  current_turn_player_id: string;
  turn_number: number;
  status: string;
  winner_player_id: string | null;
  log: string[];
  battlefield: CombatCard[];
};

let schemaReady: Promise<void> | null = null;

function ensureSchema() {
  schemaReady ??= (async () => {
    await pool.query(`
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

      alter table tcg_players add column if not exists username text;
      alter table tcg_players add column if not exists password_hash text;
      create unique index if not exists tcg_players_username_lower_idx
        on tcg_players (lower(username))
        where username is not null;

      create table if not exists tcg_cards (
        id text primary key,
        name text not null,
        role text not null,
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
        capacity integer not null,
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
    `);

    for (const card of starterCards) {
      await pool.query(
        `insert into tcg_cards (id, name, role, element, rarity, attack, defense, health, cost, effect)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         on conflict (id) do update set
          name = excluded.name,
          role = excluded.role,
          element = excluded.element,
          rarity = excluded.rarity,
          attack = excluded.attack,
          defense = excluded.defense,
          health = excluded.health,
          cost = excluded.cost,
          effect = excluded.effect`,
        card,
      );
    }
  })();

  return schemaReady;
}

function asyncRoute(
  handler: (req: Request, res: Response) => Promise<void>,
) {
  return async (req: Request, res: Response) => {
    try {
      await ensureSchema();
      await handler(req, res);
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      const message =
        err instanceof Error ? err.message : "Unexpected server error";
      (req as Request & { log?: { error: (data: unknown, message: string) => void } }).log?.error(
        { err },
        "TCG route failed",
      );
      res.status(status).json({ error: message });
    }
  };
}

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function rankTitle(points: number) {
  if (points >= 1600) return "Campeón Arcano";
  if (points >= 1350) return "Maestro de Arena";
  if (points >= 1150) return "Duelista de Plata";
  return "Aprendiz";
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

async function verifyPassword(password: string, storedHash: string | null) {
  if (!storedHash) return false;
  const [algorithm, salt, key] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !key) return false;
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  const stored = Buffer.from(key, "hex");
  return derived.length === stored.length && timingSafeEqual(derived, stored);
}

function mapPlayer(row: PlayerRow) {
  return {
    id: row.id,
    displayName: row.display_name,
    playerCode: row.player_code,
    region: row.region ?? "",
    wins: row.wins,
    losses: row.losses,
    rankPoints: row.rank_points,
    rankTitle: rankTitle(row.rank_points),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function mapCard(row: CardRow) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    element: row.element ?? "",
    rarity: row.rarity,
    attack: row.attack,
    defense: row.defense,
    health: row.health,
    cost: row.cost,
    effect: row.effect,
  };
}

function mapRoom(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    name: String(row.name),
    hostPlayerId: String(row.host_player_id),
    guestPlayerId: row.guest_player_id ? String(row.guest_player_id) : undefined,
    status: String(row.status),
    isRanked: Boolean(row.is_ranked),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

function mapTournament(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    name: String(row.name),
    hostPlayerId: String(row.host_player_id),
    capacity: Number(row.capacity),
    status: String(row.status),
    participants: Number(row.participants ?? 0),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

function mapMatch(row: MatchRow) {
  return {
    id: row.id,
    roomId: row.room_id ?? undefined,
    playerOneId: row.player_one_id,
    playerTwoId: row.player_two_id,
    currentTurnPlayerId: row.current_turn_player_id,
    turnNumber: row.turn_number,
    status: row.status,
    winnerPlayerId: row.winner_player_id ?? undefined,
    log: row.log,
    battlefield: row.battlefield,
  };
}

async function requirePlayer(playerId: string, executor: QueryExecutor = pool) {
  const result = await executor.query<PlayerRow>(
    "select * from tcg_players where id = $1",
    [playerId],
  );
  const player = result.rows[0];
  if (!player) throw new HttpError(404, "Jugador no encontrado");
  return player;
}

async function assertDeckReady(playerId: string, executor: QueryExecutor = pool) {
  const result = await executor.query(
    "select count(*)::int as count from tcg_player_cards where player_id = $1 and in_deck = true",
    [playerId],
  );
  if (Number(result.rows[0]?.count ?? 0) !== 6) {
    throw new HttpError(400, "Debes elegir exactamente 6 cartas para iniciar partida");
  }
}

async function buildBattlefield(playerOneId: string, playerTwoId: string, executor: QueryExecutor = pool) {
  const result = await executor.query<
    CardRow & { player_card_id: string; player_id: string }
  >(
    `select pc.id as player_card_id, pc.player_id, c.*
     from tcg_player_cards pc
     join tcg_cards c on c.id = pc.card_id
     where pc.player_id = any($1::uuid[]) and pc.in_deck = true
     order by pc.acquired_at asc`,
    [[playerOneId, playerTwoId]],
  );

  return result.rows.map((row) => ({
    instanceId: row.player_card_id,
    ownerId: row.player_id,
    cardName: row.name,
    role: row.role,
    element: row.element,
    attack: row.attack,
    defense: row.defense,
    health: row.health,
    maxHealth: row.health,
    charges: 1,
    shield: 0,
    defeated: false,
  }));
}

async function getGameState(playerId: string) {
  const player = await requirePlayer(playerId);
  const collectionResult = await pool.query<
    CardRow & { player_card_id: string; in_deck: boolean }
  >(
    `select pc.id as player_card_id, pc.in_deck, c.*
     from tcg_player_cards pc
     join tcg_cards c on c.id = pc.card_id
     where pc.player_id = $1
     order by pc.in_deck desc, pc.acquired_at asc`,
    [playerId],
  );
  const friendsResult = await pool.query<PlayerRow>(
    `select p.*
     from tcg_friendships f
     join tcg_players p on p.id = f.friend_id
     where f.player_id = $1
     order by p.display_name asc`,
    [playerId],
  );
  const roomsResult = await pool.query(
    `select *
     from tcg_rooms
     where status in ('waiting', 'active')
     order by created_at desc
     limit 24`,
  );
  const tournamentsResult = await pool.query(
    `select t.*, count(tp.player_id)::int as participants
     from tcg_tournaments t
     left join tcg_tournament_participants tp on tp.tournament_id = t.id
     where t.status in ('open', 'running')
     group by t.id
     order by t.created_at desc
     limit 16`,
  );
  const matchResult = await pool.query<MatchRow>(
    `select *
     from tcg_matches
     where status = 'active' and (player_one_id = $1 or player_two_id = $1)
     order by updated_at desc
     limit 1`,
    [playerId],
  );

  const deckCount = collectionResult.rows.filter((row) => row.in_deck).length;
  return {
    player: mapPlayer(player),
    collection: collectionResult.rows.map((row) => ({
      id: row.player_card_id,
      card: mapCard(row),
      inDeck: row.in_deck,
    })),
    friends: friendsResult.rows.map((row) => ({
      id: row.id,
      displayName: row.display_name,
      playerCode: row.player_code,
      rankTitle: rankTitle(row.rank_points),
    })),
    rooms: roomsResult.rows.map(mapRoom),
    tournaments: tournamentsResult.rows.map(mapTournament),
    activeMatch: matchResult.rows[0] ? mapMatch(matchResult.rows[0]) : null,
    activity: [
      `Mazo listo: ${deckCount}/6 cartas seleccionadas`,
      `Rango actual: ${rankTitle(player.rank_points)} (${player.rank_points} RP)`,
      `Colección inicial: ${collectionResult.rows.length} cartas gratuitas`,
    ],
  };
}

router.post(
  "/tcg/players",
  asyncRoute(async (req, res) => {
    const body = RegisterPlayerBody.parse(req.body);
    const username = normalizeUsername(body.username);
    const existing = await pool.query(
      "select id from tcg_players where lower(username) = lower($1)",
      [username],
    );
    if (existing.rows[0]) {
      throw new HttpError(409, "Ese usuario ya está registrado");
    }
    const playerId = randomUUID();
    const code = `TCG-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const passwordHash = await hashPassword(body.password);
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(
        `insert into tcg_players (id, username, password_hash, display_name, player_code, region)
         values ($1, $2, $3, $4, $5, $6)`,
        [playerId, username, passwordHash, body.displayName.trim(), code, body.region ?? null],
      );
      for (const [index, card] of starterCards.entries()) {
        await client.query(
          `insert into tcg_player_cards (id, player_id, card_id, in_deck)
           values ($1, $2, $3, $4)`,
          [randomUUID(), playerId, card[0], index < 6],
        );
      }
      await client.query("commit");
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
    res.json(await getGameState(playerId));
  }),
);

router.post(
  "/tcg/auth/login",
  asyncRoute(async (req, res) => {
    const body = LoginPlayerBody.parse(req.body);
    const username = normalizeUsername(body.username);
    const result = await pool.query<PlayerRow>(
      "select * from tcg_players where lower(username) = lower($1)",
      [username],
    );
    const player = result.rows[0];
    if (!player || !(await verifyPassword(body.password, player.password_hash))) {
      throw new HttpError(401, "Usuario o contraseña incorrectos");
    }
    res.json(await getGameState(player.id));
  }),
);

router.get(
  "/tcg/players/:playerId/state",
  asyncRoute(async (req, res) => {
    const params = GetPlayerStateParams.parse(req.params);
    res.json(await getGameState(params.playerId));
  }),
);

router.put(
  "/tcg/players/:playerId/deck",
  asyncRoute(async (req, res) => {
    const params = UpdateDeckParams.parse(req.params);
    const body = UpdateDeckBody.parse(req.body);
    const client = await pool.connect();
    try {
      await client.query("begin");
      await requirePlayer(params.playerId, client);
      const ownership = await client.query(
        `select id from tcg_player_cards
         where player_id = $1 and id = any($2::uuid[])
         for update`,
        [params.playerId, body.playerCardIds],
      );
      if (ownership.rows.length !== 6) {
        throw new HttpError(400, "El mazo debe contener 6 cartas de tu colección");
      }
      await client.query("update tcg_player_cards set in_deck = false where player_id = $1", [
        params.playerId,
      ]);
      await client.query(
        "update tcg_player_cards set in_deck = true where player_id = $1 and id = any($2::uuid[])",
        [params.playerId, body.playerCardIds],
      );
      await client.query("commit");
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
    res.json(await getGameState(params.playerId));
  }),
);

router.post(
  "/tcg/players/:playerId/friends",
  asyncRoute(async (req, res) => {
    const params = AddFriendParams.parse(req.params);
    const body = AddFriendBody.parse(req.body);
    await requirePlayer(params.playerId);
    const friend = await pool.query<PlayerRow>(
      `select *
       from tcg_players
       where id <> $1 and (lower(player_code) = lower($2) or lower(display_name) like lower($3))
       order by wins desc, created_at asc
       limit 1`,
      [params.playerId, body.query.trim(), `%${body.query.trim()}%`],
    );
    if (!friend.rows[0]) throw new HttpError(404, "No se encontró ese jugador");
    await pool.query(
      `insert into tcg_friendships (player_id, friend_id)
       values ($1, $2), ($2, $1)
       on conflict do nothing`,
      [params.playerId, friend.rows[0].id],
    );
    res.json(await getGameState(params.playerId));
  }),
);

router.delete(
  "/tcg/players/:playerId/friends/:friendId",
  asyncRoute(async (req, res) => {
    const params = RemoveFriendParams.parse(req.params);
    await requirePlayer(params.playerId);
    await pool.query(
      `delete from tcg_friendships
       where (player_id = $1 and friend_id = $2) or (player_id = $2 and friend_id = $1)`,
      [params.playerId, params.friendId],
    );
    res.json(await getGameState(params.playerId));
  }),
);

router.post(
  "/tcg/rooms",
  asyncRoute(async (req, res) => {
    const body = CreateRoomBody.parse(req.body);
    const client = await pool.connect();
    let result;
    try {
      await client.query("begin");
      await requirePlayer(body.playerId, client);
      await assertDeckReady(body.playerId, client);
      result = await client.query(
        `insert into tcg_rooms (id, name, host_player_id, is_ranked)
         values ($1, $2, $3, $4)
         returning *`,
        [randomUUID(), body.name.trim(), body.playerId, body.isRanked ?? true],
      );
      await client.query("commit");
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
    res.json(mapRoom(result.rows[0]));
  }),
);

router.post(
  "/tcg/rooms/:roomId/join",
  asyncRoute(async (req, res) => {
    const params = JoinRoomParams.parse(req.params);
    const body = JoinRoomBody.parse(req.body);
    const client = await pool.connect();
    try {
      await client.query("begin");
      await requirePlayer(body.playerId, client);
      await assertDeckReady(body.playerId, client);
      const roomResult = await client.query(
        "select * from tcg_rooms where id = $1 for update",
        [params.roomId],
      );
      const room = roomResult.rows[0];
      if (!room) throw new HttpError(404, "Sala no encontrada");
      if (room.status !== "waiting") throw new HttpError(400, "La sala ya no está esperando");
      if (room.host_player_id === body.playerId) {
        throw new HttpError(400, "No puedes unirte a tu propia sala");
      }
      await assertDeckReady(room.host_player_id, client);
      const battlefield = await buildBattlefield(room.host_player_id, body.playerId, client);
      const matchId = randomUUID();
      await client.query(
        "update tcg_rooms set guest_player_id = $1, status = 'active' where id = $2",
        [body.playerId, params.roomId],
      );
      await client.query(
        `insert into tcg_matches
         (id, room_id, player_one_id, player_two_id, current_turn_player_id, battlefield, log)
         values ($1, $2, $3, $4, $3, $5::jsonb, $6::jsonb)`,
        [
          matchId,
          params.roomId,
          room.host_player_id,
          body.playerId,
          JSON.stringify(battlefield),
          JSON.stringify(["La partida comenzó. Las cargas se recuperan al iniciar cada turno."]),
        ],
      );
      await client.query("commit");
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
    res.json(await getGameState(body.playerId));
  }),
);

router.post(
  "/tcg/tournaments",
  asyncRoute(async (req, res) => {
    const body = CreateTournamentBody.parse(req.body);
    await requirePlayer(body.playerId);
    const id = randomUUID();
    const result = await pool.query(
      `insert into tcg_tournaments (id, name, host_player_id, capacity)
       values ($1, $2, $3, $4)
       returning *, 1::int as participants`,
      [id, body.name.trim(), body.playerId, body.capacity],
    );
    await pool.query(
      `insert into tcg_tournament_participants (tournament_id, player_id)
       values ($1, $2)
       on conflict do nothing`,
      [id, body.playerId],
    );
    res.json(mapTournament(result.rows[0]));
  }),
);

router.post(
  "/tcg/tournaments/:tournamentId/join",
  asyncRoute(async (req, res) => {
    const params = JoinTournamentParams.parse(req.params);
    const body = JoinTournamentBody.parse(req.body);
    await requirePlayer(body.playerId);
    const tournament = await pool.query(
      `select t.*, count(tp.player_id)::int as participants
       from tcg_tournaments t
       left join tcg_tournament_participants tp on tp.tournament_id = t.id
       where t.id = $1
       group by t.id`,
      [params.tournamentId],
    );
    const row = tournament.rows[0];
    if (!row) throw new HttpError(404, "Torneo no encontrado");
    if (row.status !== "open") throw new HttpError(400, "El torneo no está abierto");
    if (Number(row.participants) >= Number(row.capacity)) {
      throw new HttpError(400, "El torneo ya está lleno");
    }
    await pool.query(
      `insert into tcg_tournament_participants (tournament_id, player_id)
       values ($1, $2)
       on conflict do nothing`,
      [params.tournamentId, body.playerId],
    );
    res.json(await getGameState(body.playerId));
  }),
);

router.post(
  "/tcg/matches/:matchId/action",
  asyncRoute(async (req, res) => {
    const params = PlayMatchActionParams.parse(req.params);
    const body = PlayMatchActionBody.parse(req.body);
    const client = await pool.connect();
    try {
    await client.query("begin");
    const matchResult = await client.query<MatchRow>(
      "select * from tcg_matches where id = $1 for update",
      [params.matchId],
    );
    const match = matchResult.rows[0];
    if (!match) throw new HttpError(404, "Partida no encontrada");
    if (match.status !== "active") throw new HttpError(400, "La partida ya terminó");
    if (match.current_turn_player_id !== body.playerId) {
      throw new HttpError(400, "Aún no es tu turno");
    }

    const battlefield = match.battlefield;
    const actor = battlefield.find((card) => card.instanceId === body.actorInstanceId);
    if (!actor || actor.ownerId !== body.playerId || actor.defeated) {
      throw new HttpError(400, "Carta atacante inválida");
    }
    if (actor.charges < 1) throw new HttpError(400, "La carta no tiene cargas disponibles");

    const opponentId =
      match.player_one_id === body.playerId ? match.player_two_id : match.player_one_id;
    const target =
      battlefield.find((card) => card.instanceId === body.targetInstanceId) ??
      battlefield.find((card) => card.ownerId === opponentId && !card.defeated) ??
      battlefield.find((card) => card.ownerId === body.playerId && !card.defeated);
    if (!target || target.defeated) throw new HttpError(400, "Objetivo inválido");

    actor.charges -= 1;
    const log = Array.isArray(match.log) ? [...match.log] : [];
    const previousDefeated = target.defeated;

    const damageTarget = (amount: number) => {
      const blocked = Math.min(target.shield, amount);
      target.shield -= blocked;
      target.health = Math.max(0, target.health - (amount - blocked));
      if (target.health === 0) target.defeated = true;
      return amount - blocked;
    };

    if (body.actionType === "protect") {
      const shield = actor.role === "centinela" ? 8 + actor.defense : 4;
      target.shield += shield;
      log.push(`${actor.cardName} protegió a ${target.cardName} con ${shield} de escudo.`);
    } else if (body.actionType === "heal") {
      const heal = actor.role === "curador" || actor.element === "verde" ? 9 : 5;
      target.health = Math.min(target.maxHealth, target.health + heal);
      target.charges = Math.min(5, target.charges + 1);
      log.push(`${actor.cardName} curó a ${target.cardName} por ${heal} y restauró una carga.`);
    } else if (body.actionType === "steal") {
      const stolenCharges = Math.min(target.charges, actor.role === "saqueador" ? 2 : 1);
      const stolenShield = Math.min(target.shield, 4);
      target.charges -= stolenCharges;
      target.shield -= stolenShield;
      actor.charges = Math.min(5, actor.charges + stolenCharges);
      actor.shield += stolenShield;
      const dealt = damageTarget(actor.role === "saqueador" ? 3 : 1);
      log.push(`${actor.cardName} saqueó ${stolenCharges} cargas, ${stolenShield} escudo e hizo ${dealt} de daño.`);
    } else if (body.actionType === "empower") {
      target.attack += actor.role === "infanteria" ? 3 : 1;
      target.shield += 2;
      target.charges = Math.min(5, target.charges + 1);
      log.push(`${actor.cardName} potenció a ${target.cardName}.`);
    } else if (body.actionType === "elemental") {
      if (actor.element === "verde") {
        target.health = Math.min(target.maxHealth, target.health + 7);
        log.push(`${actor.cardName} canalizó energía verde y curó a ${target.cardName}.`);
      } else if (actor.element === "tierra") {
        target.shield += 7;
        log.push(`${actor.cardName} levantó una barrera de tierra para ${target.cardName}.`);
      } else if (actor.element === "aura") {
        battlefield
          .filter((card) => card.ownerId === actor.ownerId && !card.defeated)
          .forEach((card) => {
            card.charges = Math.min(5, card.charges + 1);
          });
        log.push(`${actor.cardName} expandió un aura de recarga sobre su equipo.`);
      } else {
        const bonus = actor.element === "fuego" || actor.element === "ruby" ? 6 : 4;
        const dealt = damageTarget(actor.attack + bonus);
        log.push(`${actor.cardName} lanzó poder elemental e hizo ${dealt} de daño a ${target.cardName}.`);
      }
    } else {
      const roleBonus = actor.role === "caballero" ? 3 : actor.role === "artefacto" ? 2 : 0;
      const dealt = damageTarget(Math.max(1, actor.attack + roleBonus - Math.floor(target.defense / 2)));
      log.push(`${actor.cardName} atacó a ${target.cardName} e hizo ${dealt} de daño.`);
    }

    if (!previousDefeated && target.defeated && target.ownerId !== actor.ownerId) {
      actor.charges = Math.min(5, actor.charges + 1);
      log.push(`${target.cardName} cayó. ${actor.cardName} ganó una carga adicional.`);
    }

    const opponentAlive = battlefield.some(
      (card) => card.ownerId === opponentId && !card.defeated,
    );
    const currentAlive = battlefield.some(
      (card) => card.ownerId === body.playerId && !card.defeated,
    );

    let status = "active";
    let winnerPlayerId: string | null = null;
    let nextTurnPlayerId = opponentId;
    let turnNumber = match.turn_number + 1;

    if (!opponentAlive || !currentAlive) {
      status = "finished";
      winnerPlayerId = opponentAlive ? opponentId : body.playerId;
      nextTurnPlayerId = body.playerId;
      log.push(`La partida terminó. Ganador: ${winnerPlayerId}.`);
      await client.query(
        "update tcg_players set wins = wins + 1, rank_points = rank_points + 35 where id = $1",
        [winnerPlayerId],
      );
      await client.query(
        "update tcg_players set losses = losses + 1, rank_points = greatest(0, rank_points - 18) where id = $1",
        [winnerPlayerId === match.player_one_id ? match.player_two_id : match.player_one_id],
      );
      if (match.room_id) {
        await client.query("update tcg_rooms set status = 'finished' where id = $1", [
          match.room_id,
        ]);
      }
    } else {
      battlefield
        .filter((card) => card.ownerId === nextTurnPlayerId && !card.defeated)
        .forEach((card) => {
          card.charges = Math.min(5, card.charges + 1);
        });
    }

    const updated = await client.query<MatchRow>(
      `update tcg_matches
       set current_turn_player_id = $2,
           turn_number = $3,
           status = $4,
           winner_player_id = $5,
           battlefield = $6::jsonb,
           log = $7::jsonb,
           updated_at = now()
       where id = $1
       returning *`,
      [
        params.matchId,
        nextTurnPlayerId,
        turnNumber,
        status,
        winnerPlayerId,
        JSON.stringify(battlefield),
        JSON.stringify(log.slice(-20)),
      ],
    );
    await client.query("commit");
    res.json(mapMatch(updated.rows[0]));
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  }),
);

export default router;