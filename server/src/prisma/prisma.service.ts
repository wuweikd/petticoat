import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (e) {
      this.logger.warn(
        `Database unavailable at boot: ${e instanceof Error ? e.message : e}`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
