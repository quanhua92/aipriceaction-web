import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { buildAIContext } from "@/lib/ai-context-builder";
import { useTranslation } from "@/hooks/useTranslation";

export const Route = createFileRoute("/ai")({ component: AIContextPage });

function AIContextPage() {
	const { t, language } = useTranslation();
	const [copied, setCopied] = React.useState(false);
	const aiContext = React.useMemo(() => buildAIContext(language), [language]);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(aiContext);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy text:", err);
		}
	};

	return (
		<div className="container mx-auto p-2 md:p-6 space-y-6">
			<div className="space-y-2">
				<h1 className="text-3xl font-bold">{t("common.aiContext.title")}</h1>
				<p className="text-muted-foreground">
					{t("common.aiContext.description")}
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>{t("common.aiContext.cardTitle")}</CardTitle>
					<CardDescription>
						{t("common.aiContext.cardDescription")}
					</CardDescription>
				</CardHeader>
				<CardContent className="p-3 md:p-6 space-y-4">
					{/* Scrollable Textarea */}
					<div className="relative">
						<textarea
							readOnly
							value={aiContext}
							className="w-full h-[600px] p-4 font-mono text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring bg-muted/50"
							style={{ whiteSpace: "pre-wrap" }}
						/>
					</div>

					{/* Copy Button */}
					<div className="flex justify-end">
						<Button
							onClick={handleCopy}
							variant={copied ? "default" : "outline"}
							className="min-w-[120px]"
						>
							{copied ? (
								<>
									<Check className="mr-2 h-4 w-4" />
									{t("common.aiContext.copied")}
								</>
							) : (
								<>
									<Copy className="mr-2 h-4 w-4" />
									{t("common.aiContext.copyButton")}
								</>
							)}
						</Button>
					</div>

					{/* Usage Instructions */}
					<div className="mt-6 p-4 bg-muted/50 rounded-md space-y-2">
						<h3 className="font-semibold text-sm">{t("common.aiContext.howToUseTitle")}</h3>
						<ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
							<li>{t("common.aiContext.howToUseSteps.step1")}</li>
							<li>{t("common.aiContext.howToUseSteps.step2")}</li>
							<li>{t("common.aiContext.howToUseSteps.step3")}</li>
							<li>{t("common.aiContext.howToUseSteps.step4")}</li>
						</ol>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
