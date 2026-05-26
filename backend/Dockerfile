#  Stage 1 : Build des dépendances 
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json ./

RUN npm install --omit=dev && npm cache clean --force
RUN npm install -g glob@^10.5.0 minimatch@^9.0.7
RUN npm install cross-spawn@7.0.5 --save && \
    npm install --omit=dev && \
    npm cache clean --force

#  Stage 2 : Image finale 
FROM node:20-alpine

# Mettre à jour les paquets Alpine pour corriger les CVE
RUN apk update && apk upgrade --no-cache

WORKDIR /app

# Créer groupe et utilisateur non-root AVANT les COPY
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup

# Copier avec --chown pour que appuser soit propriétaire dès le départ
COPY --from=deps --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --chown=appuser:appgroup server.js ./server.js

# Donner la propriété complète du répertoire à appuser
RUN chown -R appuser:appgroup /app

# Basculer sur l'utilisateur non-root
USER appuser

EXPOSE 8443

CMD ["node", "server.js"]
