import type { Language } from "@/contexts/SiteSettingsContext";
import enTemplates from "../en/ai-templates";
import enCommon from "../en/common";
import enDialogs from "../en/dialogs";
import enSkills from "../en/skills";
import enWidgets from "../en/widgets";
import vnTemplates from "../vn/ai-templates";
import vnCommon from "../vn/common";
import vnDialogs from "../vn/dialogs";
import vnSkills from "../vn/skills";
import vnWidgets from "../vn/widgets";

const translations = {
	en: {
		common: enCommon,
		dialogs: enDialogs,
		templates: enTemplates,
		widgets: enWidgets,
		skills: enSkills,
	},
	vn: {
		common: vnCommon,
		dialogs: vnDialogs,
		templates: vnTemplates,
		widgets: vnWidgets,
		skills: vnSkills,
	},
};

export type Translations = typeof translations;
export type TranslationKeys = typeof translations.en;

export function loadTranslations(language: Language): TranslationKeys {
	return translations[language];
}
