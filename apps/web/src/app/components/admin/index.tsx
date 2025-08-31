"use client";
import { useLayoutData } from "@/app/admin/Context";

export default function AdminHomePage() {
	const { account } = useLayoutData();
	return <div className="">test {account.user.name}</div>;
}
