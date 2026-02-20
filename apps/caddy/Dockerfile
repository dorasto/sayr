# Build stage: compile Caddy with Cloudflare DNS plugin
FROM caddy:2-builder AS builder

RUN xcaddy build \
	--with github.com/caddy-dns/cloudflare

# Runtime stage
FROM caddy:2-alpine

# Copy custom Caddy binary with Cloudflare DNS plugin
COPY --from=builder /usr/bin/caddy /usr/bin/caddy

# Copy Caddyfile template
# Caddy natively supports {$ENV_VAR} syntax, no envsubst needed
COPY apps/caddy/Caddyfile.template /etc/caddy/Caddyfile

# Default environment variables (override at runtime)
ENV ROOT_DOMAIN="example.com"
ENV UPSTREAM_HOST="127.0.0.1"
ENV START_PORT="3000"
ENV BACKEND_PORT="5468"
ENV MARKETING_PORT="8080"
ENV ACME_EMAIL=""
ENV CLOUDFLARE_API_TOKEN=""

EXPOSE 80 443

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
