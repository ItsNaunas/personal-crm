import { IsString, IsEmail, IsOptional, IsEnum, IsArray, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IntakeSource } from '@prisma/client';

export class RawLeadDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  company_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  profile_link?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  /** How you plan to contact (e.g. instagram, linkedin, cold_email, twitter, phone). Used for follow-up due dates. */
  @ApiPropertyOptional({ description: 'Contact platform: instagram, linkedin, cold_email, twitter, phone, other' })
  @IsOptional()
  @IsString()
  platform?: string;

  /** Lead temperature: cold, warm, or hot. */
  @ApiPropertyOptional({ description: 'Temperature: cold, warm, hot', enum: ['cold', 'warm', 'hot'] })
  @IsOptional()
  @IsString()
  temperature?: string;

  [key: string]: unknown;
}

export class CreateIntakeDto {
  @ApiProperty({ type: [RawLeadDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RawLeadDto)
  leads!: RawLeadDto[];
}

export class WebhookIntakeDto {
  @ApiProperty()
  @IsObject()
  payload!: Record<string, unknown>;
}
