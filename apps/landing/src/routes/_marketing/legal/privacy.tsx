import { createFileRoute } from "@tanstack/react-router";
import { seoMeta } from "@/lib/seo";

const lastUpdated = "2026-02-16";
// Construct as a local calendar date, not `new Date(lastUpdated)` — that parses
// as UTC midnight, which renders a day early for anyone west of UTC once this
// hydrates client-side.
const [lastUpdatedYear, lastUpdatedMonth, lastUpdatedDay] = lastUpdated.split("-").map(Number) as [
	number,
	number,
	number,
];
const formattedDate = new Date(lastUpdatedYear, lastUpdatedMonth - 1, lastUpdatedDay).toLocaleDateString("en-GB", {
	day: "numeric",
	month: "long",
	year: "numeric",
});

export const Route = createFileRoute("/_marketing/legal/privacy")({
	component: PrivacyPage,
	head: () =>
		seoMeta({
			title: "Privacy Policy",
			description: "How Sayr collects, uses, and protects your personal data.",
			path: "/legal/privacy",
		}),
});

function PrivacyPage() {
	return (
		<div className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
			<div className="mb-12">
				<h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Privacy Policy</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					Last updated: <time dateTime={lastUpdated}>{formattedDate}</time>
				</p>
				<p className="mt-4 text-lg text-muted-foreground">
					This Privacy Policy explains how Doras Media Limited ("we", "us", "Sayr") collects, uses, shares, and
					protects your personal data when you use the Sayr platform at sayr.io and related services.
				</p>
			</div>

			<div className="space-y-12 text-sm text-muted-foreground leading-relaxed">
				{/* 1. Who We Are */}
				<section>
					<h2 className="text-xl font-semibold text-foreground mb-4">1. Who We Are</h2>
					<p>
						Sayr is operated by <strong className="text-foreground">Doras Media Limited</strong>, a company
						registered in Ireland. For the purposes of data protection law, Doras Media Limited is the data
						controller responsible for your personal data.
					</p>
					<p className="mt-2">
						If you have questions about this policy or your data, contact us at{" "}
						<a href="mailto:support@sayr.io" className="text-foreground hover:underline">
							support@sayr.io
						</a>
						.
					</p>
				</section>

				{/* 2. Data We Collect */}
				<section>
					<h2 className="text-xl font-semibold text-foreground mb-4">2. Data We Collect</h2>

					<h3 className="text-base font-medium text-foreground mt-6 mb-2">2.1 Account Data</h3>
					<p>When you sign up via GitHub, Doras, Discord, or Slack OAuth, we collect:</p>
					<ul className="list-disc pl-6 mt-2 space-y-1">
						<li>
							<strong className="text-foreground">Name and display name</strong> — from your OAuth provider
							profile
						</li>
						<li>
							<strong className="text-foreground">Email address</strong> — from your OAuth provider
						</li>
						<li>
							<strong className="text-foreground">Profile picture</strong> — avatar URL from your OAuth provider
						</li>
						<li>
							<strong className="text-foreground">OAuth tokens</strong> — access and refresh tokens to maintain
							your authenticated session with the provider
						</li>
					</ul>

					<h3 className="text-base font-medium text-foreground mt-6 mb-2">2.2 Session & Security Data</h3>
					<p>When you sign in, we automatically collect:</p>
					<ul className="list-disc pl-6 mt-2 space-y-1">
						<li>
							<strong className="text-foreground">IP address</strong> — recorded at session creation for security
							purposes
						</li>
						<li>
							<strong className="text-foreground">User agent</strong> — your browser and device information
						</li>
						<li>
							<strong className="text-foreground">Session timestamps</strong> — when your session was created,
							last active, and when it expires
						</li>
					</ul>

					<h3 className="text-base font-medium text-foreground mt-6 mb-2">2.3 User-Generated Content</h3>
					<p>Data you create while using Sayr, including:</p>
					<ul className="list-disc pl-6 mt-2 space-y-1">
						<li>Tasks, comments, and comment edits</li>
						<li>Reactions, votes, and timeline activity</li>
						<li>Organizations, teams, and member roles</li>
						<li>Labels, categories, saved views, and releases</li>
						<li>Uploaded files and attachments</li>
						<li>API keys you generate</li>
					</ul>

					<h3 className="text-base font-medium text-foreground mt-6 mb-2">2.4 Usage & Analytics Data</h3>
					<p>
						We use <strong className="text-foreground">PostHog</strong> (EU instance, hosted in Frankfurt) to
						collect product analytics, including:
					</p>
					<ul className="list-disc pl-6 mt-2 space-y-1">
						<li>Page views and navigation events</li>
						<li>Click interactions and form submissions (autocapture)</li>
						<li>Web performance metrics (page load times, web vitals)</li>
						<li>Session recordings to understand how users interact with the interface</li>
						<li>Uncaught JavaScript exceptions</li>
					</ul>
					<p className="mt-2">
						PostHog identifies you by your Sayr user ID, email, and name to associate analytics with your account.
					</p>

					<h3 className="text-base font-medium text-foreground mt-6 mb-2">2.5 Logs & Observability Data</h3>
					<p>
						We use OpenTelemetry for application tracing and Axiom for log storage. Traces may include your user
						ID, platform role, and a masked version of your email address (e.g.,{" "}
						<code className="text-foreground bg-muted px-1 rounded">t***@g***.com</code>). Request URLs, HTTP
						methods, and user agent strings are also captured for debugging and performance monitoring.
					</p>

					<h3 className="text-base font-medium text-foreground mt-6 mb-2">2.6 Anonymous Voting Data</h3>
					<p>
						For public task voting by unauthenticated users, we generate a one-way SHA-256 hash of the voter's IP
						address, user agent, and a salt to prevent duplicate votes. The raw IP address is{" "}
						<strong className="text-foreground">not</strong> stored for anonymous votes.
					</p>
				</section>

				{/* 3. How We Use Your Data */}
				<section>
					<h2 className="text-xl font-semibold text-foreground mb-4">3. How We Use Your Data</h2>
					<p>We use your personal data to:</p>
					<ul className="list-disc pl-6 mt-2 space-y-1">
						<li>
							<strong className="text-foreground">Provide and operate the service</strong> — authenticate you,
							display your content, manage organizations and permissions
						</li>
						<li>
							<strong className="text-foreground">Send transactional communications</strong> — notifications,
							invitations, and account-related emails via Send (usesend.com)
						</li>
						<li>
							<strong className="text-foreground">Improve the product</strong> — analyse usage patterns, identify
							bugs, and optimise the user experience through PostHog analytics
						</li>
						<li>
							<strong className="text-foreground">Ensure security</strong> — detect abuse, prevent fraud, and
							protect against unauthorised access using session data and logs
						</li>
						<li>
							<strong className="text-foreground">Process payments</strong> — facilitate billing through Polar
							(our Merchant of Record)
						</li>
						<li>
							<strong className="text-foreground">Comply with legal obligations</strong> — respond to lawful
							requests and enforce our Terms of Service
						</li>
					</ul>
				</section>

				{/* 4. Legal Bases */}
				<section>
					<h2 className="text-xl font-semibold text-foreground mb-4">4. Legal Bases for Processing</h2>
					<p>Under GDPR, we rely on the following legal bases:</p>
					<div className="mt-4 overflow-x-auto rounded-lg border border-border">
						<table className="w-full text-sm text-left">
							<thead className="bg-muted/50 text-muted-foreground">
								<tr>
									<th className="px-4 py-3 font-medium">Purpose</th>
									<th className="px-4 py-3 font-medium">Legal Basis</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								<tr>
									<td className="px-4 py-3">Providing the service, managing your account</td>
									<td className="px-4 py-3">Contract performance</td>
								</tr>
								<tr>
									<td className="px-4 py-3">Product analytics, performance monitoring, security logs</td>
									<td className="px-4 py-3">Legitimate interest</td>
								</tr>
								<tr>
									<td className="px-4 py-3">Transactional emails</td>
									<td className="px-4 py-3">Contract performance</td>
								</tr>
								<tr>
									<td className="px-4 py-3">Payment processing</td>
									<td className="px-4 py-3">Contract performance</td>
								</tr>
								<tr>
									<td className="px-4 py-3">Legal compliance</td>
									<td className="px-4 py-3">Legal obligation</td>
								</tr>
							</tbody>
						</table>
					</div>
				</section>

				{/* 5. Cookies */}
				<section>
					<h2 className="text-xl font-semibold text-foreground mb-4">5. Cookies & Local Storage</h2>
					<p>Sayr uses the following cookies:</p>
					<div className="mt-4 overflow-x-auto rounded-lg border border-border">
						<table className="w-full text-sm text-left">
							<thead className="bg-muted/50 text-muted-foreground">
								<tr>
									<th className="px-4 py-3 font-medium">Cookie</th>
									<th className="px-4 py-3 font-medium">Purpose</th>
									<th className="px-4 py-3 font-medium">Duration</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								<tr>
									<td className="px-4 py-3 font-mono text-xs text-foreground">better-auth.session_token</td>
									<td className="px-4 py-3">Authentication — maintains your signed-in session</td>
									<td className="px-4 py-3 whitespace-nowrap">Session expiry</td>
								</tr>
								<tr>
									<td className="px-4 py-3 font-mono text-xs text-foreground">login_origin</td>
									<td className="px-4 py-3">
										Temporary — stores your origin URL during OAuth sign-in redirect
									</td>
									<td className="px-4 py-3 whitespace-nowrap">~8 minutes</td>
								</tr>
								<tr>
									<td className="px-4 py-3 font-mono text-xs text-foreground">post_login_redirect</td>
									<td className="px-4 py-3">Temporary — stores where to redirect you after sign-in</td>
									<td className="px-4 py-3 whitespace-nowrap">Session</td>
								</tr>
								<tr>
									<td className="px-4 py-3 font-mono text-xs text-foreground">sidebar_state</td>
									<td className="px-4 py-3">
										Preference — remembers whether your sidebar is open or collapsed
									</td>
									<td className="px-4 py-3 whitespace-nowrap">7 days</td>
								</tr>
								<tr>
									<td className="px-4 py-3 font-mono text-xs text-foreground">ph_*</td>
									<td className="px-4 py-3">
										Analytics — PostHog session tracking, distinct user ID, and feature flags
									</td>
									<td className="px-4 py-3 whitespace-nowrap">Varies</td>
								</tr>
							</tbody>
						</table>
					</div>
					<p className="mt-4">
						We also use <strong className="text-foreground">localStorage</strong> to store your theme preference
						(light/dark mode). This data remains on your device and is not transmitted to our servers.
					</p>
				</section>

				{/* 6. Data Sharing */}
				<section>
					<h2 className="text-xl font-semibold text-foreground mb-4">6. Data Sharing & Subprocessors</h2>
					<p>
						We do not sell your personal data. We share data only with third-party service providers
						("subprocessors") who process it on our behalf to deliver the Sayr platform. Each subprocessor is
						contractually obligated to protect your data.
					</p>
					<p className="mt-2">
						A full list of our current subprocessors is available on our{" "}
						<a href="/legal/subprocessors" className="text-foreground hover:underline">
							Subprocessors page
						</a>
						.
					</p>
					<p className="mt-2">
						We may also disclose your data if required to do so by law, or if we believe in good faith that such
						action is necessary to comply with legal process, protect our rights, or ensure the safety of our
						users.
					</p>
				</section>

				{/* 7. International Transfers */}
				<section>
					<h2 className="text-xl font-semibold text-foreground mb-4">7. International Data Transfers</h2>
					<p>
						Our primary infrastructure is hosted in the EU (Czechia) via Zerops, with object storage and internal
						tooling hosted in the EU (Germany, Finland) via Hetzner, and we use PostHog's EU instance (Frankfurt).
						However, some of our subprocessors are based in the United States, including Cloudflare, GitHub, Send,
						and Axiom.
					</p>
					<p className="mt-2">
						Where data is transferred outside the EEA, we ensure appropriate safeguards are in place, such as
						Standard Contractual Clauses (SCCs) or the EU-U.S. Data Privacy Framework, as applicable.
					</p>
				</section>

				{/* 8. Data Retention */}
				<section>
					<h2 className="text-xl font-semibold text-foreground mb-4">8. Data Retention</h2>
					<p>
						We retain your personal data for as long as your account is active and as needed to provide you with
						the service.
					</p>
					<ul className="list-disc pl-6 mt-2 space-y-1">
						<li>
							<strong className="text-foreground">Account data</strong> — retained while your account exists;
							deleted when you delete your account
						</li>
						<li>
							<strong className="text-foreground">Session data</strong> — retained until session expiry, then
							automatically removed
						</li>
						<li>
							<strong className="text-foreground">Analytics data</strong> — retained in PostHog according to
							their standard retention policies
						</li>
						<li>
							<strong className="text-foreground">Logs</strong> — retained in Axiom according to their standard
							retention policies
						</li>
						<li>
							<strong className="text-foreground">User-generated content</strong> — retained while your account
							exists; deleted upon account deletion
						</li>
					</ul>
					<p className="mt-2">
						When you delete your account, we delete your personal data promptly. Some data may persist in
						encrypted backups for a limited period before being overwritten.
					</p>
				</section>

				{/* 9. Your Rights */}
				<section>
					<h2 className="text-xl font-semibold text-foreground mb-4">9. Your Rights</h2>
					<p>Under GDPR and applicable Irish and EU data protection law, you have the following rights:</p>
					<ul className="list-disc pl-6 mt-2 space-y-1">
						<li>
							<strong className="text-foreground">Access</strong> — request a copy of the personal data we hold
							about you
						</li>
						<li>
							<strong className="text-foreground">Rectification</strong> — request correction of inaccurate or
							incomplete data
						</li>
						<li>
							<strong className="text-foreground">Erasure</strong> — request deletion of your personal data
							("right to be forgotten")
						</li>
						<li>
							<strong className="text-foreground">Data portability</strong> — request your data in a structured,
							machine-readable format
						</li>
						<li>
							<strong className="text-foreground">Restriction</strong> — request that we restrict processing of
							your data in certain circumstances
						</li>
						<li>
							<strong className="text-foreground">Objection</strong> — object to processing based on legitimate
							interests
						</li>
						<li>
							<strong className="text-foreground">Withdraw consent</strong> — where processing is based on
							consent, you may withdraw it at any time
						</li>
					</ul>
					<p className="mt-4">
						To exercise any of these rights, contact us at{" "}
						<a href="mailto:support@sayr.io" className="text-foreground hover:underline">
							support@sayr.io
						</a>
						. We will respond within 30 days.
					</p>
					<p className="mt-2">
						You also have the right to lodge a complaint with the Irish Data Protection Commission (DPC) at{" "}
						<a
							href="https://www.dataprotection.ie"
							target="_blank"
							rel="noopener noreferrer"
							className="text-foreground hover:underline"
						>
							www.dataprotection.ie
						</a>
						.
					</p>
				</section>

				{/* 10. Children */}
				<section>
					<h2 className="text-xl font-semibold text-foreground mb-4">10. Children</h2>
					<p>
						Sayr is a business-to-business product and is not directed at individuals under the age of 16. We do
						not knowingly collect personal data from anyone under 16. If we become aware that we have collected
						data from a child under 16, we will delete it promptly.
					</p>
				</section>

				{/* 11. Security */}
				<section>
					<h2 className="text-xl font-semibold text-foreground mb-4">11. Security</h2>
					<p>
						We implement appropriate technical and organisational measures to protect your personal data,
						including:
					</p>
					<ul className="list-disc pl-6 mt-2 space-y-1">
						<li>Encrypted connections (HTTPS/TLS) for all data in transit</li>
						<li>OAuth-based authentication (no passwords stored by default)</li>
						<li>HttpOnly, Secure session cookies in production</li>
						<li>Email masking in observability traces</li>
						<li>Hashed anonymous vote identifiers (raw IPs not stored)</li>
						<li>Role-based access controls and permission checks</li>
					</ul>
					<p className="mt-2">
						No system is perfectly secure. If you discover a security vulnerability, please report it to{" "}
						<a href="mailto:support@sayr.io" className="text-foreground hover:underline">
							support@sayr.io
						</a>
						.
					</p>
				</section>

				{/* 12. Changes */}
				<section>
					<h2 className="text-xl font-semibold text-foreground mb-4">12. Changes to This Policy</h2>
					<p>
						We may update this Privacy Policy from time to time. When we make material changes, we will update the
						"Last updated" date at the top of this page. We encourage you to review this policy periodically.
					</p>
				</section>

				{/* 13. Contact */}
				<section>
					<h2 className="text-xl font-semibold text-foreground mb-4">13. Contact Us</h2>
					<div className="rounded-lg border border-border bg-muted/30 p-6">
						<p>
							<strong className="text-foreground">Doras Media Limited</strong>
							<br />
							First Floor Penrose 2<br />
							Penrose Dock
							<br />
							Cork T23 YY09
							<br />
							Ireland
						</p>
						<p className="mt-2">
							Email:{" "}
							<a href="mailto:support@sayr.io" className="text-foreground hover:underline">
								support@sayr.io
							</a>
						</p>
						<p className="mt-4">
							See also:{" "}
							<a href="/legal/subprocessors" className="text-foreground hover:underline">
								Subprocessors
							</a>
							{" | "}
							<a href="/legal/terms" className="text-foreground hover:underline">
								Terms of Service
							</a>
						</p>
					</div>
				</section>
			</div>
		</div>
	);
}
