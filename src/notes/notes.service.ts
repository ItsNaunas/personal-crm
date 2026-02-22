import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(orgId: string, dto: CreateNoteDto) {
    const note = await this.prisma.note.create({
      data: { orgId, entityType: dto.entityType, entityId: dto.entityId, body: dto.body },
    });
    if (dto.entityType === 'lead') {
      await this.prisma.lead.updateMany({
        where: { id: dto.entityId, orgId },
        data: { lastContactedAt: new Date() },
      });
    }
    return note;
  }

  async findByEntity(orgId: string, entityType: string, entityId: string) {
    return this.prisma.note.findMany({
      where: { orgId, entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, orgId: string, body: string) {
    const note = await this.prisma.note.findFirst({ where: { id, orgId } });
    if (!note) throw new NotFoundException('Note not found');
    return this.prisma.note.update({ where: { id }, data: { body } });
  }

  async remove(id: string, orgId: string) {
    const note = await this.prisma.note.findFirst({ where: { id, orgId } });
    if (!note) throw new NotFoundException('Note not found');
    await this.prisma.note.delete({ where: { id } });
  }
}
