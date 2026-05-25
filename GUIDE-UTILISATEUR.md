# 📚 Guide Utilisateur - Application Poker Vegas

## 🎯 Vue d'ensemble

L'application Poker Vegas vous permet de planifier vos tournois de poker à Las Vegas avec deux méthodes:
1. **Saisie manuelle** avec autocomplétion intelligente
2. **Sélection depuis la timeline** des 531 tournois scrapés automatiquement

---

## 🚀 Démarrage rapide

### 1. Lancer l'application

**Backend:**
```bash
cd backend
npm run dev
```
L'API sera disponible sur `http://localhost:3000`

**Frontend:**
```bash
cd frontend
npm run dev
```
L'application sera disponible sur `http://localhost:5173`

### 2. Créer ou sélectionner un utilisateur

- Cliquez sur le sélecteur d'utilisateur en haut
- Sélectionnez un utilisateur existant (ex: HUGO)
- Ou créez un nouvel utilisateur en cliquant sur "Nouvel utilisateur"

---

## 📝 Méthode 1: Saisie avec Autocomplétion

### Étapes:

1. **Accédez à l'onglet "Mon Planning"**

2. **Cliquez sur "Ajouter un tournoi"**

3. **Sélectionnez une date**
   - Choisissez parmi les dates du 3 au 12 juin 2026
   - Dès que vous sélectionnez une date, les tournois disponibles s'affichent automatiquement!

4. **Choisissez un tournoi suggéré (OPTIONNEL)**
   - Une grille de cartes affiche tous les tournois pour cette date
   - Chaque carte montre:
     - ⏰ L'heure du tournoi
     - 🎰 Le casino
     - 💵 Le buy-in
   - Cliquez sur une carte pour pré-remplir le formulaire

5. **OU Saisissez manuellement**
   - Heure: Utilisez le sélecteur d'heure
   - Casino: L'autocomplétion vous suggère les casinos
   - Buy-in: Montant en $ (laisser vide pour DAY 2)
   - Niveaux: Ex: "30 mn", "DAY 2 MS", "30/40 mn"

6. **Cliquez sur "Ajouter"**

### Exemple concret:

```
Date: 06-juin
→ 59 tournois s'affichent automatiquement

Vous cliquez sur la carte:
┌─────────────────────┐
│      19:00          │
│   Aria Casino       │
│      $300           │
└─────────────────────┘

Le formulaire se remplit automatiquement:
- Heure: 19:00
- Casino: Aria Casino
- Buy-in: 300

Il vous reste à ajouter:
- Niveaux: "25 mn"

Et c'est fini!
```

---

## 📅 Méthode 2: Timeline des Tournois

### Étapes:

1. **Accédez à l'onglet "Timeline des Tournois"**

2. **Parcourez les tournois par date**
   - Les tournois sont organisés par jour
   - Cliquez sur "Développer" pour voir les tournois d'un jour
   - Cliquez sur "Réduire" pour masquer

3. **Utilisez les filtres (OPTIONNEL)**
   - **Casino**: Filtrez par nom de casino
   - **Buy-in Min**: Montant minimum
   - **Buy-in Max**: Montant maximum
   - Cliquez sur "Réinitialiser" pour effacer les filtres

4. **Sélectionnez un tournoi**
   - Cliquez sur un tournoi dans la liste
   - OU cliquez sur le bouton "Ajouter"

5. **Dans la fenêtre qui s'ouvre:**
   - Vérifiez les informations du tournoi
   - Sélectionnez l'utilisateur (vous ou un ami)
   - Ajoutez les niveaux (ex: "30 mn")
   - Cliquez sur "Ajouter au planning"

### Exemple concret:

```
1. Ouvrez "Timeline des Tournois"
2. Filtrez: Buy-in Min = 200, Buy-in Max = 400
3. Développez "vendredi 6 juin"
4. Vous voyez:

   13:00  │  Wynn Las Vegas  │  $600  │  [Ajouter]
   19:00  │  Aria Casino     │  $300  │  [Ajouter]

5. Cliquez sur "Aria Casino $300"
6. Sélectionnez votre utilisateur
7. Ajoutez "25 mn" dans Niveaux
8. Cliquez sur "Ajouter au planning"

✅ Le tournoi est ajouté!
```

---

## 🔍 Fonctionnalités avancées

### Filtrage dans la Timeline

**Par Casino:**
```
Tapez "Aria" → Seuls les tournois à l'Aria s'affichent
```

**Par Budget:**
```
Min: 100, Max: 300 → Seulement les tournois entre $100 et $300
```

**Combiné:**
```
Casino: "WSOP"
Min: 500
→ Seulement les tournois WSOP à $500+
```

### Import Rapide

Si vous avez une liste de tournois (copié-collé depuis un site):

1. Cliquez sur "Import Rapide" dans "Mon Planning"
2. Collez vos données
3. Cliquez sur "Importer"

Format accepté:
```
04-juin 11:00 The Orleans 400 30/40 mn
05-juin 13:00 WSOP Daily 250 30 mn
```

### Export PDF

1. Dans "Mon Planning"
2. Cliquez sur "Exporter PDF"
3. Un PDF sera généré avec:
   - Votre planning complet
   - Les statistiques (total buy-ins, nombre de tournois)
   - Les casinos visités

---

## 🎰 Base de données des tournois

L'application contient **531 tournois** scrapés automatiquement depuis PokerAtlas:

### Répartition:

```
📅 Dates: 4-12 juin 2026 (9 jours)

🎰 Top Casinos:
1. World Series of Poker    - 90 tournois
2. Venetian Las Vegas        - 63 tournois
3. Horseshoe Las Vegas       - 54 tournois
4. Westgate Las Vegas        - 45 tournois
5. + 9 autres casinos majeurs

💰 Buy-ins:
- $0-$100:     225 tournois (42%)
- $101-$200:   135 tournois (25%)
- $201-$300:    72 tournois (14%)
- $301-$500:     9 tournois (2%)
- $500+:        90 tournois (17%)

⏰ Horaires:
- Matin:       126 tournois (24%)
- Après-midi:  234 tournois (44%)
- Soir:        171 tournois (32%)
```

---

## 💡 Astuces et conseils

### Pour une saisie rapide:

1. **Utilisez l'autocomplétion**
   - Sélectionnez la date
   - Cliquez sur un tournoi suggéré
   - Ajoutez juste les niveaux

2. **Dupliquez des tournois similaires**
   - Si vous jouez le même tournoi plusieurs jours
   - Copiez les infos d'un jour précédent

### Pour organiser un trip de groupe:

1. **Créez un utilisateur par personne**
   - HUGO, FRANCK, THOMAS, etc.

2. **Utilisez la Timeline**
   - Ajoutez les tournois pour chaque personne
   - Comparez les plannings

3. **Identifiez les tournois communs**
   - Regardez où tout le monde joue
   - Planifiez le transport ensemble

### Pour budgéter:

1. **Regardez le résumé dans "Mon Planning"**
   - Total buy-ins affichés
   - Nombre de jours
   - Budget moyen par jour

2. **Filtrez par budget dans la Timeline**
   - Définissez votre budget maximum
   - Ne voyez que ce qui correspond

---

## ❓ FAQ

### Comment ajouter un tournoi qui n'est pas dans la base?

Utilisez la saisie manuelle:
1. Cliquez sur "Ajouter un tournoi"
2. Remplissez tous les champs manuellement
3. Le casino s'ajoute avec autocomplétion

### Puis-je modifier un tournoi ajouté?

Actuellement, il faut supprimer et recréer le tournoi.
Une fonctionnalité d'édition sera ajoutée prochainement.

### Les données sont-elles sauvegardées?

Oui! Tout est enregistré dans une base de données SQLite locale.
Vos plannings persistent entre les sessions.

### Puis-je partager mon planning?

Utilisez l'export PDF pour:
- Imprimer votre planning
- L'envoyer par email
- Le sauvegarder sur votre téléphone

### Les tournois affichés sont-ils à jour?

Les 531 tournois ont été scrapés le 24 mai 2026.
Pour les toutes dernières infos:
- Vérifiez sur PokerAtlas.com
- Ajoutez/modifiez manuellement si nécessaire

### Combien d'utilisateurs puis-je créer?

Illimité! Créez un utilisateur par personne de votre groupe.

---

## 🐛 Problèmes courants

### L'autocomplétion ne fonctionne pas

**Solution:** Vérifiez que:
1. Le backend est lancé (`npm run dev` dans `/backend`)
2. L'URL de l'API est correcte (http://localhost:3000)
3. Votre navigateur n'a pas d'extensions bloquant les requêtes

### La Timeline est vide

**Solution:**
1. Vérifiez que la base de données contient des tournois:
   ```bash
   cd backend
   node show-summary.js
   ```
2. Si vide, relancez l'import:
   ```bash
   node clean-and-import.js poker-tournaments-june.json
   ```

### Les suggestions ne s'affichent pas pour ma date

**Cause:** La date sélectionnée n'est pas dans la période 4-12 juin 2026.

**Solution:** Choisissez une date dans cette période, ou ajoutez manuellement.

---

## 🎓 Tutoriel vidéo (à venir)

Des captures d'écran et une vidéo tutorielle seront ajoutées prochainement.

---

## 📞 Support

- **Documentation technique**: Voir `/backend/SCRAPER-README.md`
- **Résultats du scraping**: Voir `/backend/FINAL-RESULTS.md`
- **Code source**: Tous les fichiers sont commentés

---

## 🎉 Profitez de Vegas!

Bon tournoi et que les cartes soient avec vous! 🃏♠️♥️♦️♣️

**Astuce finale**: Imprimez votre planning avant de partir et gardez-le dans votre poche. Les casinos de Vegas sont grands et il est facile de se perdre dans le temps!
