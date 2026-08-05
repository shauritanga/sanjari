import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { hash } from 'argon2';
import { WORLD_LOCATION_CATALOG } from './data/countries';

process.loadEnvFile('../../.env');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  await prisma.interest.createMany({
    data: [
      { slug: 'music', labelEn: 'Music', labelSw: 'Muziki' },
      { slug: 'travel', labelEn: 'Travel', labelSw: 'Safari' },
      { slug: 'faith', labelEn: 'Faith', labelSw: 'Imani' },
      { slug: 'fitness', labelEn: 'Fitness', labelSw: 'Mazoezi' },
      { slug: 'cooking', labelEn: 'Cooking', labelSw: 'Kupika' },
      { slug: 'movies', labelEn: 'Movies', labelSw: 'Filamu' },
      { slug: 'reading', labelEn: 'Reading', labelSw: 'Kusoma' },
      { slug: 'art', labelEn: 'Art', labelSw: 'Sanaa' },
      { slug: 'photography', labelEn: 'Photography', labelSw: 'Upigaji picha' },
      { slug: 'gaming', labelEn: 'Gaming', labelSw: 'Michezo ya video' },
      { slug: 'hiking', labelEn: 'Hiking', labelSw: 'Kupanda milima' },
      { slug: 'yoga', labelEn: 'Yoga', labelSw: 'Yoga' },
      { slug: 'dancing', labelEn: 'Dancing', labelSw: 'Kucheza dansi' },
      { slug: 'coffee', labelEn: 'Coffee', labelSw: 'Kahawa' },
      { slug: 'wine', labelEn: 'Wine', labelSw: 'Mvinyo' },
      { slug: 'foodie', labelEn: 'Foodie', labelSw: 'Mpenzi wa chakula' },
      { slug: 'pets', labelEn: 'Pets', labelSw: 'Wanyama kipenzi' },
      { slug: 'fashion', labelEn: 'Fashion', labelSw: 'Mitindo' },
      { slug: 'sports', labelEn: 'Sports', labelSw: 'Michezo' },
      { slug: 'spirituality', labelEn: 'Spirituality', labelSw: 'Kiroho' },
      { slug: 'volunteering', labelEn: 'Volunteering', labelSw: 'Kujitolea' },
      { slug: 'tech', labelEn: 'Tech', labelSw: 'Teknolojia' },
      { slug: 'comedy', labelEn: 'Comedy', labelSw: 'Ucheshi' },
      { slug: 'nature', labelEn: 'Nature', labelSw: 'Asili' },
      { slug: 'nightlife', labelEn: 'Nightlife', labelSw: 'Maisha ya usiku' }
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

  for (const country of WORLD_LOCATION_CATALOG) {
    await prisma.country.upsert({ where: { code: country.code }, update: { name: country.name, active: true }, create: { code: country.code, name: country.name } });
    await prisma.city.createMany({ data: country.cities.map((name) => ({ countryCode: country.code, name })), skipDuplicates: true });
  }

  const prompts = [
    { locale: 'en', prompt: "A perfect weekend looks like..." },
    { locale: 'en', prompt: "I get way too competitive about..." },
    { locale: 'en', prompt: "The way to my heart is..." },
    { locale: 'en', prompt: "My friends would describe me as..." },
    { locale: 'en', prompt: "I'm looking for someone who..." },
    { locale: 'en', prompt: "A non-negotiable for me is..." },
    { locale: 'sw', prompt: 'Wikendi kamili kwangu ni...' },
    { locale: 'sw', prompt: 'Njia ya kufikia moyo wangu ni...' },
    { locale: 'sw', prompt: 'Ninatafuta mtu ambaye...' },
  ];
  for (const item of prompts) {
    const existing = await prisma.profilePrompt.findFirst({ where: { locale: item.locale, prompt: item.prompt } });
    if (!existing) await prisma.profilePrompt.create({ data: item });
  }

  const adminPassword = process.env.SANJARI_ADMIN_SEED_PASSWORD;
  if (!adminPassword) {
    console.log('Skipping admin seed: SANJARI_ADMIN_SEED_PASSWORD is not configured.');
    return;
  }

  const permissionKeys = [
    'users.read', 'users.suspend', 'verification.review', 'reports.resolve', 'subscriptions.read',
    'payments.read', 'notifications.manage', 'configuration.manage', 'support.read', 'support.manage',
    'health.read', 'audit.read', 'analytics.read', 'versions.read', 'legal.read'
  ];
  await prisma.permission.createMany({
    data: permissionKeys.map((key) => ({ key, description: `Allows access to ${key}.` })),
    skipDuplicates: true
  });
  const role = await prisma.role.upsert({
    where: { name: 'platform_admin' },
    update: { description: 'Full Sanjari operations access.' },
    create: { name: 'platform_admin', description: 'Full Sanjari operations access.' }
  });
  const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } }, select: { id: true } });
  await prisma.rolePermission.createMany({
    data: permissions.map(({ id }) => ({ roleId: role.id, permissionId: id })),
    skipDuplicates: true
  });
  const admin = await prisma.adminUser.upsert({
    where: { email: process.env.SANJARI_ADMIN_SEED_EMAIL ?? 'admin@sanjari.co.tz' },
    update: {
      displayName: process.env.SANJARI_ADMIN_SEED_NAME ?? 'Athanas Shauritanga',
      phoneNumber: process.env.SANJARI_ADMIN_SEED_PHONE ?? '+255655591660',
      passwordHash: await hash(adminPassword), status: 'active', mfaEnabled: false
    },
    create: {
      email: process.env.SANJARI_ADMIN_SEED_EMAIL ?? 'admin@sanjari.co.tz',
      displayName: process.env.SANJARI_ADMIN_SEED_NAME ?? 'Athanas Shauritanga',
      phoneNumber: process.env.SANJARI_ADMIN_SEED_PHONE ?? '+255655591660',
      passwordHash: await hash(adminPassword), status: 'active', mfaEnabled: false
    }
  });
  await prisma.adminRole.upsert({ where: { adminUserId_roleId: { adminUserId: admin.id, roleId: role.id } }, update: {}, create: { adminUserId: admin.id, roleId: role.id } });
  console.log(`Seeded admin ${admin.email} with platform_admin access.`);
}

void main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
