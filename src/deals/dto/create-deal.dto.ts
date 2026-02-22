import { IsString, IsNumber, Min, Max, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DealStage } from '@prisma/client';

export class CreateDealDto {
  @ApiProperty()
  @IsString()
  leadId!: string;

  @ApiProperty({ example: 10000 })
  @IsNumber()
  @Min(0)
  dealValue!: number;

  @ApiPropertyOptional({ example: 0.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  probability?: number;
}

export class UpdateDealStageDto {
  @ApiProperty({ enum: DealStage })
  @IsEnum(DealStage)
  stage!: DealStage;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lostReason?: string;
}

export class UpdateDealDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  dealValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  probability?: number;
}
