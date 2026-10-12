import type { PortfolioConfig } from "@/types/config";

// 数组顺序就是作品集的固定置顶顺序，不影响全站文章排序。
export const portfolioConfig: PortfolioConfig = {
	projects: [
		{
			name: "MedOps RAG",
			kicker: "01 / EVIDENCE-FIRST KNOWLEDGE",
			summary:
				"把文档、检索、受控 Agent 与来源复核连成一条可审计的企业知识问答链路。回答有出处，权限有边界。",
			status: "V3.5 · 企业知识库 Agent",
			stack: ["Python", "FastAPI", "Vue 3", "LangGraph", "MCP"],
			features: [
				"PDF / Office / 图片摄取与 OCR，保留原始证据位置",
				"BM25 / RRF / Parent–Child 检索与带来源持续对话",
				"多租户隔离、角色权限、拒答与运行审计",
			],
			postId: "medops-rag-project-guide",
			repository: "https://github.com/zureealLV/medops-rag",
			image: "content/posts/images/medops-overview.png",
			imageAlt: "MedOps RAG 控制台总览：运行状态、知识库与安全链路",
			imageNote: "项目控制台截图 · 界面展示不等于生产或医疗安全认证",
		},
		{
			name: "Doppel-Agent",
			kicker: "02 / LOCAL CODING WORKBENCH",
			summary:
				"面向 Windows 的本地编程工作台：持久对话、显式上下文、任务计划、审阅差异与验证，让执行过程可以被看见。",
			status: "v0.15.0-rc.1 · 预发布",
			stack: ["Python", "Vue 3", "pywebview", "LangGraph", "Deep Agents"],
			features: [
				"Graph / Deep / Legacy 三引擎与持久任务队列",
				"Diff-first 修改、独立审批、过期基线检测与验证",
				"MCP / Skills 扩展、事件回放与用量报告",
			],
			postId: "doppel-agent-local-coding-workbench",
			repository: "https://github.com/zureealLV/Doppel-Agent",
			image: "content/posts/images/doppel-agent-v015-rc1-workbench.jpg",
			imageAlt: "Doppel-Agent v0.15.0-rc.1 原生 Windows 编程工作台",
			imageNote: "原生 EXE 截图 · 隔离样例未提交模型任务，不是模型质量评测",
		},
	],
};
