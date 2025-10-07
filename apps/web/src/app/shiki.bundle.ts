import type {
	DynamicImportLanguageRegistration,
	DynamicImportThemeRegistration,
	HighlighterGeneric,
} from "@shikijs/types";
import { createdBundledHighlighter, createSingletonShorthands } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine-javascript.mjs";

type BundledLanguage = "javascript" | "js" | "typescript" | "ts" | "vue";
type BundledTheme = "github-dark-default" | "github-light-default";
type Highlighter = HighlighterGeneric<BundledLanguage, BundledTheme>;

const bundledLanguages = {
	javascript: () => import("shiki/langs/javascript.mjs"),
	js: () => import("shiki/langs/javascript.mjs"),
	typescript: () => import("shiki/langs/typescript.mjs"),
	ts: () => import("shiki/langs/typescript.mjs"),
	vue: () => import("shiki/langs/vue.mjs"),
} as Record<BundledLanguage, DynamicImportLanguageRegistration>;

const bundledThemes = {
	"github-dark-default": () => import("shiki/themes/github-dark-default.mjs"),
	"github-light-default": () => import("shiki/themes/github-light-default.mjs"),
} as Record<BundledTheme, DynamicImportThemeRegistration>;

const createHighlighter = /* @__PURE__ */ createdBundledHighlighter<BundledLanguage, BundledTheme>({
	langs: bundledLanguages,
	themes: bundledThemes,
	engine: () => createJavaScriptRegexEngine(),
});

const {
	codeToHtml,
	codeToHast,
	codeToTokensBase,
	codeToTokens,
	codeToTokensWithThemes,
	getSingletonHighlighter,
	getLastGrammarState,
} = /* @__PURE__ */ createSingletonShorthands<BundledLanguage, BundledTheme>(createHighlighter);

export {
	bundledLanguages,
	bundledThemes,
	codeToHast,
	codeToHtml,
	codeToTokens,
	codeToTokensBase,
	codeToTokensWithThemes,
	createHighlighter,
	getLastGrammarState,
	getSingletonHighlighter,
};
export type { BundledLanguage, BundledTheme, Highlighter };
