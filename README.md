# Las Vegas 2026 - Programme Poker

Application complète pour gérer les programmes de tournois de poker à Las Vegas pour plusieurs utilisateurs.

## Architecture

Le projet est divisé en deux parties:

- **Backend**: API REST avec Node.js, Express et SQLite
- **Frontend**: Application Vue.js 3 avec PrimeVue

## Fonctionnalités

- Gestion de plusieurs utilisateurs
- Affichage des tournois par utilisateur
- Statistiques et résumé (budget total, nombre de tournois, casinos, etc.)
- Interface moderne et responsive avec PrimeVue
- Données séparées par utilisateur

## Installation

### Prérequis

- Node.js 18+ et npm

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd frontend
npm install
```

## Démarrage

### 1. Démarrer le backend

```bash
cd backend
npm start
```

Le serveur API démarre sur `http://localhost:3000`

Pour le mode développement avec rechargement automatique:
```bash
npm run dev
```

### 2. Démarrer le frontend

Dans un nouveau terminal:

```bash
cd frontend
npm run dev
```

L'application frontend démarre sur `http://localhost:5173`

## Utilisation

1. Ouvrez votre navigateur à `http://localhost:5173`
2. Sélectionnez un utilisateur (HUGO est pré-chargé avec des données)
3. Créez de nouveaux utilisateurs avec le bouton "Nouvel utilisateur"
4. Visualisez les tournois et les statistiques pour chaque utilisateur

## API Endpoints

### Utilisateurs

- `GET /api/users` - Liste tous les utilisateurs
- `GET /api/users/:id` - Détails d'un utilisateur
- `POST /api/users` - Créer un nouvel utilisateur
- `GET /api/users/:userId/tournaments` - Tournois d'un utilisateur
- `GET /api/users/:userId/summary` - Résumé/statistiques d'un utilisateur
- `POST /api/users/:userId/tournaments` - Ajouter un tournoi

### Tournois

- `PUT /api/tournaments/:id` - Modifier un tournoi
- `DELETE /api/tournaments/:id` - Supprimer un tournoi

## Structure du projet

```
poker-vegas/
├── backend/
│   ├── server.js          # Serveur Express et routes API
│   ├── database.js        # Configuration SQLite et initialisation
│   ├── package.json
│   └── .env              # Configuration (PORT, DATABASE_PATH)
│
├── frontend/
│   ├── src/
│   │   ├── components/   # Composants Vue
│   │   │   ├── UserSelector.vue
│   │   │   └── TournamentList.vue
│   │   ├── services/     # Services API
│   │   │   └── api.js
│   │   ├── App.vue       # Composant racine
│   │   └── main.js       # Point d'entrée
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

## Base de données

SQLite est utilisée pour le stockage. La base de données est automatiquement créée au premier démarrage avec:

- Table `users` - Informations des utilisateurs
- Table `tournaments` - Tournois par utilisateur

Les données d'HUGO sont pré-chargées automatiquement.

## Technologies utilisées

### Backend
- Node.js
- Express.js
- better-sqlite3
- CORS

### Frontend
- Vue.js 3
- PrimeVue 4
- Vite
- Axios

## Développement futur

Fonctionnalités possibles:
- Édition et suppression de tournois depuis l'interface
- Filtres et recherche
- Export des données (PDF, Excel)
- Gestion des résultats de tournois
- Graphiques et statistiques avancées
