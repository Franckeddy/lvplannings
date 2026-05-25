# PokerAtlas Scraper

Script Python avec Selenium pour récupérer automatiquement les tournois de poker depuis PokerAtlas.com et les importer dans votre application.

## Prérequis

- Python 3.8+
- Google Chrome installé
- Compte PokerAtlas.com

## Installation

### 1. Installer Python et les dépendances

```bash
cd scraper
pip install -r requirements.txt
```

### 2. Configuration

Copiez le fichier `.env.example` vers `.env` et configurez vos identifiants:

```bash
cp .env.example .env
```

Éditez `.env` avec vos informations:
```env
POKERATLAS_EMAIL=votre-email@example.com
POKERATLAS_PASSWORD=votre-mot-de-passe
API_URL=http://localhost:3000/api
USER_ID=1
```

## Utilisation

### Lancer le scraper (mode visuel)

```bash
python pokeratlas_scraper.py
```

Le script va:
1. ✅ Ouvrir Chrome en mode visible
2. 🔐 Se connecter à PokerAtlas avec vos identifiants
3. 📍 Naviguer vers la page des tournois de Las Vegas
4. 📊 Extraire les données des tournois
5. 📤 Envoyer les tournois à votre API locale
6. 📸 Créer des screenshots pour le débogage

### Fichiers générés pour débogage

Le script crée plusieurs fichiers utiles:
- `/tmp/before_login.png` - Screenshot avant la connexion
- `/tmp/after_login.png` - Screenshot après la connexion
- `/tmp/las_vegas_tournaments.png` - Page des tournois
- `/tmp/page_source.html` - Code HTML de la page

## Fonctionnalités

### ✅ Implémenté
- Connexion automatique à PokerAtlas
- Navigation vers les tournois Las Vegas
- Screenshots de débogage
- Sauvegarde du code HTML
- Configuration via fichier .env
- **Filtrage automatique par dates (03-12 juin 2026)**
- Validation des dates dans la plage définie

### 🔄 En cours de développement
- Extraction automatique des données de tournois
- Parsing des dates, heures, casinos, buy-ins (selon structure HTML)
- Import automatique vers l'API

## Structure du code

```python
class PokerAtlasScraper:
    - setup_driver()      # Configure Chrome avec Selenium
    - login()             # Connexion à PokerAtlas
    - navigate_to_las_vegas_tournaments()  # Va sur la page LV
    - extract_tournaments()  # Extrait les données
    - send_to_api()       # Envoie à l'API backend
    - run()               # Lance tout le processus
```

## Prochaines étapes

1. **Phase 1 - Test de connexion** ✅
   - Vérifier que la connexion fonctionne
   - Analyser la structure HTML de la page

2. **Phase 2 - Extraction des données**
   - Identifier les sélecteurs CSS corrects
   - Parser les informations des tournois
   - Filtrer par dates

3. **Phase 3 - Intégration complète**
   - Automatiser l'import vers l'API
   - Gérer les doublons
   - Ajouter la gestion d'erreurs

## Sécurité

⚠️ **IMPORTANT**: Le fichier `.env` contient vos identifiants. Ne le partagez jamais et ne le commitez pas dans Git.

Le fichier est déjà dans `.gitignore` pour éviter les accidents.

## Dépannage

### Erreur de connexion
- Vérifiez vos identifiants dans `.env`
- Consultez `/tmp/login_failed.png` pour voir l'erreur

### Chrome ne se lance pas
- Vérifiez que Chrome est installé
- Le script télécharge automatiquement ChromeDriver

### Pas de tournois extraits
- Consultez `/tmp/page_source.html` pour analyser la structure
- Vérifiez les screenshots dans `/tmp/`

## Support

En cas de problème, les fichiers de débogage vous aideront à identifier l'erreur.
