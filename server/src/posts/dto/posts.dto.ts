import {
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PostStatus, PostType } from '@prisma/client';

export class CreateMePostDto {
  @IsIn(['outfit', 'tutorial'])
  type!: 'outfit' | 'tutorial';

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  coverUri?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUris?: string[];

  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variantIds?: string[];

  @IsOptional()
  @IsString()
  coordinateId?: string;
}

export class CreatePostDto {
  @IsEnum(PostType)
  type!: PostType;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  coverUri?: string;

  @IsOptional()
  @IsDateString()
  releaseAt?: string;

  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variantIds?: string[];
}

export class UpdatePostDto {
  @IsOptional()
  @IsEnum(PostType)
  type?: PostType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  coverUri?: string | null;

  @IsOptional()
  @IsDateString()
  releaseAt?: string | null;

  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variantIds?: string[];
}
