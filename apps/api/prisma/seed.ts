import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { hash } from 'argon2';

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
