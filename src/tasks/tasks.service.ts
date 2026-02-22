import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { LeadPriority } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(orgId: string, dto: CreateTaskDto) {
    return this.prisma.task.create({
      data: {
        orgId,
        title: dto.title,
        entityType: dto.entityType,
        entityId: dto.entityId,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        priority: dto.priority,
      },
    });
  }

  async findAll(orgId: string, opts?: { entityType?: string; entityId?: string; incomplete?: boolean }) {
    return this.prisma.task.findMany({
      where: {
        orgId,
        ...(opts?.entityType ? { entityType: opts.entityType } : {}),
        ...(opts?.entityId ? { entityId: opts.entityId } : {}),
        ...(opts?.incomplete ? { completedAt: null } : {}),
      },
      orderBy: [{ completedAt: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async complete(id: string, orgId: string) {
    const task = await this.prisma.task.findFirst({ where: { id, orgId } });
    if (!task) throw new NotFoundException('Task not found');
    return this.prisma.task.update({
      where: { id },
      data: { completedAt: task.completedAt ? null : new Date() },
    });
  }

  async update(id: string, orgId: string, dto: Partial<CreateTaskDto>) {
    const task = await this.prisma.task.findFirst({ where: { id, orgId } });
    if (!task) throw new NotFoundException('Task not found');
    return this.prisma.task.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.dueAt !== undefined ? { dueAt: dto.dueAt ? new Date(dto.dueAt) : null } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority as LeadPriority } : {}),
      },
    });
  }

  async remove(id: string, orgId: string) {
    const task = await this.prisma.task.findFirst({ where: { id, orgId } });
    if (!task) throw new NotFoundException('Task not found');
    await this.prisma.task.delete({ where: { id } });
  }
}
