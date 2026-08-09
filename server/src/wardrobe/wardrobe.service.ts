import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BaseColor,
  Cut,
  ItemCategory,
  Prisma,
  ReminderKind,
  WardrobeStatus,
} from '@prisma/client';
import { AuthUser } from '../auth/auth-user';
import { PrismaService } from '../prisma/prisma.service';

const CUTS_BY_CATEGORY: Record<ItemCategory, Cut[]> = {
  skirt: [Cut.JSK, Cut.OP, Cut.SK],
  top: [Cut.Blouse, Cut.Cardigan],
  outer: [Cut.Coat, Cut.Cape],
  accessory: [Cut.Headdress, Cut.Hairbow, Cut.Wristcuff, Cut.Bag],
  foundation: [Cut.Pannier],
  footwear: [Cut.Shoes, Cut.Socks],
};

const rank: Record<WardrobeStatus, number> = {
  wishlist: 1,
  on_order: 2,
  owned: 3,
};

@Injectable()
export class WardrobeService {
  constructor(private readonly prisma: PrismaService) {}

  async bootstrap(userId: string) {
    const [user, brands, items, variants, entries, preorders, reminders] =
      await Promise.all([
        this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
        this.prisma.brand.findMany({ orderBy: { name: 'asc' } }),
        this.prisma.item.findMany(),
        this.prisma.variant.findMany(),
        this.prisma.wardrobeEntry.findMany({ where: { userId } }),
        this.prisma.preorderRecord.findMany({
          where: { wardrobeEntry: { userId } },
        }),
        this.prisma.calendarReminder.findMany({
          where: { userId },
          orderBy: { at: 'asc' },
        }),
      ]);

    return {
      brands: brands.map((b) => ({ id: b.id, name: b.name })),
      items: items.map((i) => ({
        id: i.id,
        brandId: i.brandId,
        name: i.name,
        category: i.category,
        createdByUserId: i.createdByUserId,
      })),
      variants: variants.map((v) => ({
        id: v.id,
        itemId: v.itemId,
        colorName: v.colorName,
        baseColor: v.baseColor,
        cut: v.cut,
        catalogImageUri: v.catalogImageUri ?? undefined,
      })),
      entries: entries.map((e) => ({
        id: e.id,
        userId: e.userId,
        variantId: e.variantId,
        status: e.status,
        size: e.size ?? undefined,
        quantity: e.quantity,
        private: e.private,
        hidePreorder: e.hidePreorder,
        note: e.note ?? undefined,
        userImageUris: e.userImageUris,
        sourcePostId: e.sourcePostId ?? undefined,
      })),
      // 仅返回未归档未取消的预订，避免到货后脏数据进日历
      preorders: preorders
        .filter((p) => !p.cancelled && !p.archived)
        .map((p) => ({
          id: p.id,
          wardrobeEntryId: p.wardrobeEntryId,
          depositAmountCny: Number(p.depositAmountCny),
          depositPaidAt: p.depositPaidAt?.toISOString(),
          balanceAmountCny: Number(p.balanceAmountCny),
          balanceDueAt: p.balanceDueAt.toISOString().slice(0, 10),
          balancePaid: p.balancePaid,
          balancePaidAt: p.balancePaidAt?.toISOString(),
          expectedArrivalAt: p.expectedArrivalAt?.toISOString().slice(0, 10),
          cancelled: p.cancelled,
          archived: p.archived,
        })),
      reminders: reminders.map((r) => ({
        id: r.id,
        userId: r.userId,
        title: r.title,
        at: r.at.toISOString(),
        kind:
          r.kind === ReminderKind.release_from_post
            ? 'manual_release'
            : r.kind === ReminderKind.other
              ? 'other'
              : 'manual_release',
      })),
      profile: {
        id: user.id,
        phone: user.phone ?? undefined,
        nickname: user.nickname,
        bio: user.bio ?? undefined,
        avatarUri: user.avatarUri ?? undefined,
        yearsInLolita: user.yearsInLolita ?? undefined,
        preferredSubstyles: user.preferredSubstyles,
        favoriteBrandIds: user.favoriteBrandIds,
        reduceMotion: user.reduceMotion,
        wardrobeVisibility: user.wardrobeVisibility,
      },
    };
  }

  async addToWardrobe(
    user: AuthUser,
    input: {
      existingVariantId?: string;
      brandId?: string;
      brandName?: string;
      itemName?: string;
      category?: ItemCategory;
      cut?: Cut;
      colorName?: string;
      baseColor?: BaseColor;
      status: WardrobeStatus;
      size?: string;
      depositAmountCny?: number;
      balanceAmountCny?: number;
      balanceDueAt?: string;
      userImageUris?: string[];
    },
  ) {
    if (
      input.status === WardrobeStatus.on_order &&
      (input.balanceAmountCny == null ||
        !input.balanceDueAt ||
        input.depositAmountCny == null)
    ) {
      throw new BadRequestException('预订中需填写定金、尾款与截止日期');
    }

    const imageUris = (input.userImageUris ?? [])
      .map((u) => u.trim())
      .filter(Boolean)
      .slice(0, 6);

    return this.prisma.$transaction(async (tx) => {
      let variantId = input.existingVariantId;

      if (variantId) {
        const existing = await tx.variant.findUnique({ where: { id: variantId } });
        if (!existing) throw new NotFoundException('变体不存在');
      } else {
        if (
          !input.itemName ||
          !input.category ||
          !input.cut ||
          !input.colorName ||
          !input.baseColor
        ) {
          throw new BadRequestException('新建变体缺少必要字段');
        }
        const allowed = CUTS_BY_CATEGORY[input.category];
        if (!allowed.includes(input.cut) && input.cut !== Cut.Other) {
          throw new BadRequestException('裁式与品类不匹配');
        }

        let brandId = input.brandId;
        if ((!brandId || brandId === 'new') && input.brandName?.trim()) {
          const name = input.brandName.trim();
          const found = await tx.brand.findUnique({ where: { name } });
          brandId =
            found?.id ??
            (
              await tx.brand.create({ data: { name } })
            ).id;
        }
        if (!brandId) {
          const unknown = await tx.brand.upsert({
            where: { name: '未知品牌' },
            update: {},
            create: { name: '未知品牌' },
          });
          brandId = unknown.id;
        }

        let item = await tx.item.findFirst({
          where: {
            brandId,
            name: { equals: input.itemName.trim(), mode: 'insensitive' },
            category: input.category,
          },
        });
        if (!item) {
          item = await tx.item.create({
            data: {
              brandId,
              name: input.itemName.trim(),
              category: input.category,
              createdByUserId: user.id,
            },
          });
        }

        let variant = await tx.variant.findFirst({
          where: {
            itemId: item.id,
            cut: input.cut,
            colorName: { equals: input.colorName.trim(), mode: 'insensitive' },
          },
        });
        if (!variant) {
          try {
            variant = await tx.variant.create({
              data: {
                itemId: item.id,
                cut: input.cut,
                colorName: input.colorName.trim(),
                baseColor: input.baseColor,
              },
            });
          } catch (e) {
            if (
              e instanceof Prisma.PrismaClientKnownRequestError &&
              e.code === 'P2002'
            ) {
              variant = await tx.variant.findFirstOrThrow({
                where: {
                  itemId: item.id,
                  cut: input.cut,
                  colorName: input.colorName.trim(),
                },
              });
            } else {
              throw e;
            }
          }
        }
        variantId = variant.id;
      }

      let entry = await tx.wardrobeEntry.findUnique({
        where: {
          userId_variantId: { userId: user.id, variantId: variantId! },
        },
      });

      if (entry) {
        const nextStatus =
          rank[input.status] > rank[entry.status] ? input.status : entry.status;
        const mergedImages =
          imageUris.length > 0
            ? Array.from(new Set([...entry.userImageUris, ...imageUris])).slice(0, 6)
            : entry.userImageUris;
        entry = await tx.wardrobeEntry.update({
          where: { id: entry.id },
          data: {
            status: nextStatus,
            size: input.size ?? entry.size,
            userImageUris: mergedImages,
          },
        });
      } else {
        entry = await tx.wardrobeEntry.create({
          data: {
            userId: user.id,
            variantId: variantId!,
            status: input.status,
            size: input.size,
            quantity: 1,
            private: false,
            userImageUris: imageUris,
          },
        });
      }

      if (input.status === WardrobeStatus.on_order) {
        await tx.preorderRecord.create({
          data: {
            wardrobeEntryId: entry.id,
            depositAmountCny: input.depositAmountCny ?? 0,
            balanceAmountCny: input.balanceAmountCny ?? 0,
            balanceDueAt: new Date(input.balanceDueAt!),
            balancePaid: false,
            cancelled: false,
            archived: false,
          },
        });
        if (entry.status === WardrobeStatus.wishlist) {
          entry = await tx.wardrobeEntry.update({
            where: { id: entry.id },
            data: { status: WardrobeStatus.on_order },
          });
        }
      }

      return { entryId: entry.id };
    });
  }

  /**
   * 社区 Want：已有同变体衣橱条目则幂等提示，不改状态、不新建。
   * 上新帖可选择写入上新提醒（同源幂等）。
   */
  async wantVariant(
    userId: string,
    variantId: string,
    opts?: { sourcePostId?: string; addReleaseReminder?: boolean },
  ) {
    const variant = await this.prisma.variant.findUnique({
      where: { id: variantId },
      include: { item: { include: { brand: true } } },
    });
    if (!variant) throw new NotFoundException('变体不存在');

    const label = [
      variant.item.brand.name,
      variant.item.name,
      variant.colorName,
      variant.cut,
    ].join(' · ');

    const existing = await this.prisma.wardrobeEntry.findUnique({
      where: { userId_variantId: { userId, variantId } },
    });

    let entryId: string;
    let created: boolean;
    let status: WardrobeStatus;
    let message: string;

    if (existing) {
      const zone =
        existing.status === WardrobeStatus.wishlist
          ? '想要'
          : existing.status === WardrobeStatus.on_order
            ? '预订中'
            : '已拥有';
      entryId = existing.id;
      created = false;
      status = existing.status;
      message = `已在衣橱「${zone}」分区`;
      if (opts?.sourcePostId && !existing.sourcePostId) {
        await this.prisma.wardrobeEntry.update({
          where: { id: existing.id },
          data: { sourcePostId: opts.sourcePostId },
        });
      }
    } else {
      const entry = await this.prisma.wardrobeEntry.create({
        data: {
          userId,
          variantId,
          status: WardrobeStatus.wishlist,
          quantity: 1,
          private: false,
          userImageUris: [],
          sourcePostId: opts?.sourcePostId,
        },
      });
      entryId = entry.id;
      created = true;
      status = entry.status;
      message = '已加入想要';
    }

    let reminderAdded = false;
    if (opts?.addReleaseReminder && opts.sourcePostId) {
      reminderAdded = await this.ensureReleaseReminder(
        userId,
        opts.sourcePostId,
      );
    }

    return { created, entryId, status, message, label, reminderAdded };
  }

  /** 上新帖同源提醒幂等 */
  async ensureReleaseReminder(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post?.releaseAt) return false;
    const existing = await this.prisma.calendarReminder.findFirst({
      where: { userId, sourcePostId: postId, kind: ReminderKind.release_from_post },
    });
    if (existing) return false;
    await this.prisma.calendarReminder.create({
      data: {
        userId,
        title: post.title,
        at: post.releaseAt,
        kind: ReminderKind.release_from_post,
        sourcePostId: postId,
      },
    });
    return true;
  }

  async updateEntry(
    userId: string,
    entryId: string,
    patch: {
      status?: WardrobeStatus;
      size?: string;
      note?: string;
      private?: boolean;
      hidePreorder?: boolean;
      userImageUris?: string[];
    },
  ) {
    const entry = await this.prisma.wardrobeEntry.findFirst({
      where: { id: entryId, userId },
    });
    if (!entry) throw new NotFoundException('衣橱条目不存在');
    const userImageUris =
      patch.userImageUris === undefined
        ? undefined
        : patch.userImageUris
            .map((u) => u.trim())
            .filter(Boolean)
            .slice(0, 6);
    return this.prisma.wardrobeEntry.update({
      where: { id: entryId },
      data: {
        status: patch.status,
        size: patch.size,
        note: patch.note,
        private: patch.private,
        hidePreorder: patch.hidePreorder,
        ...(userImageUris !== undefined
          ? { userImageUris: { set: userImageUris } }
          : {}),
      },
    });
  }

  async removeEntry(userId: string, entryId: string) {
    const entry = await this.prisma.wardrobeEntry.findFirst({
      where: { id: entryId, userId },
    });
    if (!entry) throw new NotFoundException('衣橱条目不存在');
    await this.prisma.$transaction(async (tx) => {
      await tx.preorderRecord.deleteMany({ where: { wardrobeEntryId: entryId } });
      await tx.wardrobeEntry.delete({ where: { id: entryId } });
    });
    return { ok: true };
  }

  async markArrived(userId: string, preorderId: string) {
    const preorder = await this.prisma.preorderRecord.findFirst({
      where: {
        id: preorderId,
        wardrobeEntry: { userId },
        cancelled: false,
        archived: false,
      },
      include: { wardrobeEntry: true },
    });
    if (!preorder) throw new NotFoundException('预订记录不存在');

    const wasOwned = preorder.wardrobeEntry.status === WardrobeStatus.owned;
    await this.prisma.$transaction([
      this.prisma.preorderRecord.update({
        where: { id: preorderId },
        data: {
          balancePaid: true,
          balancePaidAt: new Date(),
          archived: true,
        },
      }),
      this.prisma.wardrobeEntry.update({
        where: { id: preorder.wardrobeEntryId },
        data: {
          status: WardrobeStatus.owned,
          quantity: wasOwned
            ? preorder.wardrobeEntry.quantity + 1
            : preorder.wardrobeEntry.quantity,
        },
      }),
    ]);
    return { ok: true };
  }

  /** 仅结清尾款，不改到货/owned（可与到货分步） */
  async markBalancePaid(userId: string, preorderId: string) {
    const preorder = await this.prisma.preorderRecord.findFirst({
      where: {
        id: preorderId,
        wardrobeEntry: { userId },
        cancelled: false,
        archived: false,
      },
    });
    if (!preorder) throw new NotFoundException('预订记录不存在');
    await this.prisma.preorderRecord.update({
      where: { id: preorderId },
      data: { balancePaid: true, balancePaidAt: new Date() },
    });
    return { ok: true };
  }

  async removeReminder(userId: string, reminderId: string) {
    const row = await this.prisma.calendarReminder.findFirst({
      where: { id: reminderId, userId },
    });
    if (!row) throw new NotFoundException('提醒不存在');
    await this.prisma.calendarReminder.delete({ where: { id: reminderId } });
    return { ok: true };
  }

  /** 与关注用户的想要重合 */
  async wishlistOverlap(userId: string) {
    const myWish = await this.prisma.wardrobeEntry.findMany({
      where: { userId, status: WardrobeStatus.wishlist },
      select: { variantId: true },
    });
    const mySet = new Set(myWish.map((e) => e.variantId));
    if (!mySet.size) return [];

    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const ids = following.map((f) => f.followingId);
    if (!ids.length) return [];

    const theirs = await this.prisma.wardrobeEntry.findMany({
      where: {
        userId: { in: ids },
        status: WardrobeStatus.wishlist,
        variantId: { in: [...mySet] },
        private: false,
      },
      include: {
        user: { select: { id: true, nickname: true } },
        variant: { include: { item: { include: { brand: true } } } },
      },
    });

    const byVariant = new Map<
      string,
      {
        variantId: string;
        label: string;
        users: { id: string; nickname: string }[];
      }
    >();
    for (const row of theirs) {
      const label = [
        row.variant.item.brand.name,
        row.variant.item.name,
        row.variant.colorName,
        row.variant.cut,
      ].join(' · ');
      const cur = byVariant.get(row.variantId) ?? {
        variantId: row.variantId,
        label,
        users: [],
      };
      if (!cur.users.some((u) => u.id === row.user.id)) {
        cur.users.push(row.user);
      }
      byVariant.set(row.variantId, cur);
    }
    return [...byVariant.values()].sort((a, b) => b.users.length - a.users.length);
  }

  /** 他人可见衣橱（受 wardrobeVisibility + private + hidePreorder 约束） */
  async publicWardrobe(viewerId: string | undefined, ownerId: string) {
    const owner = await this.prisma.user.findUnique({ where: { id: ownerId } });
    if (!owner) throw new NotFoundException('用户不存在');

    let allowed = false;
    if (viewerId === ownerId) allowed = true;
    else if (owner.wardrobeVisibility === 'public') allowed = true;
    else if (owner.wardrobeVisibility === 'followers' && viewerId) {
      const f = await this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: viewerId,
            followingId: ownerId,
          },
        },
      });
      allowed = !!f;
    }
    if (!allowed) {
      return {
        visible: false,
        visibility: owner.wardrobeVisibility,
        entries: [] as unknown[],
      };
    }

    const entries = await this.prisma.wardrobeEntry.findMany({
      where: { userId: ownerId, private: false },
      include: {
        variant: { include: { item: { include: { brand: true } } } },
        preorders: {
          where: { cancelled: false, archived: false },
        },
      },
    });

    return {
      visible: true,
      visibility: owner.wardrobeVisibility,
      owner: { id: owner.id, nickname: owner.nickname },
      entries: entries.map((e) => ({
        id: e.id,
        status: e.hidePreorder && e.status === WardrobeStatus.on_order
          ? WardrobeStatus.wishlist
          : e.status,
        label: [
          e.variant.item.brand.name,
          e.variant.item.name,
          e.variant.colorName,
          e.variant.cut,
        ].join(' · '),
        variantId: e.variantId,
        hidePreorder: e.hidePreorder,
      })),
    };
  }

  async cancelPreorder(userId: string, preorderId: string) {
    const preorder = await this.prisma.preorderRecord.findFirst({
      where: { id: preorderId, wardrobeEntry: { userId } },
      include: { wardrobeEntry: true },
    });
    if (!preorder) throw new NotFoundException('预订记录不存在');

    await this.prisma.$transaction(async (tx) => {
      await tx.preorderRecord.update({
        where: { id: preorderId },
        data: { cancelled: true, archived: true },
      });
      if (preorder.wardrobeEntry.status === WardrobeStatus.on_order) {
        const stillOpen = await tx.preorderRecord.count({
          where: {
            wardrobeEntryId: preorder.wardrobeEntryId,
            cancelled: false,
            archived: false,
            balancePaid: false,
          },
        });
        if (!stillOpen) {
          await tx.wardrobeEntry.update({
            where: { id: preorder.wardrobeEntryId },
            data: { status: WardrobeStatus.wishlist },
          });
        }
      }
    });
    return { ok: true };
  }

  async addReminder(userId: string, title: string, at: string) {
    return this.prisma.calendarReminder.create({
      data: {
        userId,
        title: title.trim(),
        at: new Date(at),
        kind: ReminderKind.manual_release,
      },
    });
  }

  async updateProfile(
    userId: string,
    patch: {
      nickname?: string;
      bio?: string;
      yearsInLolita?: number;
      preferredSubstyles?: import('@prisma/client').Substyle[];
      favoriteBrandIds?: string[];
      reduceMotion?: boolean;
      wardrobeVisibility?: import('@prisma/client').WardrobeVisibility;
    },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: patch,
    });
  }
}
