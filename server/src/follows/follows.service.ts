import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FollowsService {
  constructor(private readonly prisma: PrismaService) {}

  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('不能关注自己');
    }
    const target = await this.prisma.user.findUnique({ where: { id: followingId } });
    if (!target) throw new NotFoundException('用户不存在');
    await this.prisma.follow.upsert({
      where: {
        followerId_followingId: { followerId, followingId },
      },
      create: { followerId, followingId },
      update: {},
    });
    return { ok: true, following: true };
  }

  async unfollow(followerId: string, followingId: string) {
    await this.prisma.follow.deleteMany({
      where: { followerId, followingId },
    });
    return { ok: true, following: false };
  }

  async status(viewerId: string | undefined, userId: string) {
    const [followers, following, isFollowing] = await Promise.all([
      this.prisma.follow.count({ where: { followingId: userId } }),
      this.prisma.follow.count({ where: { followerId: userId } }),
      viewerId
        ? this.prisma.follow
            .findUnique({
              where: {
                followerId_followingId: {
                  followerId: viewerId,
                  followingId: userId,
                },
              },
            })
            .then((r) => !!r)
        : Promise.resolve(false),
    ]);
    return { followers, following, isFollowing };
  }

  followingIds(userId: string) {
    return this.prisma.follow
      .findMany({ where: { followerId: userId }, select: { followingId: true } })
      .then((rows) => rows.map((r) => r.followingId));
  }
}
