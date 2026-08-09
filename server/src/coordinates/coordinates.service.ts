import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ItemCategory, SlotKind, WardrobeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const MAIN_CATEGORIES: ItemCategory[] = [
  ItemCategory.skirt,
  ItemCategory.top,
  ItemCategory.outer,
  ItemCategory.accessory,
  ItemCategory.foundation,
  ItemCategory.footwear,
];

const EXTRA_OK: ItemCategory[] = [
  ItemCategory.accessory,
  ItemCategory.foundation,
];

const STATUS_LABEL: Record<WardrobeStatus, string> = {
  wishlist: '想要',
  on_order: '预订中',
  owned: '已拥有',
};

const CATEGORY_LABEL: Record<ItemCategory, string> = {
  skirt: '裙子',
  top: '上装',
  outer: '外套',
  accessory: '配件',
  foundation: '底层',
  footwear: '鞋袜',
};

type SlotInput = {
  kind: SlotKind;
  category?: ItemCategory;
  variantId: string;
  sortOrder?: number;
};

const detailInclude = {
  slots: {
    orderBy: [{ kind: 'asc' as const }, { sortOrder: 'asc' as const }],
    include: {
      variant: {
        include: { item: { include: { brand: true } } },
      },
    },
  },
};

@Injectable()
export class CoordinatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(ownerId: string) {
    const list = await this.prisma.coordinate.findMany({
      where: { ownerId },
      orderBy: { updatedAt: 'desc' },
      include: detailInclude,
    });
    return Promise.all(list.map((c) => this.enrich(ownerId, c)));
  }

  async get(ownerId: string, id: string) {
    const coord = await this.prisma.coordinate.findFirst({
      where: { id, ownerId },
      include: detailInclude,
    });
    if (!coord) throw new NotFoundException('搭配不存在');
    return this.enrich(ownerId, coord);
  }

  async create(
    ownerId: string,
    input: { title?: string; slots?: SlotInput[] },
  ) {
    const slots = input.slots ?? [];
    await this.validateSlots(ownerId, slots);
    const created = await this.prisma.coordinate.create({
      data: {
        ownerId,
        title: input.title?.trim() || null,
        slots: slots.length
          ? {
              create: slots.map((s, i) => ({
                kind: s.kind,
                category: s.category ?? null,
                variantId: s.variantId,
                sortOrder: s.sortOrder ?? i,
              })),
            }
          : undefined,
      },
      include: detailInclude,
    });
    return this.enrich(ownerId, created);
  }

  async update(
    ownerId: string,
    id: string,
    input: { title?: string | null; slots?: SlotInput[] },
  ) {
    const existing = await this.prisma.coordinate.findFirst({
      where: { id, ownerId },
    });
    if (!existing) throw new NotFoundException('搭配不存在');

    if (input.slots) {
      await this.validateSlots(ownerId, input.slots);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (input.slots) {
        await tx.coordinateSlot.deleteMany({ where: { coordinateId: id } });
        if (input.slots.length) {
          await tx.coordinateSlot.createMany({
            data: input.slots.map((s, i) => ({
              coordinateId: id,
              kind: s.kind,
              category: s.category ?? null,
              variantId: s.variantId,
              sortOrder: s.sortOrder ?? i,
            })),
          });
        }
      }
      return tx.coordinate.update({
        where: { id },
        data: {
          title:
            input.title === undefined
              ? undefined
              : input.title === null
                ? null
                : input.title.trim() || null,
        },
        include: detailInclude,
      });
    });
    return this.enrich(ownerId, updated);
  }

  async remove(ownerId: string, id: string) {
    const existing = await this.prisma.coordinate.findFirst({
      where: { id, ownerId },
    });
    if (!existing) throw new NotFoundException('搭配不存在');
    await this.prisma.coordinate.delete({ where: { id } });
    return { ok: true };
  }

  /** 供发帖：取出坐标上的 variantIds */
  async variantIdsForOwner(ownerId: string, coordinateId: string) {
    const coord = await this.prisma.coordinate.findFirst({
      where: { id: coordinateId, ownerId },
      include: { slots: { orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }] } },
    });
    if (!coord) throw new NotFoundException('搭配不存在');
    return coord.slots.map((s) => s.variantId);
  }

  private async enrich(
    ownerId: string,
    coord: {
      id: string;
      ownerId: string;
      title: string | null;
      createdAt: Date;
      updatedAt: Date;
      slots: Array<{
        id: string;
        kind: SlotKind;
        category: ItemCategory | null;
        variantId: string;
        sortOrder: number;
        variant: {
          id: string;
          colorName: string;
          baseColor: string;
          cut: string;
          item: {
            id: string;
            name: string;
            category: ItemCategory;
            brand: { id: string; name: string };
          };
        };
      }>;
    },
  ) {
    const variantIds = coord.slots.map((s) => s.variantId);
    const entries = variantIds.length
      ? await this.prisma.wardrobeEntry.findMany({
          where: { userId: ownerId, variantId: { in: variantIds } },
        })
      : [];
    const byVariant = new Map(entries.map((e) => [e.variantId, e]));

    return {
      id: coord.id,
      ownerId: coord.ownerId,
      title: coord.title,
      createdAt: coord.createdAt,
      updatedAt: coord.updatedAt,
      slots: coord.slots.map((s) => {
        const entry = byVariant.get(s.variantId);
        const inWardrobe = !!entry;
        const status = entry?.status;
        const arrived = status === WardrobeStatus.owned;
        return {
          id: s.id,
          kind: s.kind,
          category: s.category,
          variantId: s.variantId,
          sortOrder: s.sortOrder,
          label: [
            s.variant.item.brand.name,
            s.variant.item.name,
            s.variant.colorName,
            s.variant.cut,
          ].join(' · '),
          variant: {
            id: s.variant.id,
            colorName: s.variant.colorName,
            baseColor: s.variant.baseColor,
            cut: s.variant.cut,
            item: {
              id: s.variant.item.id,
              name: s.variant.item.name,
              category: s.variant.item.category,
              brand: s.variant.item.brand,
            },
          },
          inWardrobe,
          wardrobeStatus: status ?? null,
          notArrived: inWardrobe && !arrived,
          statusLabel: status ? STATUS_LABEL[status] : '已不在衣橱',
        };
      }),
    };
  }

  private async validateSlots(ownerId: string, slots: SlotInput[]) {
    const mainCats = new Set<ItemCategory>();
    for (const [i, slot] of slots.entries()) {
      if (slot.kind === SlotKind.main) {
        if (!slot.category || !MAIN_CATEGORIES.includes(slot.category)) {
          throw new BadRequestException(`主坑 #${i + 1} 需要合法品类`);
        }
        if (mainCats.has(slot.category)) {
          throw new BadRequestException(
            `主坑「${CATEGORY_LABEL[slot.category]}」至多一件`,
          );
        }
        mainCats.add(slot.category);
      }

      const variant = await this.prisma.variant.findUnique({
        where: { id: slot.variantId },
        include: { item: true },
      });
      if (!variant) {
        throw new BadRequestException(`变体不存在：${slot.variantId}`);
      }

      const entry = await this.prisma.wardrobeEntry.findUnique({
        where: {
          userId_variantId: { userId: ownerId, variantId: slot.variantId },
        },
      });
      if (!entry) {
        throw new BadRequestException(
          `「${variant.item.name}」未在衣橱中，不能入搭`,
        );
      }

      if (slot.kind === SlotKind.main) {
        if (variant.item.category !== slot.category) {
          const pit =
            slot.category != null
              ? CATEGORY_LABEL[slot.category]
              : '未知';
          throw new BadRequestException(
            `主坑品类不匹配：坑=${pit}，变体=${CATEGORY_LABEL[variant.item.category]}`,
          );
        }
      } else {
        if (!EXTRA_OK.includes(variant.item.category)) {
          throw new BadRequestException(
            '额外槽仅允许配件或底层',
          );
        }
        // normalize category from variant for extras
        slot.category = variant.item.category;
      }
    }
  }
}
