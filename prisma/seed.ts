import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL ?? '';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting AGRI-MOTION seeder...\n');

  // 1. Create Admin User (with hashed password)
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@agrimotion.id' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@agrimotion.id',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });
  console.log(`✅ User created: ${admin.name} (${admin.email})`);

  // 2. Create Farm
  const farm = await prisma.farm.upsert({
    where: { id: admin.id }, // will not match, forces create via fallback below
    update: {},
    create: {
      name: 'Demplot Padi',
      commodity: 'Padi',
      location: 'Jatinangor, Sumedang',
      area: 2.5,
      ownerId: admin.id,
    },
  });
  console.log(`✅ Farm created: ${farm.name}`);

  // 3. Create Device
  const device = await prisma.device.upsert({
    where: { espSerial: 'ESP32-001' },
    update: {},
    create: {
      deviceCode: 'DEV-001',
      espSerial: 'ESP32-001',
      farmId: farm.id,
      status: 'OFFLINE',
    },
  });
  console.log(`✅ Device created: ${device.deviceCode} (${device.espSerial})`);

  // 4. Create Sensors
  const sensorTypes = ['NPK', 'SOIL', 'TEMP', 'LUX'];
  for (const type of sensorTypes) {
    const existingSensor = await prisma.sensor.findFirst({
      where: { deviceId: device.id, type },
    });
    if (!existingSensor) {
      await prisma.sensor.create({
        data: {
          deviceId: device.id,
          type,
        },
      });
      console.log(`✅ Sensor created: ${type} for ${device.deviceCode}`);
    } else {
      console.log(`⏭️  Sensor already exists: ${type} for ${device.deviceCode}`);
    }
  }

  console.log('\n🎉 Seeding completed!');
  console.log('📝 Login credentials: admin@agrimotion.id / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
