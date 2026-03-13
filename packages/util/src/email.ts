const USESEND_API_URL = "https://app.usesend.com/api/v1/emails";
const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";
const RESEND_API_URL = "https://api.resend.com/emails";

interface SendEmailOptions {
	to: string | string[];
	from?: string;
	subject: string;
	html?: string;
	text?: string;
	templateId?: string;
	variables?: Record<string, string>;
	replyTo?: string;
	cc?: string | string[];
	bcc?: string | string[];
}

interface EmailProviderResponse {
	emailId: string;
}

interface EmailProvider {
	sendEmail(
		options: Required<Pick<SendEmailOptions, "from">> &
			Omit<SendEmailOptions, "from">
	): Promise<EmailProviderResponse>;
}

// Small helper
const normalizeList = (
	value: string | string[] | undefined
): string[] => {
	if (!value) return [];
	return Array.isArray(value) ? value : [value];
};

/**
 * UseSend provider
 */
class UseSendProvider implements EmailProvider {
	async sendEmail(
		options: Required<Pick<SendEmailOptions, "from">> &
			Omit<SendEmailOptions, "from">
	): Promise<EmailProviderResponse> {
		if (!process.env.SAYR_EMAIL) {
			console.warn("SAYR_EMAIL not set, skipping email send");
			return { emailId: "" };
		}

		const response = await fetch(USESEND_API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${process.env.SAYR_EMAIL}`,
			},
			body: JSON.stringify(options),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`UseSend failed: ${response.status} ${error}`);
		}

		const data = await response.json();
		return { emailId: data.emailId };
	}
}

/**
 * SendGrid provider
 * Env:
 *   SENDGRID_API_KEY
 */
class SendGridProvider implements EmailProvider {
	async sendEmail(
		options: Required<Pick<SendEmailOptions, "from">> &
			Omit<SendEmailOptions, "from">
	): Promise<EmailProviderResponse> {
		if (!process.env.SENDGRID_API_KEY) {
			console.warn("SENDGRID_API_KEY not set, skipping email send");
			return { emailId: "" };
		}

		const { to, cc, bcc, subject, html, text, from, replyTo } = options;

		const toList = normalizeList(to).map((email) => ({ email }));
		const ccList = normalizeList(cc).map((email) => ({ email }));
		const bccList = normalizeList(bcc).map((email) => ({ email }));

		const content: { type: string; value: string }[] = [];
		if (text) content.push({ type: "text/plain", value: text });
		if (html) content.push({ type: "text/html", value: html });

		const payload = {
			personalizations: [
				{
					to: toList,
					cc: ccList.length ? ccList : undefined,
					bcc: bccList.length ? bccList : undefined,
				},
			],
			from: { email: from },
			reply_to: replyTo ? { email: replyTo } : undefined,
			subject,
			content,
		};

		const response = await fetch(SENDGRID_API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${process.env.SAYR_EMAIL}`,
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`SendGrid failed: ${response.status} ${error}`);
		}

		// SendGrid usually doesn’t return an ID in body; you can
		// read a header or just return empty string.
		const emailId =
			response.headers.get("X-Message-Id") ?? "";

		return { emailId };
	}
}

/**
 * Resend provider
 * Env:
 *   RESAYR_EMAIL
 */
class ResendProvider implements EmailProvider {
	async sendEmail(
		options: Required<Pick<SendEmailOptions, "from">> &
			Omit<SendEmailOptions, "from">
	): Promise<EmailProviderResponse> {
		if (!process.env.RESAYR_EMAIL) {
			console.warn("RESAYR_EMAIL not set, skipping email send");
			return { emailId: "" };
		}

		const { to, cc, bcc, subject, html, text, from, replyTo } = options;

		const payload: Record<string, unknown> = {
			from,
			to: normalizeList(to),
			subject,
		};

		if (html) payload.html = html;
		if (text) payload.text = text;
		if (replyTo) payload.reply_to = replyTo;
		if (cc) payload.cc = normalizeList(cc);
		if (bcc) payload.bcc = normalizeList(bcc);

		const response = await fetch(RESEND_API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${process.env.SAYR_EMAIL}`,
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Resend failed: ${response.status} ${error}`);
		}

		const data = await response.json();
		// Resend returns { id: "..." }
		return { emailId: data.id };
	}
}

type ProviderName = "usesend" | "sendgrid" | "resend";

function getProvider(): EmailProvider {
	const provider =
		(process.env.EMAIL_PROVIDER as ProviderName) ?? "usesend";

	switch (provider) {
		case "sendgrid":
			return new SendGridProvider();
		case "resend":
			return new ResendProvider();
		case "usesend":
		default:
			return new UseSendProvider();
	}
}

/**
 * Public API – unchanged and easy to use
 *
 * Configure via env:
 *   EMAIL_PROVIDER = "usesend" | "sendgrid" | "resend"
 *
 * Plus each provider's API keys:
 *   usesend:  SAYR_EMAIL
 *   sendgrid: SENDGRID_API_KEY
 *   resend:   RESAYR_EMAIL
 *
 * Also:
 *   SAYR_FROM_EMAIL (default "from" address)
 */
export async function sendEmail(
	options: SendEmailOptions
): Promise<string> {
	const from = options.from ?? process.env.SAYR_FROM_EMAIL;
	console.log("🚀 ~ sendEmail ~ from:", from)

	if (!from) {
		throw new Error("SAYR_FROM_EMAIL is not set and no from provided");
	}

	const provider = getProvider();

	const result = await provider.sendEmail({
		...options,
		from,
	});

	return result.emailId;
}