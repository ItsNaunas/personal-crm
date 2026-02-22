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
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { OrgId } from '../common/decorators/org-id.decorator';
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class UpdateNoteDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  body!: string;
}

@ApiTags('notes')
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a note for an entity' })
  create(@OrgId() orgId: string, @Body() dto: CreateNoteDto) {
    return this.notesService.create(orgId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List notes by entity' })
  @ApiQuery({ name: 'entityType', required: true })
  @ApiQuery({ name: 'entityId', required: true })
  findByEntity(
    @OrgId() orgId: string,
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return this.notesService.findByEntity(orgId, entityType, entityId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update note body' })
  update(@Param('id') id: string, @OrgId() orgId: string, @Body() dto: UpdateNoteDto) {
    return this.notesService.update(id, orgId, dto.body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a note' })
  remove(@Param('id') id: string, @OrgId() orgId: string) {
    return this.notesService.remove(id, orgId);
  }
}
