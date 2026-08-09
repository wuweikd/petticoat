import { IsEnum, IsOptional, IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { BaseColor, Cut, ItemCategory } from '@prisma/client';

export class CreateBrandDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;
}

export class UpdateBrandDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;
}

export class CreateItemDto {
  @IsString()
  brandId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsEnum(ItemCategory)
  category!: ItemCategory;

  @IsString()
  @IsNotEmpty()
  colorName!: string;

  @IsEnum(BaseColor)
  baseColor!: BaseColor;

  @IsEnum(Cut)
  cut!: Cut;
}

export class UpdateItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsEnum(ItemCategory)
  category?: ItemCategory;
}

export class CreateVariantDto {
  @IsString()
  @IsNotEmpty()
  colorName!: string;

  @IsEnum(BaseColor)
  baseColor!: BaseColor;

  @IsEnum(Cut)
  cut!: Cut;

  @IsOptional()
  @IsString()
  catalogImageUri?: string;
}

export class UpdateVariantDto {
  @IsOptional()
  @IsString()
  colorName?: string;

  @IsOptional()
  @IsEnum(BaseColor)
  baseColor?: BaseColor;

  @IsOptional()
  @IsEnum(Cut)
  cut?: Cut;

  @IsOptional()
  @IsString()
  catalogImageUri?: string | null;
}
