# Context: C 端移动页面实现

## Interview Decisions

| # | Decision | Choice | Source |
|---|---|---|---|
| 1 | Scope | 按上一张 C 端原型图实现前端页面 | user |
| 2 | Depth | 标准分析 + 直接实现 + 截图验证 | user |
| 3 | Dimensions | architecture, implementation, performance, feasibility, impact, risk, complexity, alignment, maintainability | default |
| 4 | Go/No-Go threshold | Go if no backend dependency and screenshot can verify | default |

## Locked

- `/mobile` 是 C 端入口。
- C 端首版是移动学习阅读体验，不是 IDE。
- 代码区只读，支持复制/收藏/反馈的视觉入口。
- 分类目录、来源证据、版权安全必须在界面中可见。
- 静态数据先落地，后续再接真实 API。

## Free

- 具体颜色、间距、组件结构可按现有前端工程调整。
- 可使用 lucide-react 图标和普通 HTML/CSS。

## Deferred

- 收藏持久化。
- 真实学习进度计算。
- API 联动和登录态。

## Next

Implement `apps/web/src/pages/ConsumerMobilePage.tsx`, update `apps/web/src/App.tsx`, add scoped CSS, run build and screenshot verification.
