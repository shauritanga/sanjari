import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

process.loadEnvFile('../../.env');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  await prisma.interest.createMany({
    data: [
      { slug: 'music', labelEn: 'Music', labelSw: 'Muziki' },
      { slug: 'travel', labelEn: 'Travel', labelSw: 'Safari' },
      { slug: 'faith', labelEn: 'Faith', labelSw: 'Imani' },
      { slug: 'fitness', labelEn: 'Fitness', labelSw: 'Mazoezi' }
    ],
    skipDuplicates: true
  });

  await prisma.language.createMany({
    data: [
      { code: 'en', labelEn: 'English', labelSw: 'Kiingereza' },
      { code: 'sw', labelEn: 'Swahili', labelSw: 'Kiswahili' }
    ],
    skipDuplicates: true
  });
}

void main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
