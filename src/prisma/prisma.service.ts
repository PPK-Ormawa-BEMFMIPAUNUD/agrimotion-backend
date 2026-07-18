import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const connectionString = process.env.DATABASE_URL ?? '';

    // Parse connection limit from connectionString query params or use default of 5
    let maxConnections = 5;
    try {
      const urlObj = new URL(connectionString);
      const connectionLimit = urlObj.searchParams.get('connection_limit');
      if (connectionLimit) {
        maxConnections = parseInt(connectionLimit, 10);
      }
    } catch {
      // Fallback if URL parsing fails
    }

    const pool = new Pool({ connectionString, max: maxConnections });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
