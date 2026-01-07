FROM nginx:latest

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy nginx template (NOT final config)
COPY apps/nginx/nginx.conf.template /etc/nginx/nginx.conf.template

# Expose port
EXPOSE 80

# Render template with env + start nginx
CMD sh -c "envsubst < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && nginx -g 'daemon off;'"