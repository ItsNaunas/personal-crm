import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma.service';
import { CreateSavedViewDto } from './dto/create-saved-view.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SavedViewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(orgId: string, dto: CreateSavedViewDto) {
    return this.prisma.savedView.create({
      data: {
        orgId,
        name: dto.name,
        entityType: dto.entityType,
        filters: dto.filters as Prisma.InputJsonValue,
        sort: dto.sort,
        order: dto.order,
      },
    });
  }

  async findAll(orgId: string, entityType?: string) {
    return this.prisma.savedView.findMany({
      where: { orgId, ...(entityType ? { entityType } : {}) },
      orderBy: { name: 'asc' },
    });
  }

  async remove(id: string, orgId: string) {
    const view = await this.prisma.savedView.findFirst({ where: { id, orgId } });
    if (!view) throw new NotFoundException('Saved view not found');
    await this.prisma.savedView.delete({ where: { id } });
  }
}
