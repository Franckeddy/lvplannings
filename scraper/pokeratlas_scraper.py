#!/usr/bin/env python3
"""
PokerAtlas Scraper - Récupération des tournois de poker à Las Vegas
"""

import os
import time
import requests
from datetime import datetime, date
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

class PokerAtlasScraper:
    def __init__(self):
        self.email = os.getenv('POKERATLAS_EMAIL')
        self.password = os.getenv('POKERATLAS_PASSWORD')
        self.api_url = os.getenv('API_URL', 'http://localhost:3000/api')
        self.user_id = os.getenv('USER_ID', '1')
        self.driver = None

        # Dates de filtrage: 03 juin au 12 juin 2026
        self.start_date = date(2026, 6, 3)
        self.end_date = date(2026, 6, 12)

        # Mapping des dates pour le format français
        self.date_mapping = {
            date(2026, 6, 3): '03-juin',
            date(2026, 6, 4): '04-juin',
            date(2026, 6, 5): '05-juin',
            date(2026, 6, 6): '06-juin',
            date(2026, 6, 7): '07-juin',
            date(2026, 6, 8): '08-juin',
            date(2026, 6, 9): '09-juin',
            date(2026, 6, 10): '10-juin',
            date(2026, 6, 11): '11-juin',
            date(2026, 6, 12): '12-juin',
        }

    def setup_driver(self, headless=False):
        """Configure le driver Chrome"""
        chrome_options = Options()
        if headless:
            chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        chrome_options.add_argument('--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=chrome_options)
        self.driver.maximize_window()
        print("✓ Driver Chrome configuré")

    def login(self):
        """Se connecter à PokerAtlas"""
        try:
            print("\n🔐 Connexion à PokerAtlas...")
            self.driver.get('https://www.pokeratlas.com/login')
            time.sleep(2)

            # Attendre et remplir le formulaire de connexion
            wait = WebDriverWait(self.driver, 10)

            # Chercher le champ email
            email_field = wait.until(EC.presence_of_element_located((By.NAME, 'email')))
            email_field.clear()
            email_field.send_keys(self.email)
            print(f"✓ Email saisi: {self.email}")

            # Chercher le champ password
            password_field = self.driver.find_element(By.NAME, 'password')
            password_field.clear()
            password_field.send_keys(self.password)
            print("✓ Mot de passe saisi")

            # Prendre un screenshot avant de se connecter
            self.driver.save_screenshot('/tmp/before_login.png')
            print("✓ Screenshot sauvegardé: /tmp/before_login.png")

            # Chercher et cliquer sur le bouton de connexion
            login_button = self.driver.find_element(By.CSS_SELECTOR, 'button[type="submit"]')
            login_button.click()
            print("✓ Bouton de connexion cliqué")

            # Attendre que la connexion soit effective
            time.sleep(3)

            # Vérifier si la connexion a réussi
            current_url = self.driver.current_url
            if 'login' not in current_url:
                print("✓ Connexion réussie!")
                self.driver.save_screenshot('/tmp/after_login.png')
                print("✓ Screenshot après connexion: /tmp/after_login.png")
                return True
            else:
                print("✗ Échec de la connexion - toujours sur la page de login")
                self.driver.save_screenshot('/tmp/login_failed.png')
                print("✓ Screenshot d'échec: /tmp/login_failed.png")
                return False

        except Exception as e:
            print(f"✗ Erreur lors de la connexion: {str(e)}")
            self.driver.save_screenshot('/tmp/login_error.png')
            return False

    def navigate_to_las_vegas_tournaments(self):
        """Naviguer vers la page des tournois de Las Vegas"""
        try:
            print("\n📍 Navigation vers les tournois de Las Vegas...")
            self.driver.get('https://www.pokeratlas.com/poker-tournaments/las-vegas')
            time.sleep(3)

            self.driver.save_screenshot('/tmp/las_vegas_tournaments.png')
            print("✓ Page des tournois chargée")
            print("✓ Screenshot: /tmp/las_vegas_tournaments.png")

            return True
        except Exception as e:
            print(f"✗ Erreur lors de la navigation: {str(e)}")
            return False

    def is_date_in_range(self, tournament_date):
        """Vérifie si une date est dans la plage 03-13 juin 2026"""
        try:
            # Si c'est déjà un objet date
            if isinstance(tournament_date, date):
                return self.start_date <= tournament_date <= self.end_date

            # Si c'est une chaîne de caractères, essayer de la parser
            # Format attendu: "Jun 3", "June 03", etc.
            if isinstance(tournament_date, str):
                # Retirer les espaces et convertir en minuscules
                date_str = tournament_date.strip().lower()

                # Essayer différents formats
                for fmt in ['%b %d', '%B %d', '%m/%d', '%d/%m']:
                    try:
                        parsed = datetime.strptime(date_str, fmt)
                        # Ajouter l'année 2026
                        full_date = date(2026, parsed.month, parsed.day)
                        return self.start_date <= full_date <= self.end_date
                    except:
                        continue

            return False
        except Exception as e:
            print(f"⚠️  Erreur lors de la validation de date: {str(e)}")
            return False

    def parse_date_to_french(self, tournament_date_str):
        """Convertit une date du format PokerAtlas vers le format français (ex: '04-juin')"""
        try:
            # Essayer de parser la date
            for fmt in ['%b %d', '%B %d', '%m/%d/%Y', '%Y-%m-%d']:
                try:
                    parsed = datetime.strptime(tournament_date_str.strip(), fmt)
                    full_date = date(2026, parsed.month, parsed.day)
                    return self.date_mapping.get(full_date, None)
                except:
                    continue
            return None
        except:
            return None

    def extract_tournaments(self):
        """Extraire les données des tournois du 03 au 13 juin 2026"""
        try:
            print(f"\n📊 Extraction des tournois (du {self.start_date.strftime('%d/%m/%Y')} au {self.end_date.strftime('%d/%m/%Y')})...")

            # Sauvegarder le HTML pour analyse
            with open('/tmp/page_source.html', 'w', encoding='utf-8') as f:
                f.write(self.driver.page_source)
            print("✓ Source HTML sauvegardé: /tmp/page_source.html")

            # Attendre que les tournois se chargent
            wait = WebDriverWait(self.driver, 10)

            tournaments = []

            # Essayer différents sélecteurs possibles
            try:
                tournament_elements = self.driver.find_elements(By.CSS_SELECTOR, '.tournament-item, .tournament, [class*="tournament"]')
                print(f"✓ Trouvé {len(tournament_elements)} éléments de tournois potentiels")

                # Parser chaque élément de tournoi
                for elem in tournament_elements:
                    try:
                        # Extraire les informations (à ajuster selon la structure réelle)
                        tournament_data = self.parse_tournament_element(elem)

                        if tournament_data and self.is_date_in_range(tournament_data.get('raw_date')):
                            tournaments.append(tournament_data)
                            print(f"  ✓ Tournoi ajouté: {tournament_data['casino']} - {tournament_data['date']}")
                        elif tournament_data:
                            print(f"  ⊗ Tournoi hors période: {tournament_data.get('raw_date')}")
                    except Exception as e:
                        print(f"  ⚠️  Erreur de parsing d'un tournoi: {str(e)}")
                        continue

            except Exception as e:
                print(f"✗ Erreur lors de la recherche des tournois: {str(e)}")

            print(f"\n✓ Total de tournois extraits dans la période: {len(tournaments)}")
            return tournaments

        except Exception as e:
            print(f"✗ Erreur lors de l'extraction: {str(e)}")
            return []

    def parse_tournament_element(self, element):
        """Parse un élément de tournoi (à adapter selon la structure HTML réelle)"""
        try:
            # IMPORTANT: Ces sélecteurs devront être ajustés après analyse du HTML
            # Ceci est un template qui devra être modifié

            tournament = {}

            # Extraire les données (exemples de sélecteurs à ajuster)
            # tournament['raw_date'] = element.find_element(By.CSS_SELECTOR, '.date').text
            # tournament['time'] = element.find_element(By.CSS_SELECTOR, '.time').text
            # tournament['casino'] = element.find_element(By.CSS_SELECTOR, '.venue').text
            # buyin_text = element.find_element(By.CSS_SELECTOR, '.buyin').text
            # tournament['levels'] = element.find_element(By.CSS_SELECTOR, '.structure').text

            # Pour le moment, retourner None car on ne connaît pas la structure exacte
            return None

        except Exception as e:
            return None

    def send_to_api(self, tournaments):
        """Envoyer les tournois à l'API"""
        try:
            print(f"\n📤 Envoi de {len(tournaments)} tournois à l'API...")

            for tournament in tournaments:
                response = requests.post(
                    f"{self.api_url}/users/{self.user_id}/tournaments",
                    json=tournament
                )

                if response.status_code == 201:
                    print(f"✓ Tournoi ajouté: {tournament['casino']} - {tournament['date']} {tournament['time']}")
                else:
                    print(f"✗ Erreur lors de l'ajout: {response.status_code}")

        except Exception as e:
            print(f"✗ Erreur lors de l'envoi à l'API: {str(e)}")

    def run(self, headless=False):
        """Exécuter le scraper"""
        try:
            print("=" * 60)
            print("🎰 POKERATLAS SCRAPER - Récupération des tournois")
            print("=" * 60)

            self.setup_driver(headless)

            if not self.login():
                print("\n❌ Impossible de se connecter. Vérifiez vos identifiants.")
                return False

            if not self.navigate_to_las_vegas_tournaments():
                print("\n❌ Impossible de naviguer vers les tournois.")
                return False

            tournaments = self.extract_tournaments()

            if tournaments:
                self.send_to_api(tournaments)
            else:
                print("\n⚠️  Aucun tournoi extrait. Analyse manuelle nécessaire.")
                print("📁 Consultez les fichiers suivants pour déboguer:")
                print("   - /tmp/page_source.html")
                print("   - /tmp/las_vegas_tournaments.png")

            print("\n" + "=" * 60)
            print("✓ Scraper terminé")
            print("=" * 60)

            return True

        except Exception as e:
            print(f"\n❌ Erreur fatale: {str(e)}")
            return False

        finally:
            if self.driver:
                print("\n🔒 Fermeture du navigateur...")
                time.sleep(2)
                self.driver.quit()

def main():
    scraper = PokerAtlasScraper()
    scraper.run(headless=False)  # Mode visuel pour le premier test

if __name__ == "__main__":
    main()
