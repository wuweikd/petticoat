import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PostStatus, PostType, UserRole } from '@prisma/client';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser, Roles } from '../auth/auth.decorators';
import { CreatePostDto, UpdatePostDto } from './dto/posts.dto';
import { PostsService } from './posts.service';

@Controller('admin/posts')
@Roles(UserRole.EDITOR, UserRole.ADMIN)
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get()
  list(
    @Query('type') type?: PostType,
    @Query('status') status?: PostStatus,
  ) {
    return this.posts.list(type, status);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.posts.get(id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePostDto) {
    return this.posts.create(user, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePostDto) {
    return this.posts.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.posts.remove(id);
  }
}
