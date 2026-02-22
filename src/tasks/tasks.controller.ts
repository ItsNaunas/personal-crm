import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { OrgId } from '../common/decorators/org-id.decorator';

@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a task' })
  create(@OrgId() orgId: string, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(orgId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List tasks, optionally filtered by entity' })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'incomplete', required: false })
  findAll(
    @OrgId() orgId: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('incomplete') incomplete?: string,
  ) {
    return this.tasksService.findAll(orgId, {
      entityType,
      entityId,
      incomplete: incomplete === 'true',
    });
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Toggle task completion' })
  complete(@Param('id') id: string, @OrgId() orgId: string) {
    return this.tasksService.complete(id, orgId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task' })
  update(
    @Param('id') id: string,
    @OrgId() orgId: string,
    @Body() dto: Partial<CreateTaskDto>,
  ) {
    return this.tasksService.update(id, orgId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a task' })
  remove(@Param('id') id: string, @OrgId() orgId: string) {
    return this.tasksService.remove(id, orgId);
  }
}
