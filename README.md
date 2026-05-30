# Projet :  Création, sécurisation et optimisation d'un cluster Kubernetes haute disponibilité avec Argo CD et monitoring avancé
# Travail de fin d'études réalisé en vue de l'obtention du titre de Bachelier en Informatique et Systèmes


> Application 3-tiers (Frontend · Backend · MySQL) déployée sur un cluster **kubeadm** (1 control-plane + 2 workers) avec haute disponibilité, sécurité renforcée et observabilité intégrée.


---

## Table des matières

- [Vue d'ensemble](#-vue-densemble)
- [Architecture](#-architecture)
- [Structure du projet](#-structure-du-projet)
- [Prérequis](#-prérequis)
- [Démarrage rapide — Docker Compose](#-démarrage-rapide--docker-compose)
- [Déploiement Kubernetes](#-déploiement-kubernetes)
- [Sécurité](#-sécurité)
- [Scalabilité](#-scalabilité)
- [API Reference](#-api-reference)
- [Débogage](#-débogage)

---

## Vue d'ensemble

Ce projet déploie une application web composée de trois services indépendants :

| Service      | Technologie          | Rôle                                      |
|--------------|----------------------|-------------------------------------------|
| **Frontend** | NGINX + HTML         | Interface utilisateur, proxy vers le backend |
| **Backend**  | Node.js / Express    | API REST en HTTPS, accès à la base de données |
| **MySQL**    | MySQL 8              | Stockage persistant, initialisé via `init.sql` |

Le frontend lit les données MySQL **exclusivement via le backend** (pas d'accès direct à la base).

### Points clés de l'implémentation

- **NodePort 30080** — accès externe au frontend via l'IP publique d'un worker
- **HTTPS** sur le backend via certificats TLS dans `certs/`
- **hostPath** pour MySQL (`/data/demo-app/mysql`) — contourne l'absence de provisioner de stockage dynamique sur kubeadm
- **NetworkPolicy default-deny** + règles d'autorisation explicites
- **Ingress optionnel** — déplacé dans `k8s/optional/ingress.yaml` (nécessite un contrôleur Ingress installé séparément)

---

## Architecture

```
                        ┌─────────────────────────────────────┐
                        │           Cluster Kubernetes         │
                        │                                      │
  Utilisateur           │  ┌─────────────┐   ┌─────────────┐  │
  ──────────▶ NodePort  │  │  Frontend   │   │   Backend   │  │
    :30080   ──────────▶│  │  (NGINX)    │──▶│  (Node.js)  │  │
                        │  │  2 replicas │   │  3 replicas │  │
                        │  └─────────────┘   └──────┬──────┘  │
                        │                           │          │
                        │                    ┌──────▼──────┐  │
                        │                    │    MySQL    │  │
                        │                    │  StatefulSet│  │
                        │                    │  1 replica  │  │
                        │                    └─────────────┘  │
                        └─────────────────────────────────────┘
```

**Cluster kubeadm :**

```
control-plane  ──┬── worker-1
                 └── worker-2
```

---

## Structure du projet

```
Projet-k8s/
├── backend/                    # API Node.js/Express (HTTPS)
│   ├── Dockerfile
│   ├── .dockerignore
│   └── src/
├── frontend/                   # Interface NGINX + HTML statique
│   ├── Dockerfile
│   └── html/
├── db/
│   └── init.sql                # Données d'initialisation MySQL
├── certs/                      # Certificats TLS pour le backend HTTPS
├── k8s/                        # Manifestes Kubernetes
│   ├── backend/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── frontend/
│   │   ├── deployment.yaml
│   │   └── service.yaml        # NodePort 30080
│   ├── mysql/
│   │   ├── statefulset.yaml
│   │   └── service.yaml
│   ├── configmap/
│   ├── secrets/                # Secrets MySQL + TLS
│   ├── rbac/                   # ServiceAccount + Role/RoleBinding
│   ├── network-policies/       # Règles d'isolation réseau
│   ├── optional/
│   │   └── ingress.yaml        # Ingress (optionnel, nécessite un contrôleur)
│   └── kustomization.yaml
├── kind/                       # Config Kind (cluster local alternatif)
├── docker-compose.yml          # Stack locale complète
└── README.md
```

---

## Prérequis

### Pour Docker Compose (test local)

- [Docker](https://docs.docker.com/get-docker/) ≥ 24
- [Docker Compose](https://docs.docker.com/compose/) v2+

### Pour Kubernetes (production)

- Cluster kubeadm fonctionnel (1 control-plane + 2 workers)
- `kubectl` configuré avec accès au cluster
- Compte [Docker Hub](https://hub.docker.com/) pour héberger les images
- *(Optionnel)* Contrôleur Ingress (ex : NGINX Ingress Controller) pour `ingress.yaml`

---

## Démarrage rapide — Docker Compose

Idéal pour tester l'application en local sans Kubernetes.

```bash
# Cloner le dépôt
git clone https://github.com/Adam-projet/Projet-k8s.git
cd Projet-k8s

# Démarrer tous les services
docker compose up -d --build

# Vérifier que tout tourne
docker compose ps
```

Ouvrir dans le navigateur :

```
http://localhost:8080
```

Pour arrêter :

```bash
docker compose down
```

---

## Déploiement Kubernetes

### 1. Build & Push des images Docker

Remplacer `YOUR_DOCKERHUB_USERNAME` par votre identifiant Docker Hub.

```bash
# Build des images
docker build -t YOUR_DOCKERHUB_USERNAME/backend:1.0.0 ./backend
docker build -t YOUR_DOCKERHUB_USERNAME/frontend:1.0.0 ./frontend

# Push vers Docker Hub
docker push YOUR_DOCKERHUB_USERNAME/backend:1.0.0
docker push YOUR_DOCKERHUB_USERNAME/frontend:1.0.0
```

### 2. Mettre à jour les références d'images

Vérifier et adapter les lignes `image:` dans :

```
k8s/backend/deployment.yaml   → image: YOUR_DOCKERHUB_USERNAME/backend:1.0.0
k8s/frontend/deployment.yaml  → image: YOUR_DOCKERHUB_USERNAME/frontend:1.0.0
```

### 3. Déployer sur le cluster

```bash
kubectl apply -k k8s/
```

### 4. Vérifier le déploiement

```bash
# État des pods (doit afficher tous Running)
kubectl get pods -n demo-app -o wide

# Services et NodePort
kubectl get svc -n demo-app

# NetworkPolicies appliquées
kubectl get networkpolicy -n demo-app
```

État attendu :

```
NAME                    READY   STATUS    RESTARTS   AGE
backend-xxx-xxx         1/1     Running   0          1m
backend-xxx-yyy         1/1     Running   0          1m
backend-xxx-zzz         1/1     Running   0          1m
frontend-xxx-xxx        1/1     Running   0          1m
frontend-xxx-yyy        1/1     Running   0          1m
mysql-0                 1/1     Running   0          1m
```

### 5. Accéder à l'application

```bash
# Récupérer l'IP d'un worker
kubectl get nodes -o wide

# Accéder via le navigateur
http://<WORKER_IP>:30080
```

### 6. (Optionnel) Activer l'Ingress

Si un contrôleur Ingress est installé sur le cluster :

```bash
kubectl apply -f k8s/optional/ingress.yaml
```

---


## Scalabilité

### Réplicas par défaut

| Service      | Replicas par défaut |
|--------------|---------------------|
| `frontend`   | 2                   |
| `backend`    | 3                   |
| `mysql`      | 1                   |

### Scaler manuellement

```bash
kubectl scale deployment frontend -n demo-app --replicas=4
kubectl scale deployment backend  -n demo-app --replicas=5
```


## API Reference

Le backend expose les endpoints suivants :

| Méthode | Route         | Description                        |
|---------|---------------|------------------------------------|
| `GET`   | `/api/health` | Vérification de l'état du backend  |
| `GET`   | `/api/items`  | Liste des items depuis MySQL       |
| `GET`   | `/api/info`   | Informations sur le pod courant    |

La base MySQL est initialisée avec **3 lignes** de données via `db/init.sql`.

---

## Débogage

### Inspecter un pod

```bash
kubectl describe pod -n demo-app <nom-du-pod>
```

### Consulter les logs

```bash
# Logs du backend (toutes les replicas)
kubectl logs -n demo-app deploy/backend

# Logs du frontend
kubectl logs -n demo-app deploy/frontend

# Logs MySQL
kubectl logs -n demo-app mysql-0

# Suivre les logs en temps réel
kubectl logs -n demo-app deploy/backend -f
```

---

## Stack technique

- **Kubernetes** — Orchestration de conteneurs
- **kubeadm** — Provisionnement du cluster
- **Docker** — Conteneurisation des services
- **NGINX** — Serveur web frontend et reverse proxy
- **Node.js / Express** — API REST backend
- **MySQL 8** — Base de données relationnelle
- **Kustomize** — Gestion des manifestes Kubernetes
- **Alpine Linux** — Images Docker légères

