import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ItemCategory, SlotKind } from '@prisma/client';

export class CoordinateSlotDto {
  @IsEnum(SlotKind)
  kind!: SlotKind;

  @IsOptional()
  @IsEnum(ItemCategory)
  category?: ItemCategory;

  @IsString()
  variantId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateCoordinateDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoordinateSlotDto)
  slots?: CoordinateSlotDto[];
}

export class UpdateCoordinateDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoordinateSlotDto)
  slots?: CoordinateSlotDto[];
}
