import { getAccess } from "@/app/lib/serverFunctions";

export default async function Home() {
	const account = await getAccess();
	console.log("🚀 ~ Home ~ account:", account);
	return <div className="">test</div>;
}
