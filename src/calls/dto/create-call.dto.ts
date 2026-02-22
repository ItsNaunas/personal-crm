import { IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCallDto {
  @ApiProperty()
  @IsString()
  leadId!: string;

  @ApiProperty({ example: '2026-03-01T10:00:00.000Z' })
  @IsDateString()
  scheduledAt!: string;
}

export class CompleteCallDto {
  @ApiProperty()
  @IsString()
  transcript!: string;

  @ApiProperty({ example: 'positive' })
  @IsString()
  outcome!: string;
}
