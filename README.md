# 🏪 Backend - Boutique Alimentaire (MySQL)

API REST construite avec **Node.js**, **Express**, **MySQL** et **Sequelize ORM**.

---

## 📋 Prérequis

- Node.js >= 16
- MySQL >= 5.7 ou MariaDB >= 10.3
- npm ou yarn

---

## ⚙️ Installation

```bash
# 1. Se placer dans le dossier backend
cd backend

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos paramètres MySQL
```

---

## 🗄️ Configuration MySQL

### Créer la base de données

```sql
CREATE DATABASE boutique_alimentaire CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Variables d'environnement (.env)

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=3306
DB_NAME=boutique_alimentaire
DB_USER=root
DB_PASSWORD=votre_mot_de_passe

JWT_SECRET=votre_secret_jwt_tres_securise
JWT_EXPIRE=7d
```

---

## 🚀 Démarrage

```bash
# Peupler la base de données (première fois)
npm run seed

# Mode développement (avec rechargement automatique)
npm run dev

# Mode production
npm start
```

---

## 📁 Structure du projet

```
backend/
├── config/
│   └── database.js          # Configuration Sequelize/MySQL
├── middleware/
│   └── auth.middleware.js   # Vérification JWT & rôles
├── models/
│   ├── index.js             # Associations entre modèles
│   ├── User.model.js        # Modèle utilisateur (admin/agent)
│   ├── Product.model.js     # Modèle produit alimentaire
│   ├── Sale.model.js        # Modèle vente
│   ├── SaleItem.model.js    # Articles d'une vente
│   └── StockMovement.model.js # Mouvements de stock
├── routes/
│   ├── auth.routes.js       # Authentification
│   ├── user.routes.js       # Gestion des agents (admin)
│   ├── product.routes.js    # CRUD produits
│   ├── sale.routes.js       # Ventes
│   ├── stock.routes.js      # Inventaire / mouvements de stock
│   └── dashboard.routes.js  # Statistiques
├── scripts/
│   └── seed.js              # Données initiales
├── .env                     # Variables d'environnement
├── .env.example             # Template des variables
├── package.json
└── server.js                # Point d'entrée
```

---

## 🔌 Endpoints API

### 🔐 Authentification (`/api/auth`)
| Méthode | Route | Description | Accès |
|---------|-------|-------------|-------|
| POST | `/login` | Connexion | Public |
| GET | `/me` | Profil connecté | Authentifié |
| POST | `/logout` | Déconnexion | Authentifié |
| PUT | `/change-password` | Changer mot de passe | Authentifié |

### 👥 Agents (`/api/users`)
| Méthode | Route | Description | Accès |
|---------|-------|-------------|-------|
| GET | `/agents` | Liste des agents | Admin |
| POST | `/agents` | Créer un agent | Admin |
| DELETE | `/agents/:id` | Supprimer un agent | Admin |
| PATCH | `/agents/:id/toggle` | Activer/désactiver | Admin |
| GET | `/agents/:id/sales` | Ventes d'un agent | Admin |

### 📦 Produits (`/api/products`)
| Méthode | Route | Description | Accès |
|---------|-------|-------------|-------|
| GET | `/` | Liste des produits | Authentifié |
| GET | `/categories` | Catégories disponibles | Authentifié |
| GET | `/:id` | Détail d'un produit | Authentifié |
| POST | `/` | Créer un produit | Admin |
| PUT | `/:id` | Modifier un produit | Admin |
| DELETE | `/:id` | Désactiver un produit | Admin |

### 💰 Ventes (`/api/sales`)
| Méthode | Route | Description | Accès |
|---------|-------|-------------|-------|
| GET | `/` | Toutes les ventes | Admin |
| GET | `/mine` | Mes ventes | Agent |
| POST | `/` | Créer une vente | Authentifié |
| PATCH | `/:id/cancel` | Annuler une vente | Authentifié |

### 📊 Stock (`/api/stock`)
| Méthode | Route | Description | Accès |
|---------|-------|-------------|-------|
| GET | `/` | Mouvements de stock | Authentifié |
| POST | `/` | Ajouter un mouvement | Authentifié |

### 📈 Dashboard (`/api/dashboard`)
| Méthode | Route | Description | Accès |
|---------|-------|-------------|-------|
| GET | `/` | Stats globales | Authentifié |
| GET | `/agent` | Stats de l'agent | Agent |

---

## 🗄️ Schéma de la base de données

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│    users    │     │    sales    │     │   sale_items    │
├─────────────┤     ├─────────────┤     ├─────────────────┤
│ id (PK)     │────<│ agent_id(FK)│     │ id (PK)         │
│ name        │     │ agent_name  │>────│ sale_id (FK)    │
│ email       │     │ total_amount│     │ product_id (FK) │
│ password    │     │ payment_meth│     │ product_name    │
│ role        │     │ status      │     │ quantity        │
│ phone       │     │ note        │     │ unit            │
│ is_active   │     │ created_at  │     │ unit_price      │
│ last_login  │     │ updated_at  │     │ total           │
└─────────────┘     └─────────────┘     └─────────────────┘

┌─────────────────┐     ┌──────────────────────┐
│    products     │     │   stock_movements    │
├─────────────────┤     ├──────────────────────┤
│ id (PK)         │────<│ product_id (FK)      │
│ name            │     │ product_name         │
│ category        │     │ agent_id (FK)        │
│ unit            │     │ agent_name           │
│ purchase_price  │     │ type (in/out/loss/adj)│
│ selling_price   │     │ quantity             │
│ stock           │     │ unit                 │
│ min_stock       │     │ stock_before         │
│ description     │     │ stock_after          │
│ expiry_date     │     │ reason               │
│ is_active       │     │ created_at           │
└─────────────────┘     └──────────────────────┘
```

---

## 🔑 Comptes de test (après seed)

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | `admin@boutique.com` | `admin123` |
| Agent 1 | `agent1@boutique.com` | `agent123` |
| Agent 2 | `agent2@boutique.com` | `agent123` |

---

## 🛡️ Sécurité

- **JWT** : Token expirant après 7 jours
- **bcryptjs** : Hachage des mots de passe (salt rounds: 12)
- **Rôles** : `admin` (accès total) | `agent` (accès limité)
- **Transactions SQL** : Ventes et mouvements de stock atomiques
- **Soft delete** : Les produits sont désactivés, pas supprimés
