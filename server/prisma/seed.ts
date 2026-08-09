import {
  PrismaClient,
  ItemCategory,
  Cut,
  BaseColor,
  UserRole,
  PostType,
  PostStatus,
  WardrobeStatus,
  ReminderKind,
  SlotKind,
  Substyle,
  WardrobeVisibility,
} from '@prisma/client';

const prisma = new PrismaClient();

type SeedItem = {
  id: string;
  brandKey: string;
  name: string;
  category: ItemCategory;
  variants: { colorName: string; baseColor: BaseColor; cut: Cut }[];
};

async function main() {
  const admin = await prisma.user.upsert({
    where: { phone: '10000000000' },
    update: {
      role: UserRole.ADMIN,
      nickname: 'Admin',
      bio: '官方编辑账号',
    },
    create: {
      phone: '10000000000',
      nickname: 'Admin',
      role: UserRole.ADMIN,
      bio: '官方编辑账号',
    },
  });

  const demo = await prisma.user.upsert({
    where: { phone: '13800138000' },
    update: {
      nickname: '小裙子演示',
      bio: '甜萝日常 · 测试账号 验证码 0000',
      yearsInLolita: 5,
      preferredSubstyles: [Substyle.sweet, Substyle.classic],
      wardrobeVisibility: WardrobeVisibility.followers,
      reduceMotion: false,
    },
    create: {
      phone: '13800138000',
      nickname: '小裙子演示',
      bio: '甜萝日常 · 测试账号 验证码 0000',
      yearsInLolita: 5,
      preferredSubstyles: [Substyle.sweet, Substyle.classic],
      wardrobeVisibility: WardrobeVisibility.followers,
      role: UserRole.USER,
    },
  });

  const friend = await prisma.user.upsert({
    where: { phone: '13900139000' },
    update: {
      nickname: '同好小黑',
      bio: '哥特向 · 关注演示账号可见衣橱',
      preferredSubstyles: [Substyle.gothic],
      wardrobeVisibility: WardrobeVisibility.public,
    },
    create: {
      phone: '13900139000',
      nickname: '同好小黑',
      bio: '哥特向 · 关注演示账号可见衣橱',
      preferredSubstyles: [Substyle.gothic],
      wardrobeVisibility: WardrobeVisibility.public,
      role: UserRole.USER,
    },
  });

  await prisma.follow.upsert({
    where: {
      followerId_followingId: { followerId: demo.id, followingId: friend.id },
    },
    update: {},
    create: { followerId: demo.id, followingId: friend.id },
  });
  await prisma.follow.upsert({
    where: {
      followerId_followingId: { followerId: friend.id, followingId: demo.id },
    },
    update: {},
    create: { followerId: friend.id, followingId: demo.id },
  });

  const brandDefs = [
    { key: 'unknown', name: '未知品牌' },
    { key: 'ap', name: 'Angelic Pretty' },
    { key: 'btssb', name: 'Baby, The Stars Shine Bright' },
    { key: 'mm', name: 'Metamorphose temps de fille' },
    { key: 'iw', name: 'Innocent World' },
    { key: 'mf', name: 'Mary Magdalene' },
  ] as const;

  const brands: Record<string, string> = {};
  for (const b of brandDefs) {
    const row = await prisma.brand.upsert({
      where: { name: b.name },
      update: {},
      create: { name: b.name },
    });
    brands[b.key] = row.id;
  }

  await prisma.user.update({
    where: { id: demo.id },
    data: { favoriteBrandIds: [brands.ap, brands.btssb, brands.mm] },
  });

  const catalog: SeedItem[] = [
    // —— 裙子 ——
    {
      id: 'seed-holy-lantern',
      brandKey: 'ap',
      name: 'Holy Lantern',
      category: ItemCategory.skirt,
      variants: [
        { colorName: 'Mimosa', baseColor: BaseColor.yellow, cut: Cut.JSK },
        { colorName: 'Black', baseColor: BaseColor.black, cut: Cut.JSK },
        { colorName: 'Ivory', baseColor: BaseColor.white, cut: Cut.OP },
      ],
    },
    {
      id: 'seed-sugar-bouquet',
      brandKey: 'ap',
      name: 'Sugar Bouquet',
      category: ItemCategory.skirt,
      variants: [
        { colorName: 'Pink', baseColor: BaseColor.pink, cut: Cut.JSK },
        { colorName: 'Lavender', baseColor: BaseColor.purple, cut: Cut.SK },
      ],
    },
    {
      id: 'seed-alice-tea',
      brandKey: 'btssb',
      name: 'Alice Tea Party',
      category: ItemCategory.skirt,
      variants: [
        { colorName: 'Navy', baseColor: BaseColor.blue, cut: Cut.OP },
        { colorName: 'Wine', baseColor: BaseColor.red, cut: Cut.JSK },
      ],
    },
    {
      id: 'seed-moonlight-rose',
      brandKey: 'mm',
      name: 'Moonlight Rose',
      category: ItemCategory.skirt,
      variants: [
        { colorName: 'Black Rose', baseColor: BaseColor.black, cut: Cut.JSK },
        { colorName: 'Deep Green', baseColor: BaseColor.green, cut: Cut.OP },
      ],
    },
    // —— 上装 ——
    {
      id: 'seed-lace-blouse',
      brandKey: 'ap',
      name: 'Romantic Lace Blouse',
      category: ItemCategory.top,
      variants: [
        { colorName: 'White', baseColor: BaseColor.white, cut: Cut.Blouse },
        { colorName: 'Black', baseColor: BaseColor.black, cut: Cut.Blouse },
        { colorName: 'Ivory', baseColor: BaseColor.white, cut: Cut.Blouse },
      ],
    },
    {
      id: 'seed-frill-cardigan',
      brandKey: 'btssb',
      name: 'Petit Frill Cardigan',
      category: ItemCategory.top,
      variants: [
        { colorName: 'Baby Pink', baseColor: BaseColor.pink, cut: Cut.Cardigan },
        { colorName: 'Sax Blue', baseColor: BaseColor.blue, cut: Cut.Cardigan },
        { colorName: 'Black', baseColor: BaseColor.black, cut: Cut.Cardigan },
      ],
    },
    {
      id: 'seed-sailor-blouse',
      brandKey: 'iw',
      name: 'Sailor Ribbon Blouse',
      category: ItemCategory.top,
      variants: [
        { colorName: 'Navy', baseColor: BaseColor.blue, cut: Cut.Blouse },
        { colorName: 'Wine', baseColor: BaseColor.red, cut: Cut.Blouse },
      ],
    },
    {
      id: 'seed-knit-cardigan',
      brandKey: 'mm',
      name: 'Vintage Knit Cardigan',
      category: ItemCategory.top,
      variants: [
        { colorName: 'Cream', baseColor: BaseColor.white, cut: Cut.Cardigan },
        { colorName: 'Brown', baseColor: BaseColor.brown, cut: Cut.Cardigan },
      ],
    },
    // —— 外套 ——
    {
      id: 'seed-wool-coat',
      brandKey: 'iw',
      name: 'Winter Wool Coat',
      category: ItemCategory.outer,
      variants: [
        { colorName: 'Camel', baseColor: BaseColor.brown, cut: Cut.Coat },
        { colorName: 'Black', baseColor: BaseColor.black, cut: Cut.Coat },
      ],
    },
    {
      id: 'seed-velvet-cape',
      brandKey: 'mf',
      name: 'Velvet Evening Cape',
      category: ItemCategory.outer,
      variants: [
        { colorName: 'Burgundy', baseColor: BaseColor.red, cut: Cut.Cape },
        { colorName: 'Midnight', baseColor: BaseColor.black, cut: Cut.Cape },
      ],
    },
    {
      id: 'seed-short-coat',
      brandKey: 'ap',
      name: 'Little Ribbon Coat',
      category: ItemCategory.outer,
      variants: [
        { colorName: 'Pink', baseColor: BaseColor.pink, cut: Cut.Coat },
        { colorName: 'Ivory', baseColor: BaseColor.white, cut: Cut.Coat },
      ],
    },
    // —— 小物 ——
    {
      id: 'seed-rose-kc',
      brandKey: 'ap',
      name: 'Rose Garden KC',
      category: ItemCategory.accessory,
      variants: [
        { colorName: 'Pink', baseColor: BaseColor.pink, cut: Cut.Headdress },
        { colorName: 'Black', baseColor: BaseColor.black, cut: Cut.Headdress },
      ],
    },
    {
      id: 'seed-satin-bow',
      brandKey: 'btssb',
      name: 'Satin Ribbon Bow',
      category: ItemCategory.accessory,
      variants: [
        { colorName: 'Wine', baseColor: BaseColor.red, cut: Cut.Hairbow },
        { colorName: 'Navy', baseColor: BaseColor.blue, cut: Cut.Hairbow },
      ],
    },
    {
      id: 'seed-lace-cuff',
      brandKey: 'mm',
      name: 'Lace Wrist Cuffs',
      category: ItemCategory.accessory,
      variants: [
        { colorName: 'White', baseColor: BaseColor.white, cut: Cut.Wristcuff },
        { colorName: 'Black', baseColor: BaseColor.black, cut: Cut.Wristcuff },
      ],
    },
    {
      id: 'seed-basket-bag',
      brandKey: 'iw',
      name: 'Picnic Basket Bag',
      category: ItemCategory.accessory,
      variants: [
        { colorName: 'Natural', baseColor: BaseColor.brown, cut: Cut.Bag },
        { colorName: 'Black', baseColor: BaseColor.black, cut: Cut.Bag },
      ],
    },
    // —— 内搭 / 裙撑 ——
    {
      id: 'seed-organza-pannier',
      brandKey: 'ap',
      name: 'Organza Soft Pannier',
      category: ItemCategory.foundation,
      variants: [
        { colorName: 'White', baseColor: BaseColor.white, cut: Cut.Pannier },
        { colorName: 'Ivory', baseColor: BaseColor.white, cut: Cut.Pannier },
      ],
    },
    {
      id: 'seed-cage-pannier',
      brandKey: 'unknown',
      name: 'Adjustable Cage Pannier',
      category: ItemCategory.foundation,
      variants: [
        { colorName: 'Natural', baseColor: BaseColor.other, cut: Cut.Pannier },
      ],
    },
    // —— 鞋袜 ——
    {
      id: 'seed-tea-shoes',
      brandKey: 'ap',
      name: 'Tea Party Shoes',
      category: ItemCategory.footwear,
      variants: [
        { colorName: 'Black', baseColor: BaseColor.black, cut: Cut.Shoes },
        { colorName: 'Wine', baseColor: BaseColor.red, cut: Cut.Shoes },
        { colorName: 'Ivory', baseColor: BaseColor.white, cut: Cut.Shoes },
      ],
    },
    {
      id: 'seed-overknee-socks',
      brandKey: 'btssb',
      name: 'Overknee Ribbon Socks',
      category: ItemCategory.footwear,
      variants: [
        { colorName: 'White', baseColor: BaseColor.white, cut: Cut.Socks },
        { colorName: 'Black', baseColor: BaseColor.black, cut: Cut.Socks },
        { colorName: 'Pink', baseColor: BaseColor.pink, cut: Cut.Socks },
      ],
    },
    {
      id: 'seed-maryjane',
      brandKey: 'iw',
      name: 'Classic Mary Jane',
      category: ItemCategory.footwear,
      variants: [
        { colorName: 'Black Patent', baseColor: BaseColor.black, cut: Cut.Shoes },
        { colorName: 'Brown', baseColor: BaseColor.brown, cut: Cut.Shoes },
      ],
    },
  ];

  const variantIds: Record<string, string> = {};

  for (const def of catalog) {
    const item = await prisma.item.upsert({
      where: { id: def.id },
      update: {
        brandId: brands[def.brandKey],
        name: def.name,
        category: def.category,
      },
      create: {
        id: def.id,
        brandId: brands[def.brandKey],
        name: def.name,
        category: def.category,
        createdByUserId: admin.id,
      },
    });

    for (const v of def.variants) {
      const variant = await prisma.variant.upsert({
        where: {
          itemId_colorName_cut: {
            itemId: item.id,
            colorName: v.colorName,
            cut: v.cut,
          },
        },
        update: { baseColor: v.baseColor },
        create: {
          itemId: item.id,
          colorName: v.colorName,
          baseColor: v.baseColor,
          cut: v.cut,
        },
      });
      variantIds[`${def.id}|${v.colorName}|${v.cut}`] = variant.id;
    }
  }

  const v = (itemId: string, color: string, cut: Cut) =>
    variantIds[`${itemId}|${color}|${cut}`];

  // —— 演示账号衣橱（覆盖三态 + 各品类）——
  const wardrobePlan: {
    variantKey: [string, string, Cut];
    status: WardrobeStatus;
    size?: string;
    note?: string;
    private?: boolean;
    hidePreorder?: boolean;
    preorder?: {
      deposit: number;
      balance: number;
      dueAt: string;
      balancePaid?: boolean;
    };
  }[] = [
    {
      variantKey: ['seed-holy-lantern', 'Black', Cut.JSK],
      status: WardrobeStatus.owned,
      size: 'M',
      note: '常穿黑金灯笼',
    },
    {
      variantKey: ['seed-lace-blouse', 'White', Cut.Blouse],
      status: WardrobeStatus.owned,
      size: 'S',
    },
    {
      variantKey: ['seed-frill-cardigan', 'Baby Pink', Cut.Cardigan],
      status: WardrobeStatus.owned,
      size: 'F',
    },
    {
      variantKey: ['seed-rose-kc', 'Pink', Cut.Headdress],
      status: WardrobeStatus.owned,
    },
    {
      variantKey: ['seed-organza-pannier', 'White', Cut.Pannier],
      status: WardrobeStatus.owned,
    },
    {
      variantKey: ['seed-tea-shoes', 'Black', Cut.Shoes],
      status: WardrobeStatus.owned,
      size: '37',
    },
    {
      variantKey: ['seed-overknee-socks', 'White', Cut.Socks],
      status: WardrobeStatus.owned,
    },
    {
      variantKey: ['seed-holy-lantern', 'Mimosa', Cut.JSK],
      status: WardrobeStatus.on_order,
      size: 'M',
      preorder: {
        deposit: 800,
        balance: 1200,
        dueAt: '2026-09-15',
      },
    },
    {
      variantKey: ['seed-wool-coat', 'Camel', Cut.Coat],
      status: WardrobeStatus.on_order,
      size: 'M',
      hidePreorder: true,
      preorder: {
        deposit: 500,
        balance: 1800,
        dueAt: '2026-10-01',
      },
    },
    {
      variantKey: ['seed-velvet-cape', 'Burgundy', Cut.Cape],
      status: WardrobeStatus.wishlist,
    },
    {
      variantKey: ['seed-basket-bag', 'Natural', Cut.Bag],
      status: WardrobeStatus.wishlist,
      private: true,
    },
    {
      variantKey: ['seed-sailor-blouse', 'Navy', Cut.Blouse],
      status: WardrobeStatus.wishlist,
    },
    {
      variantKey: ['seed-sugar-bouquet', 'Pink', Cut.JSK],
      status: WardrobeStatus.wishlist,
    },
  ];

  for (const plan of wardrobePlan) {
    const [itemId, color, cut] = plan.variantKey;
    const variantId = v(itemId, color, cut);
    if (!variantId) continue;

    const entry = await prisma.wardrobeEntry.upsert({
      where: {
        userId_variantId: { userId: demo.id, variantId },
      },
      update: {
        status: plan.status,
        size: plan.size,
        note: plan.note,
        private: plan.private ?? false,
        hidePreorder: plan.hidePreorder ?? false,
      },
      create: {
        userId: demo.id,
        variantId,
        status: plan.status,
        size: plan.size,
        note: plan.note,
        private: plan.private ?? false,
        hidePreorder: plan.hidePreorder ?? false,
        quantity: 1,
        userImageUris: [],
      },
    });

    if (plan.preorder) {
      const existing = await prisma.preorderRecord.findFirst({
        where: { wardrobeEntryId: entry.id, cancelled: false, archived: false },
      });
      if (!existing) {
        await prisma.preorderRecord.create({
          data: {
            wardrobeEntryId: entry.id,
            depositAmountCny: plan.preorder.deposit,
            balanceAmountCny: plan.preorder.balance,
            balanceDueAt: new Date(plan.preorder.dueAt),
            balancePaid: plan.preorder.balancePaid ?? false,
            depositPaidAt: new Date(),
          },
        });
      }
    }
  }

  // 好友衣橱（想要重合用）
  const friendWishVariant = v('seed-holy-lantern', 'Black', Cut.JSK);
  if (friendWishVariant) {
    await prisma.wardrobeEntry.upsert({
      where: {
        userId_variantId: { userId: friend.id, variantId: friendWishVariant },
      },
      update: { status: WardrobeStatus.wishlist },
      create: {
        userId: friend.id,
        variantId: friendWishVariant,
        status: WardrobeStatus.wishlist,
        quantity: 1,
        private: false,
        userImageUris: [],
      },
    });
  }
  const friendOwnedBlouse = v('seed-lace-blouse', 'Black', Cut.Blouse);
  if (friendOwnedBlouse) {
    await prisma.wardrobeEntry.upsert({
      where: {
        userId_variantId: { userId: friend.id, variantId: friendOwnedBlouse },
      },
      update: { status: WardrobeStatus.owned },
      create: {
        userId: friend.id,
        variantId: friendOwnedBlouse,
        status: WardrobeStatus.owned,
        size: 'M',
        quantity: 1,
        private: false,
        userImageUris: [],
      },
    });
  }

  // —— 搭配 ——
  const coordinate = await prisma.coordinate.upsert({
    where: { id: 'seed-coord-tea' },
    update: { title: '午茶初搭' },
    create: {
      id: 'seed-coord-tea',
      ownerId: demo.id,
      title: '午茶初搭',
    },
  });

  await prisma.coordinateSlot.deleteMany({ where: { coordinateId: coordinate.id } });
  const coordSlots: {
    kind: SlotKind;
    category: ItemCategory | null;
    variantId: string | undefined;
    sortOrder: number;
  }[] = [
    {
      kind: SlotKind.main,
      category: ItemCategory.skirt,
      variantId: v('seed-holy-lantern', 'Black', Cut.JSK),
      sortOrder: 0,
    },
    {
      kind: SlotKind.main,
      category: ItemCategory.top,
      variantId: v('seed-lace-blouse', 'White', Cut.Blouse),
      sortOrder: 1,
    },
    {
      kind: SlotKind.main,
      category: ItemCategory.footwear,
      variantId: v('seed-tea-shoes', 'Black', Cut.Shoes),
      sortOrder: 2,
    },
    {
      kind: SlotKind.extra,
      category: ItemCategory.accessory,
      variantId: v('seed-rose-kc', 'Pink', Cut.Headdress),
      sortOrder: 0,
    },
    {
      kind: SlotKind.extra,
      category: ItemCategory.foundation,
      variantId: v('seed-organza-pannier', 'White', Cut.Pannier),
      sortOrder: 1,
    },
  ];
  for (const s of coordSlots) {
    if (!s.variantId) continue;
    await prisma.coordinateSlot.create({
      data: {
        coordinateId: coordinate.id,
        kind: s.kind,
        category: s.category,
        variantId: s.variantId,
        sortOrder: s.sortOrder,
      },
    });
  }

  // —— 帖子（各类型）——
  async function ensurePost(input: {
    id: string;
    authorId: string;
    type: PostType;
    title: string;
    body: string;
    releaseAt?: Date;
    coordinateId?: string;
    variantIds: string[];
  }) {
    const existing = await prisma.post.findUnique({ where: { id: input.id } });
    if (existing) {
      await prisma.post.update({
        where: { id: input.id },
        data: {
          title: input.title,
          body: input.body,
          status: PostStatus.published,
          publishedAt: existing.publishedAt ?? new Date(),
          releaseAt: input.releaseAt,
          coordinateId: input.coordinateId,
        },
      });
      await prisma.postVariant.deleteMany({ where: { postId: input.id } });
    } else {
      await prisma.post.create({
        data: {
          id: input.id,
          authorId: input.authorId,
          type: input.type,
          status: PostStatus.published,
          title: input.title,
          body: input.body,
          publishedAt: new Date(),
          releaseAt: input.releaseAt,
          coordinateId: input.coordinateId,
        },
      });
    }
    await prisma.postVariant.createMany({
      data: input.variantIds.filter(Boolean).map((variantId, i) => ({
        postId: input.id,
        variantId,
        sortOrder: i,
      })),
      skipDuplicates: true,
    });
  }

  await ensurePost({
    id: 'seed-outfit-holy',
    authorId: demo.id,
    type: PostType.outfit,
    title: 'Holy Lantern 初搭',
    body: '黑金灯笼裙 + 白蕾丝衬衫试穿分享。点下方变体「想要同款」试试闭环。',
    coordinateId: coordinate.id,
    variantIds: [
      v('seed-holy-lantern', 'Black', Cut.JSK),
      v('seed-holy-lantern', 'Mimosa', Cut.JSK),
      v('seed-lace-blouse', 'White', Cut.Blouse),
      v('seed-tea-shoes', 'Black', Cut.Shoes),
    ].filter(Boolean) as string[],
  });

  await ensurePost({
    id: 'seed-outfit-tops',
    authorId: demo.id,
    type: PostType.outfit,
    title: '上装叠穿小贴士',
    body: '衬衫 + 开衫叠穿，适合凉夏与空调房。',
    variantIds: [
      v('seed-lace-blouse', 'Ivory', Cut.Blouse),
      v('seed-frill-cardigan', 'Sax Blue', Cut.Cardigan),
      v('seed-sugar-bouquet', 'Pink', Cut.JSK),
    ].filter(Boolean) as string[],
  });

  await ensurePost({
    id: 'seed-tutorial-care',
    authorId: demo.id,
    type: PostType.tutorial,
    title: '蕾丝衬衫手洗笔记',
    body: '冷水手洗、平铺晾干；领口可用中性皂轻搓。附上装变体便于检索。',
    variantIds: [
      v('seed-lace-blouse', 'White', Cut.Blouse),
      v('seed-lace-blouse', 'Black', Cut.Blouse),
    ].filter(Boolean) as string[],
  });

  await ensurePost({
    id: 'seed-official-welcome',
    authorId: admin.id,
    type: PostType.official,
    title: '欢迎来到 Petticoat',
    body: '演示环境：手机 13800138000 / 验证码 0000。目录已覆盖裙、上装、外套、小物、裙撑、鞋袜。',
    variantIds: [],
  });

  await ensurePost({
    id: 'seed-wiki-cut',
    authorId: admin.id,
    type: PostType.encyclopedia,
    title: '百科：上装裁式说明',
    body: 'Blouse（衬衫）与 Cardigan（开衫）是上装主裁式；可与 JSK/OP/SK 叠穿。',
    variantIds: [
      v('seed-lace-blouse', 'White', Cut.Blouse),
      v('seed-frill-cardigan', 'Baby Pink', Cut.Cardigan),
      v('seed-sailor-blouse', 'Navy', Cut.Blouse),
    ].filter(Boolean) as string[],
  });

  await ensurePost({
    id: 'seed-brand-release',
    authorId: admin.id,
    type: PostType.brand_release,
    title: 'AP Holy Lantern 复刻预告',
    body: '点想要同款后会询问是否写入上新提醒。',
    releaseAt: new Date('2026-09-01'),
    variantIds: [v('seed-holy-lantern', 'Mimosa', Cut.JSK)].filter(
      Boolean,
    ) as string[],
  });

  await ensurePost({
    id: 'seed-brand-release-tops',
    authorId: admin.id,
    type: PostType.brand_release,
    title: 'BTSSB 开衫配色上新',
    body: 'Petit Frill Cardigan 新色预告，可加入想要并写入日历。',
    releaseAt: new Date('2026-08-20'),
    variantIds: [
      v('seed-frill-cardigan', 'Sax Blue', Cut.Cardigan),
      v('seed-frill-cardigan', 'Baby Pink', Cut.Cardigan),
    ].filter(Boolean) as string[],
  });

  await ensurePost({
    id: 'seed-friend-outfit',
    authorId: friend.id,
    type: PostType.outfit,
    title: '哥特向小黑衬衫',
    body: '黑蕾丝衬衫日常。',
    variantIds: [
      v('seed-lace-blouse', 'Black', Cut.Blouse),
      v('seed-moonlight-rose', 'Black Rose', Cut.JSK),
    ].filter(Boolean) as string[],
  });

  // —— 日历提醒 ——
  await prisma.calendarReminder.upsert({
    where: { id: 'seed-rem-release' },
    update: {
      title: 'AP Holy Lantern 复刻日',
      at: new Date('2026-09-01T10:00:00+08:00'),
      kind: ReminderKind.release_from_post,
      sourcePostId: 'seed-brand-release',
    },
    create: {
      id: 'seed-rem-release',
      userId: demo.id,
      title: 'AP Holy Lantern 复刻日',
      at: new Date('2026-09-01T10:00:00+08:00'),
      kind: ReminderKind.release_from_post,
      sourcePostId: 'seed-brand-release',
    },
  });
  await prisma.calendarReminder.upsert({
    where: { id: 'seed-rem-manual' },
    update: {
      title: '整理衣橱拍照',
      at: new Date('2026-08-15T19:00:00+08:00'),
      kind: ReminderKind.manual_release,
    },
    create: {
      id: 'seed-rem-manual',
      userId: demo.id,
      title: '整理衣橱拍照',
      at: new Date('2026-08-15T19:00:00+08:00'),
      kind: ReminderKind.manual_release,
    },
  });
  await prisma.calendarReminder.upsert({
    where: { id: 'seed-rem-tops' },
    update: {
      title: 'BTSSB 开衫上新',
      at: new Date('2026-08-20T12:00:00+08:00'),
      kind: ReminderKind.release_from_post,
      sourcePostId: 'seed-brand-release-tops',
    },
    create: {
      id: 'seed-rem-tops',
      userId: demo.id,
      title: 'BTSSB 开衫上新',
      at: new Date('2026-08-20T12:00:00+08:00'),
      kind: ReminderKind.release_from_post,
      sourcePostId: 'seed-brand-release-tops',
    },
  });

  const counts = {
    brands: await prisma.brand.count(),
    items: await prisma.item.count(),
    variants: await prisma.variant.count(),
    wardrobe: await prisma.wardrobeEntry.count({ where: { userId: demo.id } }),
    posts: await prisma.post.count(),
    reminders: await prisma.calendarReminder.count({ where: { userId: demo.id } }),
  };

  // eslint-disable-next-line no-console
  console.log('Seeded OK', {
    admin: admin.id,
    demo: demo.id,
    friend: friend.id,
    brands: Object.keys(brands).length,
    catalogItems: catalog.length,
    variants: Object.keys(variantIds).length,
    counts,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
