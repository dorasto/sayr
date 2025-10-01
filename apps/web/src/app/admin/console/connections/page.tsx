import { redirect } from "next/navigation";
import AdminConnectionsPage from "@/app/components/console/conections";
import { getAccess, getUsers } from "@/app/lib/serverFunctions";

export default async function Home() {
	const { account } = await getAccess();

	if (account.role !== "admin") {
		redirect("/admin");
	}
	const result = await getUsers();
	return <AdminConnectionsPage accounts={result} />;
}
