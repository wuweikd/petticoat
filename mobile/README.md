# Petticoat Mobile (Phase 1)

Expo + React Native 客户端，决策见仓库根目录 `CONTEXT.md` 与 `docs/`。

## 开发

```bash
cd mobile
npm start
```

然后按终端提示开 iOS Simulator / Android / Expo Go。

## 已实现（骨架）

- 5 Tab：首页占位 · 衣橱 · 录入 · 日历 · 我的
- 本地衣橱状态机（AsyncStorage）：Brand / Item / Variant / WardrobeEntry / PreorderRecord
- 衣橱三分区双列网格、空状态插画
- 预订录入（CNY）、日历待补总额与议程、到货/取消
- 强制浅色主题色板（奶油 + 胭脂红）

## 尚未做

- 登录、后端 NestJS、模糊搜索目录、重度动效演出、真透明饰件抠图、自定义字体文件
