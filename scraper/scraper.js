#!/usr/bin/env node

import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';

// Charger les variables d'environnement
dotenv.config();

// Configuration des dates: 03 au 12 juin 2026
const DATE_MAPPING = {
  '2026-06-03': '03-juin',
  '2026-06-04': '04-juin',
  '2026-06-05': '05-juin',
  '2026-06-06': '06-juin',
  '2026-06-07': '07-juin',
  '2026-06-08': '08-juin',
  '2026-06-09': '09-juin',
  '2026-06-10': '10-juin',
  '2026-06-11': '11-juin',
  '2026-06-12': '12-juin',
};

const START_DATE = new Date('2026-06-03');
const END_DATE = new Date('2026-06-12');

class PokerAtlasScraper {
  constructor() {
    this.email = process.env.POKERATLAS_EMAIL;
    this.password = process.env.POKERATLAS_PASSWORD;
    this.apiUrl = process.env.API_URL || 'http://localhost:3000/api';
    this.userId = process.env.USER_ID || '1';
    this.browser = null;
    this.page = null;
  }

  log(emoji, message) {
    console.log(`${emoji} ${message}`);
  }

  async init() {
    this.log('🚀', 'Lancement du scraper PokerAtlas...');
    this.log('📅', `Période: du 03/06/2026 au 12/06/2026`);

    this.browser = await puppeteer.launch({
      headless: false, // Mode visible pour déboguer
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
      defaultViewport: { width: 1280, height: 800 }
    });

    this.page = await this.browser.newPage();

    // Configurer le User-Agent
    await this.page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    this.log('✓', 'Navigateur lancé');
  }

  async login() {
    try {
      this.log('🔐', 'Connexion à PokerAtlas...');

      await this.page.goto('https://www.pokeratlas.com/login', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await this.page.waitForTimeout(3000);
      await this.page.screenshot({ path: '/tmp/before_login.png' });
      this.log('📸', 'Screenshot: /tmp/before_login.png');

      // Accepter les cookies si nécessaire
      try {
        const acceptButton = await this.page.$('button:has-text("Fermer et accepter")');
        if (acceptButton) {
          await acceptButton.click();
          this.log('✓', 'Cookies acceptés');
          await this.page.waitForTimeout(1000);
        }
      } catch (e) {
        // Pas de popup cookies, on continue
      }

      // Chercher les champs de formulaire par différents sélecteurs
      this.log('🔍', 'Recherche des champs de formulaire...');

      // Essayer plusieurs sélecteurs pour le champ email/username
      const emailSelectors = [
        'input[name="email"]',
        'input[name="username"]',
        'input[type="email"]',
        'input[placeholder*="utilisateur"]',
        'input[placeholder*="courriel"]',
        'input.form-control:first-of-type'
      ];

      let emailField = null;
      for (const selector of emailSelectors) {
        try {
          emailField = await this.page.$(selector);
          if (emailField) {
            this.log('✓', `Champ email trouvé avec: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!emailField) {
        // Chercher par index dans les inputs
        const inputs = await this.page.$$('input[type="text"], input[type="email"], input:not([type])');
        if (inputs.length > 0) {
          emailField = inputs[0];
          this.log('✓', 'Champ email trouvé par index');
        }
      }

      // Chercher le champ password
      const passwordSelectors = [
        'input[name="password"]',
        'input[type="password"]'
      ];

      let passwordField = null;
      for (const selector of passwordSelectors) {
        try {
          passwordField = await this.page.$(selector);
          if (passwordField) {
            this.log('✓', `Champ password trouvé avec: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!emailField || !passwordField) {
        this.log('✗', 'Impossible de trouver les champs de formulaire');
        return false;
      }

      // Remplir le formulaire - méthode alternative
      await this.page.evaluate((selector, value) => {
        const input = document.querySelector(selector) || document.querySelectorAll('input[type="text"], input[type="email"], input:not([type])')[0];
        if (input) {
          input.value = value;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, emailSelectors.find(s => emailField) || 'input', this.email);

      this.log('✓', `Email saisi: ${this.email}`);

      await this.page.evaluate((value) => {
        const input = document.querySelector('input[type="password"]');
        if (input) {
          input.value = value;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, this.password);

      this.log('✓', 'Mot de passe saisi');

      await this.page.screenshot({ path: '/tmp/form_filled.png' });
      this.log('📸', 'Screenshot formulaire rempli: /tmp/form_filled.png');

      // Cliquer sur le bouton - méthode directe avec evaluate
      this.log('🔍', 'Recherche du bouton de connexion...');

      const clicked = await this.page.evaluate(() => {
        // Chercher le bouton par son texte
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
        const submitButton = buttons.find(btn =>
          btn.textContent.includes('Se connecter') ||
          btn.textContent.includes('Connexion') ||
          btn.type === 'submit'
        );

        if (submitButton) {
          submitButton.click();
          return true;
        }
        return false;
      });

      if (!clicked) {
        this.log('✗', 'Bouton de connexion non trouvé');
        return false;
      }

      this.log('✓', 'Bouton de connexion cliqué');

      // Attendre la navigation
      await this.page.waitForTimeout(3000);
      await this.page.waitForTimeout(3000);

      await this.page.screenshot({ path: '/tmp/after_login.png' });
      this.log('📸', 'Screenshot: /tmp/after_login.png');

      const currentUrl = this.page.url();
      this.log('🌐', `URL actuelle: ${currentUrl}`);

      if (!currentUrl.includes('login')) {
        this.log('✓', 'Connexion réussie!');
        return true;
      } else {
        this.log('✗', 'Échec de la connexion - toujours sur la page login');
        return false;
      }
    } catch (error) {
      this.log('✗', `Erreur lors de la connexion: ${error.message}`);
      await this.page.screenshot({ path: '/tmp/login_error.png' });
      return false;
    }
  }

  async navigateToTournaments() {
    try {
      this.log('📍', 'Navigation vers les tournois Las Vegas...');

      // Essayer différentes URLs (français/anglais)
      const urls = [
        'https://www.pokeratlas.com/fr/poker-tournaments/las-vegas',
        'https://www.pokeratlas.com/poker-tournaments/las-vegas',
        'https://www.pokeratlas.com/tournois-de-poker/las-vegas'
      ];

      let success = false;
      for (const url of urls) {
        try {
          this.log('🔗', `Essai: ${url}`);
          await this.page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 15000
          });

          await this.page.waitForTimeout(3000);

          // Vérifier si la page s'est chargée
          const currentUrl = this.page.url();
          if (!currentUrl.includes('404') && !currentUrl.includes('error')) {
            this.log('✓', `Page chargée: ${currentUrl}`);
            success = true;
            break;
          }
        } catch (e) {
          this.log('⚠️', `Échec avec ${url}: ${e.message}`);
          continue;
        }
      }

      if (!success) {
        this.log('✗', 'Toutes les URLs ont échoué');
        return false;
      }

      await this.page.screenshot({ path: '/tmp/tournaments_page.png' });
      this.log('📸', 'Screenshot: /tmp/tournaments_page.png');

      // Sauvegarder le HTML
      const html = await this.page.content();
      fs.writeFileSync('/tmp/page_source.html', html, 'utf-8');
      this.log('💾', 'HTML sauvegardé: /tmp/page_source.html');

      return true;
    } catch (error) {
      this.log('✗', `Erreur de navigation: ${error.message}`);
      return false;
    }
  }

  isDateInRange(dateStr) {
    try {
      const date = new Date(dateStr);
      return date >= START_DATE && date <= END_DATE;
    } catch {
      return false;
    }
  }

  async extractTournaments() {
    try {
      this.log('📊', 'Extraction des tournois...');

      // TODO: Ajuster les sélecteurs selon la structure HTML réelle
      // Pour l'instant, on analyse la page

      const tournaments = await this.page.evaluate(() => {
        const results = [];

        // Essayer différents sélecteurs
        const selectors = [
          '.tournament-item',
          '.tournament',
          '[class*="tournament"]',
          '.event-item',
          '[data-tournament]'
        ];

        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            console.log(`Trouvé ${elements.length} éléments avec ${selector}`);

            elements.forEach((elem, index) => {
              results.push({
                index,
                selector,
                html: elem.outerHTML.substring(0, 500), // Premiers 500 caractères
                text: elem.textContent.substring(0, 200)
              });
            });

            break; // Arrêter après le premier sélecteur qui fonctionne
          }
        }

        return results;
      });

      this.log('📋', `Éléments trouvés: ${tournaments.length}`);

      if (tournaments.length > 0) {
        // Sauvegarder les données brutes pour analyse
        fs.writeFileSync('/tmp/tournaments_raw.json', JSON.stringify(tournaments, null, 2), 'utf-8');
        this.log('💾', 'Données brutes: /tmp/tournaments_raw.json');
      }

      return [];
    } catch (error) {
      this.log('✗', `Erreur extraction: ${error.message}`);
      return [];
    }
  }

  async sendToApi(tournaments) {
    try {
      this.log('📤', `Envoi de ${tournaments.length} tournois à l'API...`);

      for (const tournament of tournaments) {
        try {
          const response = await axios.post(
            `${this.apiUrl}/users/${this.userId}/tournaments`,
            tournament
          );

          if (response.status === 201) {
            this.log('✓', `Ajouté: ${tournament.casino} - ${tournament.date} ${tournament.time}`);
          }
        } catch (error) {
          this.log('✗', `Erreur ajout: ${error.message}`);
        }
      }
    } catch (error) {
      this.log('✗', `Erreur envoi API: ${error.message}`);
    }
  }

  async run() {
    try {
      console.log('═'.repeat(60));
      console.log('🎰  POKERATLAS SCRAPER - Récupération des tournois');
      console.log('═'.repeat(60));

      await this.init();

      if (!await this.login()) {
        this.log('❌', 'Impossible de se connecter');
        return false;
      }

      if (!await this.navigateToTournaments()) {
        this.log('❌', 'Impossible de charger les tournois');
        return false;
      }

      const tournaments = await this.extractTournaments();

      if (tournaments.length > 0) {
        await this.sendToApi(tournaments);
      } else {
        this.log('⚠️', 'Aucun tournoi extrait - Analyse manuelle nécessaire');
        this.log('📁', 'Consultez:');
        this.log('  ', '- /tmp/page_source.html');
        this.log('  ', '- /tmp/tournaments_page.png');
        this.log('  ', '- /tmp/tournaments_raw.json');
      }

      console.log('═'.repeat(60));
      this.log('✓', 'Scraper terminé');
      console.log('═'.repeat(60));

      return true;
    } catch (error) {
      this.log('❌', `Erreur fatale: ${error.message}`);
      return false;
    } finally {
      if (this.browser) {
        await this.page.waitForTimeout(2000);
        await this.browser.close();
        this.log('🔒', 'Navigateur fermé');
      }
    }
  }
}

// Lancer le scraper
const scraper = new PokerAtlasScraper();
scraper.run().then(success => {
  process.exit(success ? 0 : 1);
});
