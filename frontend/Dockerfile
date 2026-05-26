FROM nginx:1.27-alpine

# Mettre à jour les paquets Alpine pour corriger les CVE
RUN apk update && apk upgrade --no-cache

# Créer un utilisateur non-root
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup

# Copier la configuration nginx et le fichier HTML
COPY --chown=appuser:appgroup nginx.conf /etc/nginx/nginx.conf
COPY --chown=appuser:appgroup index.html /usr/share/nginx/html/index.html

# Donner les permissions nécessaires à nginx pour tourner en non-root
RUN chown -R appuser:appgroup /var/cache/nginx && \
    chown -R appuser:appgroup /var/log/nginx && \
    chown -R appuser:appgroup /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown appuser:appgroup /var/run/nginx.pid

USER appuser

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
