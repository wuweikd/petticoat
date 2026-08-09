import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/auth.decorators';
import { UpdateUserDto } from './dto/users.dto';
import { UsersService } from './users.service';

@Controller('admin/users')
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Query('q') q?: string) {
    return this.users.list(q);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }
}
