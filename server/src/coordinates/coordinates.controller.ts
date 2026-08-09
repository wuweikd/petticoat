import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser, Roles } from '../auth/auth.decorators';
import { CoordinatesService } from './coordinates.service';
import {
  CreateCoordinateDto,
  UpdateCoordinateDto,
} from './dto/coordinates.dto';

@Controller('me/coordinates')
@Roles(UserRole.USER, UserRole.EDITOR, UserRole.ADMIN)
export class CoordinatesController {
  constructor(private readonly coordinates: CoordinatesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.coordinates.list(user.id);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.coordinates.get(user.id, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCoordinateDto) {
    return this.coordinates.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCoordinateDto,
  ) {
    return this.coordinates.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.coordinates.remove(user.id, id);
  }
}
