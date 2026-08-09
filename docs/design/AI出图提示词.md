# Petticoat Phase 1 — AI 出图提示词

> 配套：[`视觉方向.md`](./视觉方向.md)、ADR-0006  
> **重要**：风格圣经只约束「画风与色板」，**不要**把裙撑/珠宝盒写进公共前缀——否则模型会塌成 11 张同构图。  
> **一次只出 1 个 ID**；换 ID 必须换「唯一主角」和构图，见 §3。

---

## 1. 使用方式（防塌缩）

1. 复制 **§2 瘦身风格前缀**（只有气质/色彩/禁人物）。  
2. 再整段粘贴 **§3 对应 ID 的完整场景块**（主角、构图、镜头、禁止出现的道具都写死）。  
3. **不要**一次跑「同一提示词出 11 张」——每张必须换 ID / 换场景块。  
4. Midjourney 等：每个 ID 新开任务；可加 `--stylize` 变化，但 **subject 必须不同**。  
5. 过审：和其他 ID 并排，若第一眼都是「白裙撑+粉丝带+木盒」→ **整组作废重出**。

**禁止用 AI**

- 假冒品牌实拍裙图、可读品牌 Logo  
- Tab 功能图标（用 Lucide）  
- 人脸 / 萌娘 / 完整人偶身体  

---

## 2. 瘦身风格前缀（每张都带，但要短）

### 2.1 公共 Positive

```text
2D mobile game UI illustration, refined dress-up boutique aesthetic,
cream porcelain palette background around #F7F1E8, soft carmine rose accents around #C45C6A,
tiny gold sparkles only as optional highlight, elegant not childish, not barbie-pink,
NO people, NO faces, NO anime girl, NO mannequin torso, NO doll body, NO dress form body,
clean readable composition for app empty-state, soft even lighting, delicate line art with soft cel shading,
high quality game asset, consistent series look (palette and line weight only)
```

### 2.2 公共 Negative

```text
person, human, face, anime, chibi, girl, mannequin, dress form, torso, headless dummy,
identical composition reuse, hoop skirt crinoline (unless this shot explicitly asks),
jewelry box (unless this shot explicitly asks), wooden chest (unless this shot explicitly asks),
photorealistic clothing catalog photo, brand logo, readable text, letters, watermark,
SCENE label, hex color code, Doubao, 豆包, UI button, fake app chrome,
purple gradient, neon, dark gothic void, cluttered lace wallpaper full frame,
lowres, blurry, UI screenshot, busy collage of many objects,
corner rose bouquet cluster on all four corners (unless deco shot needs subtle accent)
```

> 注意：Negative 里默认禁「裙撑 / 珠宝盒」；**仅当该 ID 场景明确需要时**，在场景块里写 `IGNORE negative ban on hoop skirt for this image` 或从本次 Negative 临时删掉对应词。

### 2.3 色彩锚点

| 角色 | 约值 |
|------|------|
| 奶油底 | `#F7F1E8` |
| 胭脂红 | `#C45C6A` |
| 金微光 | `#D4B56A` |
| 墨线 | `#3D342C` |

### 2.4 透明饰件追加

```text
isolated object on transparent background, PNG UI asset, crisp silhouette, no full-scene room, no floor, no wall
```

---

## 3. 分镜：每个 ID = 不同主角（完整可复制）

规格：空状态/氛围 **1024×1024**（闪屏可用竖图）；饰件 **512×512** 透明。

---

### E01 — `empty-wardrobe.png`（衣橱空）

**唯一主角**：空衣杆 + 几个空衣架（允许 **1 个** 小裙撑挂在角落当点缀，不要当画面中心）。

**完整 Positive（前缀 + 本段一起贴）：**

```text
[粘贴 §2.1]

SCENE E01 empty wardrobe: wide empty wooden clothing rack in a boutique backroom,
three empty wooden hangers spaced apart, one hanger slightly tilted,
ONLY a tiny folded petticoat hoop hanging on the FAR LEFT hanger as a small hint (not center),
large empty negative space in the LOWER THIRD for app caption and button,
camera: eye-level medium shot, subject in upper 60% of frame,
mood: quiet hopeful "wardrobe not filled yet",
MUST NOT: jewelry box, vanity mirror, shop window facade, calendar, wax seal, centered giant crinoline
```

**本张 Negative 额外：** `centered hoop skirt, giant crinoline, jewelry box, treasure chest, bow covering subject`

---

### E02 — `empty-calendar.png`（日历空）

**唯一主角**：台式小月历板 / 日程立牌（空白无字）+ 一支羽毛笔或蜡印章（不要珠宝盒）。

**完整场景块：**

```text
[粘贴 §2.1]

SCENE E02 empty calendar: cream desk top-down 45-degree view,
a blank standing desk calendar with empty grid (NO readable numbers or letters),
a rose wax seal stamp lying beside it, one silk ribbon bookmark,
soft shadow, lower area clear for caption,
camera: high-angle product shot,
MUST NOT: hoop skirt, clothing rack, hangers, jewelry box, shop window, mirror
```

**本张 Negative 额外：** `hoop skirt, crinoline, hanger, jewelry box, dress`

---

### E03 — `empty-home-placeholder.png`（首页敬请期待）

**唯一主角**：关着的精品橱窗 + 半拉帷幕（窗外景或店内剪影用家具，不要裙撑特写）。

```text
[粘贴 §2.1]

SCENE E03 coming soon home: exterior boutique shop window at daytime,
cream facade, dusty-rose awning, curtains half-closed inside the glass,
silhouette of shelves only (no clothing details), soft gold dust motes,
"closed for preparation" feeling WITHOUT any text or signs with letters,
camera: straight-on architectural facade, full window in frame, sky or cream wall above,
MUST NOT: hoop skirt close-up, jewelry box, hangers, vanity, calendar
```

**本张 Negative 额外：** `hoop skirt, crinoline, jewelry box, hanger, interior close-up of dress`

---

### E04 — `empty-profile.png`（我的页可选）

**唯一主角**：空梳妆台 + 镜子（镜中只映窗帘/墙，禁止脸）+ 一排空小抽屉。

```text
[粘贴 §2.1]

SCENE E04 profile corner: elegant vanity table with oval mirror,
mirror reflection shows ONLY cream curtain and wall (absolutely empty of people),
two small empty perfume bottle silhouettes (no labels), rose ribbon on drawer handle,
camera: three-quarter view of furniture,
MUST NOT: hoop skirt, jewelry treasure chest open with velvet, clothing rack, shop facade
```

**本张 Negative 额外：** `face in mirror, person reflection, hoop skirt, open jewelry box with gems`

---

### D01 — `deco-plus-frame.png`（＋号饰框）

**唯一主角**：空心圆角方形饰框（中间完全留空给真正的 +）。

```text
[粘贴 §2.1]
[粘贴 §2.4 transparent]

SCENE D01: UI frame asset only — rounded square ornamental border for a center plus button,
thin rose-gold filigree on corners, empty hollow center (completely blank middle 50%),
no plus sign drawn, no icons inside, no scene, no furniture,
flat orthographic front view like a game HUD frame
```

**本张 Negative 额外：** `plus sign, cross symbol, hoop skirt, box, room, ribbon bow in center`

---

### D02 — `deco-card-corner.png`（卡片单角饰）

**唯一主角**：仅左上角一条花饰（可旋转复用到四角）。

```text
[粘贴 §2.1]
[粘贴 §2.4 transparent]

SCENE D02: single corner flourish UI decal, L-shaped filigree for TOP-LEFT corner only,
rose and soft gold thin lines, rest of canvas empty transparent,
no full frame border, no bow cluster, no objects,
orthographic flat design
```

**本张 Negative 额外：** `full border, center ornament, hoop, box, ribbon pile`

---

### D03 — `deco-tab-base.png`（Tab 选中底座）

**唯一主角**：扁长小托台 / 短丝带底座。

```text
[粘贴 §2.1]
[粘贴 §2.4 transparent]

SCENE D03: wide short UI pedestal for a tab icon to stand on,
soft cream cushion with thin carmine edge and tiny gold stitch,
aspect like a flattened capsule, empty on top (no icon),
front orthographic, no room background
```

**本张 Negative 额外：** `tall pillar, hoop skirt, jewelry box, vertical banner`

---

### D04 — `deco-section-ribbon.png`（分区页签丝带）

**唯一主角**：横向丝带端饰（两头花结，中间可拉长的带身）。

```text
[粘贴 §2.1]
[粘贴 §2.4 transparent]

SCENE D04: horizontal silk ribbon strip for segment tabs,
dusty rose fabric with soft gold edge, decorative ends only,
long empty middle band for text overlay later,
flat UI ribbon asset, no vertical hanging bows dominating
```

**本张 Negative 额外：** `hoop skirt, jewelry box, square frame, vertical flag`

---

### D05 — `deco-badge-pending.png`（待尾款角标底）

**唯一主角**：小蜡封印章形或软菱形色块（无字）。

```text
[粘贴 §2.1]
[粘贴 §2.4 transparent]

SCENE D05: tiny wax-seal style badge shape, solid carmine rose fill,
thin gold rim, blank center for later text, soft clay material,
size like app notification badge, no scene
```

**本张 Negative 额外：** `text, numbers, hoop, box, ribbon bow larger than seal`

---

### A01 — `atmos-splash.png`（闪屏氛围）

**唯一主角**：橱窗夜景/日景的品牌氛围，裙撑只能是 **远处剪影**，主体是窗与光。

```text
[粘贴 §2.1]

SCENE A01 splash: vertical mobile splash friendly, boutique window at soft dusk,
warm cream interior glow, rose awning, ONE distant petticoat silhouette behind frosted glass (blurred, not detailed),
large clear center for logo later, cinematic but still 2D illustration,
MUST NOT: close-up crinoline filling frame, jewelry box foreground, hangers row
```

---

### A02 — `atmos-arrive.png`（到货庆祝衬底）

**唯一主角**：金色碎光 / 纸屑爆开 + 小小的礼物盒盖掀起（不是珠宝盒绒布那种）。

```text
[粘贴 §2.1]

SCENE A02 arrival celebration: soft explosion of gold confetti and rose petal shapes,
small cream gift box with lid ajar (simple gift box, NOT ornate jewelry chest),
abstract sparkles, cream background, center soft glow for overlay animation,
MUST NOT: hoop skirt, clothing rack, shop facade, calendar
```

---

## 4. 差异自检（出图后立刻做）

把 E01–E04 四张缩略图并排：

| 检查 | 合格标准 |
|------|----------|
| 主角 | 分别是：衣杆 / 台历 / 橱窗外立面 / 梳妆台 —— **不能撞车** |
| 禁止「全家桶」 | 同一张里不要同时出现裙撑+珠宝盒+丝带蝴蝶结三大件 |
| 留白 | 空状态图下方约 25–35% 相对干净，好放文案 |
| 饰件 D01–D05 | 必须是「零件」不是「小场景」 |

若 11 张都是白裙撑+木盒 → 说明仍在用旧公共前缀或批量同提示词，请改用本文 §2 瘦身版并按 ID 分开跑。

---

## 5. 过审清单（进包前）

- [ ] 无人物/人脸/人台躯干  
- [ ] 不偏芭比粉、不紫渐变、不黑底  
- [ ] 与同系列色板一致，但 **构图与主角不同**  
- [ ] 无可读文字/水印/假品牌  
- [ ] 饰件透明边干净  
- [ ] 空状态留得住 CTA  
- [ ] AI 服务条款允许商用  

---

## 6. 分工

| 角色 | 做什么 |
|------|--------|
| 工程 | 占位 → 按 filename 替换；粒子用代码 |
| 出图 | **按 ID 逐张**生成 → §4 自检 → §5 过审 → `assets/ai/` |
| 文档 | 新槽位追加；保持「一 ID 一主角」 |

---

## 7. 修订记录

| 日期 | 说明 |
|------|------|
| 2026-07-26 | 初稿 |
| 2026-07-26 | **重修**：瘦身公共前缀；每 ID 独立主角与完整场景块；增加防塌缩与差异自检（修复 11 张同图问题） |
