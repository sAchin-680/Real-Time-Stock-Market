# Tickline stream relay — build from the repo root:
#   docker build -f relay/Dockerfile -t tickline-relay .
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --ignore-scripts
COPY lib/stream ./lib/stream
COPY relay ./relay
RUN npx esbuild relay/server.ts --bundle --platform=node --target=node22 --outfile=relay/dist/server.js

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY --from=build /app/relay/dist/server.js ./server.js
USER node
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
CMD ["node", "server.js"]
