FROM traefik:v3.2

# Install envsubst (part of gettext)
RUN apk add --no-cache gettext

# Copy static configuration
COPY apps/traefik/traefik.yml /etc/traefik/traefik.yml

# Copy dynamic configuration template
COPY apps/traefik/dynamic.yml.template /etc/traefik/dynamic.yml.template

# Default domain (override via environment)
ARG VITE_ROOT_DOMAIN="example.com"
ENV VITE_ROOT_DOMAIN=$VITE_ROOT_DOMAIN

# Expose port
EXPOSE 80

# Render template with env vars and start Traefik
CMD sh -c " \
  : \"${VITE_ROOT_DOMAIN:?VITE_ROOT_DOMAIN is required}\" && \
  envsubst '\$VITE_ROOT_DOMAIN' < /etc/traefik/dynamic.yml.template > /etc/traefik/dynamic.yml && \
  traefik --configFile=/etc/traefik/traefik.yml \
"
