FROM nginx:latest

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy nginx template (NOT final config)
COPY apps/nginx/nginx.conf.template /etc/nginx/nginx.conf.template
ARG VITE_ROOT_DOMAIN="example.com"
ENV VITE_ROOT_DOMAIN=$VITE_ROOT_DOMAIN
# Expose port
EXPOSE 80

# Render template with env + start nginx
CMD sh -c ": \"\${VITE_ROOT_DOMAIN:?VITE_ROOT_DOMAIN is required}\" &&  envsubst < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && nginx -g 'daemon off;'"