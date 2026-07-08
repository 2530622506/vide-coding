---
session_id: BLP-consumer-mobile-redesign-2026-06-20
id: NFR-USABILITY-001
title: 移动端可用性
status: complete
phase: requirements
priority: Must
mvp: true
---

# NFR-USABILITY-001 移动端可用性

- 页面 MUST 以 390px 移动宽度为主验收目标，并 SHOULD 兼容 360px 到 430px。
- 触控目标 MUST 不小于 44px。
- 底部导航 MUST 固定，但内容区 MUST 预留足够 padding，避免遮挡核心 CTA。
- 文本 MUST 允许换行，不得出现主要文案被按钮或卡片裁切。
- 色彩对比 MUST 满足常规正文 4.5:1 的可读性目标。

## Acceptance Criteria

1. 首页、题库、题目、进度、我的截图无横向滚动。
2. 原型主色、卡片半径、CTA 层级和底部导航状态在实现中保持一致。
3. iOS Safari 和 Chrome 移动模拟尺寸下主要交互可点击。
