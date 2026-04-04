import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const club = await prisma.club.upsert({
    where: { name: 'Notts Forest' },
    update: {},
    create: {
      name: 'Notts Forest',
      country: 'England',
      budget: 1500000,
      reputation: 58,
      players: {
        create: [
          {
            name: 'J. Lawson',
            position: 'FW',
            age: 24,
            overall: 67,
            potential: 74,
            wage: 9000
          },
          {
            name: 'M. Price',
            position: 'MF',
            age: 27,
            overall: 65,
            potential: 66,
            wage: 8500
          }
        ]
      }
    }
  });

  console.log(`Seeded club: ${club.name}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
