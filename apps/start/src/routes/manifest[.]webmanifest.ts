import { getOrganizationPublic } from "@repo/database";
import { createFileRoute } from "@tanstack/react-router";

const DEFAULT_MANIFEST = {
    id: "/",
    name: "Sayr.io admin",
    short_name: "Sayr.io",
    scope: "/",
    start_url: "/",
    icons: [
        {
            src: "/favicon.ico",
            sizes: "64x64 32x32 24x24 16x16",
            type: "image/x-icon",
        },
        {
            src: "/web-app-manifest-192x192.png",
            sizes: "192x192",
            type: "image/png",
        },
        {
            src: "/web-app-manifest-512x512.png",
            sizes: "512x512",
            type: "image/png",
        },
    ],
    theme_color: "#ffffff",
    background_color: "#ffffff",
    display: "standalone",
    orientation: "any",
};

export const Route = createFileRoute("/manifest.webmanifest")({
    server: {
        handlers: {
            GET: async (ctx) => {
                const url = new URL(ctx.request.url);
                const orgSlug = url.searchParams.get("org");

                // No org → default manifest
                if (!orgSlug) {
                    return Response.json(DEFAULT_MANIFEST, {
                        headers: {
                            "content-type": "application/manifest+json",
                        },
                    });
                }

                const organization = await getOrganizationPublic(orgSlug);

                // Org not found → default manifest
                if (!organization) {
                    return Response.json(DEFAULT_MANIFEST, {
                        headers: {
                            "content-type": "application/manifest+json",
                        },
                    });
                }

                const logo =
                    organization.logo ?? "/web-app-manifest-512x512.png";

                return Response.json(
                    {
                        id: "/",
                        name: `Sayr · ${organization.name}`,
                        short_name: `Sayr ${organization.slug}`,
                        scope: "/",
                        start_url: "/",
                        icons: [
                            {
                                src: logo,
                                sizes: "192x192",
                                type: "image/png",
                                purpose: "any maskable",
                            },
                            {
                                src: logo,
                                sizes: "512x512",
                                type: "image/png",
                                purpose: "any maskable",
                            },
                        ],
                        screenshots: organization.bannerImg
                            ? [
                                {
                                    src: organization.bannerImg,
                                    sizes: "1280x720",
                                    type: "image/png",
                                    form_factor: "wide",
                                },
                            ]
                            : undefined,
                        theme_color: "#ffffff",
                        background_color: "#ffffff",
                        display: "standalone",
                        orientation: "any",
                    },
                    {
                        headers: {
                            "content-type": "application/manifest+json",
                        },
                    },
                );
            },
        },
    },
});