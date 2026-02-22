FROM nginx:alpine

RUN apk add --no-cache gettext

COPY cloud/nginx/nginx.conf.template /etc/nginx/nginx.conf.template
COPY cloud/nginx/proxy.conf /etc/nginx/proxy.conf

EXPOSE 80

CMD sh -c "\
  : \"${VITE_ROOT_DOMAIN:?VITE_ROOT_DOMAIN is required}\" && \
  envsubst '\$VITE_ROOT_DOMAIN' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && \
  nginx -g 'daemon off;' \
"