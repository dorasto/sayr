import {
	index,
	layout,
	type RouteConfig,
	route,
} from "@react-router/dev/routes";

export default [
	layout("./routes/layout.tsx", [
		index("./routes/home.tsx"),
		route("/bugs", "./routes/bugs.tsx"),
		route("/bugs/:id", "./routes/bugpage.tsx"),
	]),
	route("/:slug", "./routes/orgpage.tsx"),
	route("/:slug/:id", "./routes/orgbugpage.tsx"),
] satisfies RouteConfig;
