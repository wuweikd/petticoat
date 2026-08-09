import { Body, Controller, Get, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser, Roles } from '../auth/auth.decorators';
import { CreateMePostDto } from './dto/posts.dto';
import { PostsService } from './posts.service';

@Controller('me/posts')
@Roles(UserRole.USER, UserRole.EDITOR, UserRole.ADMIN)
export class MePostsController {
  constructor(private readonly posts: PostsService) {}

  @Get()
  mine(@CurrentUser() user: AuthUser) {
    return this.posts.listMine(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateMePostDto) {
    return this.posts.createMe(user, dto);
  }
}
