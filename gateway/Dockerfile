# ── compiler ──
FROM openresty/openresty:alpine AS compiler
WORKDIR /src
COPY lua/ ./lua/

# LuaJIT 编译 .lua → .luac
RUN for f in lua/*.lua; do \
      luajit -b "$f" "${f%.lua}.luac"; \
    done && \
    rm -f lua/*.lua

# ── runner ──
FROM openresty/openresty:alpine AS runner

RUN apk add --no-cache perl curl \
    && opm get SkyLothar/lua-resty-jwt \
    && opm get ledgetech/lua-resty-http

COPY nginx.conf /usr/local/openresty/nginx/conf/nginx.conf
RUN rm -f /etc/nginx/conf.d/default.conf
COPY conf.d/ /etc/nginx/conf.d/
COPY --from=compiler /src/lua/ /usr/local/openresty/nginx/lua/

ARG BUILD_VERSION=dev
ENV BUILD_VERSION=${BUILD_VERSION}

EXPOSE 80
CMD ["openresty", "-g", "daemon off;"]
