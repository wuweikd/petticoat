import { Module, forwardRef } from '@nestjs/common';
import { CoordinatesModule } from '../coordinates/coordinates.module';
import { MePostsController } from './me-posts.controller';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { PublicPostsController } from './public-posts.controller';

@Module({
  imports: [forwardRef(() => CoordinatesModule)],
  controllers: [PublicPostsController, MePostsController, PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
