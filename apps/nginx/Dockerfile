FROM nginx:alpine

RUN apk add --no-cache gettext

COPY apps/nginx/nginx.conf.template /etc/nginx/nginx.conf.template
COPY apps/nginx/proxy.conf /etc/nginx/proxy.conf

EXPOSE 80

CMD sh -c "\
  : \"${VITE_ROOT_DOMAIN:?VITE_ROOT_DOMAIN is required}\" && \
  : \"${MAIN_ORG:?MAIN_ORG is required}\" && \
  envsubst '\$VITE_ROOT_DOMAIN \$MAIN_ORG' \
    < /etc/nginx/nginx.conf.template \
    > /etc/nginx/nginx.conf && \
  nginx -g 'daemon off;' \
"