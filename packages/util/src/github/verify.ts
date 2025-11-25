import crypto from "node:crypto";

// biome-ignore lint/style/noNonNullAssertion: <needed>
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET!;

export function verifySignature(signature: string | null, payload: string): boolean {
	if (!signature) return false;

	const theirSig = signature.replace("sha256=", "");
	const ourSig = crypto.createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex");

	const their = Buffer.from(theirSig, "hex");
	const ours = Buffer.from(ourSig, "hex");

	return their.length === ours.length && crypto.timingSafeEqual(their, ours);
}
