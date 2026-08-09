import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { CoordinatesModule } from './coordinates/coordinates.module';
import { HealthModule } from './health/health.module';
import { PostsModule } from './posts/posts.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { FollowsModule } from './follows/follows.module';
import { UploadsModule } from './uploads/uploads.module';
import { WardrobeModule } from './wardrobe/wardrobe.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    HealthModule,
    CatalogModule,
    UsersModule,
    PostsModule,
    WardrobeModule,
    CoordinatesModule,
    UploadsModule,
    FollowsModule,
  ],
})
export class AppModule {}
