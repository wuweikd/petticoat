import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BaseColor,
  Cut,
  ItemCategory,
  Prisma,
  UserRole,
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

const CATEGORY_LABEL: Record<ItemCategory, string> = {
  skirt: '裙子',
  top: '上装',
  outer: '外套',
  accessory: '配件',
  foundation: '底层',
  footwear: '鞋袜',
};

const CUT_LABEL: Record<Cut, string> = {
  JSK: '背带裙（JSK）',
  OP: '连衣裙（OP）',
  SK: '半裙（SK）',
  Blouse: '衬衫',
  Cardigan: '开衫',
  Coat: '大衣',
  Cape: '披肩',
  Headdress: '头饰',
  Hairbow: '发带',
  Wristcuff: '手袖',
  Bag: '包',
  Pannier: '裙撑',
  Shoes: '鞋',
  Socks: '袜',
  Other: '其他',
};

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  listBrands(q?: string) {
    return this.prisma.brand.findMany({
      where: q ? { name: { contains: q, mode: 'insensitive' } } : undefined,
      orderBy: { name: 'asc' },
      include: { _count: { select: { items: true } } },
    });
  }

  async searchPublic(q: string, limit = 20) {
    const query = q.trim();
    if (query.length < 1) return [];

    const variants = await this.prisma.variant.findMany({
      where: {
        OR: [
          { colorName: { contains: query, mode: 'insensitive' } },
          { item: { name: { contains: query, mode: 'insensitive' } } },
          { item: { brand: { name: { contains: query, mode: 'insensitive' } } } },
        ],
      },
      take: limit,
      include: {
        item: { include: { brand: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return variants.map((v) => ({
      brand: { id: v.item.brand.id, name: v.item.brand.name },
      item: {
        id: v.item.id,
        brandId: v.item.brandId,
        name: v.item.name,
        category: v.item.category,
        createdByUserId: v.item.createdByUserId,
      },
      variant: {
        id: v.id,
        itemId: v.itemId,
        colorName: v.colorName,
        baseColor: v.baseColor,
        cut: v.cut,
        catalogImageUri: v.catalogImageUri ?? undefined,
      },
      label: `${v.item.brand.name} · ${v.item.name} · ${v.cut} ${v.colorName}`,
    }));
  }

  getBrand(id: string) {
    return this.prisma.brand.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            variants: true,
            _count: { select: { variants: true } },
          },
        },
      },
    });
  }

  async createBrand(name: string) {
    const trimmed = name.trim();
    try {
      return await this.prisma.brand.create({ data: { name: trimmed } });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('品牌名已存在');
      }
      throw e;
    }
  }

  async updateBrand(id: string, name: string) {
    try {
      return await this.prisma.brand.update({
        where: { id },
        data: { name: name.trim() },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('品牌名已存在');
      }
      throw e;
    }
  }

  listItems(q?: string) {
    return this.prisma.item.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { brand: { name: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : undefined,
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: {
        brand: true,
        variants: {
          include: {
            _count: { select: { wardrobeEntries: true } },
          },
        },
        _count: { select: { variants: true } },
      },
    });
  }

  async getItem(id: string) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: {
        brand: true,
        createdBy: {
          select: { id: true, nickname: true, phone: true },
        },
        variants: {
          include: {
            _count: { select: { wardrobeEntries: true } },
            wardrobeEntries: {
              select: { userId: true },
            },
          },
        },
      },
    });
    if (!item) return null;
    return {
      ...item,
      variants: item.variants.map((v) => {
        const linkedUserIds = [...new Set(v.wardrobeEntries.map((e) => e.userId))];
        return {
          id: v.id,
          itemId: v.itemId,
          colorName: v.colorName,
          baseColor: v.baseColor,
          cut: v.cut,
          catalogImageUri: v.catalogImageUri,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
          wardrobeLinkCount: v._count.wardrobeEntries,
          linkedUserCount: linkedUserIds.length,
          lockedForCreator:
            linkedUserIds.length > 1 ||
            (linkedUserIds.length === 1 && linkedUserIds[0] !== item.createdByUserId),
        };
      }),
    };
  }

  async createItem(
    user: AuthUser,
    input: {
      brandId: string;
      name: string;
      category: ItemCategory;
      colorName: string;
      baseColor: BaseColor;
      cut: Cut;
    },
  ) {
    this.assertCut(input.category, input.cut);
    const brand = await this.prisma.brand.findUnique({
      where: { id: input.brandId },
    });
    if (!brand) throw new NotFoundException('品牌不存在');

    return this.prisma.item.create({
      data: {
        brandId: input.brandId,
        name: input.name.trim(),
        category: input.category,
        createdByUserId: user.id,
        variants: {
          create: {
            colorName: input.colorName.trim(),
            baseColor: input.baseColor,
            cut: input.cut,
          },
        },
      },
      include: { brand: true, variants: true },
    });
  }

  async updateItem(
    user: AuthUser,
    id: string,
    input: { name?: string; brandId?: string; category?: ItemCategory },
  ) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: { variants: { include: { wardrobeEntries: { select: { userId: true } } } } },
    });
    if (!item) throw new NotFoundException('物品不存在');
    await this.assertCanEditItem(user, item);

    if (input.category && input.category !== item.category) {
      for (const v of item.variants) {
        this.assertCut(input.category, v.cut);
      }
    }

    return this.prisma.item.update({
      where: { id },
      data: {
        name: input.name?.trim(),
        brandId: input.brandId,
        category: input.category,
      },
      include: { brand: true, variants: true },
    });
  }

  async createVariant(
    user: AuthUser,
    itemId: string,
    input: { colorName: string; baseColor: BaseColor; cut: Cut; catalogImageUri?: string },
  ) {
    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
      include: { variants: { include: { wardrobeEntries: { select: { userId: true } } } } },
    });
    if (!item) throw new NotFoundException('物品不存在');
    this.assertCut(item.category, input.cut);

    try {
      return await this.prisma.variant.create({
        data: {
          itemId,
          colorName: input.colorName.trim(),
          baseColor: input.baseColor,
          cut: input.cut,
          catalogImageUri: input.catalogImageUri,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('同色名+裁式变体已存在');
      }
      throw e;
    }
  }

  async updateVariant(
    user: AuthUser,
    id: string,
    input: {
      colorName?: string;
      baseColor?: BaseColor;
      cut?: Cut;
      catalogImageUri?: string | null;
    },
  ) {
    const variant = await this.prisma.variant.findUnique({
      where: { id },
      include: {
        item: true,
        wardrobeEntries: { select: { userId: true } },
      },
    });
    if (!variant) throw new NotFoundException('变体不存在');
    await this.assertCanEditVariant(user, variant);

    const cut = input.cut ?? variant.cut;
    this.assertCut(variant.item.category, cut);

    try {
      return await this.prisma.variant.update({
        where: { id },
        data: {
          colorName: input.colorName?.trim(),
          baseColor: input.baseColor,
          cut: input.cut,
          catalogImageUri: input.catalogImageUri,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('同色名+裁式变体已存在');
      }
      throw e;
    }
  }

  async deleteVariant(user: AuthUser, id: string) {
    const variant = await this.prisma.variant.findUnique({
      where: { id },
      include: {
        item: true,
        _count: { select: { wardrobeEntries: true } },
        wardrobeEntries: { select: { userId: true } },
      },
    });
    if (!variant) throw new NotFoundException('变体不存在');
    if (variant._count.wardrobeEntries > 0) {
      throw new BadRequestException('仍有衣橱关联，禁止删除');
    }
    // staff can always delete unlinked; creator can if unlocked (no links => unlocked)
    if (
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.EDITOR &&
      variant.item.createdByUserId !== user.id
    ) {
      throw new ForbiddenException('无权删除');
    }
    await this.prisma.variant.delete({ where: { id } });
    return { ok: true };
  }

  private assertCut(category: ItemCategory, cut: Cut) {
    const allowed = CUTS_BY_CATEGORY[category];
    if (!allowed.includes(cut) && cut !== Cut.Other) {
      throw new BadRequestException(
        `裁式「${CUT_LABEL[cut]}」不属于品类「${CATEGORY_LABEL[category]}」`,
      );
    }
  }

  private async assertCanEditItem(
    user: AuthUser,
    item: {
      createdByUserId: string;
      variants: { wardrobeEntries: { userId: string }[] }[];
    },
  ) {
    if (user.role === UserRole.ADMIN || user.role === UserRole.EDITOR) return;
    if (item.createdByUserId !== user.id) {
      throw new ForbiddenException('无权编辑该物品');
    }
    const otherUsers = new Set<string>();
    for (const v of item.variants) {
      for (const e of v.wardrobeEntries) {
        if (e.userId !== user.id) otherUsers.add(e.userId);
      }
    }
    if (otherUsers.size > 0) {
      throw new ForbiddenException(
        `已有 ${otherUsers.size} 名其他用户同款，全局字段已锁定，请联系管理员`,
      );
    }
  }

  private async assertCanEditVariant(
    user: AuthUser,
    variant: {
      item: { createdByUserId: string };
      wardrobeEntries: { userId: string }[];
    },
  ) {
    if (user.role === UserRole.ADMIN || user.role === UserRole.EDITOR) return;
    if (variant.item.createdByUserId !== user.id) {
      throw new ForbiddenException('无权编辑该变体');
    }
    const others = variant.wardrobeEntries.filter((e) => e.userId !== user.id);
    if (others.length > 0) {
      const n = new Set(others.map((o) => o.userId)).size;
      throw new ForbiddenException(
        `已有 ${n} 名其他用户同款，变体已锁定，请联系管理员`,
      );
    }
  }
}
