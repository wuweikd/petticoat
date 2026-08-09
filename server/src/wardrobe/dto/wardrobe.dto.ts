import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { BaseColor, Cut, ItemCategory, WardrobeStatus } from '@prisma/client';

export class AddToWardrobeDto {
  @IsOptional()
  @IsString()
  existingVariantId?: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  brandName?: string;

  @IsOptional()
  @IsString()
  itemName?: string;

  @IsOptional()
  @IsEnum(ItemCategory)
  category?: ItemCategory;

  @IsOptional()
  @IsEnum(Cut)
  cut?: Cut;

  @IsOptional()
  @IsString()
  colorName?: string;

  @IsOptional()
  @IsEnum(BaseColor)
  baseColor?: BaseColor;

  @IsEnum(WardrobeStatus)
  status!: WardrobeStatus;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  depositAmountCny?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  balanceAmountCny?: number;

  @IsOptional()
  @IsDateString()
  balanceDueAt?: string;

  /** 用户实拍图（本地 uploads 路径） */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userImageUris?: string[];
}

export class CreateReminderDto {
  @IsString()
  title!: string;

  @IsDateString()
  at!: string;
}

export class UpdateWardrobeEntryDto {
  @IsOptional()
  @IsEnum(WardrobeStatus)
  status?: WardrobeStatus;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  private?: boolean;

  @IsOptional()
  @IsBoolean()
  hidePreorder?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userImageUris?: string[];
}

export class WantDto {
  @IsString()
  variantId!: string;

  /** 上新帖 Want 后可选写入日历 */
  @IsOptional()
  @IsString()
  sourcePostId?: string;

  @IsOptional()
  @IsBoolean()
  addReleaseReminder?: boolean;
}
