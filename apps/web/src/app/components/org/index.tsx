"use client";
import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import Image from "next/image";
import useWebSocketPublic from "@/app/lib/wsPublic";

type Props = {
	_organization: schema.organizationType;
};

export default function PublicOrgHomePage({ _organization }: Props) {
	const { value: organization, setValue: setOrganization } = useStateManagement("organization", _organization);
	useWebSocketPublic({ organization, setOrganization });
	return (
		<div className="">
			<div className="relative rounded-2xl overflow-hidden">
				<div className="aspect-[21/9] w-full">
					<Image width={1260} height={540} src={organization.bannerImg || ""} alt={organization.name} />
				</div>
				<div className="absolute bottom-0 left-0 transform flex items-center gap-3 bg-background/50 backdrop-blur p-3 rounded-tr-xl rounded-bl-2xl">
					<Image
						height={100}
						width={100}
						className="rounded-xl"
						src={organization.logo || ""}
						alt={organization.name}
					/>
					<div>
						<h1>{organization.name}</h1>
						<span className="font-semibold max-w-prose line-clamp-2">{organization.description}</span>
					</div>
				</div>
			</div>
		</div>
	);
}
