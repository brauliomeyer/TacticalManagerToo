import { PlayerRole, PrismaClient } from '@prisma/client';
import axios from 'axios';
import csv from 'csv-parser';
import { Readable } from 'stream';

const prisma = new PrismaClient();

const DATASET_BASE = 'https://raw.githubusercontent.com/footballcsv/england/master';
const TARGET_SEASON = '2020-21';

const divisions = [
  { name: 'Premier League', season: 2020, file: 'eng.1.csv' },
  { name: 'Championship', season: 2020, file: 'eng.2.csv' },
  { name: 'League One', season: 2020, file: 'eng.3.csv' },
  { name: 'League Two', season: 2020, file: 'eng.4.csv' }
] as const;

const squadRoles: PlayerRole[] = [
  'GOALKEEPER', 'GOALKEEPER',
  'CENTER_BACK', 'CENTER_BACK', 'CENTER_BACK',
  'LEFT_BACK', 'RIGHT_BACK',
  'DEFENSIVE_MIDFIELDER', 'DEFENSIVE_MIDFIELDER',
  'CENTRAL_MIDFIELDER', 'CENTRAL_MIDFIELDER', 'BOX_TO_BOX_MIDFIELDER',
  'ATTACKING_MIDFIELDER', 'PLAYMAKER',
  'LEFT_WINGER', 'RIGHT_WINGER',
  'STRIKER', 'STRIKER', 'SECOND_STRIKER', 'TARGET_MAN',
  'FALSE_NINE', 'LEFT_MIDFIELDER', 'RIGHT_MIDFIELDER'
];

const firstNames = [
  'James', 'Jack', 'Harry', 'Thomas', 'Oliver', 'George', 'Charlie', 'Ethan', 'Leo', 'Mason',
  'Noah', 'Lucas', 'Adam', 'Liam', 'Isaac', 'Samuel', 'Jacob', 'Finley', 'Ryan', 'Daniel'
];

const lastNames = [
  'Walker', 'Johnson', 'Brown', 'Davies', 'Taylor', 'Wilson', 'Evans', 'Roberts', 'Lewis', 'Cooper',
  'Hall', 'Baker', 'Morris', 'Murphy', 'King', 'Turner', 'Price', 'Parker', 'Collins', 'Scott'
];

function statRange(role: PlayerRole) {
  if (role === 'GOALKEEPER') {
    return { pac: [38, 68], sho: [20, 45], pas: [45, 75], dri: [25, 55], def: [55, 85], phy: [50, 82] };
  }
  if (role === 'CENTER_BACK' || role === 'LEFT_BACK' || role === 'RIGHT_BACK') {
    return { pac: [45, 80], sho: [30, 60], pas: [45, 75], dri: [38, 70], def: [55, 88], phy: [55, 88] };
  }
  if (role === 'STRIKER' || role === 'TARGET_MAN' || role === 'FALSE_NINE' || role === 'SECOND_STRIKER') {
    return { pac: [50, 90], sho: [58, 92], pas: [42, 78], dri: [45, 88], def: [20, 55], phy: [48, 88] };
  }
  if (role === 'LEFT_WINGER' || role === 'RIGHT_WINGER') {
    return { pac: [62, 92], sho: [50, 86], pas: [50, 82], dri: [62, 92], def: [28, 62], phy: [45, 78] };
  }

  return { pac: [48, 84], sho: [40, 78], pas: [52, 86], dri: [48, 84], def: [40, 78], phy: [45, 82] };
}

function randBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomName() {
  return `${firstNames[randBetween(0, firstNames.length - 1)]} ${lastNames[randBetween(0, lastNames.length - 1)]}`;
}

function extractTeamsFromCsv(csvText: string): Promise<string[]> {
  const teams = new Set<string>();

  return new Promise((resolve, reject) => {
    Readable.from(csvText)
      .pipe(csv())
      .on('data', (row: Record<string, string>) => {
        const home = row['Team 1']?.trim();
        const away = row['Team 2']?.trim();
        if (home) teams.add(home);
        if (away) teams.add(away);
      })
      .on('end', () => resolve(Array.from(teams).sort((a, b) => a.localeCompare(b))))
      .on('error', reject);
  });
}

async function fetchDivisionClubs(fileName: string): Promise<string[]> {
  const url = `${DATASET_BASE}/2020s/${TARGET_SEASON}/${fileName}`;
  const response = await axios.get<string>(url);
  return extractTeamsFromCsv(response.data);
}

async function resetExistingData() {
  await prisma.match.deleteMany();
  await prisma.tableStanding.deleteMany();
  await prisma.tactics.deleteMany();
  await prisma.player.deleteMany();
  await prisma.club.deleteMany();
  await prisma.league.deleteMany();
}

async function createSquad(clubId: string, clubName: string) {
  const usedNames = new Set<string>();
  for (const role of squadRoles) {
    let name = randomName();
    while (usedNames.has(name)) {
      name = randomName();
    }
    usedNames.add(name);

    const range = statRange(role);
    const age = randBetween(18, 36);
    const expBase = Math.min(20, Math.max(1, Math.floor((age - 16) * 0.8) + randBetween(0, 4)));
    await prisma.player.create({
      data: {
        clubId,
        name,
        age,
        pac: randBetween(range.pac[0], range.pac[1]),
        sho: randBetween(range.sho[0], range.sho[1]),
        pas: randBetween(range.pas[0], range.pas[1]),
        dri: randBetween(range.dri[0], range.dri[1]),
        def: randBetween(range.def[0], range.def[1]),
        phy: randBetween(range.phy[0], range.phy[1]),
        morale: randBetween(45, 85),
        stamina: randBetween(48, 92),
        form: randBetween(40, 90),
        potential: randBetween(52, 92),
        // Original Tactical Manager attributes
        played: 0,
        scored: 0,
        speed: randBetween(1, 19),
        control: randBetween(1, 19),
        tackling: randBetween(1, 19),
        passing: randBetween(1, 19),
        heading: randBetween(0, 15),
        shooting: randBetween(0, 15),
        marking: randBetween(1, 19),
        vision: randBetween(1, 19),
        caps: randBetween(0, 49),
        experience: expBase,
        fitness: randBetween(5, 20),
        freshness: randBetween(10, 20),
        influence: randBetween(1, 15),
        attitude: randBetween(3, 19),
        reliability: randBetween(2, 19),
        role,
        posX: randBetween(6, 94),
        posY: randBetween(6, 94)
      }
    });
  }

  console.log(`Created ${squadRoles.length} players for ${clubName}`);
}

async function seed() {
  await resetExistingData();
  console.log('Cleared existing leagues, clubs, players, tactics and matches.');

  for (const division of divisions) {
    const clubsFromDataset = await fetchDivisionClubs(division.file);
    console.log(`Loaded ${clubsFromDataset.length} clubs from ${division.file}`);

    const league = await prisma.league.upsert({
      where: { name_season: { name: division.name, season: division.season } },
      update: {},
      create: {
        name: division.name,
        country: 'England',
        season: division.season,
      },
    });

    for (const clubName of clubsFromDataset) {
      const club = await prisma.club.upsert({
        where: { name_leagueId: { name: clubName, leagueId: league.id } },
        update: {},
        create: {
          name: clubName,
          leagueId: league.id,
          budget: randBetween(8_000_000, 220_000_000),
          reputation: randBetween(35, 95),
        },
      });

      await createSquad(club.id, clubName);
    }
  }

  const [leagueCount, clubCount, playerCount] = await Promise.all([
    prisma.league.count(),
    prisma.club.count(),
    prisma.player.count()
  ]);

  console.log(`Seeding completed: ${leagueCount} leagues, ${clubCount} clubs, ${playerCount} players.`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
