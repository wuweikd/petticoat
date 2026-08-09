import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Substyle, UserRole, WardrobeVisibility } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser, Public, Roles } from '../auth/auth.decorators';
import {
  AddToWardrobeDto,
  CreateReminderDto,
  UpdateWardrobeEntryDto,
  WantDto,
} from './dto/wardrobe.dto';
import { WardrobeService } from './wardrobe.service';

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  nickname?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsInt()
  yearsInLolita?: number;

  @IsOptional()
  @IsArray()
  preferredSubstyles?: Substyle[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  favoriteBrandIds?: string[];

  @IsOptional()
  @IsBoolean()
  reduceMotion?: boolean;

  @IsOptional()
  @IsEnum(WardrobeVisibility)
  wardrobeVisibility?: WardrobeVisibility;
}

@Controller('me')
@Roles(UserRole.USER, UserRole.EDITOR, UserRole.ADMIN)
export class WardrobeController {
  constructor(private readonly wardrobe: WardrobeService) {}

  @Get('wardrobe')
  bootstrap(@CurrentUser() user: AuthUser) {
    return this.wardrobe.bootstrap(user.id);
  }

  @Post('wardrobe/entries')
  add(@CurrentUser() user: AuthUser, @Body() dto: AddToWardrobeDto) {
    return this.wardrobe.addToWardrobe(user, dto);
  }

  @Patch('wardrobe/entries/:id')
  patchEntry(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateWardrobeEntryDto,
  ) {
    return this.wardrobe.updateEntry(user.id, id, dto);
  }

  @Delete('wardrobe/entries/:id')
  removeEntry(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.wardrobe.removeEntry(user.id, id);
  }

  @Post('wardrobe/want')
  want(@CurrentUser() user: AuthUser, @Body() dto: WantDto) {
    return this.wardrobe.wantVariant(user.id, dto.variantId, {
      sourcePostId: dto.sourcePostId,
      addReleaseReminder: dto.addReleaseReminder,
    });
  }

  @Post('wardrobe/preorders/:id/arrive')
  arrive(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.wardrobe.markArrived(user.id, id);
  }

  @Post('wardrobe/preorders/:id/pay-balance')
  payBalance(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.wardrobe.markBalancePaid(user.id, id);
  }

  @Post('wardrobe/preorders/:id/cancel')
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.wardrobe.cancelPreorder(user.id, id);
  }

  @Post('wardrobe/reminders')
  reminder(@CurrentUser() user: AuthUser, @Body() dto: CreateReminderDto) {
    return this.wardrobe.addReminder(user.id, dto.title, dto.at);
  }

  @Delete('wardrobe/reminders/:id')
  removeReminder(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.wardrobe.removeReminder(user.id, id);
  }

  @Get('wishlist-overlap')
  wishlistOverlap(@CurrentUser() user: AuthUser) {
    return this.wardrobe.wishlistOverlap(user.id);
  }

  @Patch('profile')
  profile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.wardrobe.updateProfile(user.id, dto);
  }
}

@Controller('users')
export class PublicWardrobeController {
  constructor(private readonly wardrobe: WardrobeService) {}

  @Public()
  @Get(':userId/wardrobe')
  publicWardrobe(
    @Param('userId') userId: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.wardrobe.publicWardrobe(user?.id, userId);
  }
}
