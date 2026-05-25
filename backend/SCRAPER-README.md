# Scraper de Tournois de Poker - PokerAtlas

## 🎯 Vue d'ensemble

Ce système permet de scraper automatiquement les tournois de poker depuis PokerAtlas et de les stocker dans une base de données accessible via API REST.

## 📁 Fichiers créés

### Scripts de scraping

1. **`scraper-scroll.js`** - Scraper principal avec gestion du scroll
   - Scroll automatique de la page
   - Extraction de 50+ tournois
   - Capture d'écran pour debug
   - Gestion des chargements dynamiques

2. **`scraper-debug.js`** - Script de debug pour analyser la structure HTML
   - Analyse de la page PokerAtlas
   - Détection des sélecteurs CSS
   - Capture d'écran complète
   - Export JSON de la structure

3. **`scraper.js`** - Version simple (désormais obsolète)

### Scripts d'import et nettoyage

4. **`init-scraped-tournaments.js`** - Initialisation de la table DB
   - Crée la table `scraped_tournaments`
   - Index pour performances
   - Contraintes d'unicité

5. **`clean-and-import.js`** - Nettoyage et import des données
   - Filtre les données invalides
   - Évite les doublons
   - Affiche les statistiques

6. **`import-tournaments.js`** - Import simple (version de base)

### API

7. **Nouveaux endpoints dans `server.js`**:
   - `GET /api/scraped-tournaments` - Liste tous les tournois
   - `GET /api/scraped-tournaments/casinos` - Liste des casinos
   - `GET /api/scraped-tournaments/stats` - Statistiques globales

## 🚀 Utilisation

### 1. Scraper les tournois

```bash
cd backend
node scraper-scroll.js
```

Le script va:
- Ouvrir PokerAtlas dans un navigateur visible
- Scroller automatiquement pour charger tous les tournois
- Extraire environ 50-100 tournois
- Sauvegarder dans `poker-tournaments.json`
- Créer des captures d'écran: `pokeratlas-initial.png` et `pokeratlas-final.png`

### 2. Nettoyer et importer les données

```bash
node init-scraped-tournaments.js  # Créer la table (1ère fois seulement)
node clean-and-import.js          # Importer les données
```

### 3. Consulter les données via l'API

Démarrer le serveur:
```bash
npm run dev
```

#### Endpoints disponibles:

**Stats globales:**
```bash
curl http://localhost:3000/api/scraped-tournaments/stats
```

Réponse:
```json
{
  "total": 59,
  "casinos": 13,
  "dates": 1,
  "avgBuyIn": 214.12,
  "minBuyIn": 1,
  "maxBuyIn": 600,
  "startDate": "2026-06-04",
  "endDate": "2026-06-04"
}
```

**Liste des casinos:**
```bash
curl http://localhost:3000/api/scraped-tournaments/casinos
```

**Tous les tournois:**
```bash
curl http://localhost:3000/api/scraped-tournaments
```

**Filtrer par casino:**
```bash
curl "http://localhost:3000/api/scraped-tournaments?casino=Aria"
```

**Filtrer par buy-in:**
```bash
curl "http://localhost:3000/api/scraped-tournaments?minBuyIn=200&maxBuyIn=400"
```

**Filtrer par date:**
```bash
curl "http://localhost:3000/api/scraped-tournaments?date=2026-06-04"
```

## 📊 Données extraites

### Structure d'un tournoi

```json
{
  "id": 1,
  "casino": "Aria Casino",
  "date": "2026-06-04",
  "time": "19:00:00",
  "buyIn": 300,
  "created_at": "2026-05-24 18:44:54"
}
```

### Casinos disponibles (13 au total)

1. Aria Casino
2. Bellagio Casino
3. Caesars Palace
4. Horseshoe Las Vegas
5. MGM Grand
6. Mandalay Bay
7. Red Rock Casino
8. South Point Casino
9. The Orleans Casino
10. Venetian Las Vegas
11. Westgate Las Vegas Resort & Casino
12. World Series of Poker
13. Wynn Las Vegas

## 🔧 Configuration

### Variables d'environnement

Le scraper utilise des identifiants codés en dur (à améliorer):
```javascript
const CONFIG = {
  username: 'votre-email@example.com',
  password: 'votre-mot-de-passe'
};
```

### Paramètres du scraper

Dans `scraper-scroll.js`:
```javascript
const CONFIG = {
  url: 'https://www.pokeratlas.com/poker-tournaments/las-vegas',
  scrollDelay: 2000,    // Temps d'attente entre chaque scroll (ms)
  maxScrolls: 20,       // Nombre maximum de scrolls
  outputFile: 'poker-tournaments.json'
};
```

## 🐛 Debug

### Problèmes courants

**Le scraper ne trouve aucun tournoi:**
1. Lancer `node scraper-debug.js`
2. Consulter `page-structure.json`
3. Vérifier les captures d'écran
4. Ajuster les sélecteurs CSS dans le scraper

**Données invalides:**
Le script `clean-and-import.js` filtre automatiquement:
- Les casinos avec des noms invalides
- Les entrées "Unknown"
- Les dates dans le nom du casino
- Les buy-ins à 0

**Table n'existe pas:**
```bash
node init-scraped-tournaments.js
```

## 📝 Notes importantes

### Limitations actuelles

1. **Une seule date**: Le scraper n'extrait que les tournois du jour affiché (24 mai)
   - PokerAtlas ne permet pas de filtrer facilement par date
   - Il faudrait naviguer jour par jour pour les autres dates

2. **Pas d'authentification**: La connexion échoue parfois
   - Le script continue même sans être connecté
   - Certains tournois peuvent nécessiter une connexion

3. **Scroll limité**: Maximum 20 scrolls
   - Peut ne pas capturer TOUS les tournois si la liste est très longue
   - Ajuster `maxScrolls` si nécessaire

### Améliorations possibles

1. **Navigation par dates**:
   - Ajouter une boucle pour parcourir plusieurs jours
   - Gérer le calendrier de PokerAtlas

2. **Headless mode**:
   - Passer `headless: true` pour plus de rapidité
   - Actuellement en mode visible pour debug

3. **Scheduling**:
   - Créer un cron job pour scraper automatiquement
   - Mettre à jour la base quotidiennement

4. **Détection de changements**:
   - Notifier quand de nouveaux tournois apparaissent
   - Tracker les modifications de buy-in

## 🎓 Exemple complet

```bash
# 1. Scraper les données
node scraper-scroll.js

# 2. Initialiser la DB (première fois)
node init-scraped-tournaments.js

# 3. Importer les données
node clean-and-import.js

# 4. Démarrer l'API
npm run dev

# 5. Consulter les données
curl http://localhost:3000/api/scraped-tournaments/stats

# 6. Filtrer les tournois
curl "http://localhost:3000/api/scraped-tournaments?casino=WSOP&minBuyIn=200"
```

## ✅ Résultats

Dernière exécution (24 mai 2026):
- ✅ 103 tournois bruts extraits
- ✅ 59 tournois valides après nettoyage
- ✅ 13 casinos différents
- ✅ Buy-in moyen: $214
- ✅ API fonctionnelle avec filtres

## 🔄 Prochaines étapes

Pour obtenir les données du **4-12 juin 2026**:

1. **Option manuelle**: Naviguer sur PokerAtlas jour par jour et scraper
2. **Option automatique**: Améliorer le scraper pour gérer les dates
3. **Alternative**: Contacter PokerAtlas pour un accès API officiel
