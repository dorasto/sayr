import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import PublicTaskSide from "./side";
import { PublicTaskView } from "./task-view";

export default function PublicOrgHomePage() {
  const { organization } = usePublicOrganizationLayout();
  return (
    <div className="flex flex-col gap-6 relative">
      <div className="relative rounded-2xl overflow-hidden bg-card border">
        <div className="aspect-21/9 w-full bg-muted/30">
          {organization.bannerImg && (
            <img
              width={1260}
              height={540}
              className="w-full h-full object-cover"
              src={organization.bannerImg}
              alt={organization.name}
            />
          )}
        </div>
        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-background/95 to-transparent p-6 pt-24">
          <div className="flex items-end gap-4">
            {organization.logo ? (
              <img
                height={80}
                width={80}
                className="rounded-xl border shadow-sm bg-background"
                src={organization.logo}
                alt={organization.name}
              />
            ) : (
              <div className="h-20 w-20 rounded-xl border shadow-sm bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground uppercase">
                {organization.name.substring(0, 2)}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold">{organization.name}</h1>
              <p className="text-muted-foreground font-medium max-w-prose line-clamp-2">
                {organization.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 sticky top-0">
          <PublicTaskSide />
        </div>
        <div className="md:col-span-3">
          <PublicTaskView />
        </div>
      </div>
    </div>
  );
}
