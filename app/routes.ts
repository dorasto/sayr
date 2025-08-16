import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [  layout("./routes/layout.tsx", [
    index("./routes/home.tsx"),
    route("/bugs","./routes/bugs.tsx"),
    route("/bugs/:id","./routes/bugpage.tsx"),
  ])] satisfies RouteConfig;