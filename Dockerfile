FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine AS runtime
ENV NODE_ENV=production PORT=3000 TAKE7_DATA_DIR=/app/.data
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && mkdir -p .data && chown node:node .data
COPY --from=build /app/dist ./dist
COPY server.mjs ./server.mjs
USER node
EXPOSE 3000
CMD ["node", "server.mjs"]
