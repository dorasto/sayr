"use client";
import { useRouter } from "next/navigation";
export default async function Home() {
	const router = useRouter();
	return router.back();
}
