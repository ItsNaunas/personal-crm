import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(orgId: string, dto: CreateTemplateDto) {
    return this.prisma.template.create({
      data: {
        orgId,
        name: dto.name,
        body: dto.body,
        variables: (dto.variables as Prisma.InputJsonValue) ?? undefined,
        outreachChannels: (dto.outreachChannels as Prisma.InputJsonValue) ?? undefined,
      },
    });
  }

  async findAll(orgId: string) {
    return this.prisma.template.findMany({
      where: { orgId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, orgId: string) {
    const t = await this.prisma.template.findFirst({ where: { id, orgId } });
    if (!t) throw new NotFoundException('Template not found');
    return t;
  }

  async update(id: string, orgId: string, dto: Partial<CreateTemplateDto>) {
    await this.findOne(id, orgId);
    return this.prisma.template.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.body !== undefined ? { body: dto.body } : {}),
        ...(dto.variables !== undefined ? { variables: dto.variables as Prisma.InputJsonValue } : {}),
        ...(dto.outreachChannels !== undefined ? { outreachChannels: dto.outreachChannels as Prisma.InputJsonValue } : {}),
      },
    });
  }

  async remove(id: string, orgId: string) {
    await this.findOne(id, orgId);
    await this.prisma.template.delete({ where: { id } });
  }

  /** Substitute {{variable}} placeholders with provided values */
  render(body: string, variables: Record<string, string>): string {
    return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? `{{${key}}}`);
  }
}
