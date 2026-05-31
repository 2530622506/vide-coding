---
title: "Architecture Constraints"
readMode: required
priority: high
category: arch
keywords:
  - architecture
  - module
  - layer
  - boundary
  - dependency
  - structure
---

# Architecture Constraints

## Module Structure

## Layer Boundaries

## Dependency Rules

## Technology Constraints

## Entries

<spec-entry category="arch" keywords="gesp,catalog,classification,ia" date="2026-05-31" source=".workflow/roadmap.md">

### GESP 分类目录优先

产品必须以分类目录为主线，而不是搜索页优先；核心信息架构是 level -> algorithm domain -> problem type -> problems -> knowledge points。

</spec-entry>

<spec-entry category="arch" keywords="gesp,official-source,trust,provenance" date="2026-05-31" source=".workflow/roadmap.md">

### GESP 官方来源优先

GESP 题目等级和官方知识点范围必须以官方大纲、官方真题和官方样题为准；OJ 镜像、训练题单和题解文章只能作为练习入口、题目映射或辅助标签证据。

</spec-entry>

<spec-entry category="arch" keywords="gesp,level-5,dp,syllabus-fit" date="2026-05-31" source=".workflow/roadmap.md">

### GESP 五级 DP 越级处理

动态规划不属于 GESP 五级核心分类；五级题源中出现 DP 标签时，应保存为 community_inferred、out_of_level 或 disputed，并进入复核流程，不能覆盖官方五级分类。

</spec-entry>

<spec-entry category="arch" keywords="backend,database,docker,container" date="2026-05-31" source="user">

### 后端与数据库容器化许可

后端服务、数据库、队列、检索服务和离线解析依赖可以使用 Docker 容器；涉及数据库或服务运行验证时，优先设计为可容器化部署。

</spec-entry>

<spec-entry category="arch" keywords="frontend,react,backend,nest,crawler,python" date="2026-05-31" source="user">

### 技术栈默认选择

后续页面前端默认使用 React 编写，后端服务默认使用 Nest；爬虫优先沿用当前工程脚本方式，若 Node 或常规抓取手段获取不到，可切换为 Python 爬虫实现。

</spec-entry>

<spec-entry category="arch" keywords="database,mysql,docker,backend" date="2026-05-31" source="user">

### 数据库默认选择

后端数据库可以使用 MySQL；需要数据库验证或后端联调时，可以直接启动用户本机 Docker 服务中的 MySQL 容器。

</spec-entry>
