# PokerAtlas Scraper (Version Node.js)

Script Node.js avec Puppeteer pour récupérer automatiquement les tournois de poker depuis PokerAtlas.com.

## 🚀 Installation et utilisation

### 1. Installer les dépendances

```bash
cd /home/franck/Projets/Perso/poker-vegas/scraper
npm install
```

**Note:** L'installation de Puppeteer peut prendre quelques minutes car il télécharge Chromium.

### 2. Configuration

Le fichier `.env` est déjà configuré avec vos identifiants:
- Email: franck.garcon@gmail.com
- Password: TeamVegas@03-13-06-2026
- API_URL: http://localhost:3000/api
- USER_ID: 1

### 3. Démarrer le backend

Dans un autre terminal:
```bash
cd /home/franck/Projets/Perso/poker-vegas/backend
npm start
```

### 4. Lancer le scraper

```bash
npm start
# ou
node scraper.js
```

## 📊 Ce que fait le scraper

1. ✅ Lance Chrome en mode visible
2. 🔐 Se connecte à PokerAtlas avec vos identifiants
3. 📍 Va sur https://www.pokeratlas.com/poker-tournaments/las-vegas
4. 📸 Prend des screenshots à chaque étape
5. 💾 Sauvegarde le HTML de la page
6. 📊 Analyse la structure pour trouver les tournois
7. 🎯 **Filtre uniquement les tournois du 03 au 12 juin 2026**
8. 📤 Envoie les données à votre API

## 📁 Fichiers générés

- `/tmp/before_login.png` - Avant la connexion
- `/tmp/after_login.png` - Après la connexion
- `/tmp/tournaments_page.png` - Page des tournois
- `/tmp/page_source.html` - Code HTML complet
- `/tmp/tournaments_raw.json` - Données brutes extraites

## 🔍 Phase actuelle

Le scraper est en **phase 1**: Test de connexion et analyse de structure.

Il va:
- ✅ Se connecter à PokerAtlas
- ✅ Naviguer vers les tournois Las Vegas
- ✅ Sauvegarder les fichiers de débogage
- 🔄 Identifier la structure HTML des tournois

**Après le premier run**, nous analyserons les fichiers générés pour compléter l'extraction automatique des données.

## 🎯 Dates filtrées

Le scraper récupère uniquement les tournois entre:
- **Début:** 03 juin 2026
- **Fin:** 12 juin 2026

Les dates sont converties au format français: 03-juin, 04-juin, ..., 12-juin

## ⚙️ Technologies utilisées

- **Puppeteer** - Contrôle de Chrome/Chromium
- **Axios** - Requêtes HTTP vers l'API
- **Dotenv** - Gestion des variables d'environnement

## 🔐 Sécurité

Le fichier `.env` contient vos identifiants et est dans `.gitignore`.
Ne le partagez jamais et ne le committez pas dans Git.

## 🐛 Dépannage

### L'installation échoue
Attendez que `npm install` se termine complètement (peut prendre 2-3 minutes pour Puppeteer).

### Le navigateur ne se lance pas
Vérifiez que Chrome ou Chromium est installé sur votre système.

### Erreur de connexion
Consultez `/tmp/login_error.png` et `/tmp/page_source.html` pour voir ce qui s'est passé.

## 📞 Prochaines étapes

Après le premier test:
1. Analyser les fichiers générés
2. Identifier les sélecteurs CSS corrects
3. Implémenter le parsing des données
4. Automatiser l'import complet
