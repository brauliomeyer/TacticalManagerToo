import 'dotenv/config';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import type { ManagerSummary } from '@tmt/shared';
import { simulateMatchEngine } from './matchEngine';

const prisma = new PrismaClient();
const app = express();
const httpServer = createServer(app);

const CLIENT_ORIGIN_RAW = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
const CLIENT_ORIGINS: string[] = CLIENT_ORIGIN_RAW.split(',').map((s) => s.trim());
const PORT = Number(process.env.PORT ?? 4000);

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGINS
  }
});

app.use(cors({ origin: CLIENT_ORIGINS, optionsSuccessStatus: 200 }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/clubs', async (_req, res) => {
  const clubs = await prisma.club.findMany({
    include: { league: true },
    orderBy: [{ league: { name: 'asc' } }, { name: 'asc' }]
  });

  res.json(
    clubs.map((club: (typeof clubs)[number]) => ({
      id: club.id,
      name: club.name,
      country: club.league?.country ?? null,
      budget: club.budget,
      reputation: club.reputation,
      leagueId: club.leagueId,
      leagueName: club.league?.name ?? null
    }))
  );
});

app.get('/clubs/:clubId/players', async (req, res) => {
  const clubId = String(req.params.clubId);

  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) {
    res.status(404).json({ error: 'Club not found' });
    return;
  }

  const players = await prisma.player.findMany({
    where: { clubId },
    orderBy: [{ role: 'asc' }, { name: 'asc' }]
  });

  res.json({
    club: { id: club.id, name: club.name },
    players
  });
});

app.get('/leagues/:leagueId/standings', async (req, res) => {
  const leagueId = String(req.params.leagueId);

  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league) {
    res.status(404).json({ error: 'League not found' });
    return;
  }

  const rows = await prisma.tableStanding.findMany({
    where: { leagueId },
    include: { club: true },
    orderBy: [
      { points: 'desc' },
      { goalDiff: 'desc' },
      { goalsFor: 'desc' },
      { club: { name: 'asc' } }
    ]
  });

  if (rows.length > 0) {
    res.json({
      league: { id: league.id, name: league.name, season: league.season },
      standings: rows.map((row: (typeof rows)[number], index: number) => ({
        position: row.position > 0 ? row.position : index + 1,
        clubId: row.clubId,
        clubName: row.club.name,
        played: row.played,
        won: row.won,
        drawn: row.drawn,
        lost: row.lost,
        goalsFor: row.goalsFor,
        goalsAgainst: row.goalsAgainst,
        goalDiff: row.goalDiff,
        points: row.points,
        updatedAt: row.updatedAt
      }))
    });
    return;
  }

  const clubs = await prisma.club.findMany({
    where: { leagueId },
    orderBy: { name: 'asc' }
  });

  res.json({
    league: { id: league.id, name: league.name, season: league.season },
    standings: clubs.map((club: (typeof clubs)[number], index: number) => ({
      position: index + 1,
      clubId: club.id,
      clubName: club.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
      updatedAt: null
    }))
  });
});

app.get('/manager/summary', async (_req, res) => {
  const clubs = await prisma.club.findMany();
  const summary: ManagerSummary = {
    status: 'INEXPERIENCED',
    level: 3,
    successes: Math.max(0, Math.floor(clubs.length / 2)),
    successiveWins: 0,
    successiveLosses: 0,
    totalWins: clubs.length,
    totalLosses: 0,
    totalDraws: Math.max(0, clubs.length - 1)
  };

  res.json(summary);
});

// ────────────────────────────────────────────
// OFFLINE-FIRST: Game Save API endpoints
// ────────────────────────────────────────────

/**
 * POST /game/init
 * Initialize a new game save for a club.
 * Body: { clubId: string, data: unknown }
 */
app.post('/game/init', async (req, res) => {
  const { clubId, data } = req.body as { clubId: string; data: unknown };

  if (!clubId) {
    res.status(400).json({ error: 'clubId is required' });
    return;
  }

  try {
    const existing = await prisma.gameSave.findUnique({ where: { clubId } });
    if (existing) {
      res.status(409).json({ error: 'Game already exists for this club', gameSave: existing });
      return;
    }

    const gameSave = await prisma.gameSave.create({
      data: {
        clubId,
        version: 1,
        data: JSON.stringify(data ?? {}),
      },
    });

    res.status(201).json({
      clubId: gameSave.clubId,
      version: gameSave.version,
      updatedAt: gameSave.updatedAt.toISOString(),
      data: JSON.parse(gameSave.data),
    });
  } catch (err) {
    console.error('[game/init] Error:', err);
    res.status(500).json({ error: 'Failed to initialize game' });
  }
});

/**
 * GET /game/load/:clubId
 * Load the latest game save for a club.
 */
app.get('/game/load/:clubId', async (req, res) => {
  const clubId = String(req.params.clubId);

  try {
    const gameSave = await prisma.gameSave.findUnique({ where: { clubId } });

    if (!gameSave) {
      res.status(404).json({ error: 'No game save found for this club' });
      return;
    }

    res.json({
      clubId: gameSave.clubId,
      version: gameSave.version,
      updatedAt: gameSave.updatedAt.toISOString(),
      data: JSON.parse(gameSave.data),
    });
  } catch (err) {
    console.error('[game/load] Error:', err);
    res.status(500).json({ error: 'Failed to load game' });
  }
});

/**
 * POST /game/save
 * Save a game snapshot. Uses Last Write Wins (version-based).
 * Body: { clubId: string, version: number, data: unknown }
 * Returns 409 if the incoming version is <= the stored version.
 */
app.post('/game/save', async (req, res) => {
  const { clubId, version, data } = req.body as { clubId: string; version: number; data: unknown };

  if (!clubId || version === undefined) {
    res.status(400).json({ error: 'clubId and version are required' });
    return;
  }

  try {
    const existing = await prisma.gameSave.findUnique({ where: { clubId } });

    if (existing && version <= existing.version) {
      res.status(409).json({
        error: 'Version conflict — incoming version is stale',
        storedVersion: existing.version,
        incomingVersion: version,
      });
      return;
    }

    const gameSave = await prisma.gameSave.upsert({
      where: { clubId },
      create: {
        clubId,
        version,
        data: JSON.stringify(data ?? {}),
      },
      update: {
        version,
        data: JSON.stringify(data ?? {}),
      },
    });

    res.json({
      clubId: gameSave.clubId,
      version: gameSave.version,
      updatedAt: gameSave.updatedAt.toISOString(),
      data: JSON.parse(gameSave.data),
    });
  } catch (err) {
    console.error('[game/save] Error:', err);
    res.status(500).json({ error: 'Failed to save game' });
  }
});

/**
 * DELETE /game/clear/:clubId
 * Delete the game save for a club.
 */
app.delete('/game/clear/:clubId', async (req, res) => {
  const clubId = String(req.params.clubId);

  try {
    const existing = await prisma.gameSave.findUnique({ where: { clubId } });
    if (!existing) {
      res.status(404).json({ error: 'No game save found for this club' });
      return;
    }

    await prisma.gameSave.delete({ where: { clubId } });
    res.json({ message: 'Game save cleared', clubId });
  } catch (err) {
    console.error('[game/clear] Error:', err);
    res.status(500).json({ error: 'Failed to clear game' });
  }
});

app.post('/matches/simulate', async (req, res) => {
  const homeClubId = String(req.body.homeClubId);
  const awayClubId = String(req.body.awayClubId);

  const [homeClub, awayClub, homePlayers, awayPlayers, homeTactics, awayTactics] = await Promise.all([
    prisma.club.findUnique({ where: { id: homeClubId } }),
    prisma.club.findUnique({ where: { id: awayClubId } }),
    prisma.player.findMany({ where: { clubId: homeClubId } }),
    prisma.player.findMany({ where: { clubId: awayClubId } }),
    prisma.tactics.findFirst({ where: { clubId: homeClubId }, orderBy: { updatedAt: 'desc' } }),
    prisma.tactics.findFirst({ where: { clubId: awayClubId }, orderBy: { updatedAt: 'desc' } })
  ]);

  if (!homeClub || !awayClub) {
    res.status(404).json({ error: 'Club not found' });
    return;
  }

  const result = simulateMatchEngine(
    { players: homePlayers, tactics: homeTactics },
    { players: awayPlayers, tactics: awayTactics }
  );

  io.emit('match:update', result);
  res.json(result);
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({ error: 'Internal server error' });
});

io.on('connection', (socket) => {
  socket.emit('match:message', 'Connected to Tactical Manager live match feed.');
});

const server = httpServer.listen(PORT, () => {
  console.log(`Backend listening on http://0.0.0.0:${PORT}`);
});

const shutdown = () => {
  console.log('Shutting down server...');
  server.close(() => {
    prisma.$disconnect().finally(() => process.exit(0));
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
