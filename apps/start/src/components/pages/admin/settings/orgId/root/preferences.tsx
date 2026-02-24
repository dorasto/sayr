import {
  Tile,
  TileHeader,
  TileTitle,
  TileAction,
  TileDescription,
} from "@repo/ui/components/doras-ui/tile";
import { Label } from "@repo/ui/components/label";
import { Switch } from "@repo/ui/components/switch";
import { Toggle } from "@repo/ui/components/toggle";

export default function Preferences() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3" title="Public Pages">
        <Label variant={"subheading"}>General configuration</Label>
        <div className="bg-card rounded-lg flex flex-col">
          <Tile className="md:w-full" variant={"transparent"}>
            <TileHeader className="md:w-full">
              <TileTitle className="text-sm">
                Allow actions on closed tasks
              </TileTitle>
              <TileDescription className="text-xs leading-normal!">
                When disabled, users without privileges will not be able to
                comment on or modify closed tasks.
              </TileDescription>
            </TileHeader>
            <TileAction>
              <Switch defaultChecked />
            </TileAction>
          </Tile>
        </div>
      </div>
      <div className="flex flex-col gap-3" title="Public Pages">
        <Label variant={"subheading"}>Public page settings</Label>
        <div className="bg-card rounded-lg flex flex-col">
          <Tile className="md:w-full" variant={"transparent"}>
            <TileHeader className="md:w-full">
              <TileTitle className="text-sm">Enable public page</TileTitle>
              <TileDescription className="text-xs leading-normal!">
                Toggles your organizations public page. No external users will
                be able to find your tasks or contribute.
              </TileDescription>
            </TileHeader>
            <TileAction>
              <Switch defaultChecked />
            </TileAction>
          </Tile>
          <Tile className="md:w-full" variant={"transparent"}>
            <TileHeader className="md:w-full">
              <TileTitle className="text-sm">Public actions</TileTitle>
              <TileDescription className="text-xs leading-normal!">
                Allow external users to comment on & create tasks. Enables users
                to create feature requests, bug reports, etc. Voting remains
                open.
              </TileDescription>
            </TileHeader>
            <TileAction>
              <Switch defaultChecked />
            </TileAction>
          </Tile>
          <Tile className="md:w-full" variant={"transparent"}>
            <TileHeader className="md:w-full">
              <TileTitle className="text-sm">Blocked users</TileTitle>
              <TileDescription className="text-xs leading-normal!">
                Block users from interacting with your organization or its
                tasks.
              </TileDescription>
            </TileHeader>
            <TileAction>
              Will contain a sheet with a list of blocked users and options to
              add or remove users from the listz.
            </TileAction>
          </Tile>
        </div>
      </div>
    </div>
  );
}
