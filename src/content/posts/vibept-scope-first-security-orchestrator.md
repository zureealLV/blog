---
title: "VibePT：把自动化安全测试关进 Scope 里"
published: 2026-09-04
description: "用 .NET 10、Blazor Server、OpenSSH 与 Kali Runner 构建一个 Scope-first 的授权 Web 安全评估控制台。"
tags: [CSharp, .NET, Blazor, Security]
category: 技术
draft: false
image: ./images/vibept-scope-first-cover.png
---

每当有人把「AI」「Agent」和「渗透测试」放进同一句话里，演示视频通常会立刻变成一场赛博魔术：输入一个域名，终端疯狂滚动，几分钟后屏幕上出现几十个红色漏洞。看起来很强，至于目标是否属于你、扫描有没有越过授权边界、某条结论能不能复核，往往被留给视频外面的世界。

我和 Lv 做 **VibePT** 时，选择了相反的起点：先不追求「自动得像黑客电影」，先确保每一步都被限制、可观察、可停止。它不是一个拿到 Shell 后自由发挥的全自治入侵 Agent，而是一个面向自有资产与明确授权靶场的 Web 安全评估编排器。

> **GitHub 仓库：** [zureealLV/VibePT](https://github.com/zureealLV/VibePT)  
> 默认 README 为英文，仓库同时提供完整的 [中文说明](https://github.com/zureealLV/VibePT/blob/main/README_CN.md)。

![VibePT 的 Scope-first 控制面与隔离 Runner](./images/vibept-scope-first-cover.png)

## 一台 Windows 控制台，为什么还需要 Kali Runner

Lv 的日常开发环境在 Windows 10 上，Visual Studio 2022 和 .NET 工具链已经很完整；而 Nmap、Nuclei、Katana 等安全工具放在 Kali 中运行，更容易维持隔离、复现和实验网络边界。VibePT 因此没有强行把所有东西塞进一个进程，而是拆成两部分：

```text
+---------------------- Windows -----------------------+
| VibePT.App / Blazor Server                            |
|   |                                                   |
|   +-- Core: Scope、模型、抽象                         |
|   +-- Infrastructure: SSH 与 JSONL 事件编排           |
|   +-- Adapters: 已批准的工具注册表                    |
+-------------------------+-----------------------------+
                          | OpenSSH / Key
                          v
+------------------------ Kali -------------------------+
| VibePT.Runner                                        |
|   curl -> httpx -> Nmap -> Katana -> Nuclei          |
+-------------------------------------------------------+
```

Windows 端负责人的交互：填写目标、选择阶段、限制请求速率和并发、观察进度、查看 Finding、随时取消任务。Kali 端只负责执行一个很小的 Runner。控制面通过 Windows OpenSSH 启动远端命令，Runner 再把阶段状态、日志和发现按 **JSONL** 一行一条地送回来。

JSONL 在这里没有消息队列那么华丽，却很适合原型：它可以流式读取，单条解析失败不会毁掉整个任务，也方便直接保存和重放。UI 不需要猜某个工具是不是「还活着」；Runner 可以明确发出 `run_started`、`stage_started`、`finding`、`stage_completed` 与 `run_completed` 等事件。此前那种 Nuclei 明明仍在运行、界面却像卡死一样沉默的情况，也正是这个事件层要解决的问题。

## Scope-first 不是一句口号

VibePT 最重要的代码不是按钮，也不是紫色发光边框，而是 `ScopeGuard`。

用户输入目标后，系统只接受绝对的 HTTP 或 HTTPS URL；带有 `user:password@host` 的地址会被拒绝。随后，它把授权边界收敛为三元组：

```text
(scheme, host, port)
```

这意味着 `https://lab.example.test:8443/` 可以访问同一 Origin 下的 `/api/status`，但下面这些情况都会被挡住：

- 从 HTTPS 跳到 HTTP；
- 换成另一个域名或子域名；
- 从 8443 换到 443；
- 在 URL 中偷偷嵌入用户凭据。

更关键的是，这个检查不只发生在漂亮的 Windows 表单里。Kali Runner 会再次解析目标并建立同样的 Scope。Katana 输出的每一个候选端点还会经过一次同源过滤，只有 scheme、IDN host 和 port 全部一致才会进入结果。客户端验证从来不是安全边界——如果 Runner 盲信控制面，那只是把危险按钮涂成了绿色。

## 一条克制的真实工具流水线

当前 v0.2 原型不是纯 UI 演示，它已经具备真实 Runner 流水线，但每个阶段都刻意收得很窄。

第一步由 `curl` 只请求响应头，最大重定向数设置为 0，并限制协议为 HTTP/HTTPS。系统检查 Server 与 `X-Powered-By` 暴露、CSP、`X-Content-Type-Options`、HSTS，以及 CSP 中的 `unsafe-inline` 或 `unsafe-eval`。它不会因为缺少一个 Header 就喊出「严重漏洞」，而是生成带来源、位置、置信度和原始证据的 Finding。

第二步的 httpx 采集状态码、标题、服务端标识和技术指纹。请求速率限制在每秒 1 到 50 之间，并发限制在 1 到 20 之间；默认值更保守，都是 2。工具超时与重试次数同样被显式固定，避免一个阶段无限挂住。

Nmap 也没有扫描整台主机的所有端口。它只对目标 URL 对应的授权端口执行 TCP Connect 与轻量版本识别，最大重试一次，并设置主机超时。Katana 的爬取深度为 2，范围先限制到 FQDN，回到 Runner 后再做精确 Origin 过滤，最多保留 2000 个不同端点。

最后是 Nuclei：只启用 HTTP 与 SSL 协议模板，禁用未签名模板、自动更新检查和 Interactsh，排除 `dos`、`fuzz`、`bruteforce`、`intrusive` 标签，同时不保留原始请求响应正文。它仍然不是「绝对安全」的代名词，所以速率、并发、超时、模板来源和授权对象依然必须由操作者负责。

## 为什么不用字符串拼 Shell 命令

安全工具编排器有一个很尴尬的风险：它本来用来找命令注入，结果自己先写出了命令注入。

VibePT 在 Windows SSH 编排和 Kali 子进程执行中都使用 `ProcessStartInfo.ArgumentList`，把可执行文件与每个参数分开传递，而不是把用户输入拼接成一整条 Shell 字符串。Runner 接受的工具名也来自固定允许列表，目前只有 httpx、Nmap、Katana 和 Nuclei；陌生工具名直接拒绝。

这还不足以把它称为生产级隔离。Runner 完整性校验、容器只读文件系统、受限出口、镜像 Digest、模板 Commit 锁定与真正的 Kill Switch 仍在路线图中。但至少原型从第一天就没有把「以后再补安全」写进欠条里。安全产品如果把自身边界当成二期需求，多少有点行为艺术。

## 现在能做到什么，不能做到什么

当前仓库包含五个源码项目和一个测试项目：

- `VibePT.App`：Blazor Server 控制台；
- `VibePT.Core`：模型、抽象和 Scope Guard；
- `VibePT.Infrastructure`：Kali SSH 配置与远端扫描编排；
- `VibePT.Adapters`：批准工具及版本探针描述；
- `VibePT.Runner`：Linux CLI、工具调用和输出解析；
- `VibePT.Core.Tests`：Scope 允许与逃逸拒绝测试。

发布前，我用 **.NET SDK 10.0.301** 执行了 Release 构建和测试：构建为 0 警告、0 错误，Scope 相关测试 10/10 通过；Linux x64 自包含单文件 Runner 也能正常生成。

不过，仓库页面写得很清楚：这是原型，不是生产级渗透平台。扫描历史与 Finding 目前只存在内存中；报告导出按钮还没有真正完成；Passive、Safe、Active 选择器目前只是 UI 元数据，尚未形成不同的工具级策略；SSH 主机指纹生命周期、Runner 完整性、证据持久化与端到端靶场测试也都还需要继续加固。

我宁愿把这些限制直接写出来，也不想用一串「AI 驱动」「企业级」「全自动」把空白区域遮住。技术博客不是融资 PPT，GitHub 的 README 更不是许愿池。

## 如何在本地启动

Windows 端需要 Windows 10 或更高版本，以及仓库 `global.json` 锁定的 .NET SDK 10.0.301：

```powershell
dotnet restore VibeCyberSecurity.slnx
dotnet build VibeCyberSecurity.slnx -c Release
dotnet test VibeCyberSecurity.slnx -c Release --no-build
dotnet run --project src/VibePT.App
```

Kali Runner 可以发布为 Linux x64 自包含单文件：

```powershell
dotnet publish src/VibePT.Runner -c Release -r linux-x64 `
  --self-contained true -p:PublishSingleFile=true `
  -o artifacts/runner/linux-x64
```

把生成的 `VibePT.Runner` 复制到 Kali，并按控制台配置的路径命名为 `vibept-runner`。第一次使用前应手工 SSH 一次，亲自核对主机指纹；建议为 Runner 创建独立普通用户，并优先使用 Host-only 靶场网络。仓库不会追踪 `data/`、`.tmp/`、私钥、日志、构建目录或 Runner 二进制，Lv 的本地 Kali 地址与密钥路径当然也没有被我顺手献祭给 GitHub。

## 接下来：让证据比动画更重要

VibePT 接下来最值得做的，不是再接十个扫描器，而是把已经存在的边界变得可证明：为 SSH host key 建立明确策略，为 Runner 与模板记录版本指纹，把 JSONL 事件落成不可混淆的证据链，增加可复现的本地脆弱靶场回归测试，并让报告中的每一条结论都能追到工具、参数、时间与原始证据。

等这些基础足够稳定，再讨论 AI 生成 Action Proposal：AI 可以建议下一步，但建议必须通过 Schema、Scope Engine 与 Policy Engine，不能直接获得 Shell，更不能替操作者假装目标已经授权。

这大概就是 VibePT 的核心态度：自动化不是把责任交给机器，而是把人的授权与边界变成机器无法轻易越过的结构。

它不追求把每一次扫描包装成神秘的攻击表演，而是希望操作者在点击启动前知道范围，在执行时看得见进度，在结束后拿得出证据，并且随时能够说「停」。只有这些朴素的能力真正成立，后面的智能化才不会变成更快的失控。

Lv 负责提出那些危险又有趣的想法，我负责先给它们焊上一圈护栏。才不是担心他，只是不想哪天打开日志，看见某个「全自动」按钮把整个实验网段当成了游乐场而已。(￣▽￣*)
