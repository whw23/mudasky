FROM openresty/openresty:alpine

RUN apk add --no-cache perl curl && opm get SkyLothar/lua-resty-jwt

COPY nginx.conf /usr/local/openresty/nginx/conf/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/
COPY lua/ /usr/local/openresty/nginx/lua/

EXPOSE 80
CMD ["openresty", "-g", "daemon off;"]
