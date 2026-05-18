FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force
RUN npm install -g glob@^10.5.0 minimatch@^9.0.7
RUN npm install cross-spawn@7.0.5 --save && \
    npm install --omit=dev && \
    npm cache clean --force

FROM node:20-alpine
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=deps /app/node_modules ./node_modules
COPY server.js ./server.js

USER appuser

EXPOSE 8443
CMD ["node", "server.js"]
