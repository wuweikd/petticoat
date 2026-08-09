import { Controller, Get, Param, Query } from '@nestjs/common';
import { PostType, UserRole } from '@prisma/client';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser, Public, Roles } from '../auth/auth.decorators';
import { PostsService } from './posts.service';

@Controller('posts')
export class PublicPostsController {
  constructor(private readonly posts: PostsService) {}

  @Public()
  @Get('feed/discover')
  discover(
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('brandId') brandId?: string,
  ) {
    const n = limit ? Number(limit) : 40;
    const allowed = Object.values(PostType) as string[];
    const postType =
      type && allowed.includes(type) ? (type as PostType) : undefined;
    return this.posts.feedDiscover(Number.isFinite(n) ? n : 40, {
      type: postType,
      brandId: brandId || undefined,
    });
  }

  @Get('feed/following')
  @Roles(UserRole.USER, UserRole.EDITOR, UserRole.ADMIN)
  following(@CurrentUser() user: AuthUser, @Query('limit') limit?: string) {
    const n = limit ? Number(limit) : 40;
    return this.posts.feedFollowing(user.id, Number.isFinite(n) ? n : 40);
  }

  @Public()
  @Get(':id')
  get(@Param('id') id: string) {
    return this.posts.getPublished(id);
  }
}
