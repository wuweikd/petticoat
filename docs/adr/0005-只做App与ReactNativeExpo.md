# 0005-只做 App 与 React Native Expo

## 状态：已接受

## 背景

原方案以微信小程序为首发，并用 Taro 编译到 React Native 做 App。产品改为要换装游戏级重度动效，且决定不再首发小程序。

## 决策

- **唯一客户端**：iOS / Android App；不做微信小程序首发
- **技术栈**：**React Native + Expo**（TypeScript），动效用 Reanimated 等原生动画能力
- **登录**：以手机号验证码为主（不再以小程序 openid 为首要身份）

## 理由

- 重度动效与换装游戏气质在 App 上比小程序更可持续
- 与后端 NestJS 同属 TypeScript，降低全栈切换成本
- 只做 App 时 Taro 的多端收益消失，反而增加动效与原生能力上限的摩擦

## 后果

- 失去微信内免安装分发；获客与审核走应用商店
- iOS 后续若上架，可能需补 Sign in with Apple（另议）
- 若未来再做小程序，需单独决策，不能假设与当前 RN 代码同源
