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

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
const PORT = Number(process.env.PORT ?? 4000);

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN
  }
});

app.use(cors({ origin: CLIENT_ORIGIN, optionsSuccessStatus: 200 }));
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
