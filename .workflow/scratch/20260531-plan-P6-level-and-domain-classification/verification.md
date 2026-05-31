# Phase 6 Level And Domain Classification 验证记录

Date: 2026-05-31
Plan: `PLN-20260531-P6-level-and-domain-classification`
Phase: `level-and-domain-classification`

## 命令

```bash
npm run classify:level-domain
npm run validate:level-domain-classification
```

## 输出摘要

```text
classified problem count: 216
C++ level 5 with level labels: 27
C++ level 5 with domain labels: 24
programming with domain labels: 16/16
level 5 DP exact-domain count: 0
out-of-level signal count: 0
Level/domain classification validation passed
```

## 就绪状态

- 216 条 C++ canonical problem 都生成了官方等级标签。
- 五级 27 条题目全部有等级标签，24 条有算法范畴候选。
- 16 道编程题全部有算法范畴候选。
- DP 没有进入五级 exact/core domain。

## 后续风险

- 当前算法范畴仍是候选标签，需 Phase 7 / Phase 8 继续补题型模板、知识点和置信度模型。
- 选择题和判断题标题较短，部分题目仍需人工或更强证据复核。
