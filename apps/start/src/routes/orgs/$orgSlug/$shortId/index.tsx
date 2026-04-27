import { PublicTaskContent } from "@/components/public/public-task-content";
import {
  getOrganizationPublic,
  getTaskByShortId,
  getTaskComments,
  getCommentReplies,
  getRelease,
} from "@repo/database";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getOgImageUrl, seo } from "@/seo";
import {
  IconArrowLeft,
  IconLayoutSidebarRight,
  IconLayoutSidebarRightFilled,
} from "@tabler/icons-react";
import { useState } from "react";
import type { NodeJSON } from "prosekit/core";
import { extractTextContent } from "@/lib/util";
import { prosekitHtmlFromJSON } from "@/lib/prosekit-ssr";
import { LLMOContent, type LLMOComment } from "@/components/llmo/LLMOContent";

interface LLMOCommentWithReplies extends LLMOComment {
  text: string;
  replies: LLMOCommentWithReplies[];
}

const fetchPublicTask = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string; shortId: number }) => data)
  .handler(async ({ data }) => {
    const organization = await getOrganizationPublic(data.slug);
    if (!organization)
      return {
        task: null,
        release: null,
        org: null,
        descriptionHtml: "",
        descriptionText: "",
        commentsHtml: [],
        commentsText: [],
      };
    const task = await getTaskByShortId(
      organization.id,
      data.shortId,
      "public",
    );

    if (!task) {
      return {
        task: null,
        release: null,
        org: { name: organization.name, logo: organization.logo },
        descriptionHtml: "",
        descriptionText: "",
        commentsHtml: [],
        commentsText: [],
      };
    }

    // Server-render ProseKit HTML for AI extractors (sr-only div)
    const descriptionHtml = prosekitHtmlFromJSON(
      task.description as NodeJSON | null | undefined,
    );
    // Plain text for JSON-LD (search engines expect plain text in structured data)
    const descriptionText = extractTextContent(
      task.description as NodeJSON | null | undefined,
    );

    // Fetch public top-level comments (ordered oldest first for natural conversation flow)
    const commentsResult = await getTaskComments(organization.id, task.id, {
      limit: 50,
    });
    const commentsRaw = commentsResult
      ? commentsResult.comments
        .filter((c) => c.visibility === "public")
        .sort(
          (a, b) =>
            (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0),
        )
      : [];

    // Fetch replies for each comment and build nested structure
    const commentsWithReplies: LLMOCommentWithReplies[] = [];
    const commentsTextFlat: {
      author: string;
      text: string;
      createdAt: Date | null;
    }[] = [];

    for (const c of commentsRaw) {
      const commentHtml = prosekitHtmlFromJSON(
        c.content as NodeJSON | null | undefined,
      );
      const commentText = extractTextContent(
        c.content as NodeJSON | null | undefined,
      );

      if (commentHtml.length > 0 || commentText.length > 0) {
        // Fetch replies for this comment
        const repliesResult = await getCommentReplies(
          organization.id,
          c.id,
          { limit: 50 },
        );
        const repliesRaw = repliesResult
          ? repliesResult.replies
            .filter((r) => r.visibility === "public")
            .sort(
              (a, b) =>
                (a.createdAt?.getTime() ?? 0) -
                (b.createdAt?.getTime() ?? 0),
            )
          : [];

        const replies: LLMOCommentWithReplies[] = [];
        for (const r of repliesRaw) {
          const replyHtml = prosekitHtmlFromJSON(
            r.content as NodeJSON | null | undefined,
          );
          const replyText = extractTextContent(
            r.content as NodeJSON | null | undefined,
          );
          if (replyHtml.length > 0 || replyText.length > 0) {
            replies.push({
              author:
                r.createdBy?.displayName ?? r.createdBy?.name ?? "Unknown",
              html: replyHtml,
              text: replyText,
              createdAt: r.createdAt?.toISOString(),
              replies: [],
            });
            commentsTextFlat.push({
              author: `  ↳ ${r.createdBy?.displayName ?? r.createdBy?.name ?? "Unknown"}`,
              text: replyText,
              createdAt: r.createdAt,
            });
          }
        }

        commentsWithReplies.push({
          author: c.createdBy?.displayName ?? c.createdBy?.name ?? "Unknown",
          html: commentHtml,
          text: commentText,
          createdAt: c.createdAt?.toISOString(),
          replies,
        });
        commentsTextFlat.push({
          author: c.createdBy?.displayName ?? c.createdBy?.name ?? "Unknown",
          text: commentText,
          createdAt: c.createdAt,
        });
      }
    }

    const release = task.releaseId ? await getRelease(task.releaseId) : null;

    return {
      task,
      release,
      org: { name: organization.name, logo: organization.logo },
      descriptionHtml,
      descriptionText,
      commentsHtml: commentsWithReplies,
      commentsText: commentsTextFlat,
    };
  });

export const Route = createFileRoute("/orgs/$orgSlug/$shortId/")({
  loader: async ({ params, context }) => {
    const slug = context?.systemSlug || params.orgSlug;
    if (Number.isNaN(Number(params.shortId))) {
      throw redirect({
        to: "/orgs/$orgSlug",
        params: { orgSlug: slug },
      });
    }
    return await fetchPublicTask({
      data: {
        slug: slug,
        shortId: Number(params.shortId),
      },
    });
  },
  component: RouteComponent,
  head: ({ loaderData }) => {
    const task = loaderData?.task;
    const org = loaderData?.org;
    const descriptionText = loaderData?.descriptionText ?? "";
    const commentsText = loaderData?.commentsText ?? [];

    const ogDescription = task
      ? descriptionText.trim().slice(0, 160) ||
        `Task #${task.shortId} in ${org?.name ?? "Sayr"}`
      : undefined;

    // Rich JSON-LD using schema.org Article type for better LLMO
    const jsonLd = task
      ? {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: `#${task.shortId} - ${task.title}`,
          name: task.title,
          description: descriptionText.trim() || undefined,
          url: `https://${org?.name?.toLowerCase().replace(/\s+/g, "-")}.sayr.io/${task.shortId}`,
          datePublished: task.createdAt,
          dateModified: task.updatedAt || task.createdAt,
          keywords: [
            task.status,
            ...(task.priority !== "none" ? [task.priority] : []),
            ...(Array.isArray(task.labels)
              ? task.labels.map((l) => l.name)
              : []),
          ]
            .filter(Boolean)
            .join(", "),
          articleBody: descriptionText.trim() || undefined,
          publisher: {
            "@type": "Organization",
            name: org?.name ?? "Sayr",
            url: `https://${org?.name?.toLowerCase().replace(/\s+/g, "-")}.sayr.io`,
          },
          ...(commentsText.length > 0
            ? {
                comment: commentsText.map((c) => ({
                  "@type": "Comment",
                  author: { "@type": "Person", name: c.author },
                  text: c.text,
                  dateCreated: c.createdAt,
                })),
              }
            : {}),
        }
      : null;

    return {
      meta: seo({
        title: task
          ? `#${task.shortId} - ${task.title} | ${org?.name}`
          : "Task Not Available",
        description: ogDescription,
        image: task
          ? getOgImageUrl({
              title: task.title || undefined,
              subtitle: `#${task.shortId}`,
              meta: org?.name || undefined,
              logo: org?.logo || undefined,
            })
          : undefined,
      }),
      scripts: jsonLd
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify(jsonLd)
                .replace(/</g, "\\u003c")
                .replace(/\u2028/g, "\\u2028")
                .replace(/\u2029/g, "\\u2029"),
            },
          ]
        : [],
    };
  },
});

function RouteComponent() {
  const { task, release, descriptionHtml, commentsHtml, org } =
    Route.useLoaderData();
  const { orgSlug } = Route.useParams();
  const [panelOpen, setPanelOpen] = useState(true);

  if (!task) {
    return (
      <div className="via-surface to-surface flex min-h-[60vh] items-center justify-center bg-[conic-gradient(at_bottom_left,var(--tw-gradient-stops))] from-primary">
        <div className="mx-auto max-w-xl text-center text-white">
          <h1 className="text-5xl font-black">Task Not Available</h1>

          <p className="mb-7 mt-3">
            Sorry, this task could not be found or isn't publicly available. It
            may have been removed, or the link is incorrect.
          </p>

          <div className="flex place-content-center items-center gap-3">
            <a href="/">
              <Button className="border-surface-100! text-surface-100 w-full p-4 font-bold">
                Back to organization
              </Button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* server render */}
      <LLMOContent
        type="task"
        title={task.title ?? "Untitled Task"}
        shortId={task.shortId ?? undefined}
        status={task.status}
        priority={task.priority ?? undefined}
        labels={task.labels?.map((l) => l.name)}
        descriptionHtml={descriptionHtml}
        comments={commentsHtml}
        orgName={org?.name ?? undefined}
        url={`https://${org?.name?.toLowerCase().replace(/\s+/g, "-")}.sayr.io/${task.shortId}`}
      />

      {/* Top bar */}
      <div className="flex items-center justify-between h-11 shrink-0 border-b px-3">
        <Link to={`/orgs/$orgSlug`} params={{ orgSlug: orgSlug }}>
          <Button
            variant="ghost"
            className="w-fit text-xs p-1 h-auto rounded-lg"
            size="sm"
          >
            <IconArrowLeft className="size-3!" />
            Back
          </Button>
        </Link>
        <Button
          variant="accent"
          className={cn(
            "gap-2 h-6 w-fit bg-accent border-transparent p-1",
            !panelOpen && "bg-transparent",
          )}
          onClick={() => setPanelOpen((v) => !v)}
        >
          {panelOpen ? (
            <IconLayoutSidebarRightFilled className="w-3 h-3" />
          ) : (
            <IconLayoutSidebarRight className="w-3 h-3" />
          )}
        </Button>
      </div>
      {/* Split pane */}
      <div className="flex-1 min-h-0">
        <PublicTaskContent
          task={task}
          release={release}
          panelOpen={panelOpen}
          setPanelOpen={setPanelOpen}
        />
      </div>
    </div>
  );
}
