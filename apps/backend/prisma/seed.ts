import { PlayerRole, PrismaClient } from '@prisma/client';
import axios from 'axios';
import csv from 'csv-parser';
import { Readable } from 'stream';

const prisma = new PrismaClient();

async function fetchClubsFromOpenFootball(league: string, season: string): Promise<string[]> {
  const url = `https://raw.githubusercontent.com/openfootball/england/master/${season}/${league}.csv`;
  try {
    const response = await axios.get(url);
    const clubs = new Set<string>();
    const stream = Readable.from(response.data);
    return new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (row: any) => {
          if (row.HomeTeam) clubs.add(row.HomeTeam);
          if (row.AwayTeam) clubs.add(row.AwayTeam);
        })
        .on('end', () => {
          console.log(`Fetched ${clubs.size} clubs for ${league}`);
          resolve(Array.from(clubs));
        })
        .on('error', reject);
    });
  } catch (error) {
    console.error(`Failed to fetch ${league}:`, error);
    return [];
  }
}

async function seed() {
  // Hardcoded clubs for now (from OpenFootball data)
  const premierLeagueClubs = [
    'Arsenal', 'Aston Villa', 'Brentford', 'Brighton', 'Burnley', 'Chelsea', 'Crystal Palace', 'Everton', 'Fulham', 'Liverpool', 'Manchester City', 'Manchester United', 'Newcastle United', 'Norwich City', 'Southampton', 'Tottenham Hotspur', 'Watford', 'West Ham United', 'Wolverhampton Wanderers'
  ];
  const championshipClubs = [
    'Birmingham City', 'Blackburn Rovers', 'Blackpool', 'Bournemouth', 'Bristol City', 'Cardiff City', 'Coventry City', 'Derby County', 'Huddersfield Town', 'Hull City', 'Luton Town', 'Middlesbrough', 'Millwall', 'Nottingham Forest', 'Peterborough United', 'Preston North End', 'Queens Park Rangers', 'Reading', 'Sheffield United', 'Stoke City', 'Swansea City', 'West Bromwich Albion'
  ];
  const leagueOneClubs = [
    'Accrington Stanley', 'AFC Wimbledon', 'Bolton Wanderers', 'Burton Albion', 'Cambridge United', 'Charlton Athletic', 'Cheltenham Town', 'Crewe Alexandra', 'Doncaster Rovers', 'Fleetwood Town', 'Gillingham', 'Ipswich Town', 'Lincoln City', 'MK Dons', 'Morecambe', 'Oxford United', 'Plymouth Argyle', 'Portsmouth', 'Rotherham United', 'Salford City', 'Sheffield Wednesday', 'Shrewsbury Town', 'Sunderland', 'Wigan Athletic'
  ];
  const leagueTwoClubs = [
    'AFC Wimbledon', 'Barrow', 'Bradford City', 'Bristol Rovers', 'Carlisle United', 'Colchester United', 'Crawley Town', 'Exeter City', 'Forest Green Rovers', 'Harrogate Town', 'Hartlepool United', 'Leyton Orient', 'Mansfield Town', 'Newport County', 'Northampton Town', 'Oldham Athletic', 'Port Vale', 'Rochdale', 'Salford City', 'Scunthorpe United', 'Stevenage', 'Sutton United', 'Swindon Town', 'Tranmere Rovers', 'Walsall'
  ];

  console.log('PL clubs:', premierLeagueClubs.length);
  console.log('CH clubs:', championshipClubs.length);

  const divisions = [
    { name: 'Premier League', season: 2022, clubs: premierLeagueClubs },
    { name: 'Championship', season: 2022, clubs: championshipClubs },
    { name: 'League One', season: 2022, clubs: leagueOneClubs },
    { name: 'League Two', season: 2022, clubs: leagueTwoClubs },
  ];

  for (const division of divisions) {
    const league = await prisma.league.upsert({
      where: { name_season: { name: division.name, season: division.season } },
      update: {},
      create: {
        name: division.name,
        country: 'England',
        season: division.season,
      },
    });

    for (const clubName of division.clubs) {
      const club = await prisma.club.upsert({
        where: { name_leagueId: { name: clubName, leagueId: league.id } },
        update: {},
        create: {
          name: clubName,
          leagueId: league.id,
          budget: Math.floor(Math.random() * 100000000) + 10000000,
          reputation: Math.floor(Math.random() * 100) + 1,
        },
      });

      // Generate fictional players for each club
      const roles: PlayerRole[] = [
        'GOALKEEPER', 'CENTER_BACK', 'LEFT_BACK', 'RIGHT_BACK', 'SWEEPER',
        'CENTRAL_MIDFIELDER', 'ATTACKING_MIDFIELDER', 'LEFT_WINGER', 'RIGHT_WINGER', 'STRIKER'
      ];

      for (let i = 0; i < 11; i++) {
        const role = roles[i % roles.length];
        await prisma.player.create({
          data: {
            clubId: club.id,
            name: `Player ${i + 1} of ${clubName}`,
            age: Math.floor(Math.random() * 20) + 18,
            pac: Math.floor(Math.random() * 50) + 50,
            sho: Math.floor(Math.random() * 50) + 50,
            pas: Math.floor(Math.random() * 50) + 50,
            dri: Math.floor(Math.random() * 50) + 50,
            def: Math.floor(Math.random() * 50) + 50,
            phy: Math.floor(Math.random() * 50) + 50,
            role,
            posX: Math.floor(Math.random() * 100),
            posY: Math.floor(Math.random() * 100),
          },
        });
      }
    }
  }

  console.log('Seeding completed');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
