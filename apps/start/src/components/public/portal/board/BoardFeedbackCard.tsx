import { Button } from "@repo/ui/components/button";
import {
  Tile,
  TileAction,
  TileDescription,
  TileHeader,
  TileIcon,
  TileTitle,
} from "@repo/ui/components/doras-ui/tile";
import { IconMessageCircle, IconPlus } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { usePublicPostAbility } from "../../public-task-creator";
import { BoardControls, type BoardToolbarProps } from "./BoardControls";
import { newPostLink } from "./new-post-path";

interface BoardFeedbackCardProps {
  toolbar: BoardToolbarProps;
}

/**
 * The card above the Feedback posts: a short invitation with the "Write a post" button (hidden when the viewer can not
 * post), then the tabs, sort and filter menus (`BoardControls`) under a divider.
 */
export function BoardFeedbackCard({ toolbar }: BoardFeedbackCardProps) {
  const { organization } = usePublicOrganizationLayout();
  const { canPost } = usePublicPostAbility();

  return (
    <Tile className="mb-3 w-full flex-col items-stretch gap-0 p-0 md:w-full">
      <div className="flex items-center gap-4 p-3 max-md:flex-col max-md:items-stretch">
        <TileHeader className="flex-1 items-start">
          <TileIcon>
            <IconMessageCircle />
          </TileIcon>
          <TileTitle className="text-sm">Share your feedback</TileTitle>
          {organization.description.trim() && (
            <TileDescription className="text-xs">
              {organization.description}
            </TileDescription>
          )}
        </TileHeader>
        {canPost && (
          <TileAction>
            <Button
              render={<Link {...newPostLink(organization.slug)} />}
              nativeButton={false}
              size="sm"
              className="max-md:w-full"
              variant={"primary"}
            >
              <IconPlus aria-hidden />
              Write a post
            </Button>
          </TileAction>
        )}
      </div>
      <div className="border-t">
        <BoardControls toolbar={toolbar} />
      </div>
    </Tile>
  );
}
