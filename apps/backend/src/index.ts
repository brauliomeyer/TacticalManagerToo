import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import type { ManagerSummary } from '@tmt/shared';
import { simulateMatchEngine } from './matchEngine';

const prisma = new PrismaClient();
const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173'
  }
});

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/clubs', async (_req, res) => {
  const clubs = await prisma.club.findMany({ include: { players: true } });
  res.json(clubs);
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

io.on('connection', (socket) => {
  socket.emit('match:message', 'Connected to Tactical Manager live match feed.');
});

const port = Number(process.env.PORT ?? 4000);
httpServer.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
