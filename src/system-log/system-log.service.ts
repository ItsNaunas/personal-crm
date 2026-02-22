import { Injectable } from '@nestjs/common';
import { LogLevel, Prisma } from '@prisma/client';
import { PrismaService } from '../core/database/prisma.service';

@Injectable()
export class SystemLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(level: LogLevel, source: string, message: string, context?: Record<string, unknown>) {
    await this.prisma.systemLog.create({
      data: { level, source, message, context: context as Prisma.InputJsonValue | undefined },
    });
  }

  async debug(source: string, message: string, context?: Record<string, unknown>) {
    return this.log('debug', source, message, context);
  }

  async info(source: string, message: string, context?: Record<string, unknown>) {
    return this.log('info', source, message, context);
  }

  async warn(source: string, message: string, context?: Record<string, unknown>) {
    return this.log('warn', source, message, context);
  }

  async error(source: string, message: string, context?: Record<string, unknown>) {
    return this.log('error', source, message, context);
  }
}
