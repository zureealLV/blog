# 索引与正式接入边界

## 读取与地址

只递归读取 `D:/blog/Firefly_zureeallv/src/content/posts/**/*.{md,mdx}`。`gray-matter` 解析真实 frontmatter。`draft: true` 与非空 `password` **整篇排除**，正文、标题均不进入公开索引。文件系统符号链接不跟随；不扫描 staging。

已检查正式 `src/content.config.ts` 的 glob loader、`src/utils/content-utils.ts`、`src/utils/url-utils.ts`、`src/pages/posts/[...slug].astro` 和 `astro.config.mjs`。当前安装 Astro 6.3.1 的 glob loader 默认调用 `getContentEntryIdAndSlug`：逐路径段进行 GitHub slug 规范化、移除末尾 `/index`，显式 `data.slug` 优先。Demo **直接复用该安装版本的实际 helper**，不是按文件名猜地址。再按正式 route 去扩展名、拼接 `/posts/<id>/`，当前 base `/`、站点 `https://zureeallv.com`。

这是有意的版本耦合：升级 Astro 或改路由规则后应重新跑测试。测试设有 glob 自定义 ID、base 与 URL 模板的漂移检查；若未来添加 generateId，应改适配器，不应静默沿用旧规则。

## 数据接口

- `buildSnapshot(root, overrides)` → `{ index, bodies: Map }`；可被未来构建脚本复用，当前没有接入生产流水线。
- `GET /v5/api/index`：版本 hash、覆盖统计、主题、每篇 ID/真实 URL/标题/发布日期/原摘要/60–100 字源文本简介/分类/作者/标签/关键词/主题依据/跨主题候选/XYZ/正文版本。**无全文 HTML**。
- `GET /v5/api/body/<hash-key>`：选中阅读时才请求，返回服务端 `marked` + `sanitize-html` 清理的正文 HTML。不执行脚本和 MDX；图片不由此 Demo 加载。
- `corepack pnpm run index`：输出元数据 `index.report.json`，不写正文到磁盘；报告不是服务的数据源。
- `createWatcher`：1.2 秒轮询正式文件及纠正配置的内容 hash，涵盖同大小/同时间戳变更。变更后原子替换内存快照，删除内容的 body key 随之失效。页面 2 秒同步，后台标签页暂停前端轮询，重新进入立即刷新。
- 文件解析错误时 fail closed，服务停止提供旧索引与旧正文；页面清空陈旧正文并显示错误，而不是继续曝光已转为私密的旧数据。正常传播延迟约为一次扫描 + 一次页面轮询，并非实时强一致。

## 主题规则

当前六区：自我与意识、欲望与关系、时间与记忆、诗与夜晚、代码与机器、未归类。

词表位于 `topics.mjs`，依据实际文章里的哲学、关系、回忆、诗歌和技术内容选取。标题权重 8、原标签 6、原 description 3、正文关键词 1；每词每字段最多计 4 次；标题与词完全匹配额外 +24。单字词只用于标题/标签，避免“光、爱”等在长文中泛滥。最高分 ≥5 才归类，否则兜底。前两名差 <8 标为 low；另记录最高分主题的关键词依据和接近分数的跨主题候选。

当前扫描：194/194；草稿 0、加密 0。主题分布 106 / 20 / 24 / 24 / 13 / 7。Hermes 跨 6 区分布（98 / 16 / 20 / 12 / 3 / 1），不是按原分类集中为一团。分区不是人工均分或模型质量评估。

每篇唯一主位置，主题中心固定；局部位置由真实 ID 的 FNV/xorshift 确定，不依赖全局文章顺序/数量。新增文章不会搬动旧节点；文章主题改变或显式纠正时，该篇会移动到新主题。只在聚焦时显示最多 3 条关联，依据共享关键词与同主题加分，不声称向量语义相似。

人工纠正示例（仅文档例子，配置默认空）：

```json
{ "实际-content-id": "time" }
```

正式接入时建议由 Astro Content Collection 直接传入已解析 ID 和数据，复用分类/布局函数；目前独立 indexer 兼顾本地监听，**没有改任何发布脚本或生产构建**。

## 隐私与安全

服务只绑定回环地址；静态资源白名单，不暴露仓库任意文件、环境变量、日志、node_modules 或测试材料。正文清理移除脚本、事件属性与危险链接协议。前端没有在线模型、遥测或第三方资源请求；点击博客原文才显式访问外网。源文本只从用户授权的公开文章目录读取。
