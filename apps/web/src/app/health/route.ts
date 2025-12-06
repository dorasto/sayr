import { NextResponse } from "next/server";
export const GET = () => {
	const message = "OK";
	return new NextResponse(message, {
		headers: { "Content-Type": "text/plain" },
	});
};
