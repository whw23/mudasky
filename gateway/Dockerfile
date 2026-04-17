# ── compiler ──
FROM openresty/openresty:alpine AS compiler
WORKDIR /src
COPY lua/ ./lua/

# LuaJIT 编译 .lua → .luac
RUN LUAJIT=$(find /usr/local/openresty/luajit/bin -name "luajit*" -type f | head -1) && \
    mkdir -p out && \
    for f in lua/*.lua; do \
      name=$(basename "$f" .lua) && \
      "$LUAJIT" -b "$f" "out/${name}.luac"; \
    done && \
    rm -rf lua && mv out lua

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
