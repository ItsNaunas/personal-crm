import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Predefined outreach channel tags for templates (e.g. cold_email, linkedin, instagram). */
export const OUTREACH_CHANNELS = [
  'cold_email',
  'linkedin',
  'instagram',
  'tiktok',
  'twitter',
  'phone',
  'other',
] as const;
export type OutreachChannel = (typeof OUTREACH_CHANNELS)[number];

export class CreateTemplateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  body!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  variables?: string[];

  @ApiPropertyOptional({
    description: 'Outreach channel tags (e.g. cold_email, linkedin, instagram, tiktok)',
    type: [String],
    example: ['cold_email', 'linkedin'],
  })
  @IsOptional()
  @IsArray()
  outreachChannels?: string[];
}
