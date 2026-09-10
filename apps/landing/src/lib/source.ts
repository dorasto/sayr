import {
	IconApi,
	IconBuildingSkyscraper,
	IconChecklist,
	IconCode,
	IconEye,
	IconFolders,
	IconHelpCircle,
	IconLayoutKanban,
	IconPlug,
	IconServer,
	IconSparkles,
	IconUserCircle,
} from "@tabler/icons-react";
import { docs } from "collections/server";
import { loader } from "fumadocs-core/source";
import { createElement } from "react";

// Maps the `icon` string in a folder's meta.json to a React element. Keep this
// in sync with the icon names used across content/docs/**/meta.json.
const icons = {
	IconApi,
	IconBuildingSkyscraper,
	IconChecklist,
	IconCode,
	IconEye,
	IconFolders,
	IconHelpCircle,
	IconLayoutKanban,
	IconPlug,
	IconServer,
	IconSparkles,
	IconUserCircle,
};

export const source = loader({
	baseUrl: "/docs",
	source: docs.toFumadocsSource(),
	icon(icon) {
		if (!icon) return;
		// Neither the sidebar tree nor the tab dropdown force-size icon nodes via
		// CSS, so an explicit size keeps every icon consistent instead of
		// rendering at Tabler's 24px default.
		if (icon in icons) return createElement(icons[icon as keyof typeof icons], { size: 16 });
	},
});
