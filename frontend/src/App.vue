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
        @tournament-added="handleTournamentAddedFromTimeline"
      />

      <!-- Team Recap View -->
      <TeamRecap
        v-else-if="currentView === 'team'"
        @user-created="loadUsers"
      />

      <!-- Welcome Message -->
      <div class="welcome" v-else-if="!selectedUser && currentView === 'planning'">
        <i class="pi pi-users" style="font-size: 4rem; color: #94a3b8;"></i>
        <p>Sélectionnez un utilisateur pour voir son programme</p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { userService } from './services/api';
import UserSelector from './components/UserSelector.vue';
import TournamentList from './components/TournamentList.vue';
import TournamentTimeline from './components/TournamentTimeline.vue';
import TeamRecap from './components/TeamRecap.vue';
import CasinoMap from './components/CasinoMap.vue';
import Button from 'primevue/button';

const users = ref([]);
const usersKey = ref(0);
const sidebarCollapsed = ref(false);
const selectedUser = ref(null);
const tournaments = ref([]);
const summary = ref(null);
const loading = ref(false);
const currentView = ref('planning');
const windowWidth = ref(window.innerWidth);
const showCasinoMap = ref(false);

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
  loadUserData(user.id);
  if (isMobile.value) {
    sidebarCollapsed.value = true;
  }
};

const handleUserCreated = async (userName) => {
  try {
    const response = await userService.create(userName);
    await loadUsers();
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

onMounted(() => {
  loadUsers();

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
}

/* Sidebar Styles */
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  width: var(--sidebar-width);
  background: var(--sidebar-bg);
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
  background: #0f172a;
}

.sidebar.collapsed ~ .main-content {
  margin-left: var(--sidebar-collapsed-width);
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
