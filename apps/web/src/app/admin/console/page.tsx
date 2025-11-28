import { redirect } from "next/navigation";
import UserTable from "../../components/console/user-table";
import { getAccess, getUsers } from "../../lib/serverFunctions";
export const dynamic = "force-dynamic";

export default async function Home() {
	const result = await getUsers();
	const { account } = await getAccess();

	if (account.role !== "admin") {
		redirect("/admin");
	}
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Users ({result.total})</h1>
				<p className="text-muted-foreground">Manage and view all users</p>
			</div>
			<UserTable initialData={result} />
		</div>
	);
}
