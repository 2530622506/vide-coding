---
session_id: BLP-consumer-mobile-redesign-2026-06-20
id: REQ-003
title: 题目阅读与解题动作
status: complete
phase: requirements
priority: Must
mvp: true
---

# REQ-003 题目阅读与解题动作

## User Story

作为学习者，我希望题目页聚焦题干、选项/样例、解题线索和参考代码入口，以便在移动端快速完成理解和复习动作。

## Requirements

- 题目页 MUST 展示来源标签、标题、题型、知识点、题干和答案选项/样例。
- 选择题/判断题 MUST 优先展示选项；编程题 SHOULD 展示样例输入输出。
- 解题线索 MUST 使用后端 `steps` 或 `algorithm` 生成，缺失时显示明确空状态。
- 参考代码入口 MUST 进入 code view 或 IDE 入口，并保留返回上下文。
- 收藏按钮 MUST 记录 `favorite` 学习事件；标记复习 MUST 记录 `review` 学习事件。

## Acceptance Criteria

1. 打开题目详情时自动记录 `view` 事件。
2. 点击收藏后，`GET /consumer-mobile/progress` 或页面级模型能看到该题进入 favorites。
3. 点击参考代码后能看到代码、思路或明确的暂无代码状态。
4. GESP 和 AtCoder 题目均可使用同一个题目页模型渲染。

## Source Anchors

- `apps/web/src/pages/consumer/ConsumerProblemStatement.tsx`
- `apps/web/src/pages/consumer/ConsumerCodeBlock.tsx`
- `apps/api/src/consumer-mobile.service.ts`
