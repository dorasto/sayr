import { createProject, getOrganizationMembers } from "@repo/database";
import { Hono } from "hono";
import { type AppEnv, checkMembershipRole } from "@/index";
import {
	broadcast,
	broadcastIndividual,
	broadcastPublic,
	findClientByWsId,
	findClientsByUserId,
	type WSBaseMessage,
} from "../ws";
import { apiRouteAdminProjectTask } from "./task";

export const apiRouteAdminProject = new Hono<AppEnv>();
apiRouteAdminProject.post("/create", async (c) => {
	const { org_id, wsClientId, name, description, visibility } = await c.req.json();
	const session = c.get("session");
	const isAuthorized = await checkMembershipRole(session?.userId, org_id, ["owner"]);
	if (!isAuthorized) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}
	const result = await createProject(org_id, name, description, visibility);
	if (result.success) {
		const found = findClientByWsId(wsClientId);
		const data = {
			type: "CREATE_PROJECT" as WSBaseMessage["type"],
			data: result.data,
		};
		broadcast(org_id, "admin", data, found?.socket);
		broadcastPublic(org_id, { ...data, data: data });
		const members = await getOrganizationMembers(org_id);
		members.forEach((member) => {
			const clients = findClientsByUserId(member.userId);
			clients.forEach((c) => broadcastIndividual(c.socket, data));
		});
		return c.json({
			success: true,
			data: data,
		});
	} else {
		return c.json(
			{
				success: false,
				path: c.req.path,
				error: result.error,
			},
			500
		);
	}
});

apiRouteAdminProject.patch("/update", async (c) => {
	const { org_id, wsClientId } = await c.req.json();
	const session = c.get("session");
	const isAuthorized = await checkMembershipRole(session?.userId, org_id);
	if (!isAuthorized) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}
	const found = findClientByWsId(wsClientId);
	return c.json({
		success: true,
		data: found,
	});
});

apiRouteAdminProject.route("/task", apiRouteAdminProjectTask);
