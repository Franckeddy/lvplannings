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

        <!-- Utilisateur connecté -->
        <div class="connected-user-section" v-if="selectedUser">
          <label>Connecté :</label>
          <div class="connected-user-badge">
            <div class="connected-user-avatar">
              {{ selectedUser.name.charAt(0).toUpperCase() }}
            </div>
            <span class="connected-user-name">{{ selectedUser.name }}</span>
            <i class="pi pi-check-circle connected-user-check"></i>
          </div>

          <!-- Bouton partage position équipe -->
          <div class="location-share-toggle">
            <Button
              :icon="shareMyLocation ? 'pi pi-wifi' : 'pi pi-map-marker'"
              :label="shareMyLocation ? 'Position partagée' : 'Partager ma position'"
              @click="toggleShareLocation"
              :severity="shareMyLocation ? 'success' : 'secondary'"
              size="small"
              class="share-location-btn"
              :class="{ 'sharing': shareMyLocation }"
            />
            <span v-if="shareMyLocation" class="share-status">
              <i class="pi pi-circle-fill pulse-dot"></i> Équipe peut me voir
            </span>
          </div>

          <Button
            icon="pi pi-sign-out"
            label="Déconnexion"
            @click="handleUserDisconnected"
            severity="danger"
            text
            size="small"
            class="disconnect-btn"
          />
        </div>

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
    <CasinoMap v-model="showCasinoMap" :current-user="selectedUser" :user-tournaments="tournaments" />

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

    <!-- Modale de confirmation de connexion -->
    <Dialog
      v-model:visible="showLoginConfirmModal"
      :modal="true"
      :closable="false"
      :showHeader="false"
      :style="{ width: '420px', maxWidth: '95vw' }"
      class="login-confirm-dialog"
    >
      <!-- Bouton retour -->
      <button
        v-if="canGoBack"
        class="login-back-btn"
        @click="goBackLoginStep"
        type="button"
      >
        <i class="pi pi-arrow-left"></i>
      </button>

      <!-- Étape 1: Confirmation utilisateur précédent -->
      <div v-if="loginStep === 'confirm' && pendingUser" class="login-confirm-content">
        <div class="login-confirm-user">
          <div class="login-confirm-avatar">
            {{ pendingUser.name.charAt(0).toUpperCase() }}
          </div>
          <span class="login-confirm-name">{{ pendingUser.name }}</span>
          <span class="login-confirm-question">?</span>
        </div>
        <div class="login-confirm-actions-vertical">
          <Button
            label="Oui, c'est moi"
            icon="pi pi-check"
            @click="confirmLogin"
            severity="success"
            class="login-btn-full"
          />
          <Button
            label="Non, choisir un autre profil"
            icon="pi pi-users"
            @click="loginStep = 'select'"
            severity="secondary"
            outlined
            class="login-btn-full"
          />
        </div>
      </div>

      <!-- Étape 2: Sélection d'un utilisateur ou création -->
      <div v-else-if="loginStep === 'select'" class="login-select-content">
        <p class="login-select-message">
          Choisissez votre profil
        </p>

        <div class="login-users-list">
          <button
            v-for="user in users"
            :key="user.id"
            class="login-user-option"
            :class="{ 'selected': selectedLoginUser?.id === user.id }"
            @click="selectedLoginUser = user"
          >
            <div class="login-user-avatar">
              {{ user.name.charAt(0).toUpperCase() }}
            </div>
            <span class="login-user-name">{{ user.name }}</span>
            <i v-if="selectedLoginUser?.id === user.id" class="pi pi-check login-user-check"></i>
          </button>
        </div>

        <div class="login-select-actions">
          <Button
            label="Se connecter"
            icon="pi pi-sign-in"
            @click="confirmSelectedUser"
            :disabled="!selectedLoginUser"
            severity="success"
            class="login-btn-full"
          />
          <div class="login-divider">
            <span>ou</span>
          </div>
          <Button
            label="Créer un nouveau profil"
            icon="pi pi-plus"
            @click="loginStep = 'create'"
            severity="info"
            outlined
            class="login-btn-full"
          />
        </div>
      </div>

      <!-- Étape 3: Création d'un nouveau profil -->
      <div v-else-if="loginStep === 'create'" class="login-create-content">
        <div class="login-create-icon">
          <i class="pi pi-user-plus"></i>
        </div>
        <p class="login-create-message">
          Créer votre profil
        </p>

        <div class="login-create-form">
          <label for="new-login-name">Votre pseudo</label>
          <InputText
            id="new-login-name"
            v-model="newLoginUserName"
            placeholder="Entrez votre pseudo"
            class="login-input-full"
            @keyup.enter="createAndLogin"
          />
        </div>

        <div class="login-create-actions">
          <Button
            label="Créer et me connecter"
            icon="pi pi-check"
            @click="createAndLogin"
            :disabled="!newLoginUserName.trim()"
            severity="success"
            class="login-btn-full"
          />
          <Button
            label="Retour"
            icon="pi pi-arrow-left"
            @click="loginStep = 'select'"
            severity="secondary"
            text
            class="login-btn-full"
          />
        </div>
      </div>

      <!-- Première visite: pas d'utilisateur précédent -->
      <div v-else-if="loginStep === 'first'" class="login-first-content">
        <div class="login-first-icon">
          <i class="pi pi-star"></i>
        </div>
        <p class="login-first-message">
          Bienvenue sur Las Vegas Poker 2026 !
        </p>
        <p class="login-first-submessage">
          Pour commencer, identifiez-vous
        </p>

        <div class="login-first-actions">
          <Button
            v-if="users.length > 0"
            label="Choisir mon profil"
            icon="pi pi-users"
            @click="loginStep = 'select'"
            severity="primary"
            class="login-btn-full"
          />
          <Button
            label="Créer mon profil"
            icon="pi pi-plus"
            @click="loginStep = 'create'"
            :severity="users.length > 0 ? 'secondary' : 'primary'"
            :outlined="users.length > 0"
            class="login-btn-full"
          />
        </div>
      </div>
    </Dialog>

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
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { userService } from './services/api';
import TournamentList from './components/TournamentList.vue';
import TournamentTimeline from './components/TournamentTimeline.vue';
import TeamRecap from './components/TeamRecap.vue';
import CasinoMap from './components/CasinoMap.vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';

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
const showLoginConfirmModal = ref(false);
const pendingUser = ref(null);
const loginStep = ref('confirm'); // 'confirm', 'select', 'create', 'first'
const selectedLoginUser = ref(null);
const newLoginUserName = ref('');

// Géolocalisation équipe
const shareMyLocation = ref(false);
let locationWatchId = null;

// Computed pour détecter si on est sur mobile
const isMobile = computed(() => windowWidth.value <= 768);

// Computed pour savoir si on peut revenir en arrière dans la modale de connexion
const canGoBack = computed(() => {
  // Retour possible depuis 'select' vers 'confirm' si on a un pendingUser
  if (loginStep.value === 'select' && pendingUser.value) return true;
  // Retour possible depuis 'create' vers 'select'
  if (loginStep.value === 'create') return true;
  return false;
});

// Fonction pour revenir à l'étape précédente dans la modale de connexion
const goBackLoginStep = () => {
  if (loginStep.value === 'select' && pendingUser.value) {
    loginStep.value = 'confirm';
  } else if (loginStep.value === 'create') {
    loginStep.value = users.value.length > 0 ? 'select' : 'first';
  }
};

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

const handleUserDisconnected = () => {
  // Arrêter le partage de position
  stopSharingLocation();

  selectedUser.value = null;
  tournaments.value = [];
  summary.value = null;
  localStorage.removeItem('currentUserId');
  currentView.value = 'timeline';
  // Réafficher la modale de connexion
  loginStep.value = users.value.length > 0 ? 'select' : 'first';
  showLoginConfirmModal.value = true;
};

// ========== GÉOLOCALISATION ÉQUIPE ==========

// Démarrer le partage de position
const startSharingLocation = () => {
  if (!selectedUser.value || !navigator.geolocation) return;

  shareMyLocation.value = true;
  localStorage.setItem('shareLocation', 'true');

  // Envoyer la position immédiatement puis à chaque changement
  locationWatchId = navigator.geolocation.watchPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      try {
        await userService.updateLocation(selectedUser.value.id, lat, lng);
      } catch (error) {
        console.error('Erreur mise à jour position:', error);
      }
    },
    (error) => {
      console.error('Erreur géolocalisation:', error);
      if (error.code === error.PERMISSION_DENIED) {
        shareMyLocation.value = false;
        alert('Pour partager votre position, autorisez l\'accès à la géolocalisation.');
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000
    }
  );
};

// Arrêter le partage de position
const stopSharingLocation = async () => {
  shareMyLocation.value = false;
  localStorage.setItem('shareLocation', 'false');

  if (locationWatchId !== null) {
    navigator.geolocation.clearWatch(locationWatchId);
    locationWatchId = null;
  }

  // Supprimer ma position du serveur
  if (selectedUser.value) {
    try {
      await userService.clearLocation(selectedUser.value.id);
    } catch (error) {
      console.error('Erreur suppression position:', error);
    }
  }
};

// Toggle le partage de position
const toggleShareLocation = () => {
  if (shareMyLocation.value) {
    stopSharingLocation();
  } else {
    startSharingLocation();
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

  // Vérifier si un utilisateur est déjà sauvegardé
  const savedUserId = localStorage.getItem('currentUserId');
  if (savedUserId && users.value.length > 0) {
    const savedUser = users.value.find(u => u.id === parseInt(savedUserId));
    if (savedUser) {
      // Utilisateur précédent trouvé - le connecter directement sans modale
      selectedUser.value = savedUser;
      currentView.value = 'planning';
      loadUserData(savedUser.id);
      // Restaurer le partage de position si précédemment activé
      const savedShareLocation = localStorage.getItem('shareLocation');
      if (savedShareLocation === 'true') {
        setTimeout(() => startSharingLocation(), 500);
      }
      showLoginConfirmModal.value = false;
    } else {
      // Utilisateur non trouvé dans la base - afficher modale de sélection
      loginStep.value = users.value.length > 0 ? 'select' : 'first';
      showLoginConfirmModal.value = true;
    }
  } else {
    // Première visite ou pas d'utilisateur sauvegardé - afficher modale
    loginStep.value = users.value.length > 0 ? 'select' : 'first';
    showLoginConfirmModal.value = true;
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

// Fonctions pour la confirmation de connexion
const confirmLogin = () => {
  if (pendingUser.value) {
    selectedUser.value = pendingUser.value;
    localStorage.setItem('currentUserId', pendingUser.value.id.toString());
    currentView.value = 'planning';
    loadUserData(pendingUser.value.id);
    // Restaurer le partage de position si précédemment activé
    const savedShareLocation = localStorage.getItem('shareLocation');
    if (savedShareLocation === 'true') {
      setTimeout(() => startSharingLocation(), 500);
    }
  }
  closeLoginModal();
};

const confirmSelectedUser = () => {
  if (selectedLoginUser.value) {
    selectedUser.value = selectedLoginUser.value;
    localStorage.setItem('currentUserId', selectedLoginUser.value.id.toString());
    currentView.value = 'planning';
    loadUserData(selectedLoginUser.value.id);
    // Restaurer le partage de position si précédemment activé
    const savedShareLocation = localStorage.getItem('shareLocation');
    if (savedShareLocation === 'true') {
      setTimeout(() => startSharingLocation(), 500);
    }
  }
  closeLoginModal();
};

const createAndLogin = async () => {
  if (newLoginUserName.value.trim()) {
    try {
      const response = await userService.create(newLoginUserName.value.trim());
      await loadUsers();
      selectedUser.value = response.data;
      localStorage.setItem('currentUserId', response.data.id.toString());
      currentView.value = 'planning';
      loadUserData(response.data.id);
      // Pour un nouvel utilisateur, activer le partage par défaut
      setTimeout(() => startSharingLocation(), 500);
      closeLoginModal();
    } catch (error) {
      console.error('Erreur lors de la création de l\'utilisateur:', error);
    }
  }
};

const closeLoginModal = () => {
  showLoginConfirmModal.value = false;
  pendingUser.value = null;
  selectedLoginUser.value = null;
  newLoginUserName.value = '';
  loginStep.value = 'confirm';
};

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  // Arrêter le partage à la destruction du composant
  stopSharingLocation();
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

/* Section utilisateur connecté */
.connected-user-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.connected-user-section > label {
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.connected-user-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 10px;
}

.connected-user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 1rem;
}

.connected-user-name {
  flex: 1;
  color: #4ade80;
  font-weight: 700;
  font-size: 1rem;
}

.connected-user-check {
  color: #22c55e;
  font-size: 1.125rem;
}

.disconnect-btn {
  align-self: flex-start;
  font-size: 0.8125rem !important;
  opacity: 0.7;
}

.disconnect-btn:hover {
  opacity: 1;
}

/* Bouton partage position */
.location-share-toggle {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 8px 0;
}

.share-location-btn {
  width: 100%;
  justify-content: center;
}

.share-location-btn.sharing {
  animation: pulse-share 2s infinite;
}

@keyframes pulse-share {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(34, 197, 94, 0);
  }
}

.share-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: #4ade80;
  padding-left: 4px;
}

.pulse-dot {
  font-size: 8px;
  animation: pulse-dot 1.5s infinite;
}

@keyframes pulse-dot {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
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

/* Modale confirmation de connexion */
:deep(.login-confirm-dialog .p-dialog-content) {
  background: #0f172a;
  padding: 32px 24px;
  border-radius: 12px;
  position: relative;
}

/* Modale confirmation de connexion */
.p-dialog-content {
  background: #0f172a;
  padding: 32px 24px;
  border-radius: 12px;
  position: relative;
}

.login-confirm-dialog {
  background: #0f172a;
  border-radius: 12px;
  position: relative;
}

/* Bouton retour modale connexion */
.login-back-btn {
  position: absolute;
  top: 16px;
  left: 16px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #1e293b;
  border: 1px solid #334155;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;
}

.login-back-btn:hover {
  background: #334155;
  color: #f1f5f9;
  border-color: #6366f1;
}

.login-back-btn i {
  font-size: 1rem;
}

/* Étape Confirm */
.login-confirm-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
}

.login-confirm-icon,
.login-select-icon,
.login-create-icon,
.login-first-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-confirm-icon i,
.login-select-icon i,
.login-create-icon i,
.login-first-icon i {
  font-size: 2rem;
  color: white;
}

.login-first-icon {
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
}

.login-create-icon {
  background: linear-gradient(135deg, #22c55e, #4ade80);
}

.login-confirm-message {
  color: #94a3b8;
  font-size: 1.1rem;
  margin: 0;
}

.login-confirm-user {
  margin-top: 1em;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background: rgba(99, 102, 241, 0.15);
  border: 2px solid rgba(99, 102, 241, 0.4);
  border-radius: 12px;
}

.login-confirm-avatar {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 1.25rem;
}

.login-confirm-name {
  color: #f1f5f9;
  font-weight: 700;
  font-size: 1.5rem;
}

.login-confirm-question {
  color: #94a3b8;
  font-size: 1.5rem;
  font-weight: 700;
}

.login-confirm-actions-vertical {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  margin-top: 8px;
}

.login-btn-full {
  width: 100%;
  justify-content: center !important;
}

/* Étape Select */
.login-select-content,
.login-create-content,
.login-first-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
}

.login-select-message,
.login-create-message,
.login-first-message {
  color: #f1f5f9;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

.login-first-submessage {
  color: #94a3b8;
  font-size: 0.95rem;
  margin: -8px 0 0 0;
}

.login-users-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-height: 250px;
  overflow-y: auto;
}

.login-user-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #1e293b;
  border: 2px solid #334155;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  text-align: left;
}

.login-user-option:hover {
  background: #334155;
  border-color: #6366f1;
}

.login-user-option.selected {
  background: rgba(99, 102, 241, 0.2);
  border-color: #6366f1;
}

.login-user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1, #818cf8);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 1rem;
  flex-shrink: 0;
}

.login-user-name {
  flex: 1;
  color: #f1f5f9;
  font-weight: 600;
  font-size: 1rem;
}

.login-user-check {
  color: #22c55e;
  font-size: 1.25rem;
}

.login-select-actions,
.login-create-actions,
.login-first-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  margin-top: 8px;
}

.login-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.login-divider::before,
.login-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #334155;
}

.login-divider span {
  color: #64748b;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Étape Create */
.login-create-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  text-align: left;
}

.login-create-form label {
  color: #94a3b8;
  font-size: 0.875rem;
  font-weight: 500;
}

.login-input-full {
  width: 100%;
}

:deep(.login-input-full.p-inputtext) {
  background: #1e293b;
  border: 2px solid #334155;
  color: #f1f5f9;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 1rem;
}

:deep(.login-input-full.p-inputtext:focus) {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

/* Responsive modale connexion */
@media (max-width: 480px) {
  :deep(.login-confirm-dialog) {
    width: calc(100vw - 1rem) !important;
    max-width: none !important;
    margin: 0.5rem !important;
  }

  :deep(.login-confirm-dialog .p-dialog-content) {
    padding: 24px 16px;
  }

  .login-back-btn {
    top: 12px;
    left: 12px;
    width: 32px;
    height: 32px;
  }

  .login-back-btn i {
    font-size: 0.875rem;
  }

  .login-confirm-icon,
  .login-select-icon,
  .login-create-icon,
  .login-first-icon {
    width: 56px;
    height: 56px;
  }

  .login-confirm-icon i,
  .login-select-icon i,
  .login-create-icon i,
  .login-first-icon i {
    font-size: 1.75rem;
  }

  .login-confirm-message,
  .login-select-message,
  .login-create-message,
  .login-first-message {
    font-size: 1rem;
  }

  .login-first-submessage {
    font-size: 0.875rem;
  }

  .login-confirm-user {
    padding: 12px 16px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .login-confirm-avatar {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }

  .login-confirm-name {
    font-size: 1.2rem;
  }

  .login-confirm-question {
    font-size: 1.2rem;
  }

  .login-users-list {
    max-height: 180px;
  }

  .login-user-option {
    padding: 10px 12px;
  }

  .login-user-avatar {
    width: 36px;
    height: 36px;
    font-size: 0.9rem;
  }

  .login-user-name {
    font-size: 0.9375rem;
  }

  .login-btn-full {
    padding: 0.75rem 1rem !important;
    font-size: 0.9375rem !important;
  }

  .login-create-form label {
    font-size: 0.8125rem;
  }

  :deep(.login-input-full.p-inputtext) {
    padding: 10px 14px;
    font-size: 0.9375rem;
  }
}

@media (max-width: 360px) {
  :deep(.login-confirm-dialog .p-dialog-content) {
    padding: 20px 12px;
  }

  .login-confirm-content,
  .login-select-content,
  .login-create-content,
  .login-first-content {
    gap: 12px;
  }

  .login-confirm-icon,
  .login-select-icon,
  .login-create-icon,
  .login-first-icon {
    width: 48px;
    height: 48px;
  }

  .login-confirm-icon i,
  .login-select-icon i,
  .login-create-icon i,
  .login-first-icon i {
    font-size: 1.5rem;
  }

  .login-users-list {
    max-height: 150px;
  }

  .login-select-actions,
  .login-create-actions,
  .login-first-actions,
  .login-confirm-actions-vertical {
    gap: 10px;
  }
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
