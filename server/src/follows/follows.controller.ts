import { Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser, Public, Roles } from '../auth/auth.decorators';
import { FollowsService } from './follows.service';

@Controller()
export class FollowsController {
  constructor(private readonly follows: FollowsService) {}

  @Post('me/following/:userId')
  @Roles(UserRole.USER, UserRole.EDITOR, UserRole.ADMIN)
  follow(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.follows.follow(user.id, userId);
  }

  @Delete('me/following/:userId')
  @Roles(UserRole.USER, UserRole.EDITOR, UserRole.ADMIN)
  unfollow(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.follows.unfollow(user.id, userId);
  }

  @Get('users/:userId/follow-stats')
  @Public()
  stats(@Param('userId') userId: string) {
    return this.follows.status(undefined, userId);
  }

  @Get('me/following/:userId/status')
  @Roles(UserRole.USER, UserRole.EDITOR, UserRole.ADMIN)
  myStatus(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.follows.status(user.id, userId);
  }
}
