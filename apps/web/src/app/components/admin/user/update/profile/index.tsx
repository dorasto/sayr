"use client";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { Separator } from "@repo/ui/components/separator";
import LabelledInput from "@repo/ui/components/tomui/labeled-input";
import OptionField from "@repo/ui/components/tomui/option-field";
import { useLayoutData } from "@/app/admin/Context";
import { ThemeToggle } from "@/app/components/theme-toggle";

export default function ProfileUpdate() {
	const { account } = useLayoutData();

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-6">
				<div>
					<Label variant={"heading"}>Account settings</Label>
				</div>
				<div className="flex w-full gap-3">
					<div>img</div>
					{/* copy/pasted from organization one */}
					{/* <LogoUpload
                    currentImage={currentLogoImage}
                    openFileDialog={handleLogoUpload}
                    removeFile={removeLogoFile}
                    files={logoFiles}
                    /> */}
					<LabelledInput id="display-name" value={account.name} label="Display name" className="w-full" />
				</div>
				<OptionField title="Email" description={account.email} buttonText="Update email" />
			</div>
			<div className="flex flex-col gap-6">
				<div>
					<Label variant={"heading"}>Preferences</Label>
				</div>
				<OptionField title="Theme" description="Choose your colour settings" customSide={<ThemeToggle full />} />
			</div>
		</div>
	);
}
