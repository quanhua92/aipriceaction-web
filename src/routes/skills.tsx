import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowDown,
	Bitcoin,
	Bot,
	Brain,
	Building2,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Coins,
	Copy,
	ExternalLink,
	Github,
	Globe,
	Network,
	Search,
	Sparkles,
	TrendingUp,
	Unlock,
} from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/hooks/useTranslation";

export const Route = createFileRoute("/skills")({ component: SkillsPage });

function SkillsPage() {
	const { t } = useTranslation();

	React.useEffect(() => {
		document.title = t("skills.pageTitle");
	}, [t]);

	return (
		<div className="space-y-0">
			<HeroSection />
			<InstallationSection />
			<WhySection />
			<SkillsSection />
			<MarketCoverageSection />
			<AgentsSection />
			<ComparisonSection />
			<ExamplePromptsSection />
			<FAQSection />
			<DisclaimerSection />
		</div>
	);
}

function HeroSection() {
	const { t } = useTranslation();

	return (
		<section className="bg-gradient-to-br from-green-500/10 via-blue-500/10 to-purple-500/10 border-b">
			<div className="container mx-auto px-4 py-12 md:py-20 text-center">
				<div className="max-w-3xl mx-auto space-y-6">
					<Badge className="bg-green-500 text-white border-green-500 px-3 py-1 text-sm">
						{t("skills.hero.badge")}
					</Badge>
					<h1 className="text-3xl md:text-5xl font-bold leading-tight bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
						{t("skills.hero.headline1")}
						<br />
						{t("skills.hero.headline2")}
					</h1>
					<p className="text-lg md:text-xl text-muted-foreground">
						{t("skills.hero.subtitle")}
					</p>
					<p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
						{t("skills.hero.description")}
					</p>
					<Button
						size="lg"
						className="bg-green-500 hover:bg-green-600 text-white"
						onClick={() =>
							document
								.getElementById("install-section")
								?.scrollIntoView({ behavior: "smooth" })
						}
					>
						<ArrowDown className="mr-2 h-4 w-4" />
						{t("skills.hero.cta")}
					</Button>
				</div>
			</div>
		</section>
	);
}

function InstallationSection() {
	const { t } = useTranslation();

	const handleDownloadAgentsMd = async () => {
		try {
			const res = await fetch(
				"https://raw.githubusercontent.com/quanhua92/aipriceaction/main/AGENTS.md",
			);
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "AGENTS.md";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch {
			// ignore
		}
	};

	return (
		<section id="install-section" className="border-b">
			<div className="container mx-auto px-4 py-10 md:py-16">
				<h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
					{t("skills.install.sectionTitle")}
				</h2>
				<Tabs defaultValue="skills" className="max-w-3xl mx-auto">
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="skills">
							<span className="hidden sm:inline">
								{t("skills.install.tabCLI")}
							</span>
							<span className="sm:hidden">
								{t("skills.install.tabCLIshort")}
							</span>
						</TabsTrigger>
						<TabsTrigger value="agents">
							{t("skills.install.tabAgents")}
						</TabsTrigger>
					</TabsList>

					<TabsContent value="skills" className="mt-6">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Sparkles className="h-5 w-5 text-green-500" />
									{t("skills.install.method1Title")}
								</CardTitle>
								<CardDescription>
									{t("skills.install.method1Desc")}
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="relative">
									<code className="block bg-muted rounded-lg p-4 pr-10 font-mono text-sm overflow-x-auto">
										npx skills add quanhua92/aipriceaction
									</code>
									<button
										type="button"
										onClick={() => navigator.clipboard.writeText("npx skills add quanhua92/aipriceaction")}
										className="absolute top-2 right-2 p-1.5 rounded hover:bg-muted-foreground/20 transition-colors text-muted-foreground hover:text-foreground"
										title="Copy"
									>
										<Copy className="h-3.5 w-3.5" />
									</button>
								</div>
								<ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
									<li>{t("skills.install.method1Step1")}</li>
									<li>{t("skills.install.method1Step2")}</li>
									<li>{t("skills.install.method1Step3")}</li>
									<li>{t("skills.install.method1Step4")}</li>
								</ol>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="agents" className="mt-6">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Bot className="h-5 w-5 text-blue-500" />
									{t("skills.install.method2Title")}
								</CardTitle>
								<CardDescription>
									{t("skills.install.method2Desc")}
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<Button
									variant="outline"
									className="w-full bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
									onClick={handleDownloadAgentsMd}
								>
									<Bot className="mr-2 h-4 w-4" />
									Download AGENTS.md
								</Button>
								<p className="text-sm text-muted-foreground">
									{t("skills.install.method2Note")}
								</p>
								<p className="text-sm text-muted-foreground">
									{t("skills.install.method2Note2")}{" "}
									<code className="text-xs bg-muted px-1.5 py-0.5 rounded ml-1">
										aipa-cli
									</code>{" "}
									{t("skills.install.method2Note2End")}
								</p>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>

				<div className="max-w-3xl mx-auto mt-6">
					<Card>
						<CardContent className="pt-6 space-y-2">
							<h3 className="font-semibold text-sm">
								{t("skills.install.prerequisites")}
							</h3>
							<ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
								<li>
									{t("skills.install.prereq1")}{" "}
									<code className="text-xs bg-muted px-1.5 py-0.5 rounded">
										uvx
									</code>
									)
								</li>
								<li>
									<strong>{t("skills.install.prereq2NoApiKey")}</strong>
								</li>
								<li>
									<code className="text-xs bg-muted px-1.5 py-0.5 rounded">
										OPENAI_API_KEY
									</code>{" "}
									{t("skills.install.prereq3")}{" "}
									<code className="text-xs bg-muted px-1.5 py-0.5 rounded">
										aipa analyze
									</code>{" "}
									{t("skills.install.prereq3End")}
								</li>
							</ul>
						</CardContent>
					</Card>
				</div>
			</div>
		</section>
	);
}

function WhySection() {
	const { t } = useTranslation();

	const features = [
		{
			icon: <Unlock className="h-6 w-6 text-green-500" />,
			title: t("skills.why.feature1Title"),
			description: t("skills.why.feature1Desc"),
		},
		{
			icon: <Globe className="h-6 w-6 text-blue-500" />,
			title: t("skills.why.feature2Title"),
			description: t("skills.why.feature2Desc"),
		},
		{
			icon: <Brain className="h-6 w-6 text-purple-500" />,
			title: t("skills.why.feature3Title"),
			description: t("skills.why.feature3Desc"),
		},
		{
			icon: <Network className="h-6 w-6 text-orange-500" />,
			title: t("skills.why.feature4Title"),
			description: t("skills.why.feature4Desc"),
		},
	];

	return (
		<section className="border-b">
			<div className="container mx-auto px-4 py-10 md:py-16">
				<h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
					{t("skills.why.sectionTitle")}
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
					{features.map((f) => (
						<Card
							key={f.title}
							className="hover:border-primary/30 transition-colors"
						>
							<CardHeader>
								<div className="flex items-center gap-3">
									{f.icon}
									<CardTitle className="text-base">{f.title}</CardTitle>
								</div>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground">{f.description}</p>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}

function SkillsSection() {
	const { t } = useTranslation();

	const skillsData = [
		{
			name: "aipa-data",
			heading: t("skills.skillsData.data.heading"),
			description: t("skills.skillsData.data.description"),
			tag: t("skills.skillsData.data.tag"),
			tagColor: "bg-green-500 text-white border-green-500",
			samplePrompts: [
				t("skills.skillsData.data.prompt1"),
				t("skills.skillsData.data.prompt2"),
				t("skills.skillsData.data.prompt3"),
			],
		},
		{
			name: "aipa-analyze",
			heading: t("skills.skillsData.analyze.heading"),
			description: t("skills.skillsData.analyze.description"),
			tag: t("skills.skillsData.analyze.tag"),
			tagColor: "bg-blue-500 text-white border-blue-500",
			samplePrompts: [
				t("skills.skillsData.analyze.prompt1"),
				t("skills.skillsData.analyze.prompt2"),
				t("skills.skillsData.analyze.prompt3"),
			],
		},
		{
			name: "aipa-research",
			heading: t("skills.skillsData.research.heading"),
			description: t("skills.skillsData.research.description"),
			tag: t("skills.skillsData.research.tag"),
			tagColor: "bg-purple-500 text-white border-purple-500",
			samplePrompts: [
				t("skills.skillsData.research.prompt1"),
				t("skills.skillsData.research.prompt2"),
				t("skills.skillsData.research.prompt3"),
			],
			pipelineDiagram: true,
		},
	];

	return (
		<section className="border-b">
			<div className="container mx-auto px-4 py-10 md:py-16">
				<h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
					{t("skills.skillsSectionTitle")}
				</h2>
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
					{skillsData.map((skill) => (
						<SkillCard key={skill.name} skill={skill} />
					))}
				</div>
			</div>
		</section>
	);
}

function SkillCard({
	skill,
}: {
	skill: {
		name: string;
		heading: string;
		description: string;
		tag: string;
		tagColor: string;
		samplePrompts: string[];
		pipelineDiagram?: boolean;
	};
}) {
	const { t } = useTranslation();
	const [copiedPrompt, setCopiedPrompt] = React.useState<string | null>(null);

	const handleCopyPrompt = async (prompt: string) => {
		try {
			const text = prompt.replace(/^"|"$/g, "");
			await navigator.clipboard.writeText(text);
			setCopiedPrompt(prompt);
			setTimeout(() => setCopiedPrompt(null), 2000);
		} catch {
			// ignore
		}
	};

	return (
		<Card className="flex flex-col hover:border-primary/30 transition-colors">
			<CardHeader>
				<div className="flex items-center justify-between gap-2">
					<CardTitle className="text-lg">{skill.heading}</CardTitle>
					<Badge className={skill.tagColor}>{skill.tag}</Badge>
				</div>
				<CardDescription>{skill.description}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4 flex-1">
				<div className="space-y-2">
					{skill.samplePrompts.map((prompt) => (
						<button
							key={prompt}
							type="button"
							onClick={() => handleCopyPrompt(prompt)}
							className="flex items-start justify-between w-full text-left text-sm italic text-muted-foreground bg-muted/50 rounded px-3 py-2 hover:bg-muted/80 transition-colors group"
						>
							<span className="break-all">{prompt}</span>
							{copiedPrompt === prompt ? (
								<CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 ml-2 mt-0.5" />
							) : (
								<Copy className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 ml-2 mt-0.5" />
							)}
						</button>
					))}
				</div>

				{skill.pipelineDiagram && (
					<div className="bg-muted/50 rounded-lg p-3 space-y-1">
						<p className="text-xs font-mono text-center">
							{t("skills.skillsData.research.pipelineStep1")}
						</p>
						<p className="text-xs text-center text-muted-foreground">↓</p>
						<p className="text-xs font-mono text-center">
							{t("skills.skillsData.research.pipelineStep2")}
						</p>
						<p className="text-xs text-center text-muted-foreground">↓</p>
						<p className="text-xs font-mono text-center">
							{t("skills.skillsData.research.pipelineStep3")}
						</p>
						<p className="text-xs text-center text-muted-foreground">↓</p>
						<p className="text-xs font-mono text-center">
							{t("skills.skillsData.research.pipelineStep4")}
						</p>
						<p className="text-xs text-center text-muted-foreground">↓</p>
						<p className="text-xs font-mono text-center font-semibold">
							{t("skills.skillsData.research.pipelineStep5")}
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function MarketCoverageSection() {
	const { t } = useTranslation();

	const marketsData = [
		{
			icon: <Building2 className="h-6 w-6 text-red-500" />,
			name: t("skills.markets.vnStocks"),
			provider: "VCI, Vietstock, VNDirect, VPS, DNSE",
			examples: "VNINDEX, VN30, VCB, FPT, VIC, HPG, VNM, MBB...",
			intervals: "1m, 5m, 15m, 30m, 1h, 4h, 1D, 1W, 2W",
			watchlists: "VN30, VINGROUP, MASAN, TM, INDEX, CROSS",
		},
		{
			icon: <Bitcoin className="h-6 w-6 text-yellow-500" />,
			name: t("skills.markets.crypto"),
			provider: "Binance",
			examples: "BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT...",
			intervals: "1m, 5m, 15m, 30m, 1h, 4h, 1D, 1W, 2W",
			watchlists: t("skills.markets.market247"),
		},
		{
			icon: <TrendingUp className="h-6 w-6 text-blue-500" />,
			name: t("skills.markets.globalStocks"),
			provider: "Yahoo Finance",
			examples: "AAPL, TSLA, NVDA, SPY, ^GSPC...",
			intervals: "1m, 5m, 15m, 30m, 1h, 4h, 1D, 1W, 2W",
			watchlists: null,
		},
		{
			icon: <Coins className="h-6 w-6 text-amber-500" />,
			name: t("skills.markets.sjcGold"),
			provider: "sjc.com.vn",
			examples: "SJC-GOLD",
			intervals: "1D",
			watchlists: null,
		},
	];

	return (
		<section className="border-b">
			<div className="container mx-auto px-4 py-10 md:py-16">
				<h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
					{t("skills.markets.sectionTitle")}
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto">
					{marketsData.map((m) => (
						<Card
							key={m.name}
							className="hover:border-primary/30 transition-colors"
						>
							<CardHeader>
								<div className="flex items-center gap-3">
									{m.icon}
									<CardTitle className="text-base">{m.name}</CardTitle>
								</div>
							</CardHeader>
							<CardContent className="space-y-2">
								<div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
									<span className="text-muted-foreground font-medium">
										{t("skills.markets.labelProvider")}
									</span>
									<span>{m.provider}</span>
									<span className="text-muted-foreground font-medium">
										{t("skills.markets.labelExamples")}
									</span>
									<span className="font-mono text-xs">{m.examples}</span>
									<span className="text-muted-foreground font-medium">
										{t("skills.markets.labelIntervals")}
									</span>
									<span>{m.intervals}</span>
									{m.watchlists && (
										<>
											<span className="text-muted-foreground font-medium">
												{t("skills.markets.labelWatchlists")}
											</span>
											<span>{m.watchlists}</span>
										</>
									)}
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}

function AgentsSection() {
	const { t } = useTranslation();

	const agents = [
		{ name: "Claude Code", primary: true },
		{ name: "Gemini CLI", primary: false },
		{ name: "Codex", primary: false },
		{ name: "Cursor", primary: false },
		{ name: "openCode", primary: false },
		{ name: t("skills.agents.anyAgent"), primary: false },
	];

	return (
		<section className="border-b">
			<div className="container mx-auto px-4 py-10 md:py-16">
				<h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
					{t("skills.agents.sectionTitle")}
				</h2>
				<p className="text-center text-sm text-muted-foreground mb-8">
					<code className="text-xs bg-muted px-1.5 py-0.5 rounded">
						npx skills add quanhua92/aipriceaction
					</code>{" "}
					{t("skills.agents.sectionDesc")}
				</p>
				<div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
					{agents.map((a) => (
						<Card
							key={a.name}
							className={`px-4 py-3 hover:border-primary/30 transition-colors ${
								a.primary ? "border-green-500/50" : ""
							}`}
						>
							<div className="flex items-center gap-2">
								{a.primary && (
									<CheckCircle2 className="h-4 w-4 text-green-500" />
								)}
								<span className="text-sm font-medium">{a.name}</span>
								{a.primary && (
									<Badge className="bg-green-500 text-white border-green-500 text-[10px] px-1.5 py-0">
										{t("skills.agents.primaryBadge")}
									</Badge>
								)}
							</div>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}

function ComparisonSection() {
	const { t } = useTranslation();

	const comparisonKeys = [
		"price",
		"auth",
		"vnStocks",
		"crypto",
		"intlStocks",
		"sjcGold",
		"technicalAnalysis",
		"volumeProfile",
		"deepResearch",
		"agentsSupported",
		"cli",
		"openSource",
	] as const;

	return (
		<section className="border-b">
			<div className="container mx-auto px-4 py-10 md:py-16">
				<h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
					{t("skills.comparison.sectionTitle")}
				</h2>
				<div className="max-w-4xl mx-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[200px]">
									{t("skills.comparison.colFeature")}
								</TableHead>
								<TableHead className="text-green-600 font-bold">
									{t("skills.comparison.colUs")}
								</TableHead>
								<TableHead>{t("skills.comparison.colOthers")}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{comparisonKeys.map((key) => (
								<TableRow key={key}>
									<TableCell className="font-medium whitespace-normal text-xs">
										{t(`skills.comparison.${key}.feature`)}
									</TableCell>
									<TableCell className="whitespace-normal text-xs">
										{t(`skills.comparison.${key}.us`)}
									</TableCell>
									<TableCell className="whitespace-normal text-xs text-muted-foreground">
										{t(`skills.comparison.${key}.them`)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</div>
		</section>
	);
}

function PromptCard({
	title,
	prompts,
	color,
}: {
	title: string;
	prompts: string[];
	color: string;
}) {
	return (
		<Card className="hover:border-primary/30 transition-colors">
			<CardHeader className="pb-2">
				<Badge className={color}>{title}</Badge>
			</CardHeader>
			<CardContent className="space-y-2">
				{prompts.map((p) => (
					<p key={p} className="text-sm italic text-muted-foreground">
						&quot;{p}&quot;
					</p>
				))}
			</CardContent>
		</Card>
	);
}

function ExamplePromptsSection() {
	const { t } = useTranslation();

	return (
		<section className="border-b">
			<div className="container mx-auto px-4 py-10 md:py-16">
				<h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
					{t("skills.prompts.sectionTitle")}
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
					<PromptCard
						title="aipa-data"
						color="bg-green-500 text-white border-green-500"
						prompts={[
							t("skills.prompts.dataPrompts.0"),
							t("skills.prompts.dataPrompts.1"),
							t("skills.prompts.dataPrompts.2"),
							t("skills.prompts.dataPrompts.3"),
							t("skills.prompts.dataPrompts.4"),
						]}
					/>
					<PromptCard
						title="aipa-analyze"
						color="bg-blue-500 text-white border-blue-500"
						prompts={[
							t("skills.prompts.analyzePrompts.0"),
							t("skills.prompts.analyzePrompts.1"),
							t("skills.prompts.analyzePrompts.2"),
							t("skills.prompts.analyzePrompts.3"),
							t("skills.prompts.analyzePrompts.4"),
						]}
					/>
					<PromptCard
						title="aipa-research"
						color="bg-purple-500 text-white border-purple-500"
						prompts={[
							t("skills.prompts.researchPrompts.0"),
							t("skills.prompts.researchPrompts.1"),
							t("skills.prompts.researchPrompts.2"),
							t("skills.prompts.researchPrompts.3"),
						]}
					/>
				</div>
			</div>
		</section>
	);
}

function FAQSection() {
	const { t } = useTranslation();

	const faqKeys = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8"] as const;

	return (
		<section className="border-b">
			<div className="container mx-auto px-4 py-10 md:py-16">
				<h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
					{t("skills.faq.sectionTitle")}
				</h2>
				<div className="max-w-3xl mx-auto space-y-3">
					{faqKeys.map((key) => (
						<FAQItem
							key={key}
							question={t(`skills.faq.${key}.q`)}
							answer={t(`skills.faq.${key}.a`)}
						/>
					))}
				</div>
			</div>
		</section>
	);
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
	const [open, setOpen] = React.useState(false);

	return (
		<Collapsible open={open} onOpenChange={setOpen}>
			<Card className="overflow-hidden">
				<CollapsibleTrigger asChild>
					<button
						type="button"
						className="flex items-center justify-between w-full p-4 text-left hover:bg-muted/50 transition-colors"
					>
						<span className="font-medium text-sm">{question}</span>
						{open ? (
							<ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
						) : (
							<ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
						)}
					</button>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<div className="px-4 pb-4 text-sm text-muted-foreground whitespace-pre-line">
						{answer}
					</div>
				</CollapsibleContent>
			</Card>
		</Collapsible>
	);
}

function DisclaimerSection() {
	const { t } = useTranslation();

	return (
		<section>
			<div className="container mx-auto px-4 py-10 md:py-16">
				<div className="max-w-3xl mx-auto space-y-4">
					<Separator />
					<div className="space-y-3 pt-4">
						<p className="text-sm text-muted-foreground">
							{t("skills.disclaimer.text1")}
						</p>
						<p className="text-sm text-muted-foreground">
							{t("skills.disclaimer.text2")}
						</p>
						<p className="text-sm text-muted-foreground">
							{t("skills.disclaimer.text3")}
						</p>
					</div>
					<div className="flex items-center gap-4 pt-2">
						<a
							href="https://github.com/quanhua92/aipriceaction"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							<Github className="h-4 w-4" />
							Github
						</a>
						<a
							href="https://aipriceaction.com"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							<ExternalLink className="h-4 w-4" />
							Website
						</a>
						<a
							href="https://pypi.org/project/aipa-cli/"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							<Search className="h-4 w-4" />
							PyPI
						</a>
						<span className="text-xs text-muted-foreground">License: MIT</span>
					</div>
				</div>
			</div>
		</section>
	);
}
