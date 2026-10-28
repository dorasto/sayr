const USESEND_API_URL = "https://app.usesend.com/api/v1/emails";
const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";
const RESEND_API_URL = "https://api.resend.com/emails";
const RESEND_BATCH_API_URL = "https://api.resend.com/emails/batch";
const RESEND_BATCH_LIMIT = 100;

export interface SendEmailOptions {
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

interface EmailBatchOptions {
	messages: SendEmailOptions[];
}

interface EmailProvider {
	sendEmail(
		options: Required<Pick<SendEmailOptions, "from">> & Omit<SendEmailOptions, "from">
	): Promise<EmailProviderResponse>;

	sendEmailBatch?(options: EmailBatchOptions): Promise<EmailProviderResponse[]>;
}

const normalizeList = (value: string | string[] | undefined): string[] => {
	if (!value) return [];
	return Array.isArray(value) ? value : [value];
};

/* ------------------------------------------------------------------ */
/* UseSend Provider */
/* ------------------------------------------------------------------ */

class UseSendProvider implements EmailProvider {
	async sendEmail(
		options: Required<Pick<SendEmailOptions, "from">> & Omit<SendEmailOptions, "from">
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

	async sendEmailBatch(options: EmailBatchOptions): Promise<EmailProviderResponse[]> {
		if (!process.env.SAYR_EMAIL) return [];

		const response = await fetch("https://app.usesend.com/api/v1/emails/batch", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${process.env.SAYR_EMAIL}`,
			},
			body: JSON.stringify(options.messages), // MUST be raw array
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`UseSend batch failed: ${response.status} ${error}`);
		}

		const data = await response.json();

		return data.data.map((item: any) => ({
			emailId: item.emailId,
		}));
	}
}

/* ------------------------------------------------------------------ */
/* SendGrid Provider */
/* ------------------------------------------------------------------ */

class SendGridProvider implements EmailProvider {
	async sendEmail(
		options: Required<Pick<SendEmailOptions, "from">> & Omit<SendEmailOptions, "from">
	): Promise<EmailProviderResponse> {
		if (!process.env.SAYR_EMAIL) {
			console.warn("SAYR_EMAIL not set, skipping email send");
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

		const emailId = response.headers.get("X-Message-Id") ?? "";
		return { emailId };
	}

	async sendEmailBatch(options: EmailBatchOptions): Promise<EmailProviderResponse[]> {
		if (!process.env.SAYR_EMAIL) return [];

		// No messages → nothing to send
		if (options.messages.length === 0) return [];

		// Safe because of the early return
		const first = options.messages[0]!;

		const personalizations = options.messages.map((msg) => ({
			to: normalizeList(msg.to).map((email) => ({ email })),
			cc: normalizeList(msg.cc).map((email) => ({ email })),
			bcc: normalizeList(msg.bcc).map((email) => ({ email })),
			subject: msg.subject,
			dynamic_template_data: msg.variables,
		}));

		const payload: any = {
			personalizations,
			from: { email: first.from },
		};

		if (first.templateId) {
			payload.template_id = first.templateId;
		} else {
			const content: { type: string; value: string }[] = [];
			if (first.text) content.push({ type: "text/plain", value: first.text });
			if (first.html) content.push({ type: "text/html", value: first.html });
			if (content.length > 0) payload.content = content;
		}

		if (first.replyTo) {
			payload.reply_to = { email: first.replyTo };
		}

		const response = await fetch(SENDGRID_API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${process.env.SAYR_EMAIL}`,
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			throw new Error(`SendGrid batch failed: ${response.status} ${await response.text()}`);
		}

		return options.messages.map(() => ({ emailId: "" }));
	}
}

/* ------------------------------------------------------------------ */
/* Resend Provider */
/* ------------------------------------------------------------------ */

class ResendProvider implements EmailProvider {
	async sendEmail(
		options: Required<Pick<SendEmailOptions, "from">> & Omit<SendEmailOptions, "from">
	): Promise<EmailProviderResponse> {
		if (!process.env.SAYR_EMAIL) {
			console.warn("SAYR_EMAIL not set, skipping email send");
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
		return { emailId: data.id };
	}

	async sendEmailBatch(options: EmailBatchOptions): Promise<EmailProviderResponse[]> {
		if (!process.env.SAYR_EMAIL) return [];

		// One entry per message so recipients never see each other and each keeps its own
		// template variables (e.g. a personal invite URL). Resend accepts up to 100 per call.
		const toPayload = (msg: SendEmailOptions): Record<string, unknown> => {
			const payload: Record<string, unknown> = {
				from: msg.from ?? process.env.SAYR_FROM_EMAIL,
				to: normalizeList(msg.to),
				subject: msg.subject,
			};
			if (msg.templateId) {
				// Resend rejects html/text alongside a template.
				payload.template = { id: msg.templateId, variables: msg.variables ?? {} };
			} else {
				if (msg.html) payload.html = msg.html;
				if (msg.text) payload.text = msg.text;
			}
			if (msg.replyTo) payload.reply_to = msg.replyTo;
			if (msg.cc) payload.cc = normalizeList(msg.cc);
			if (msg.bcc) payload.bcc = normalizeList(msg.bcc);
			return payload;
		};

		const results: EmailProviderResponse[] = [];

		for (let i = 0; i < options.messages.length; i += RESEND_BATCH_LIMIT) {
			const chunk = options.messages.slice(i, i + RESEND_BATCH_LIMIT);

			const response = await fetch(RESEND_BATCH_API_URL, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${process.env.SAYR_EMAIL}`,
				},
				body: JSON.stringify(chunk.map(toPayload)),
			});

			if (!response.ok) {
				throw new Error(`Resend batch failed: ${response.status} ${await response.text()}`);
			}

			const data: { data?: { id: string }[] } = await response.json();
			const ids = data.data ?? [];

			results.push(...chunk.map((_, index) => ({ emailId: ids[index]?.id ?? "" })));
		}

		return results;
	}
}

/* ------------------------------------------------------------------ */

type ProviderName = "usesend" | "sendgrid" | "resend";

function getProvider(): EmailProvider {
	const provider = (process.env.EMAIL_PROVIDER as ProviderName) ?? "usesend";

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

/* Public single email API */
export async function sendEmail(options: SendEmailOptions): Promise<string> {
	const from = options.from ?? process.env.SAYR_FROM_EMAIL;

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

/* Public batch API */
export async function sendEmailBatch(messages: SendEmailOptions[]): Promise<string[]> {
	const provider = getProvider();

	if (provider.sendEmailBatch) {
		const results = await provider.sendEmailBatch({ messages });
		return results.map((r) => r.emailId);
	}

	const ids: string[] = [];
	for (let i = 0; i < messages.length; i += 50) {
		const batch = messages.slice(i, i + 50);
		const res = await Promise.all(batch.map((m) => sendEmail(m)));
		ids.push(...res);
	}
	return ids;
}

const contactBookId = process.env.USESEND_SIGNUP_CONTACT_BOOK_ID;
const apiKey = process.env.SAYR_EMAIL;
const headers = {
	Authorization: `Bearer ${apiKey}`,
	"Content-Type": "application/json",
};

export async function deleteContactByEmail(email: string) {
	if (!contactBookId) {
		throw new Error("Missing USESEND_SIGNUP_CONTACT_BOOK_ID environment variable");
	}

	if (!apiKey) {
		throw new Error("Missing SAYR_EMAIL environment variable");
	}
	const listResponse = await fetch(
		`https://app.usesend.com/api/v1/contactBooks/${contactBookId}/contacts?emails=${encodeURIComponent(email)}`,
		{
			method: "GET",
			headers,
		}
	);

	if (!listResponse.ok) {
		throw new Error(`Failed to find contact: ${listResponse.status} ` + (await listResponse.text()));
	}

	const result = await listResponse.json();
	// Adjust this depending on the exact response shape.
	const contact = Array.isArray(result) ? result[0] : (result.contacts?.[0] ?? result.data?.[0]);

	if (!contact) {
		console.log(`No contact found for ${email}`);
		return;
	}

	const contactId = contact.id;

	const deleteResponse = await fetch(
		`https://app.usesend.com/api/v1/contactBooks/${contactBookId}/contacts/${encodeURIComponent(contactId)}`,
		{
			method: "DELETE",
			headers,
		}
	);

	if (!deleteResponse.ok) {
		throw new Error(`Failed to delete contact: ${deleteResponse.status} ` + (await deleteResponse.text()));
	}

	console.log(`Deleted contact ${contactId} (${email})`);
}

type AddContactInput = {
	email: string;
	firstName?: string;
	lastName?: string;
	properties?: Record<string, string | number | boolean | null>;
	subscribed?: boolean;
};

type UseSendContactResponse = {
	id?: string;
	email?: string;
	[key: string]: unknown;
};

export async function addContactToContactBook(contact: AddContactInput): Promise<UseSendContactResponse> {
	if (!contactBookId) {
		throw new Error("Missing USESEND_SIGNUP_CONTACT_BOOK_ID environment variable");
	}

	if (!apiKey) {
		throw new Error("Missing SAYR_EMAIL environment variable");
	}

	const response = await fetch(`https://app.usesend.com/api/v1/contactBooks/${contactBookId}/contacts`, {
		method: "POST",
		headers,
		body: JSON.stringify({
			email: contact.email,
			firstName: contact.firstName,
			lastName: contact.lastName,
			properties: contact.properties,
			subscribed: contact.subscribed ?? true,
		}),
	});

	const responseText = await response.text();

	let data: UseSendContactResponse;

	try {
		data = JSON.parse(responseText) as UseSendContactResponse;
	} catch {
		throw new Error(`UseSend returned invalid JSON: ${response.status} ${responseText}`);
	}

	if (!response.ok) {
		throw new Error(`Failed to add contact: ${response.status} ${JSON.stringify(data)}`);
	}

	return data;
}
