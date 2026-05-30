<template>
  <div class="app-container dark-mode">
    <!-- Mobile Toggle Button -->
    <button
      v-if="isMobile && sidebarCollapsed"
      class="mobile-toggle"
      @click="toggleSidebar"
      aria-label="Ouvrir le menu"
    >
      <i class="pi pi-bars"></i>
    </button>

    <!-- Overlay for mobile -->
    <div
      v-if="isMobile && !sidebarCollapsed"
      class="sidebar-overlay"
      :class="{ 'active': !sidebarCollapsed }"
      @click="toggleSidebar"
    ></div>

    <!-- Sidebar Latérale Gauche -->
    <aside class="sidebar" :class="{ 'collapsed': sidebarCollapsed }">
      <div class="sidebar-header">
        <Button
          icon="pi pi-bars"
          @click="toggleSidebar"
          rounded
          text
          class="sidebar-toggle"
          aria-label="Toggle sidebar"
        />
      </div>

      <div class="sidebar-content" v-show="!sidebarCollapsed">
        <div class="app-title">
          <div class="title-text">
            <h1>Las Vegas 2026</h1>
            <p class="subtitle">Programme Poker</p>
          </div>
        </div>

        <button
            class="map-link-button"
            @click="showCasinoMap = true"
        >
          <i class="pi pi-map"></i>
          CARTE DES CASINOS
        </button>

        <div class="divider"></div>

        <nav class="sidebar-nav">
          <Button
            label="Planning des tournois"
            icon="pi pi-calendar"
            @click="selectView('timeline')"
            :class="['nav-button', { 'nav-button-active': currentView === 'timeline' }]"
          />
          <Button
            v-if="selectedUser"
            :label="`Planning de ${selectedUser.name}`"
            icon="pi pi-list-check"
            @click="selectView('planning')"
            :class="['nav-button', { 'nav-button-active': currentView === 'planning' }]"
          />
          <Button
            label="Récap Team"
            icon="pi pi-users"
            @click="selectView('team')"
            :class="['nav-button', { 'nav-button-active': currentView === 'team' }]"
          />
        </nav>

        <div class="divider"></div>

        <UserSelector
          :key="usersKey"
          :users="users"
          :selected-user="selectedUser"
          @user-selected="handleUserSelected"
          @user-created="handleUserCreated"
          @user-disconnected="handleUserDisconnected"
        />

        <div class="sidebar-external-link">
          <a
            href="https://bdtgif.github.io/PokerNotes/"
            target="_blank"
            rel="noopener noreferrer"
            class="external-link-button"
          >
            <i class="pi pi-external-link"></i>
            POKER-HANDS
          </a>
        </div>
      </div>
    </aside>

    <!-- Carte des Casinos -->
    <CasinoMap v-model="showCasinoMap" />

    <!-- Main Content -->
    <main class="main-content">
      <!-- Planning View -->
      <TournamentList
        v-if="selectedUser && currentView === 'planning'"
        :user="selectedUser"
        :tournaments="tournaments"
        :summary="summary"
        :loading="loading"
        @refresh="loadUserData"
        @import-tournaments="handleImportTournaments"
        @delete-tournament="handleDeleteTournament"
        @user-created="loadUsers"
      />

      <!-- Timeline View -->
      <TournamentTimeline
        v-else-if="currentView === 'timeline'"
        :connected-user="selectedUser"
        @tournament-added="handleTournamentAddedFromTimeline"
      />

      <!-- Team Recap View -->
      <TeamRecap
        v-else-if="currentView === 'team'"
        :connected-user="selectedUser"
        @user-created="loadUsers"
      />

      <!-- Welcome Message -->
      <div class="welcome" v-else-if="!selectedUser && currentView === 'planning'">
        <i class="pi pi-users" style="font-size: 4rem; color: #94a3b8;"></i>
        <p>Sélectionnez un utilisateur pour voir son programme</p>
      </div>
    </main>

    <!-- Bouton flottant Apps -->
    <button
      class="floating-apps-btn"
      title="Applications utiles"
      @click="showAppsModal = true"
    >
      <i class="pi pi-mobile"></i>
    </button>

    <!-- Modale Apps -->
    <Dialog
      v-model:visible="showAppsModal"
      header="Applications Utiles"
      :modal="true"
      :style="{ width: '420px', maxWidth: '95vw' }"
      class="apps-dialog"
    >
      <div class="apps-modal-content">
        <!-- Switch Apple / Google -->
        <div class="store-switch">
          <button
            class="store-btn"
            :class="{ active: selectedStore === 'google' }"
            @click="selectedStore = 'google'"
          >
            <i class="pi pi-android"></i>
            Google Play
          </button>
          <button
            class="store-btn"
            :class="{ active: selectedStore === 'apple' }"
            @click="selectedStore = 'apple'"
          >
            <i class="pi pi-apple"></i>
            App Store
          </button>
        </div>

        <!-- Liste des apps -->
        <div class="apps-list">
          <!-- rideRTC -->
          <a
            :href="selectedStore === 'google'
              ? 'https://play.google.com/store/apps/details?id=com.rtcsnv.rideRTC&hl=fr'
              : 'https://apps.apple.com/fr/app/ridertc/id909691507'"
            target="_blank"
            rel="noopener noreferrer"
            class="app-link"
          >
            <div class="app-icon rtc-icon">
              <img src="https://play-lh.googleusercontent.com/EsZuaErjsR_gSJeKqSDlgqbQPut24DRAEhkXZfpzWeMoHroIqodoVz69nWIPk51CHVOm=w240-h480" alt="rideRTC" class="app-icon-img" />
            </div>
            <div class="app-info">
              <div class="app-name">rideRTC</div>
              <div class="app-desc">Bus RTC Las Vegas - Horaires et itinéraires</div>
            </div>
            <i class="pi pi-external-link app-link-arrow"></i>
          </a>

          <!-- Transit -->
          <a
            :href="selectedStore === 'google'
              ? 'https://play.google.com/store/apps/details?id=com.thetransitapp.droid&hl=fr'
              : 'https://apps.apple.com/fr/app/transit-horaires-bus-m%C3%A9tro/id498151501'"
            target="_blank"
            rel="noopener noreferrer"
            class="app-link"
          >
            <div class="app-icon transit-icon">
              <img src="https://play-lh.googleusercontent.com/rDVnZ9rwreErP5_wwGrSVtx-prgRBTCJwdCP9iQFkt_3EerJzB0rxA15EIAGYXUNZA=s48" alt="Transit" class="app-icon-img" />
            </div>
            <div class="app-info">
              <div class="app-name">Transit</div>
              <div class="app-desc">Navigation transport en commun - Bus & Métro</div>
            </div>
            <i class="pi pi-external-link app-link-arrow"></i>
          </a>

          <!-- Monorail -->
          <a
            :href="selectedStore === 'google'
              ? 'https://play.google.com/store/apps/details?id=com.lvmonorail.app&hl=fr'
              : 'https://apps.apple.com/app/id6476942189'"
            target="_blank"
            rel="noopener noreferrer"
            class="app-link"
          >
            <div class="app-icon monorail-icon">
              <img src="/monorail.webp" alt="Las Vegas Monorail" class="app-icon-img" />
            </div>
            <div class="app-info">
              <div class="app-name">Las Vegas Monorail</div>
              <div class="app-desc">Monorail du Strip - Horaires et tickets</div>
            </div>
            <i class="pi pi-external-link app-link-arrow"></i>
          </a>

          <!-- Séparateur -->
          <div class="apps-separator">
            <span>Autres</span>
          </div>

          <!-- Google Sheets - Tricount -->
          <a
            href="https://docs.google.com/spreadsheets/d/1uGans4g_OhofWaYTCyc5R2RMGKsW-cRbBuLHApkc4Cw/edit?usp=drivesdk"
            target="_blank"
            rel="noopener noreferrer"
            class="app-link"
          >
            <div class="app-icon sheets-icon">
              <img src="https://ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_spreadsheet_x64.png" alt="Google Sheets" class="app-icon-img" />
            </div>
            <div class="app-info">
              <div class="app-name">Tricount Las Vegas</div>
              <div class="app-desc">Google Sheets - Gestion des dépenses</div>
            </div>
            <i class="pi pi-external-link app-link-arrow"></i>
          </a>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { userService } from './services/api';
import UserSelector from './components/UserSelector.vue';
import TournamentList from './components/TournamentList.vue';
import TournamentTimeline from './components/TournamentTimeline.vue';
import TeamRecap from './components/TeamRecap.vue';
import CasinoMap from './components/CasinoMap.vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';

const users = ref([]);
const usersKey = ref(0);
const sidebarCollapsed = ref(false);
const selectedUser = ref(null);
const tournaments = ref([]);
const summary = ref(null);
const loading = ref(false);
const currentView = ref('timeline');
const windowWidth = ref(window.innerWidth);
const showCasinoMap = ref(false);
const showAppsModal = ref(false);
const selectedStore = ref('google');

// Computed pour détecter si on est sur mobile
const isMobile = computed(() => windowWidth.value <= 768);

// Fonction pour gérer le resize
const handleResize = () => {
  windowWidth.value = window.innerWidth;
  // Fermer automatiquement la sidebar sur mobile au chargement
  if (isMobile.value && !sidebarCollapsed.value) {
    // On ne ferme pas automatiquement, on laisse l'utilisateur décider
  }
};

// Fonction pour sélectionner une vue et fermer la sidebar sur mobile
const selectView = (view) => {
  currentView.value = view;
  if (isMobile.value) {
    sidebarCollapsed.value = true;
  }
};

const loadUsers = async () => {
  try {
    const response = await userService.getAll();
    users.value = response.data;
    usersKey.value++; // Force re-render du UserSelector
  } catch (error) {
    console.error('Erreur lors du chargement des utilisateurs:', error);
  }
};

const loadUserData = async (userId) => {
  if (!userId) return;

  loading.value = true;
  try {
    const [tournamentsResponse, summaryResponse] = await Promise.all([
      userService.getTournaments(userId),
      userService.getSummary(userId)
    ]);

    tournaments.value = tournamentsResponse.data;
    summary.value = summaryResponse.data;
  } catch (error) {
    console.error('Erreur lors du chargement des données:', error);
  } finally {
    loading.value = false;
  }
};

const handleUserSelected = (user) => {
  selectedUser.value = user;
  localStorage.setItem('currentUserId', user.id.toString());
  loadUserData(user.id);
  currentView.value = 'planning';
  if (isMobile.value) {
    sidebarCollapsed.value = true;
  }
};

const handleUserDisconnected = () => {
  selectedUser.value = null;
  tournaments.value = [];
  summary.value = null;
  localStorage.removeItem('currentUserId');
  currentView.value = 'timeline';
};

const handleUserCreated = async (userName) => {
  try {
    const response = await userService.create(userName);
    await loadUsers();
    // Sélectionner automatiquement le nouvel utilisateur créé
    handleUserSelected(response.data);
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur:', error);
  }
};

const handleTournamentAddedFromTimeline = async () => {
  if (selectedUser.value) {
    await loadUserData(selectedUser.value.id);
  }
};

const handleImportTournaments = async (tournamentsArray) => {
  if (!selectedUser.value) return;

  try {
    loading.value = true;
    let successCount = 0;
    let errorCount = 0;

    for (const tournamentData of tournamentsArray) {
      try {
        await userService.addTournament(selectedUser.value.id, tournamentData);
        successCount++;
      } catch (error) {
        console.error('Erreur lors de l\'ajout d\'un tournoi:', error);
        errorCount++;
      }
    }

    console.log(`Import terminé: ${successCount} réussis, ${errorCount} échecs`);
    await loadUserData(selectedUser.value.id);

    if (errorCount > 0) {
      alert(`Import terminé avec des erreurs: ${successCount} tournois importés, ${errorCount} échecs`);
    }
  } catch (error) {
    console.error('Erreur lors de l\'import des tournois:', error);
  } finally {
    loading.value = false;
  }
};

const handleDeleteTournament = async () => {
  if (!selectedUser.value) return;

  // Recharger les données pour mettre à jour l'affichage
  await loadUserData(selectedUser.value.id);
};

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
  // Ne sauvegarder l'état que sur desktop
  if (!isMobile.value) {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed.value.toString());
  }
};

onMounted(async () => {
  await loadUsers();

  // Restaurer l'utilisateur depuis localStorage
  const savedUserId = localStorage.getItem('currentUserId');
  if (savedUserId && users.value.length > 0) {
    const savedUser = users.value.find(u => u.id === parseInt(savedUserId));
    if (savedUser) {
      selectedUser.value = savedUser;
      currentView.value = 'planning';
      loadUserData(savedUser.id);
    }
  }

  // Ajouter le listener pour le resize
  window.addEventListener('resize', handleResize);

  // Charger l'état de la sidebar depuis localStorage (desktop seulement)
  if (!isMobile.value) {
    const savedSidebarState = localStorage.getItem('sidebarCollapsed');
    if (savedSidebarState !== null) {
      sidebarCollapsed.value = savedSidebarState === 'true';
    }
  } else {
    // Sur mobile, la sidebar est fermée par défaut
    sidebarCollapsed.value = true;
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});
</script>

<style>
:root {
  --bg-primary: #f8fafc;
  --bg-secondary: #ffffff;
  --sidebar-bg: #ffffff;
  --sidebar-hover: #f1f5f9;
  --text-primary: #0f172a;
  --text-secondary: #64748b;
  --border-color: #e2e8f0;
  --card-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06);
  --sidebar-shadow: 2px 0 12px rgba(0, 0, 0, 0.05);
  --gradient-start: #667eea;
  --gradient-end: #764ba2;
  --accent-color: #6366f1;
  --sidebar-width: 320px;
  --sidebar-collapsed-width: 80px;
}

.dark-mode {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --sidebar-bg: #1e293b;
  --sidebar-hover: #334155;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --border-color: #334155;
  --card-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  --sidebar-shadow: 2px 0 12px rgba(0, 0, 0, 0.4);
  --gradient-start: #4338ca;
  --gradient-end: #5b21b6;
  --accent-color: #818cf8;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background-color: var(--bg-primary);
  transition: background-color 0.3s ease;
  overflow-x: hidden;
}

.app-container {
  min-height: 100vh;
  display: flex;
  transition: background-color 0.3s ease;
  position: relative;
}

.app-container::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    linear-gradient(rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.85)),
    url('/home-icon.png') center center no-repeat;
  background-size: cover, cover;
  z-index: 0;
  pointer-events: none;
}

/* Sidebar Styles */
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  width: var(--sidebar-width);
  background: rgba(30, 41, 59, 0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-right: 1px solid var(--border-color);
  box-shadow: var(--sidebar-shadow);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar.collapsed {
  width: var(--sidebar-collapsed-width);
}

.sidebar-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.sidebar-toggle {
  font-size: 1.25rem;
  color: var(--text-primary);
  transition: all 0.3s ease;
}

.sidebar-toggle:hover {
  transform: scale(1.1);
  background: var(--sidebar-hover);
}

.sidebar-content {
  flex: 1;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  overflow-y: auto;
}

.sidebar-content::-webkit-scrollbar {
  width: 6px;
}

.sidebar-content::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-content::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.sidebar-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

.app-title {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;
}

.app-icon {
  font-size: 2.5rem;
  background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.title-text h1 {
  color: var(--text-primary);
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
  transition: color 0.3s ease;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin: 0.25rem 0 0 0;
  font-weight: 500;
  transition: color 0.3s ease;
}

.divider {
  height: 1px;
  background: var(--border-color);
  margin: 0.5rem 0;
}

/* Sidebar Navigation */
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Navigation Buttons - Style uniforme */
.nav-button {
  width: 100%;
  justify-content: flex-start !important;
  gap: 0.75rem;
  background: transparent !important;
  color: var(--text-secondary) !important;
  transition: all 0.2s ease;
  padding: 0.875rem 1rem !important;
  border-radius: 8px !important;
  font-weight: 500 !important;
  font-size: 0.9375rem !important;
  border: 1px solid #334155 !important;
}

.nav-button:hover {
  background: var(--sidebar-hover) !important;
  color: var(--text-primary) !important;
}

.nav-button-active {
  background: var(--accent-color) !important;
  color: white !important;
}

.nav-button-active:hover {
  background: var(--accent-color) !important;
  color: white !important;
  opacity: 0.9;
}

/* External Link Button */
.sidebar-external-link {
  margin-top: auto;
  padding-bottom: 3em;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.map-link-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.875rem 1rem;
  background: #6366f1;
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9375rem;
  transition: all 0.3s ease;
  border: none;
  cursor: pointer;
}

.map-link-button:hover {
  transform: translateY(-2px);
}

.map-link-button i {
  font-size: 0.875rem;
}

.external-link-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.875rem 1rem;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9375rem;
  transition: all 0.3s ease;
  border: none;
}

.external-link-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
  opacity: 0.95;
}

.external-link-button i {
  font-size: 0.875rem;
}

/* Main Content */
.main-content {
  margin-left: var(--sidebar-width);
  flex: 1;
  padding: 2rem;
  transition: margin-left 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 100vh;
  position: relative;
  z-index: 1;
}

.sidebar.collapsed ~ .main-content {
  margin-left: var(--sidebar-collapsed-width);
}

/* Bouton flottant Apps */
.floating-apps-btn {
  position: fixed;
  top: 1rem;
  right: 1rem;
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #9333ea, #7c3aed);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  text-decoration: none;
  box-shadow: 0 4px 15px rgba(147, 51, 234, 0.4);
  transition: all 0.3s ease;
  z-index: 1001;
  border: none;
  cursor: pointer;
}

.floating-apps-btn i {
  font-size: 1.5rem;
}

.floating-apps-btn:hover {
  transform: scale(1.1) translateY(-2px);
  box-shadow: 0 6px 20px rgba(147, 51, 234, 0.5);
  background: linear-gradient(135deg, #7e22ce, #6d28d9);
}

.floating-apps-btn:active {
  transform: scale(1.05);
}

/* Modale Apps */
:deep(.apps-dialog .p-dialog-header) {
  background: #0f172a;
  border-bottom: 1px solid #334155;
}

:deep(.apps-dialog .p-dialog-content) {
  background: #0f172a;
  padding: 20px;
}

:deep(.apps-dialog .p-dialog-title) {
  color: #f1f5f9;
  font-weight: 700;
}

.apps-modal-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.store-switch {
  display: flex;
  gap: 10px;
  padding: 6px;
  background: #1e293b;
  border-radius: 12px;
}

.store-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: transparent;
  border: 2px solid transparent;
  border-radius: 8px;
  color: #94a3b8;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.store-btn:hover {
  background: #334155;
  color: #f1f5f9;
}

.store-btn.active {
  background: linear-gradient(135deg, #6366f1, #818cf8);
  color: white;
  border-color: #818cf8;
}

.store-btn i {
  font-size: 1.125rem;
}

.apps-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.app-link {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #1e293b;
  border-radius: 12px;
  text-decoration: none;
  color: #f1f5f9;
  transition: all 0.2s ease;
  border: 2px solid #334155;
}

.app-link:hover {
  background: #334155;
  border-color: #6366f1;
  transform: translateX(4px);
}

.app-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.app-icon i {
  font-size: 1.5rem;
  color: white;
}

.app-icon-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 12px;
}

.rtc-icon {
  background: linear-gradient(135deg, #e53935, #c62828);
}

.transit-icon {
  background: linear-gradient(135deg, #22c55e, #16a34a);
}

.monorail-icon {
  background: linear-gradient(135deg, #232d6a, #1a2150);
}

.sheets-icon {
  background: linear-gradient(135deg, #34a853, #0f9d58);
}

.app-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.app-name {
  font-weight: 700;
  font-size: 1rem;
  color: #f1f5f9;
}

.app-desc {
  font-size: 0.8125rem;
  color: #94a3b8;
}

.app-link-arrow {
  color: #64748b;
  font-size: 1rem;
  transition: transform 0.2s ease;
}

.app-link:hover .app-link-arrow {
  color: #6366f1;
  transform: translateX(4px);
}

.apps-separator {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 8px 0;
}

.apps-separator::before,
.apps-separator::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #334155;
}

.apps-separator span {
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.main-tabs {
  background: var(--bg-secondary);
  border-radius: 16px;
  box-shadow: var(--card-shadow);
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid var(--border-color);
}

.welcome {
  max-width: 600px;
  margin: 100px auto;
  text-align: center;
  padding: 3rem;
  background: var(--bg-secondary);
  border-radius: 16px;
  box-shadow: var(--card-shadow);
  transition: all 0.3s ease;
  border: 1px solid var(--border-color);
}

.welcome i {
  color: var(--text-secondary) !important;
}

.welcome p {
  margin-top: 1.5rem;
  font-size: 1.125rem;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

/* Mobile overlay */
.sidebar-overlay {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.sidebar-overlay.active {
  opacity: 1;
}

/* Mobile toggle button fixe */
.mobile-toggle {
  display: none;
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 998;
  background: var(--sidebar-bg);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 0.75rem;
  color: var(--text-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Responsive */
@media (max-width: 1024px) {
  .sidebar {
    width: 280px;
  }

  .sidebar.collapsed {
    width: 0;
    border: none;
  }

  .main-content {
    margin-left: 280px;
    padding: 1.5rem;
  }

  .sidebar.collapsed ~ .main-content {
    margin-left: 0;
  }
}

@media (max-width: 768px) {
  .sidebar {
    width: 85%;
    max-width: 320px;
    transform: translateX(-100%);
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.3);
  }

  .sidebar:not(.collapsed) {
    transform: translateX(0);
  }

  .sidebar.collapsed {
    transform: translateX(-100%);
    width: 85%;
    max-width: 320px;
  }

  .sidebar-overlay {
    display: block;
  }

  .mobile-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sidebar:not(.collapsed) ~ .sidebar-overlay {
    display: block;
    opacity: 1;
  }

  .main-content {
    margin-left: 0;
    padding: 1rem;
    padding-top: 4.5rem;
  }

  .sidebar.collapsed ~ .main-content {
    margin-left: 0;
  }

  .sidebar-header {
    padding: 1rem;
  }

  .sidebar-content {
    padding: 1rem;
    gap: 1rem;
  }

  .welcome {
    margin: 20px auto;
    padding: 2rem 1.5rem;
  }

  .welcome i {
    font-size: 3rem !important;
  }

  .welcome p {
    font-size: 1rem;
  }

  .floating-sheets-btn {
    top: 0.75rem;
    right: 1rem;
    width: 44px;
    height: 44px;
  }

  .floating-sheets-btn i {
    font-size: 1.25rem;
  }
}

@media (max-width: 480px) {
  .sidebar {
    width: 100%;
    max-width: 100%;
  }

  .main-content {
    padding: 0.75rem;
    padding-top: 4rem;
  }

  .title-text h1 {
    font-size: 1.25rem;
  }

  .nav-button {
    padding: 0.75rem !important;
    font-size: 0.875rem !important;
  }

  .welcome {
    padding: 1.5rem 1rem;
    border-radius: 12px;
  }
}

/* Dark mode pour les composants PrimeVue */
.dark-mode :deep(.p-tabview-nav) {
  background: var(--bg-secondary);
  border-color: var(--border-color);
}

.dark-mode :deep(.p-tabview-title) {
  color: var(--text-primary);
}

.dark-mode :deep(.p-tabview-panels) {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

/* Dialog responsive */
.dark-mode :deep(.p-dialog) {
  max-width: calc(100vw - 2rem);
  margin: 1rem;
}

@media (max-width: 480px) {
  .dark-mode :deep(.p-dialog) {
    width: calc(100vw - 1rem) !important;
    max-width: none;
    margin: 0.5rem;
  }
}
</style>
