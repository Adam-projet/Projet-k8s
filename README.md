# Pack corrigé pour EC2 Ubuntu 24 + kubeadm (1 control-plane + 2 workers)

Cette version conserve l'application d'origine :
- **frontend** : NGINX + page HTML
- **backend** : API Node.js/Express en **HTTPS**
- **mysql** : base MySQL avec données d'initialisation

Le frontend lit les données MySQL **via le backend**.

## Corrections apportées pour EC2 / kubeadm

- `frontend` exposé en **NodePort 30080** pour accès via l'IP publique d'un worker.
- images Kubernetes remplacées par des placeholders **Docker Hub** pour éviter `ImagePullBackOff`.
- `imagePullPolicy: Always` pour récupérer les images poussées.
- MySQL converti pour utiliser un **hostPath** (`/data/demo-app/mysql`) afin d'éviter le problème `PVC Pending` sur un cluster kubeadm sans provisioner de stockage.
- ajout d'une **NetworkPolicy** qui autorise l'accès entrant vers le frontend, sinon le `default-deny` bloquait l'accès externe.
- l'Ingress a été déplacé dans `k8s/optional/ingress.yaml` car, sur EC2/kubeadm, il faut d'abord installer un contrôleur Ingress.

## Structure

```text
k8s-microservices-pack-ec2-fixed/
├── backend/
├── certs/
├── db/
├── docker-compose.yml
├── frontend/
├── k8s/
│   ├── backend/
│   ├── configmap/
│   ├── frontend/
│   ├── mysql/
│   ├── network-policies/
│   ├── optional/
│   ├── rbac/
│   ├── secrets/
│   └── kustomization.yaml
└── README.md
```

## 1. Test local avec Docker Compose

```bash
docker compose up -d --build
```

Ouvre ensuite :

```text
http://localhost:8080
```

## 2. Préparer les images pour Kubernetes

Remplace `YOUR_DOCKERHUB_USERNAME` par ton identifiant Docker Hub.

```bash
docker build -t YOUR_DOCKERHUB_USERNAME/backend:1.0.0 ./backend
docker build -t YOUR_DOCKERHUB_USERNAME/frontend:1.0.0 ./frontend

docker push YOUR_DOCKERHUB_USERNAME/backend:1.0.0
docker push YOUR_DOCKERHUB_USERNAME/frontend:1.0.0
```

Ensuite, si besoin, vérifie les lignes `image:` dans :
- `k8s/backend/deployment.yaml`
- `k8s/frontend/deployment.yaml`

## 3. Déployer sur Kubernetes

```bash
kubectl apply -k k8s/
```

## 4. Vérifier

```bash
kubectl get pods -n demo-app -o wide
kubectl get svc -n demo-app
kubectl get networkpolicy -n demo-app
```

Tu dois voir :
- `frontend` en `Running`
- `backend` en `Running`
- `mysql-0` en `Running`
- service `frontend` en `NodePort`

## 5. Accès depuis EC2

Ouvre dans le **Security Group AWS** :
- TCP `30080` depuis ton IP ou `0.0.0.0/0` pour les tests
- plus généralement `30000-32767` si tu veux tester d'autres NodePorts

Ensuite ouvre dans le navigateur l'**IP publique d'un worker** :

```text
http://IP_PUBLIQUE_WORKER:30080
```

## 6. Données de test

La base contient 3 lignes chargées par `db/init.sql`.

Le frontend appelle :
- `/api/items`

Le backend expose :
- `GET /api/health`
- `GET /api/items`
- `GET /api/info`

## 7. Réplicas

Par défaut :
- `frontend`: 2 replicas
- `backend`: 3 replicas
- `mysql`: 1 replica

Exemples :

```bash
kubectl scale deployment frontend -n demo-app --replicas=4
kubectl scale deployment backend -n demo-app --replicas=5
```

## 8. Ce que couvre le pack

### Chapitre 2 - Dockerisation
- Dockerfile pour chaque service
- `.dockerignore`
- `docker-compose.yml`
- images légères basées sur Alpine
- séparation front / back / db
- secrets Kubernetes pour les mots de passe

### Chapitre 3 - Kubernetes haute disponibilité
- cluster distribué 1 control-plane + 2 workers
- replicas frontend/backend
- anti-affinité et topology spread
- requests/limits CPU et mémoire
- probes de santé
- PodDisruptionBudget et HPA

### Chapitre 4 - Sécurité
- ServiceAccounts dédiés
- Role/RoleBinding backend
- Secrets MySQL et TLS
- NetworkPolicies
- backend en HTTPS

## 9. Limites de cette version EC2

- MySQL utilise `hostPath` pour être simple à lancer sur kubeadm sans CSI. C'est bien pour une démo, pas pour une vraie production.
- Le certificat TLS est auto-signé.
- L'Ingress n'est pas appliqué par défaut.

## 10. Débogage utile

```bash
kubectl describe pod -n demo-app <nom-du-pod>
kubectl logs -n demo-app deploy/backend
kubectl logs -n demo-app deploy/frontend
kubectl logs -n demo-app mysql-0
```
# argocd-demo
