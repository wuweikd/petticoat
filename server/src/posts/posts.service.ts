import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostStatus, PostType, Prisma } from '@prisma/client';
import { AuthUser } from '../auth/auth-user';
import { CoordinatesService } from '../coordinates/coordinates.service';
import { PrismaService } from '../prisma/prisma.service';

const postDetailInclude = {
  author: { select: { id: true, nickname: true, role: true } },
  variants: {
    include: {
      variant: {
        include: { item: { include: { brand: true } } },
      },
    },
    orderBy: { sortOrder: 'asc' as const },
  },
};

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coordinates: CoordinatesService,
  ) {}

  list(type?: PostType, status?: PostStatus) {
    return this.prisma.post.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: postDetailInclude,
    });
  }

  /** 发现流：已发布帖，时间序；可按类型 / 品牌筛选 */
  feedDiscover(
    limit = 40,
    filters?: { type?: PostType; brandId?: string },
  ) {
    return this.prisma.post.findMany({
      where: {
        status: PostStatus.published,
        ...(filters?.type ? { type: filters.type } : {}),
        ...(filters?.brandId
          ? {
              variants: {
                some: { variant: { item: { brandId: filters.brandId } } },
              },
            }
          : {}),
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(limit, 100),
      include: postDetailInclude,
    });
  }

  /** 关注流：已关注作者的已发布帖 */
  async feedFollowing(userId: string, limit = 40) {
    const follows = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const authorIds = follows.map((f) => f.followingId);
    if (!authorIds.length) return [];
    return this.prisma.post.findMany({
      where: {
        status: PostStatus.published,
        authorId: { in: authorIds },
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(limit, 100),
      include: postDetailInclude,
    });
  }

  async get(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: postDetailInclude,
    });
    if (!post) throw new NotFoundException('帖子不存在');
    return post;
  }

  /** 公开读：仅已发布 */
  async getPublished(id: string) {
    const post = await this.get(id);
    if (post.status !== PostStatus.published) {
      throw new NotFoundException('帖子不存在');
    }
    return post;
  }

  /** App 用户发帖：仅穿搭 / 教程 */
  async createMe(
    user: AuthUser,
    input: {
      type: PostType;
      title: string;
      body?: string;
      coverUri?: string;
      imageUris?: string[];
      variantIds?: string[];
      coordinateId?: string;
      status?: PostStatus;
    },
  ) {
    if (input.type !== PostType.outfit && input.type !== PostType.tutorial) {
      throw new ForbiddenException('普通用户仅可发穿搭分享或教程心得');
    }
    let variantIds = input.variantIds ?? [];
    let coordinateId = input.coordinateId;
    if (coordinateId) {
      const fromCoord = await this.coordinates.variantIdsForOwner(
        user.id,
        coordinateId,
      );
      if (!variantIds.length) variantIds = fromCoord;
      else {
        // 合并去重，Coordinate 在前
        const set = new Set([...fromCoord, ...variantIds]);
        variantIds = [...set];
      }
    }
    return this.create(user, {
      ...input,
      variantIds,
      coordinateId,
      status: input.status ?? PostStatus.published,
    });
  }

  private normalizeImages(coverUri?: string, imageUris?: string[]) {
    const list = [...(imageUris ?? [])].filter(Boolean);
    if (coverUri && !list.includes(coverUri)) list.unshift(coverUri);
    const unique = [...new Set(list)];
    return {
      imageUris: unique,
      coverUri: unique[0] ?? coverUri ?? null,
    };
  }

  async create(
    user: AuthUser,
    input: {
      type: PostType;
      title: string;
      body?: string;
      coverUri?: string;
      imageUris?: string[];
      releaseAt?: string;
      status?: PostStatus;
      variantIds?: string[];
      coordinateId?: string;
    },
  ) {
    this.assertTypeRules(input.type, input.variantIds, input.releaseAt);
    if (input.coordinateId) {
      // 校验归属
      await this.coordinates.variantIdsForOwner(user.id, input.coordinateId);
    }
    const status = input.status ?? PostStatus.draft;
    const images = this.normalizeImages(input.coverUri, input.imageUris);
    return this.prisma.post.create({
      data: {
        authorId: user.id,
        type: input.type,
        title: input.title.trim(),
        body: input.body,
        coverUri: images.coverUri,
        imageUris: images.imageUris,
        releaseAt: input.releaseAt ? new Date(input.releaseAt) : null,
        coordinateId: input.coordinateId ?? null,
        status,
        publishedAt: status === PostStatus.published ? new Date() : null,
        variants: input.variantIds?.length
          ? {
              create: input.variantIds.map((variantId, sortOrder) => ({
                variantId,
                sortOrder,
              })),
            }
          : undefined,
      },
      include: {
        variants: true,
        author: { select: { id: true, nickname: true } },
      },
    });
  }

  async update(
    id: string,
    input: {
      type?: PostType;
      title?: string;
      body?: string;
      coverUri?: string | null;
      releaseAt?: string | null;
      status?: PostStatus;
      variantIds?: string[];
    },
  ) {
    const existing = await this.prisma.post.findUnique({
      where: { id },
      include: { variants: true },
    });
    if (!existing) throw new NotFoundException('帖子不存在');

    const type = input.type ?? existing.type;
    const variantIds =
      input.variantIds ?? existing.variants.map((v) => v.variantId);
    const releaseAt =
      input.releaseAt === undefined
        ? existing.releaseAt?.toISOString().slice(0, 10)
        : input.releaseAt;
    this.assertTypeRules(type, variantIds, releaseAt ?? undefined);

    const data: Prisma.PostUpdateInput = {
      type: input.type,
      title: input.title?.trim(),
      body: input.body,
      coverUri: input.coverUri,
      releaseAt:
        input.releaseAt === undefined
          ? undefined
          : input.releaseAt
            ? new Date(input.releaseAt)
            : null,
      status: input.status,
    };
    if (input.status === PostStatus.published && !existing.publishedAt) {
      data.publishedAt = new Date();
    }

    return this.prisma.$transaction(async (tx) => {
      if (input.variantIds) {
        await tx.postVariant.deleteMany({ where: { postId: id } });
        if (input.variantIds.length) {
          await tx.postVariant.createMany({
            data: input.variantIds.map((variantId, sortOrder) => ({
              postId: id,
              variantId,
              sortOrder,
            })),
          });
        }
      }
      return tx.post.update({
        where: { id },
        data,
        include: {
          variants: {
            include: {
              variant: { include: { item: { include: { brand: true } } } },
            },
          },
          author: { select: { id: true, nickname: true } },
        },
      });
    });
  }

  async remove(id: string) {
    await this.prisma.post.delete({ where: { id } });
    return { ok: true };
  }

  listMine(authorId: string) {
    return this.prisma.post.findMany({
      where: { authorId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: postDetailInclude,
    });
  }

  private assertTypeRules(
    type: PostType,
    variantIds?: string[],
    releaseAt?: string,
  ) {
    if (type === PostType.outfit && (!variantIds || variantIds.length < 1)) {
      throw new BadRequestException('穿搭分享至少挂 1 个变体');
    }
    if (type === PostType.brand_release && !releaseAt) {
      throw new BadRequestException('品牌上新必须填写上新日期');
    }
  }
}
