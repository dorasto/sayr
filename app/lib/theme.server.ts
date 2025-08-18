import { createCookie } from "remix";

export const themeCookie = createCookie("theme", {
	maxAge: 604_800, // one week
	path: "/",
});
