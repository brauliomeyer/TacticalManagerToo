import { PlayerRole, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const divisions = [
  {
    name: 'Premier League',
    season: 2026,
    clubs: [
      'Arsenal',
      'Aston Villa',
      'Bournemouth',
      'Brentford',
      'Brighton',
      'Burnley',
      'Chelsea',
      'Crystal Palace',
      'Everton',
      'Fulham',
      'Liverpool',
      'Luton Town',
      'Manchester City',
      'Manchester United',
      'Newcastle United',
      'Nottingham Forest',
      'Sheffield United',
      'Tottenham Hotspur',
      'West Ham United',
      'Wolverhampton Wanderers'
    ]
  },
  {
    name: 'Championship',
    season: 2026,
    clubs: [
      'Birmingham City',
      'Blackburn Rovers',
      'Bristol City',
      'Cardiff City',
      'Coventry City',
      'Derby County',
      'Hull City',
      'Ipswich Town',
      'Leeds United',
      'Leicester City',
      'Middlesbrough',
      'Millwall',
      'Norwich City',
      'Plymouth Argyle',
      'Preston North End',
      'Queens Park Rangers',
      'Rotherham United',
      'Sheffield Wednesday',
      'Southampton',
      'Stoke City',
      'Sunderland',
      'Swansea City',
      'Watford',
      'West Bromwich Albion'
    ]
  },
  {
    name: 'League One',
    season: 2026,
    clubs: [
      'Barnsley',
      'Blackpool',
      'Bolton Wanderers',
      'Burton Albion',
      'Cambridge United',
      'Carlisle United',
      'Charlton Athletic',
      'Cheltenham Town',
      'Derby County U23',
      'Exeter City',
      'Fleetwood Town',
      'Leyton Orient',
      'Lincoln City',
      'Northampton Town',
      'Oxford United',
      'Peterborough United',
      'Port Vale',
      'Portsmouth',
      'Reading',
      'Shrewsbury Town',
      'Stevenage',
      'Wigan Athletic',
      'Wycombe Wanderers',
      'Bristol Rovers'
    ]
  },
  {
    name: 'League Two',
    season: 2026,
    clubs: [
      'Accrington Stanley',
      'AFC Wimbledon',
      'Barrow',
      'Bradford City',
      'Colchester United',
      'Crawley Town',
      'Crewe Alexandra',
      'Doncaster Rovers',
      'Forest Green Rovers',
      'Gillingham',
      'Grimsby Town',
      'Harrogate Town',
      'Mansfield Town',
      'Milton Keynes Dons',
      'Morecambe',
      'Newport County',
      'Notts County',
      'Salford City',
      'Stockport County',
      'Swindon Town',
      'Sutton United',
      'Tranmere Rovers',
      'Walsall',
      'Wrexham'
    ]
  }
];

const firstNames = ['Jack', 'James', 'Tom', 'Ben', 'Callum', 'Liam', 'Mason', 'Noah', 'Ethan', 'Owen'];
const lastNames = ['Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Davies', 'Evans', 'Wilson', 'Thomas', 'Roberts'];

const formationSlots: Record<PlayerRole, Array<{ x: number; y: number }>> = {
  GOALKEEPER: [
    { x: 50, y: 8 },
    { x: 44, y: 10 },
    { x: 56, y: 10 }
  ],
  DEFENDER: [
    { x: 15, y: 24 },
    { x: 35, y: 26 },
    { x: 65, y: 26 },
    { x: 85, y: 24 },
    { x: 20, y: 32 },
    { x: 40, y: 34 },
    { x: 60, y: 34 },
    { x: 80, y: 32 },
    { x: 50, y: 28 },
    { x: 50, y: 38 }
  ],
  MIDFIELDER: [
    { x: 18, y: 48 },
    { x: 35, y: 50 },
    { x: 50, y: 52 },
    { x: 65, y: 50 },
    { x: 82, y: 48 },
    { x: 25, y: 58 },
    { x: 40, y: 60 },
    { x: 60, y: 60 },
    { x: 75, y: 58 },
    { x: 50, y: 64 }
  ],
  ATTACKER: [
    { x: 20, y: 74 },
    { x: 35, y: 78 },
    { x: 50, y: 80 },
    { x: 65, y: 78 },
    { x: 80, y: 74 },
    { x: 42, y: 86 },
    { x: 58, y: 86 }
  ]
};

function clamp(value: number, min = 20, max = 95) {
  return Math.max(min, Math.min(max, value));
}

function roleBoosts(role: PlayerRole) {
  if (role === 'GOALKEEPER') return { pac: 45, sho: 35, pas: 72, dri: 45, def: 58, phy: 66, stamina: 75 };
  if (role === 'DEFENDER') return { pac: 58, sho: 42, pas: 55, dri: 50, def: 78, phy: 80, stamina: 70 };
  if (role === 'MIDFIELDER') return { pac: 62, sho: 60, pas: 80, dri: 72, def: 58, phy: 64, stamina: 82 };
  return { pac: 82, sho: 84, pas: 62, dri: 74, def: 40, phy: 68, stamina: 70 };
}

function generatePlayer(clubStrength: number, role: PlayerRole, index: number) {
  const boost = roleBoosts(role);
  const slots = formationSlots[role];
  const slot = slots[index % slots.length];
  const variance = Math.floor(Math.random() * 12) - 6;

  const base = clamp(clubStrength + variance, 35, 92);

  return {
    name: `${firstNames[index % firstNames.length]} ${lastNames[(index * 3) % lastNames.length]}`,
    age: 18 + (index % 16),
    pac: clamp(boost.pac + variance, 25, 99),
    sho: clamp(boost.sho + variance, 20, 99),
    pas: clamp(boost.pas + variance, 20, 99),
    dri: clamp(boost.dri + variance, 20, 99),
    def: clamp(boost.def + variance, 20, 99),
    phy: clamp(boost.phy + variance, 20, 99),
    morale: clamp(58 + Math.floor(Math.random() * 30), 30, 99),
    stamina: clamp(boost.stamina + Math.floor(Math.random() * 10) - 5, 35, 99),
    form: clamp(50 + Math.floor(Math.random() * 35), 25, 99),
    potential: clamp(base + Math.floor(Math.random() * 12), 30, 99),
    posX: clamp(slot.x + (Math.floor(Math.random() * 11) - 5), 0, 100),
    posY: clamp(slot.y + (Math.floor(Math.random() * 11) - 5), 0, 100),
    role
  };
}

function buildFixtures(clubIds: string[], leagueId: string) {
  const teamCount = clubIds.length;
  const hasBye = teamCount % 2 !== 0;
  const teams = hasBye ? [...clubIds, 'BYE'] : [...clubIds];
  const rounds = teams.length - 1;
  const half = teams.length / 2;

  const fixtures: Array<{
    leagueId: string;
    homeTeamId: string;
    awayTeamId: string;
    scoreHome: number;
    scoreAway: number;
    events: object;
    matchDate: Date;
  }> = [];

  const rotation = [...teams];
  let day = 1;

  for (let round = 0; round < rounds; round += 1) {
    for (let i = 0; i < half; i += 1) {
      const home = rotation[i];
      const away = rotation[rotation.length - 1 - i];
      if (home !== 'BYE' && away !== 'BYE') {
        fixtures.push({
          leagueId,
          homeTeamId: home,
          awayTeamId: away,
          scoreHome: 0,
          scoreAway: 0,
          events: [],
          matchDate: new Date(`2026-08-${String((day % 28) + 1).padStart(2, '0')}T15:00:00.000Z`)
        });
        fixtures.push({
          leagueId,
          homeTeamId: away,
          awayTeamId: home,
          scoreHome: 0,
          scoreAway: 0,
          events: [],
          matchDate: new Date(`2027-01-${String((day % 28) + 1).padStart(2, '0')}T15:00:00.000Z`)
        });
      }
    }

    const fixed = rotation[0];
    const rest = rotation.slice(1);
    rest.unshift(rest.pop()!);
    rotation.splice(0, rotation.length, fixed, ...rest);
    day += 1;
  }

  return fixtures;
}

async function main() {
  await prisma.match.deleteMany();
  await prisma.tableStanding.deleteMany();
  await prisma.player.deleteMany();
  await prisma.tactics.deleteMany();
  await prisma.club.deleteMany();
  await prisma.league.deleteMany();

  for (const division of divisions) {
    const league = await prisma.league.create({
      data: {
        name: division.name,
        country: 'England',
        season: division.season
      }
    });

    const createdClubs: { id: string; strength: number }[] = [];

    for (let i = 0; i < division.clubs.length; i += 1) {
      const qualityFromTop = division.clubs.length - i;
      const teamStrength = 48 + Math.floor((qualityFromTop / division.clubs.length) * 38);

      const club = await prisma.club.create({
        data: {
          name: division.clubs[i],
          leagueId: league.id,
          budget: 2_000_000 + qualityFromTop * 750_000,
          reputation: clamp(35 + qualityFromTop * 2, 30, 95)
        }
      });

      createdClubs.push({ id: club.id, strength: teamStrength });

      const players = [
        ...Array.from({ length: 3 }, (_, idx) => generatePlayer(teamStrength, 'GOALKEEPER', idx)),
        ...Array.from({ length: 10 }, (_, idx) => generatePlayer(teamStrength, 'DEFENDER', idx)),
        ...Array.from({ length: 10 }, (_, idx) => generatePlayer(teamStrength, 'MIDFIELDER', idx)),
        ...Array.from({ length: 7 }, (_, idx) => generatePlayer(teamStrength, 'ATTACKER', idx))
      ];

      await prisma.player.createMany({
        data: players.map((player) => ({
          ...player,
          clubId: club.id
        }))
      });

      await prisma.tactics.create({
        data: {
          clubId: club.id,
          formationName: '4-3-3 Wide',
          tempo: clamp(45 + Math.floor(Math.random() * 30), 20, 95),
          pressing: clamp(45 + Math.floor(Math.random() * 35), 20, 95),
          width: clamp(40 + Math.floor(Math.random() * 35), 20, 95),
          mentality: i < 6 ? 'Attacking' : i > division.clubs.length - 6 ? 'Defensive' : 'Balanced'
        }
      });
    }

    await prisma.tableStanding.createMany({
      data: createdClubs.map((club, idx) => ({
        leagueId: league.id,
        clubId: club.id,
        position: idx + 1,
        points: 0,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0
      }))
    });

    const fixtures = buildFixtures(
      createdClubs.map((club) => club.id),
      league.id
    );

    for (const fixture of fixtures) {
      await prisma.match.create({ data: fixture });
    }
  }

  console.log('Seed complete: English top 4 divisions, 30 players per club, tactics, standings and fixtures generated.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
