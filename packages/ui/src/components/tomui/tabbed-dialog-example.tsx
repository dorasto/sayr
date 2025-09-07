"use client";

import { Bell, Globe, Palette, Settings, Shield, User } from "lucide-react";
import { useState } from "react";
import { Button } from "../button";
import { TabbedDialog, TabbedDialogFooter, TabPanel } from "./tabbed-dialog";

export function TabbedDialogExample() {
	const [isTopOpen, setIsTopOpen] = useState(false);
	const [isSideOpen, setIsSideOpen] = useState(false);

	// Example tabs for top layout
	const topTabs = [
		{
			id: "general",
			label: "General",
			icon: <Settings className="w-4 h-4" />,
			footer: (
				<TabbedDialogFooter
					onCancel={() => setIsTopOpen(false)}
					onSubmit={() => {
						console.log("Saving general settings...");
						setIsTopOpen(false);
					}}
					submitLabel="Save General"
				/>
			),
		},
		{
			id: "profile",
			label: "Profile",
			icon: <User className="w-4 h-4" />,
			footer: (
				<TabbedDialogFooter
					onCancel={() => setIsTopOpen(false)}
					onSubmit={() => {
						console.log("Saving profile...");
						setIsTopOpen(false);
					}}
					submitLabel="Update Profiless"
					successVariant="default"
				/>
			),
		},
		{
			id: "notifications",
			label: "Notifications",
			icon: <Bell className="w-4 h-4" />,
			// No footer for this tab
		},
		{
			id: "security",
			label: "Security",
			icon: <Shield className="w-4 h-4" />,
			footer: (
				<TabbedDialogFooter
					onCancel={() => setIsTopOpen(false)}
					onSubmit={() => {
						console.log("Saving security settings...");
						setIsTopOpen(false);
					}}
					submitLabel="Apply Security Settings"
					successVariant="destructive"
				/>
			),
		},
	];

	// Example using the new hierarchical structure (recommended)
	const sideGroupedTabs = [
		{
			name: "Account",
			items: [
				{
					id: "profile",
					label: "Profile",
					icon: <User className="w-4 h-4" />,
					title: "Profile Settings",
					description: "Update your personal information and preferences",
				},
				{
					id: "security",
					label: "Security",
					icon: <Shield className="w-4 h-4" />,
					title: "Security & Privacy",
					description: "Manage your account security and authentication settings",
				},
			],
		},
		{
			name: "Preferences",
			items: [
				{
					id: "notifications",
					label: "Notifications",
					icon: <Bell className="w-4 h-4" />,
					title: "Notification Settings",
					// description: "Choose how and when you want to be notified",
				},
				{
					id: "appearance",
					label: "Appearance",
					icon: <Palette className="w-4 h-4" />,
					title: "Appearance & Theme",
					description: "Customize the look and feel of your interface",
				},
				{
					id: "language",
					label: "Language & Region settings and sorts",
					icon: <Globe className="w-4 h-4" />,
					title: "Language & Regional Settings",
					description: "Set your language, timezone, and regional preferences",
					footer: (
						<TabbedDialogFooter
							onCancel={() => setIsTopOpen(false)}
							onSubmit={() => {
								console.log("Saving security settings...");
								setIsTopOpen(false);
							}}
							submitLabel="Apply Security Settings"
							successVariant="destructive"
						/>
					),
				},
			],
		},
	];

	return (
		<div className="space-y-4">
			<Button onClick={() => setIsTopOpen(true)}>Open Top Tabs Dialog</Button>

			<Button onClick={() => setIsSideOpen(true)}>Open Side Tabs Dialog (New Structure)</Button>

			{/* Top Layout Dialog */}
			<TabbedDialog
				isOpen={isTopOpen}
				onOpenChange={setIsTopOpen}
				title="Settings"
				description="Manage your account settings and preferences"
				tabs={topTabs}
				defaultTab="general"
				layout="top"
				size="lg"
			>
				<TabPanel tabId="general">
					<div className="space-y-4">
						<div>
							<label htmlFor="language" className="block text-sm font-medium mb-2">
								Language
							</label>
							<select id="language" className="w-full px-3 py-2 border border-border rounded-md bg-background">
								<option value="en">English</option>
								<option value="es">Español</option>
								<option value="fr">Français</option>
								<option value="de">Deutsch</option>
							</select>
						</div>
						<div>
							<label htmlFor="language" className="block text-sm font-medium mb-2">
								Language
							</label>
							<select id="language" className="w-full px-3 py-2 border border-border rounded-md bg-background">
								<option value="en">English</option>
								<option value="es">Español</option>
								<option value="fr">Français</option>
								<option value="de">Deutsch</option>
							</select>
						</div>
						<div>
							<label htmlFor="language" className="block text-sm font-medium mb-2">
								Language
							</label>
							<select id="language" className="w-full px-3 py-2 border border-border rounded-md bg-background">
								<option value="en">English</option>
								<option value="es">Español</option>
								<option value="fr">Français</option>
								<option value="de">Deutsch</option>
							</select>
						</div>
						<div>
							<label htmlFor="language" className="block text-sm font-medium mb-2">
								Language
							</label>
							<select id="language" className="w-full px-3 py-2 border border-border rounded-md bg-background">
								<option value="en">English</option>
								<option value="es">Español</option>
								<option value="fr">Français</option>
								<option value="de">Deutsch</option>
							</select>
						</div>
						<div>
							<label htmlFor="language" className="block text-sm font-medium mb-2">
								Language
							</label>
							<select id="language" className="w-full px-3 py-2 border border-border rounded-md bg-background">
								<option value="en">English</option>
								<option value="es">Español</option>
								<option value="fr">Français</option>
								<option value="de">Deutsch</option>
							</select>
						</div>
						<div>
							<label htmlFor="language" className="block text-sm font-medium mb-2">
								Language
							</label>
							<select id="language" className="w-full px-3 py-2 border border-border rounded-md bg-background">
								<option value="en">English</option>
								<option value="es">Español</option>
								<option value="fr">Français</option>
								<option value="de">Deutsch</option>
							</select>
						</div>
						<div>
							<label htmlFor="timezone" className="block text-sm font-medium mb-2">
								Timezone
							</label>
							<select id="timezone" className="w-full px-3 py-2 border border-border rounded-md bg-background">
								<option value="UTC">UTC</option>
								<option value="America/New_York">Eastern Time</option>
								<option value="America/Los_Angeles">Pacific Time</option>
								<option value="Europe/London">London</option>
							</select>
						</div>
						<div>
							<label htmlFor="dateFormat" className="block text-sm font-medium mb-2">
								Date Format
							</label>
							<select id="dateFormat" className="w-full px-3 py-2 border border-border rounded-md bg-background">
								<option value="MM/DD/YYYY">MM/DD/YYYY</option>
								<option value="DD/MM/YYYY">DD/MM/YYYY</option>
								<option value="YYYY-MM-DD">YYYY-MM-DD</option>
							</select>
						</div>
					</div>
				</TabPanel>

				<TabPanel tabId="profile">
					<h3 className="text-lg font-semibold">Profile</h3>
					<p className="text-muted-foreground">Manage your profile information.</p>
				</TabPanel>

				<TabPanel tabId="notifications">
					<h3 className="text-lg font-semibold">Notifications</h3>
					<p className="text-muted-foreground">Configure your notification preferences.</p>
				</TabPanel>

				<TabPanel tabId="security">
					<h3 className="text-lg font-semibold">Security</h3>
					<p className="text-muted-foreground">Manage your security settings.</p>
				</TabPanel>
			</TabbedDialog>

			{/* Side Layout Dialog - New Hierarchical Structure */}
			<TabbedDialog
				isOpen={isSideOpen}
				onOpenChange={setIsSideOpen}
				title="Preferences"
				// description="Customize how your workspace looks and behaves"
				groupedTabs={sideGroupedTabs}
				defaultTab="profile"
				layout="side"
				size="lg"
			>
				<TabPanel tabId="profile" className="flex flex-col gap-3">
					<div className="space-y-4">
						<div>
							<label htmlFor="displayName" className="block text-sm font-medium mb-2">
								Display Name
							</label>
							<input
								id="displayName"
								type="text"
								className="w-full px-3 py-2 border border-border rounded-md bg-background"
								placeholder="Enter your display name"
							/>
						</div>
						<div>
							<label htmlFor="email" className="block text-sm font-medium mb-2">
								Email
							</label>
							<input
								id="email"
								type="email"
								className="w-full px-3 py-2 border border-border rounded-md bg-background"
								placeholder="Enter your email"
							/>
						</div>
						<div>
							<label htmlFor="bio" className="block text-sm font-medium mb-2">
								Bio
							</label>
							<textarea
								id="bio"
								className="w-full px-3 py-2 border border-border rounded-md bg-background"
								placeholder="Tell us about yourself"
								rows={3}
							/>
						</div>
					</div>
				</TabPanel>

				<TabPanel tabId="security">
					<div className="space-y-4">
						<div>
							<h4 className="text-sm font-semibold mb-2">Password</h4>
							<Button variant="outline" size="sm">
								Change Password
							</Button>
						</div>
						<div>
							<h4 className="text-sm font-semibold mb-2">Two-Factor Authentication</h4>
							<p className="text-sm text-muted-foreground mb-2">
								Add an extra layer of security to your account.
							</p>
							<Button variant="outline" size="sm">
								Enable 2FA
							</Button>
						</div>
						<div>
							<h4 className="text-sm font-semibold mb-2">Active Sessions</h4>
							<p className="text-sm text-muted-foreground">Manage your active login sessions.</p>
						</div>
					</div>
				</TabPanel>

				<TabPanel tabId="notifications">
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<h4 className="text-sm font-semibold">Email Notifications</h4>
								<p className="text-xs text-muted-foreground">Receive notifications via email</p>
							</div>
							<input type="checkbox" className="w-4 h-4" defaultChecked />
						</div>
						<div className="flex items-center justify-between">
							<div>
								<h4 className="text-sm font-semibold">Push Notifications</h4>
								<p className="text-xs text-muted-foreground">Receive push notifications in your browser</p>
							</div>
							<input type="checkbox" className="w-4 h-4" />
						</div>
						<div className="flex items-center justify-between">
							<div>
								<h4 className="text-sm font-semibold">Marketing Emails</h4>
								<p className="text-xs text-muted-foreground">Receive updates about new features</p>
							</div>
							<input type="checkbox" className="w-4 h-4" />
						</div>
					</div>
				</TabPanel>

				<TabPanel tabId="appearance">
					<div className="space-y-4">
						<div>
							<h4 className="text-sm font-semibold mb-2">Theme</h4>
							<div className="space-y-2">
								<label className="flex items-center space-x-2">
									<input type="radio" name="theme" value="light" defaultChecked />
									<span className="text-sm">Light</span>
								</label>
								<label className="flex items-center space-x-2">
									<input type="radio" name="theme" value="dark" />
									<span className="text-sm">Dark</span>
								</label>
								<label className="flex items-center space-x-2">
									<input type="radio" name="theme" value="system" />
									<span className="text-sm">System</span>
								</label>
							</div>
						</div>
						<div>
							<h4 className="text-sm font-semibold mb-2">Interface Scale</h4>
							<input type="range" min="0.8" max="1.2" step="0.1" defaultValue="1" className="w-full" />
						</div>
					</div>
				</TabPanel>

				<TabPanel tabId="language">
					<div className="space-y-4">
						<div>
							<label htmlFor="language" className="block text-sm font-medium mb-2">
								Language
							</label>
							<select id="language" className="w-full px-3 py-2 border border-border rounded-md bg-background">
								<option value="en">English</option>
								<option value="es">Español</option>
								<option value="fr">Français</option>
								<option value="de">Deutsch</option>
							</select>
						</div>
						<div>
							<label htmlFor="language" className="block text-sm font-medium mb-2">
								Language
							</label>
							<select id="language" className="w-full px-3 py-2 border border-border rounded-md bg-background">
								<option value="en">English</option>
								<option value="es">Español</option>
								<option value="fr">Français</option>
								<option value="de">Deutsch</option>
							</select>
						</div>
						<div>
							<label htmlFor="language" className="block text-sm font-medium mb-2">
								Language
							</label>
							<select id="language" className="w-full px-3 py-2 border border-border rounded-md bg-background">
								<option value="en">English</option>
								<option value="es">Español</option>
								<option value="fr">Français</option>
								<option value="de">Deutsch</option>
							</select>
						</div>
						<div>
							<label htmlFor="language" className="block text-sm font-medium mb-2">
								Language
							</label>
							<select id="language" className="w-full px-3 py-2 border border-border rounded-md bg-background">
								<option value="en">English</option>
								<option value="es">Español</option>
								<option value="fr">Français</option>
								<option value="de">Deutsch</option>
							</select>
						</div>
						<div>
							<label htmlFor="language" className="block text-sm font-medium mb-2">
								Language
							</label>
							<select id="language" className="w-full px-3 py-2 border border-border rounded-md bg-background">
								<option value="en">English</option>
								<option value="es">Español</option>
								<option value="fr">Français</option>
								<option value="de">Deutsch</option>
							</select>
						</div>
						<div>
							<label htmlFor="language" className="block text-sm font-medium mb-2">
								Language
							</label>
							<select id="language" className="w-full px-3 py-2 border border-border rounded-md bg-background">
								<option value="en">English</option>
								<option value="es">Español</option>
								<option value="fr">Français</option>
								<option value="de">Deutsch</option>
							</select>
						</div>
						<div>
							<label htmlFor="timezone" className="block text-sm font-medium mb-2">
								Timezone
							</label>
							<select id="timezone" className="w-full px-3 py-2 border border-border rounded-md bg-background">
								<option value="UTC">UTC</option>
								<option value="America/New_York">Eastern Time</option>
								<option value="America/Los_Angeles">Pacific Time</option>
								<option value="Europe/London">London</option>
							</select>
						</div>
						<div>
							<label htmlFor="dateFormat" className="block text-sm font-medium mb-2">
								Date Format
							</label>
							<select id="dateFormat" className="w-full px-3 py-2 border border-border rounded-md bg-background">
								<option value="MM/DD/YYYY">MM/DD/YYYY</option>
								<option value="DD/MM/YYYY">DD/MM/YYYY</option>
								<option value="YYYY-MM-DD">YYYY-MM-DD</option>
							</select>
						</div>
					</div>
				</TabPanel>
			</TabbedDialog>
		</div>
	);
}
