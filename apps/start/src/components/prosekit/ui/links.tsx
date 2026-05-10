/** biome-ignore-all lint/a11y/useAnchorContent: required for custom link rendering */

import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@repo/ui/components/hover-card";
import { Button } from "@repo/ui/components/button";
import { Preview } from "@repo/ui/components/doras-ui/preview";
import { normalizeUrl } from "@repo/ui/lib/utils";
import {
  IconExternalLink,
  IconCheck,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";
import type { ReactMarkViewProps } from "prosekit/react";
import { TextSelection } from "prosekit/pm/state";
import { useState } from "react";
import { Separator } from "@repo/ui/components/separator";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@repo/ui/components/input-group";

type Mode = "view" | "edit";

export default function Link(props: ReactMarkViewProps) {
  const href = props.mark.attrs.href as string;
  const isEditable = props.view.editable;
  const normalizedHref = normalizeUrl(href);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("view");

  const findLinkRange = (): { from: number; to: number } | null => {
    const { doc } = props.view.state;
    let result: { from: number; to: number } | null = null;

    doc.nodesBetween(0, doc.content.size, (node, pos) => {
      if (result) return false;
      for (const mark of node.marks) {
        if (mark.type.name === "link" && mark.attrs.href === href) {
          result = { from: pos, to: pos + node.nodeSize };
          return false;
        }
      }
      return true;
    });

    return result;
  };

  const handleEdit = () => {
    setMode("edit");
  };

  const handleSave = (newHref?: string) => {
    props.view.focus();
    const range = findLinkRange();
    if (range) {
      const { tr } = props.view.state;
      const $from = tr.doc.resolve(range.from);
      const $to = tr.doc.resolve(range.to);
      const sel = TextSelection.between($from, $to);
      tr.setSelection(sel);
      props.view.dispatch(tr);
    }
    if (newHref) {
      const { tr, schema } = props.view.state;
      const linkType = schema.marks.link;
      if (linkType && range) {
        const { doc } = props.view.state;
        const $from = doc.resolve(range.from);
        const $to = doc.resolve(range.to);
        const sel = TextSelection.between($from, $to);
        tr.setSelection(sel);
        tr.addMark(range.from, range.to, linkType.create({ href: newHref }));
        props.view.dispatch(tr);
      }
    } else if (range) {
      const { tr, schema } = props.view.state;
      const linkType = schema.marks.link;
      if (linkType) {
        tr.removeMark(range.from, range.to, linkType);
        props.view.dispatch(tr);
      }
    }
    setMode("view");
    setOpen(false);
  };

  const handleRemove = () => {
    props.view.focus();
    const range = findLinkRange();
    if (range) {
      const { tr, schema } = props.view.state;
      const linkType = schema.marks.link;
      if (linkType) {
        tr.removeMark(range.from, range.to, linkType);
        props.view.dispatch(tr);
      }
    }
    setOpen(false);
  };

  const content = (
    <a
      href={normalizedHref}
      className="text-primary hover:underline"
      ref={props.contentRef}
    />
  );

  if (!isEditable) {
    return (
      <Preview url={href} className=" pointer-events-auto!">
        {content}
      </Preview>
    );
  }

  return (
    <HoverCard
      openDelay={0}
      closeDelay={100}
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setMode("view");
      }}
    >
      <HoverCardTrigger asChild>
        <span className="cursor-pointer">{content}</span>
      </HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="start"
        className="w-auto p-1 flex items-center gap-1 rounded-xl"
      >
        {mode === "view" ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1"
              onClick={() => window.open(normalizedHref, "_blank", "noopener")}
              title="Open link"
            >
              <IconExternalLink className="size-3.5" />
              <span className="text-xs">Open</span>
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8"
              onClick={handleEdit}
              title="Edit link"
            >
              <IconPencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8"
              onClick={handleRemove}
              title="Remove link"
            >
              <IconTrash className="size-3.5" />
            </Button>
          </>
        ) : (
          <form
            className="min-w-64"
            onSubmit={(event) => {
              event.preventDefault();
              const target = event.target as HTMLFormElement | null;
              const value = target?.querySelector("input")?.value?.trim();
              handleSave(value || undefined);
            }}
          >
            <InputGroup className="rounded-lg text-foreground w-full">
              <InputGroupInput
                defaultValue={normalizedHref}
                placeholder="Paste the link..."
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  aria-label="Save link"
                  title="Save link"
                  size="icon-xs"
                  type="submit"
                >
                  <IconCheck className="size-4" />
                </InputGroupButton>
                <InputGroupButton
                  aria-label="Remove link"
                  title="Remove link"
                  size="icon-xs"
                  type="button"
                  onClick={() => handleSave()}
                >
                  <IconTrash className="size-4" />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </form>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
