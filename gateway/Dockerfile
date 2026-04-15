FROM openresty/openresty:alpine

RUN apk add --no-cache perl curl \
    && opm get SkyLothar/lua-resty-jwt \
    && opm get ledgetech/lua-resty-http

COPY nginx.conf /usr/local/openresty/nginx/conf/nginx.conf
RUN rm -f /etc/nginx/conf.d/default.conf
COPY conf.d/ /etc/nginx/conf.d/
COPY lua/ /usr/local/openresty/nginx/lua/

ARG BUILD_VERSION=dev
ENV BUILD_VERSION=${BUILD_VERSION}

EXPOSE 80
CMD ["openresty", "-g", "daemon off;"]
