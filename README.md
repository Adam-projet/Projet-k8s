# Pack complet Docker + Kubernetes : frontend + backend API + MySQL

Ce pack fournit une application simple composée de :
- **frontend** : page HTML servie par NGINX
- **backend** : API Node.js/Express exposée en **HTTPS**
- **mysql** : base de données avec données de démonstration

Le frontend lit les données de la base **via l'API backend**.  
Le pack couvre les points demandés :
- **Chapitre 2** : Dockerfiles, Docker Compose, images légères, secrets et optimisation
- **Chapitre 3** : déploiement Kubernetes, ressources, réplicas, anti-affinité, PDB, HPA
- **Chapitre 4** : RBAC, TLS, Secrets, NetworkPolicy, segmentation réseau

## 1. Structure

```text
k8s-microservices-pack/
├── backend/
├── certs/
├── db/
├── docker-compose.yml
├── frontend/
├── kind/
├── k8s/
└── README.md
```

## 2. Test local avec Docker Compose

### Lancer
```bash
docker compose up -d --build
```

### Vérifier
```bash
docker compose ps
docker compose logs -f backend
```

### Ouvrir
- Frontend : `http://localhost:8080`

## 3. Build et push des images

Adapte le registre si besoin.

```bash
docker build -t demo/backend:1.0.0 ./backend
docker build -t demo/frontend:1.0.0 ./frontend
```

Si tu utilises un cluster local `kind`, charge les images :

```bash
kind create cluster --config kind/cluster-config.yaml
kind load docker-image demo/backend:1.0.0 --name demo-3nodes
kind load docker-image demo/frontend:1.0.0 --name demo-3nodes
```

## 4. Déploiement Kubernetes

### Appliquer tous les manifests
```bash
kubectl apply -k k8s/
```

### Vérifier
```bash
kubectl get all -n demo-app
kubectl get ingress -n demo-app
kubectl get networkpolicy -n demo-app
kubectl get secret -n demo-app
```

### Accès simple sans Ingress
```bash
kubectl port-forward -n demo-app svc/frontend 8080:8080
```

Puis ouvre :
- `http://localhost:8080`

### Accès avec Ingress NGINX
Si ton cluster a un ingress controller NGINX, ajoute dans `/etc/hosts` :
```text
127.0.0.1 demo.local
```

Puis ouvre :
- `https://demo.local`

Le certificat TLS est auto-signé pour la démonstration.

## 5. Réplicas et haute disponibilité

### Réplicas par défaut
- frontend : **2**
- backend : **3**
- mysql : **1** (pour une démo simple)

### Ajouter des réplicas backend
```bash
kubectl scale deployment backend -n demo-app --replicas=5
```

### Ajouter des réplicas frontend
```bash
kubectl scale deployment frontend -n demo-app --replicas=4
```

### Vérifier la répartition
```bash
kubectl get pods -n demo-app -o wide
```

Les manifests utilisent :
- **podAntiAffinity**
- **topologySpreadConstraints**
- **PodDisruptionBudget**
- **HorizontalPodAutoscaler**

## 6. Ce que couvre le pack par rapport au besoin

### Chapitre 2 - Dockerisation
- Dockerfile dédié par microservice
- images basées sur **Alpine**
- exécution en **non-root**
- `.dockerignore`
- `docker-compose.yml`
- séparation frontend / backend / base
- backend en **HTTPS**
- secrets Kubernetes pour les mots de passe

### Chapitre 3 - Kubernetes haute disponibilité
- déploiement sur cluster **3 nœuds**
- backend avec **3 replicas**
- anti-affinité pour répartir les pods
- requests / limits CPU / mémoire
- probes de santé
- PDB et HPA

### Chapitre 4 - Sécurisation
- **ServiceAccount** dédiés
- **Role** et **RoleBinding**
- **Secret** Kubernetes pour MySQL et TLS
- **Ingress TLS**
- **NetworkPolicy** avec stratégie par défaut restrictive
- communication frontend -> backend en **HTTPS**
- trafic backend -> mysql limité par policy

## 7. Limites assumées pour cette démo
- MySQL est en **instance unique** pour rester simple à tester
- le certificat est **auto-signé**
- la vérification stricte du certificat backend côté frontend NGINX est désactivée pour simplifier la démo
- pour une vraie production, utiliser :
  - cert-manager
  - un vrai CA
  - un stockage persistant robuste
  - éventuellement une base HA (InnoDB Cluster, Galera, opérateur MySQL)

## 8. Fichiers importants

### Docker
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `docker-compose.yml`

### Kubernetes
- `k8s/backend/deployment.yaml`
- `k8s/frontend/deployment.yaml`
- `k8s/mysql/statefulset.yaml`
- `k8s/network-policies/*.yaml`
- `k8s/rbac/*.yaml`
- `k8s/secrets/*.yaml`

## 9. Tests utiles

### Vérifier l'API
```bash
kubectl port-forward -n demo-app svc/backend 8443:8443
curl -k https://localhost:8443/api/items
```

### Vérifier la base
```bash
kubectl exec -it -n demo-app mysql-0 -- mysql -uappuser -pAppPassw0rd! appdb -e "SELECT * FROM items;"
```

### Tester la résilience
Supprime un pod backend :
```bash
kubectl delete pod -n demo-app -l app=backend
```

Puis vérifie que le service reste disponible.

## 10. Architecture logique

```text
Utilisateur
   |
   v
Frontend (NGINX)
   |
 HTTPS /api
   |
   v
Backend (Node.js API)
   |
 TCP 3306
   |
   v
MySQL
```
