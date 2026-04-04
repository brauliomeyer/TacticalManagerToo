import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import type { MatchEvent } from '@tmt/shared';

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

app.post('/matches/simulate', async (req, res) => {
  const homeClubId = String(req.body.homeClubId);
  const awayClubId = String(req.body.awayClubId);

  const [home, away] = await Promise.all([
    prisma.club.findUnique({ where: { id: homeClubId } }),
    prisma.club.findUnique({ where: { id: awayClubId } })
  ]);

  if (!home || !away) {
    res.status(404).json({ error: 'Club not found' });
    return;
  }

  const events: MatchEvent[] = [
    { minute: 12, type: 'goal', description: `${home.name} scored from a counterattack.` },
    { minute: 61, type: 'card', description: `${away.name} received a yellow card.` }
  ];

  io.emit('match:update', { homeClubId, awayClubId, events });
  res.json({ homeClubId, awayClubId, events });
});

io.on('connection', (socket) => {
  socket.emit('match:message', 'Connected to Tactical Manager live match feed.');
});

const port = Number(process.env.PORT ?? 4000);
httpServer.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
