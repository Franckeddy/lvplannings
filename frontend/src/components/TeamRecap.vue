<template>
  <Toast />
  <div class="team-container">
    <!-- Header -->
    <div class="team-header">
      <div class="header-info">
        <div class="header-icon">
          <i class="pi pi-users"></i>
        </div>
        <div class="header-text">
          <h1>Récap Team</h1>
          <p class="header-subtitle">Planning consolidé de l'équipe</p>
        </div>
      </div>
    </div>


    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <ProgressSpinner />
      <p>Chargement des plannings...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="Object.keys(teamByDay).length === 0" class="empty-state">
      <div class="empty-icon">
        <i class="pi pi-calendar-plus"></i>
      </div>
      <h3>Aucun tournoi programmé</h3>
      <p>Les membres de l'équipe n'ont pas encore de tournois</p>
    </div>

    <!-- Vue Grille des dates -->
    <div v-else-if="!selectedDate" class="dates-grid">
      <div
        v-for="(dayData, date) in teamByDay"
        :key="date"
        class="date-card"
        @click="selectDate(date)"
      >
        <div class="date-card-header">
          <div class="date-badge">
            <span class="date-number">{{ extractDay(date) }}</span>
            <span class="date-month">{{ extractMonth(date) }}</span>
          </div>
          <span class="date-day-name">{{ getDayName(date) }}</span>
        </div>

        <div class="date-card-members">
          <div
            v-for="memberId in Array.from(dayData.members)"
            :key="memberId"
            class="member-tag"
            :style="{ backgroundColor: getUserColorById(memberId) }"
          >
            {{ getUserNameById(memberId) }}
          </div>
        </div>

        <div class="date-card-footer">
          <div class="date-card-stats">
            <span class="mini-stat"><i class="pi pi-trophy"></i> {{ dayData.totalTournaments }}</span>
            <span class="mini-stat"><i class="pi pi-building"></i> {{ Object.keys(dayData.casinos).length }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Vue Détail d'une date -->
    <div v-else class="date-detail">
      <!-- Back button -->
      <button class="back-button" @click="selectedDate = null">
        <i class="pi pi-arrow-left"></i>
        <span>Retour aux dates</span>
      </button>

      <!-- Date Header -->
      <div class="detail-header">
        <div class="detail-date-badge">
          <span class="detail-date-number">{{ extractDay(selectedDate) }}</span>
          <span class="detail-date-month">{{ extractMonth(selectedDate) }}</span>
        </div>
        <div class="detail-date-info">
          <h2>{{ getDayName(selectedDate) }} {{ selectedDate }}</h2>
          <div class="detail-stats">
            <span><i class="pi pi-users"></i> {{ teamByDay[selectedDate].members.size }} membres</span>
            <span><i class="pi pi-trophy"></i> {{ teamByDay[selectedDate].totalTournaments }} tournois</span>
          </div>
        </div>
      </div>

      <!-- Casinos du jour -->
      <div class="casinos-list">
        <div
          v-for="(casinoData, casino) in teamByDay[selectedDate].casinos"
          :key="casino"
          class="casino-card"
        >
          <div class="casino-header">
            <div class="casino-info">
              <div class="casino-logo-wrapper">
                <img
                  v-if="getCasinoLogo(casino)"
                  :src="getCasinoLogo(casino)"
                  :alt="casino"
                  class="casino-logo"
                  @error="handleImageError"
                />
                <div v-else class="casino-initials">
                  {{ getCasinoInitials(casino) }}
                </div>
              </div>
              <div class="casino-details">
                <span class="casino-name">{{ casino }}</span>
                <span class="casino-count">{{ casinoData.users.length }} personne{{ casinoData.users.length > 1 ? 's' : '' }}</span>
                <span v-if="getRouteTime(casino)" class="casino-drive-time">
                  <i class="pi pi-car"></i>
                  {{ getRouteTime(casino).durationMin }} min
                  <span class="drive-distance">({{ getRouteTime(casino).distanceMiles }} mi)</span>
                </span>
              </div>
              <button v-if="getRouteTime(casino)" class="map-link-btn" @click.stop="openRouteMap(casino)">
                <i class="pi pi-directions"></i>
                <span class="map-link-text">Trajet</span>
              </button>
            </div>

            <!-- Notes du casino (desktop: tooltip) -->
            <div
              v-if="getCasinoNotes(casinoData).length > 0"
              class="casino-notes-indicator desktop-only"
              v-tooltip.top="formatCasinoNotes(casinoData)"
            >
              <i class="pi pi-comment"></i>
              <span class="notes-count">{{ getCasinoNotes(casinoData).length }}</span>
            </div>
          </div>

          <!-- Horaires du casino -->
          <div class="time-slots">
            <div
              v-for="(timeData, time) in casinoData.times"
              :key="time"
              class="time-slot"
            >
              <!-- Ligne 1: Heure + Buy-in + Badges -->
              <div class="time-slot-top">
                <div class="time-badge">
                  <i class="pi pi-clock"></i>
                  {{ time }}
                </div>
                <span v-if="timeData.buyin" class="time-buyin">{{ formatBuyIn(timeData.buyin) }}</span>
                <span v-if="timeData.day" class="day-badge-small">Day {{ timeData.day }}</span>
                <span v-else-if="timeData.isRestart" class="restart-badge-small">Restart</span>
              </div>

              <!-- Ligne 2: Structure -->
              <div v-if="timeData.structureChips || timeData.structureLevels || (timeData.levels && timeData.levels !== '-')" class="time-slot-structure">
                <span v-if="timeData.structureChips" class="structure-tag chips">
                  <i class="pi pi-circle-fill"></i> {{ timeData.structureChips }}
                </span>
                <span v-if="timeData.structureLevels" class="structure-tag levels">
                  <i class="pi pi-clock"></i> {{ timeData.structureLevels }}
                </span>
                <span v-else-if="timeData.levels && timeData.levels !== '-'" class="structure-tag levels">
                  <i class="pi pi-clock"></i> {{ timeData.levels }}
                </span>
              </div>

              <!-- Ligne 3: Utilisateurs + Rejoindre -->
              <div class="time-slot-bottom">
                <div class="time-users">
                  <div
                    v-for="user in timeData.users"
                    :key="`${user.id}-${user.tournamentId}`"
                    class="user-chip-wrapper"
                  >
                    <div
                      class="user-chip"
                      :style="{ backgroundColor: getUserColor(user.name) }"
                      @click="openNoteDialog(user)"
                    >
                      {{ user.name }}
                    </div>
                    <div
                      v-if="user.user_note"
                      class="user-note-icon desktop-only"
                      v-tooltip.top="user.user_note"
                    >
                      <i class="pi pi-comment"></i>
                    </div>
                  </div>
                </div>
                <Button
                  label="Rejoindre"
                  icon="pi pi-user-plus"
                  @click="openJoinDialog(selectedDate, casino, time, timeData)"
                  text
                  size="small"
                  class="join-btn"
                />
              </div>

              <!-- Notes visibles sur mobile -->
              <div class="mobile-user-notes" v-if="timeData.users.some(u => u.user_note)">
                <div
                  v-for="user in timeData.users.filter(u => u.user_note)"
                  :key="'note-' + user.tournamentId"
                  class="mobile-user-note-item"
                >
                  <span class="mobile-note-user">{{ user.name }}:</span>
                  <span class="mobile-note-text">{{ user.user_note }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Dialog Rejoindre -->
    <Dialog
      v-model:visible="showJoinDialog"
      header="Rejoindre ce tournoi"
      :modal="true"
      :style="{ width: '450px' }"
      class="join-dialog"
    >
      <div v-if="tournamentToJoin" class="join-dialog-content">
        <div class="join-tournament-summary">
          <div class="summary-row">
            <span class="summary-label">Date</span>
            <span class="summary-value">{{ getDayName(tournamentToJoin.date) }} {{ tournamentToJoin.date }}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Heure</span>
            <span class="summary-value highlight">{{ tournamentToJoin.time }}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Casino</span>
            <span class="summary-value">{{ tournamentToJoin.casino }}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Buy-in</span>
            <span class="summary-value buyin">{{ formatBuyIn(tournamentToJoin.buyin) }}</span>
          </div>
        </div>

        <div class="current-participants">
          <span class="participants-label">Déjà inscrit{{ tournamentToJoin.users.length > 1 ? 's' : '' }} :</span>
          <div class="participants-chips">
            <div
              v-for="user in tournamentToJoin.users"
              :key="user.id"
              class="user-chip small"
              :style="{ backgroundColor: getUserColor(user.name) }"
            >
              {{ user.name }}
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>Qui souhaite rejoindre ?</label>
          <Select
            v-if="availableUsersToJoin.length > 0"
            :key="usersKey"
            v-model="selectedUserToJoin"
            :options="availableUsersToJoin"
            optionLabel="name"
            placeholder="Sélectionnez un membre..."
            class="input-full"
          />
          <div class="divider-or" v-if="availableUsersToJoin.length > 0">
            <span>ou créez un nouveau pseudo</span>
          </div>
          <div class="create-user-section">
            <div class="create-user-inline">
              <InputText
                v-model="newUserName"
                placeholder="Votre pseudo..."
                class="input-pseudo"
                @keyup.enter="createUserAndJoin"
              />
              <Button
                label="Créer"
                icon="pi pi-plus"
                @click="createUserAndJoin"
                :disabled="!newUserName || creatingUser"
                :loading="creatingUser"
                size="small"
              />
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <Button
          label="Annuler"
          @click="showJoinDialog = false"
          severity="secondary"
          text
        />
        <Button
          label="Rejoindre"
          @click="joinTournament"
          :disabled="!selectedUserToJoin || joining"
          :loading="joining"
          icon="pi pi-user-plus"
        />
      </template>
    </Dialog>

    <!-- Dialog Note utilisateur -->
    <Dialog
      v-model:visible="showNoteDialog"
      :modal="true"
      :style="{ width: '450px' }"
      :showHeader="false"
      class="note-dialog"
    >
      <div class="note-dialog-content">
        <div class="note-icon">
          <i class="pi pi-file-edit"></i>
        </div>
        <h3>Note de {{ tournamentToEditNote?.userName }}</h3>

        <div class="note-input-wrapper">
          <Textarea
            v-model="editingNote"
            rows="4"
            placeholder="Écrivez votre note ici..."
            class="w-full"
            autoResize
          />
        </div>

        <div class="note-actions">
          <Button
            label="Annuler"
            @click="showNoteDialog = false"
            severity="secondary"
            text
            class="cancel-btn"
          />
          <Button
            label="Enregistrer"
            @click="saveNote"
            icon="pi pi-check"
            :loading="savingNote"
            class="confirm-note-btn"
          />
        </div>
      </div>
    </Dialog>

    <!-- Modale carte itinéraire -->
    <Dialog
      v-model:visible="showRouteMapDialog"
      :header="`Itinéraire vers ${routeMapCasino}`"
      :modal="true"
      :style="{ width: '95vw', maxWidth: '900px' }"
      :breakpoints="{ '768px': '100vw' }"
      class="route-map-dialog"
    >
      <div class="route-map-container">
        <div ref="routeMapContainer" class="route-leaflet-map"></div>

        <!-- Barre d'info et liens navigation -->
        <div class="route-map-bottom-bar">
          <div v-if="routeMapInfo" class="route-map-info">
            <div class="route-map-stat">
              <i class="pi pi-car"></i>
              <span>{{ routeMapInfo.durationMin }} min</span>
            </div>
            <div class="route-map-stat">
              <i class="pi pi-map"></i>
              <span>{{ routeMapInfo.distanceMiles }} mi ({{ routeMapInfo.distanceKm }} km)</span>
            </div>
          </div>

          <!-- Liens navigation externe -->
          <div class="route-nav-links">
            <!-- Google Maps (Desktop + Android) -->
            <a
              :href="getGoogleMapsUrl()"
              target="_blank"
              rel="noopener noreferrer"
              class="nav-link-btn google-maps"
            >
              <i class="pi pi-map"></i>
              <span class="nav-link-label">Google Maps</span>
            </a>

            <!-- Apple Maps (iOS uniquement) -->
            <a
              :href="getAppleMapsUrl()"
              target="_blank"
              rel="noopener noreferrer"
              class="nav-link-btn apple-maps mobile-only"
            >
              <i class="pi pi-apple"></i>
              <span class="nav-link-label">Apple Maps</span>
            </a>
          </div>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import ProgressSpinner from 'primevue/progressspinner';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import { useCasinoLogos } from '../composables/useCasinoLogos';
import { useCasinoRoutes } from '../composables/useCasinoRoutes';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const loading = ref(false);
const users = ref([]);
const usersKey = ref(0);
const allTournaments = ref([]);
const selectedDate = ref(null);
const showJoinDialog = ref(false);
const tournamentToJoin = ref(null);
const selectedUserToJoin = ref(null);
const joining = ref(false);
const newUserName = ref('');
const creatingUser = ref(false);

// Note dialog state
const showNoteDialog = ref(false);
const tournamentToEditNote = ref(null);
const editingNote = ref('');
const savingNote = ref(false);

// Casino routes
const { getRouteForCasino, getCasinoCoords, HOME_LOCATION } = useCasinoRoutes();
const casinoRouteTimes = ref({});

// Route map modal
const showRouteMapDialog = ref(false);
const routeMapCasino = ref('');
const routeMapContainer = ref(null);
const routeMapInfo = ref(null);
let routeMap = null;
let routeMapControl = null;

const { getCasinoLogo, getCasinoInitials } = useCasinoLogos();
const toast = useToast();

const emit = defineEmits(['user-created']);

// Couleurs pour les utilisateurs
const userColors = {};
const colorPalette = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#ef4444', '#14b8a6', '#f97316', '#84cc16'
];

const getUserColor = (name) => {
  if (!userColors[name]) {
    const index = Object.keys(userColors).length % colorPalette.length;
    userColors[name] = colorPalette[index];
  }
  return userColors[name];
};

const getUserColorById = (userId) => {
  const user = users.value.find(u => u.id === userId);
  return user ? getUserColor(user.name) : '#64748b';
};

const getUserNameById = (userId) => {
  const user = users.value.find(u => u.id === userId);
  return user ? user.name : '';
};

const selectDate = (date) => {
  selectedDate.value = date;
  // Charger les temps de trajet pour les casinos de ce jour
  loadRouteTimes(date);
};

// Charger les temps de trajet pour les casinos d'un jour
const loadRouteTimes = async (date) => {
  const dayData = teamByDay.value[date];
  if (!dayData) return;
  const casinoNames = Object.keys(dayData.casinos);
  for (const casinoName of casinoNames) {
    if (!casinoRouteTimes.value[casinoName]) {
      const route = await getRouteForCasino(casinoName);
      if (route) {
        casinoRouteTimes.value[casinoName] = route;
      }
    }
  }
};

// Obtenir le temps de trajet pour un casino
const getRouteTime = (casinoName) => {
  return casinoRouteTimes.value[casinoName] || null;
};

const availableUsersToJoin = computed(() => {
  if (!tournamentToJoin.value) return [];
  const enrolledIds = tournamentToJoin.value.users.map(u => u.id);
  return users.value.filter(u => !enrolledIds.includes(u.id));
});


const teamByDay = computed(() => {
  const grouped = {};

  allTournaments.value.forEach(tournament => {
    const date = tournament.date;
    const casino = tournament.casino;
    const time = tournament.time;

    if (!grouped[date]) {
      grouped[date] = {
        casinos: {},
        members: new Set(),
        totalTournaments: 0,
        totalBuyin: 0
      };
    }

    if (!grouped[date].casinos[casino]) {
      grouped[date].casinos[casino] = {
        times: {},
        users: []
      };
    }

    if (!grouped[date].casinos[casino].times[time]) {
      grouped[date].casinos[casino].times[time] = {
        users: [],
        buyin: tournament.buyin,
        levels: tournament.levels,
        structureChips: tournament.structureChips,
        structureLevels: tournament.structureLevels,
        structureGuarantee: tournament.structureGuarantee,
        day: tournament.day,
        isRestart: tournament.isRestart
      };
    }

    const user = users.value.find(u => u.id === tournament.user_id);
    if (user) {
      // Ajouter l'utilisateur avec les infos du tournoi (y compris la note)
      grouped[date].casinos[casino].times[time].users.push({
        ...user,
        tournamentId: tournament.id,
        user_note: tournament.user_note
      });
      if (!grouped[date].casinos[casino].users.find(u => u.id === user.id)) {
        grouped[date].casinos[casino].users.push(user);
      }
      grouped[date].members.add(user.id);
    }

    grouped[date].totalTournaments++;
    grouped[date].totalBuyin += tournament.buyin || 0;
  });

  const sortedDates = Object.keys(grouped).sort();
  const sorted = {};
  sortedDates.forEach(date => {
    // Trier les casinos par l'heure la plus tôt de leurs tournois
    const casinos = grouped[date].casinos;
    const sortedCasinos = Object.entries(casinos).sort((a, b) => {
      const firstTimeA = Object.keys(a[1].times).sort()[0] || '99:99';
      const firstTimeB = Object.keys(b[1].times).sort()[0] || '99:99';
      return firstTimeA.localeCompare(firstTimeB);
    });

    // Reconstruire l'objet casinos trié, avec les times triés aussi
    const sortedCasinosObj = {};
    sortedCasinos.forEach(([casinoName, casinoData]) => {
      const sortedTimes = Object.keys(casinoData.times).sort();
      const sortedTimesObj = {};
      sortedTimes.forEach(time => {
        sortedTimesObj[time] = casinoData.times[time];
      });
      sortedCasinosObj[casinoName] = { ...casinoData, times: sortedTimesObj };
    });

    sorted[date] = { ...grouped[date], casinos: sortedCasinosObj };
  });

  return sorted;
});

const openJoinDialog = (date, casino, time, timeData) => {
  tournamentToJoin.value = {
    date,
    casino,
    time,
    buyin: timeData.buyin,
    levels: timeData.levels,
    users: timeData.users
  };
  selectedUserToJoin.value = null;
  showJoinDialog.value = true;
};

const joinTournament = async () => {
  if (!selectedUserToJoin.value || !tournamentToJoin.value) return;

  joining.value = true;

  const tournamentData = {
    date: tournamentToJoin.value.date,
    time: tournamentToJoin.value.time,
    casino: tournamentToJoin.value.casino,
    buyin: tournamentToJoin.value.buyin,
    levels: tournamentToJoin.value.levels || '-'
  };

  try {
    const response = await fetch(
      `${API_URL}/users/${selectedUserToJoin.value.id}/tournaments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tournamentData)
      }
    );

    if (response.ok) {
      const userName = selectedUserToJoin.value.name;
      toast.add({
        severity: 'success',
        summary: 'Inscrit !',
        detail: `${userName} a rejoint le tournoi`,
        life: 3000
      });
      showJoinDialog.value = false;
      selectedUserToJoin.value = null;
      tournamentToJoin.value = null;
      await loadAllData();
    } else {
      toast.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Impossible de rejoindre le tournoi',
        life: 3000
      });
    }
  } catch (error) {
    console.error('Erreur:', error);
    toast.add({
      severity: 'error',
      summary: 'Erreur',
      detail: 'Une erreur est survenue',
      life: 3000
    });
  } finally {
    joining.value = false;
  }
};

const createUserAndJoin = async () => {
  if (!newUserName.value.trim() || !tournamentToJoin.value) return;

  creatingUser.value = true;

  try {
    // Créer l'utilisateur
    const createResponse = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newUserName.value.trim() })
    });

    if (!createResponse.ok) {
      const error = await createResponse.json();
      toast.add({
        severity: 'error',
        summary: 'Erreur',
        detail: error.error || 'Impossible de créer l\'utilisateur',
        life: 3000
      });
      return;
    }

    const newUser = await createResponse.json();

    // Ajouter le tournoi pour ce nouvel utilisateur
    const tournamentData = {
      date: tournamentToJoin.value.date,
      time: tournamentToJoin.value.time,
      casino: tournamentToJoin.value.casino,
      buyin: tournamentToJoin.value.buyin,
      levels: tournamentToJoin.value.levels || '-'
    };

    const joinResponse = await fetch(
      `${API_URL}/users/${newUser.id}/tournaments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tournamentData)
      }
    );

    if (joinResponse.ok) {
      toast.add({
        severity: 'success',
        summary: 'Bienvenue !',
        detail: `${newUser.name} a été créé et inscrit au tournoi`,
        life: 3000
      });
      showJoinDialog.value = false;
      newUserName.value = '';
      tournamentToJoin.value = null;
      emit('user-created');
      await loadAllData();
    } else {
      toast.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Utilisateur créé mais erreur lors de l\'inscription',
        life: 3000
      });
    }
  } catch (error) {
    console.error('Erreur:', error);
    toast.add({
      severity: 'error',
      summary: 'Erreur',
      detail: 'Une erreur est survenue',
      life: 3000
    });
  } finally {
    creatingUser.value = false;
  }
};

const loadAllData = async () => {
  loading.value = true;

  try {
    const usersResponse = await fetch(`${API_URL}/users`);
    if (usersResponse.ok) {
      users.value = await usersResponse.json();
      usersKey.value++; // Force re-render du Select
    }

    const allTournamentsData = [];
    for (const user of users.value) {
      try {
        const response = await fetch(`${API_URL}/users/${user.id}/tournaments`);
        if (response.ok) {
          const tournaments = await response.json();
          tournaments.forEach(t => {
            allTournamentsData.push({ ...t, user_id: user.id });
          });
        }
      } catch (error) {
        console.error(`Erreur chargement tournois pour ${user.name}:`, error);
      }
    }

    allTournaments.value = allTournamentsData;
  } catch (error) {
    console.error('Erreur lors du chargement:', error);
  } finally {
    loading.value = false;
  }
};

const formatBuyIn = (amount) => {
  if (!amount) return '$0';
  return '$' + amount.toLocaleString('en-US');
};

// Obtenir toutes les notes d'un casino
const getCasinoNotes = (casinoData) => {
  const notes = [];
  Object.entries(casinoData.times).forEach(([time, timeData]) => {
    timeData.users.forEach(user => {
      if (user.user_note) {
        notes.push({
          time,
          userName: user.name,
          note: user.user_note
        });
      }
    });
  });
  return notes;
};

// Formatter les notes du casino pour le tooltip
const formatCasinoNotes = (casinoData) => {
  const notes = getCasinoNotes(casinoData);
  return notes.map(n => `${n.time} - ${n.userName}: ${n.note}`).join('\n');
};

const extractDay = (dateStr) => {
  if (!dateStr) return '-';
  const match = dateStr.match(/^(\d+)/);
  return match ? match[1] : '-';
};

const extractMonth = (dateStr) => {
  if (!dateStr) return '';
  const match = dateStr.match(/-(.+)$/);
  return match ? match[1].substring(0, 3).toUpperCase() : '';
};

const getDayName = (dateStr) => {
  if (!dateStr) return '';
  const match = dateStr.match(/^(\d+)-(.+)$/);
  if (!match) return '';

  const day = parseInt(match[1]);
  const monthName = match[2].toLowerCase();

  const monthMap = {
    'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3,
    'mai': 4, 'juin': 5, 'juillet': 6, 'août': 7,
    'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11
  };

  const month = monthMap[monthName];
  if (month === undefined) return '';

  const date = new Date(2026, month, day);
  return date.toLocaleDateString('fr-FR', { weekday: 'long' });
};

const handleImageError = (event) => {
  event.target.style.display = 'none';
  const initialsDiv = event.target.nextElementSibling;
  if (initialsDiv) {
    initialsDiv.style.display = 'flex';
  }
};

// Note management
const openNoteDialog = (user) => {
  tournamentToEditNote.value = {
    id: user.tournamentId,
    userName: user.name,
    user_note: user.user_note
  };
  editingNote.value = user.user_note || '';
  showNoteDialog.value = true;
};

const saveNote = async () => {
  if (!tournamentToEditNote.value) return;

  savingNote.value = true;

  try {
    const response = await fetch(
      `${API_URL}/tournaments/${tournamentToEditNote.value.id}/note`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_note: editingNote.value || null })
      }
    );

    if (response.ok) {
      showNoteDialog.value = false;
      toast.add({
        severity: 'success',
        summary: 'Note enregistrée',
        detail: editingNote.value ? 'La note a été sauvegardée' : 'Note supprimée',
        life: 3000
      });
      await loadAllData();
    } else {
      toast.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Impossible de sauvegarder la note',
        life: 3000
      });
    }
  } catch (error) {
    console.error('Erreur:', error);
    toast.add({
      severity: 'error',
      summary: 'Erreur',
      detail: 'Une erreur est survenue',
      life: 3000
    });
  } finally {
    savingNote.value = false;
  }
};

// Ouvrir la modale de carte avec itinéraire
const openRouteMap = async (casinoName) => {
  routeMapCasino.value = casinoName;
  routeMapInfo.value = casinoRouteTimes.value[casinoName] || null;
  showRouteMapDialog.value = true;

  await nextTick();
  setTimeout(() => {
    initRouteMap(casinoName);
  }, 200);
};

const initRouteMap = async (casinoName) => {
  if (!routeMapContainer.value) return;

  if (routeMap) {
    routeMap.remove();
    routeMap = null;
    routeMapControl = null;
  }

  const casinoCoords = await getCasinoCoords(casinoName);
  if (!casinoCoords) return;

  // Sauvegarder les coordonnées pour les liens de navigation
  currentCasinoCoords.value = casinoCoords;

  routeMap = L.map(routeMapContainer.value, {
    center: [36.15, -115.15],
    zoom: 12,
    zoomControl: true
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19
  }).addTo(routeMap);

  const homeIcon = L.icon({
    iconUrl: '/home-icon.png',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
    className: 'home-marker-img'
  });

  L.marker([HOME_LOCATION.lat, HOME_LOCATION.lng], { icon: homeIcon })
    .addTo(routeMap)
    .bindPopup('<b>🏠 Maison</b>');

  const casinoIcon = L.divIcon({
    className: 'custom-casino-marker',
    html: `<div class="marker-container" style="background: #6366f1"><span class="marker-initial">${casinoName.charAt(0)}</span></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });

  L.marker([casinoCoords.lat, casinoCoords.lng], { icon: casinoIcon })
    .addTo(routeMap)
    .bindPopup(`<b>${casinoName}</b>`);

  routeMapControl = L.Routing.control({
    waypoints: [
      L.latLng(HOME_LOCATION.lat, HOME_LOCATION.lng),
      L.latLng(casinoCoords.lat, casinoCoords.lng)
    ],
    routeWhileDragging: false,
    addWaypoints: false,
    draggableWaypoints: false,
    fitSelectedRoutes: true,
    showAlternatives: false,
    createMarker: () => null,
    lineOptions: {
      styles: [
        { color: '#6366f1', opacity: 0.9, weight: 6 },
        { color: '#818cf8', opacity: 0.4, weight: 12 }
      ]
    },
    router: L.Routing.osrmv1({
      serviceUrl: 'https://router.project-osrm.org/route/v1',
      profile: 'driving'
    })
  }).addTo(routeMap);

  routeMapControl.on('routesfound', (e) => {
    const route = e.routes[0];
    routeMapInfo.value = {
      durationMin: Math.round(route.summary.totalTime / 60),
      distanceKm: (route.summary.totalDistance / 1000).toFixed(1),
      distanceMiles: (route.summary.totalDistance / 1609.34).toFixed(1)
    };

    // Dézoomer pour avoir une meilleure vue d'ensemble
    setTimeout(() => {
      if (routeMap) {
        const currentZoom = routeMap.getZoom();
        routeMap.setZoom(currentZoom - 1.5);
      }
    }, 100);
  });

  setTimeout(() => {
    if (routeMap) routeMap.invalidateSize();
  }, 300);
};

// Coordonnées du casino actuel pour les liens de navigation
const currentCasinoCoords = ref(null);

// Générer l'URL Google Maps pour l'itinéraire
const getGoogleMapsUrl = () => {
  const origin = `${HOME_LOCATION.lat},${HOME_LOCATION.lng}`;
  const destination = currentCasinoCoords.value
    ? `${currentCasinoCoords.value.lat},${currentCasinoCoords.value.lng}`
    : routeMapCasino.value;
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
};

// Générer l'URL Apple Maps pour l'itinéraire
const getAppleMapsUrl = () => {
  const origin = `${HOME_LOCATION.lat},${HOME_LOCATION.lng}`;
  const destination = currentCasinoCoords.value
    ? `${currentCasinoCoords.value.lat},${currentCasinoCoords.value.lng}`
    : routeMapCasino.value;
  return `https://maps.apple.com/?saddr=${origin}&daddr=${destination}&dirflg=d`;
};

watch(showRouteMapDialog, (val) => {
  if (!val && routeMap) {
    routeMap.remove();
    routeMap = null;
    routeMapControl = null;
    routeMapInfo.value = null;
  }
});

onMounted(() => {
  loadAllData();
});

onUnmounted(() => {
  if (routeMap) {
    routeMap.remove();
    routeMap = null;
  }
});
</script>

<style scoped>
.team-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

/* Header */
.team-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, #ec4899, #f97316);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.75rem;
}

.header-text h1 {
  color: var(--text-primary, #f1f5f9);
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 4px 0;
}

.header-subtitle {
  color: var(--text-secondary, #94a3b8);
  font-size: 1rem;
  margin: 0;
}

/* Loading & Empty States */
.loading-state, .empty-state {
  padding: 80px 24px;
  text-align: center;
  color: var(--text-secondary, #94a3b8);
}

.empty-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--bg-secondary, #1e293b);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
}

.empty-icon i { font-size: 2rem; color: var(--accent-color, #818cf8); }
.empty-state h3 { color: var(--text-primary, #f1f5f9); font-size: 1.25rem; margin: 0 0 8px 0; }
.empty-state p { margin: 0; font-size: 0.9375rem; }

/* Dates Grid */
.dates-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.date-card {
  background: var(--bg-secondary, #1e293b);
  border: 1px solid var(--border-color, #334155);
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.date-card:hover {
  border-color: #ec4899;
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(236, 72, 153, 0.15);
}

.date-card-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.date-badge {
  min-width: 56px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #ec4899, #f97316);
  border-radius: 12px;
  text-align: center;
}

.date-number {
  display: block;
  color: white;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1;
}

.date-month {
  display: block;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  margin-top: 4px;
}

.date-day-name {
  color: var(--text-primary, #f1f5f9);
  font-size: 1.125rem;
  font-weight: 600;
  text-transform: capitalize;
}

.date-card-members {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color, #334155);
}

.member-tag {
  padding: 4px 12px;
  border-radius: 16px;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.date-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.date-card-stats {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mini-stat {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.8125rem;
}

.mini-stat i {
  font-size: 0.6875rem;
  opacity: 0.7;
}

.date-total {
  color: #22c55e;
  font-size: 1.125rem;
  font-weight: 700;
}

/* Date Detail View */
.date-detail {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--bg-secondary, #1e293b);
  border: 1px solid var(--border-color, #334155);
  border-radius: 10px;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.9375rem;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 24px;
}

.back-button:hover {
  color: var(--text-primary, #f1f5f9);
  border-color: var(--accent-color, #818cf8);
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(249, 115, 22, 0.1));
  border: 1px solid rgba(236, 72, 153, 0.2);
  border-radius: 16px;
  margin-bottom: 24px;
}

.detail-date-badge {
  min-width: 72px;
  padding: 14px 18px;
  background: linear-gradient(135deg, #ec4899, #f97316);
  border-radius: 14px;
  text-align: center;
}

.detail-date-number {
  display: block;
  color: white;
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
}

.detail-date-month {
  display: block;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  margin-top: 4px;
}

.detail-date-info h2 {
  color: var(--text-primary, #f1f5f9);
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 8px 0;
  text-transform: capitalize;
}

.detail-stats {
  display: flex;
  gap: 20px;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.9375rem;
}

.detail-stats span {
  display: flex;
  align-items: center;
  gap: 6px;
}

.detail-stats i {
  font-size: 0.875rem;
}

.detail-total {
  color: #22c55e !important;
  font-weight: 600;
}

/* Casinos List */
.casinos-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.casino-card {
  background: var(--bg-secondary, #1e293b);
  border: 1px solid var(--border-color, #334155);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.casino-card:hover {
  border-color: rgba(129, 140, 248, 0.4);
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.08), 0 4px 12px rgba(0, 0, 0, 0.1);
}

.casino-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 22px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.06), rgba(99, 102, 241, 0.06));
  border-bottom: 1px solid var(--border-color, #334155);
}

.casino-info {
  display: flex;
  align-items: center;
  gap: 14px;
}

.casino-logo-wrapper {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  border: 2px solid var(--border-color, #334155);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary, #0f172a);
  padding: 4px;
  flex-shrink: 0;
}

.casino-logo { width: 100%; height: 100%; object-fit: contain; }

.casino-initials {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  font-weight: 700;
  font-size: 0.75rem;
  border-radius: 8px;
}

.casino-details { display: flex; flex-direction: column; gap: 3px; }
.casino-name { color: var(--text-primary, #f1f5f9); font-weight: 700; font-size: 1.0625rem; }
.casino-count { color: var(--text-secondary, #94a3b8); font-size: 0.8125rem; }

.casino-drive-time {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--accent-color, #818cf8);
  font-size: 0.75rem;
  font-weight: 500;
}

.casino-drive-time i {
  font-size: 0.625rem;
}

.casino-drive-time .drive-distance {
  color: var(--text-secondary, #94a3b8);
  font-size: 0.6875rem;
  font-weight: 400;
}

.map-link-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 3px 10px rgba(99, 102, 241, 0.35);
  flex-shrink: 0;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-left: auto;
}

.map-link-btn i {
  font-size: 0.875rem;
}

.map-link-btn:hover {
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  transform: translateY(-2px);
  box-shadow: 0 5px 16px rgba(99, 102, 241, 0.5);
}

.map-link-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.3);
}

.map-link-text {
  display: inline;
}

/* Route map modal */
.route-map-container {
  width: 100%;
  height: 55vh;
  min-height: 300px;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  background: #0f172a;
}

.route-leaflet-map {
  width: 100%;
  height: 100%;
}

/* Barre inférieure avec info et liens navigation */
.route-map-bottom-bar {
  align-items: center;
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 1000;
}

.route-map-info {
  width: fit-content;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 10px 20px;
  background: rgba(30, 41, 59, 0.95);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  border: 1px solid #6366f1;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
}

.route-map-stat {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #f1f5f9;
  font-size: 0.9375rem;
  font-weight: 600;
}

.route-map-stat i {
  color: #818cf8;
  font-size: 0.875rem;
}

/* Liens de navigation externe */
.route-nav-links {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.nav-link-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 10px;
  text-decoration: none;
  font-weight: 700;
  font-size: 0.875rem;
  transition: all 0.25s ease;
  max-width: 200px;
}

.nav-link-btn i {
  font-size: 1.125rem;
}

.nav-link-btn.google-maps {
  background: linear-gradient(135deg, #4285f4, #34a853);
  color: white;
  box-shadow: 0 4px 12px rgba(66, 133, 244, 0.4);
}

.nav-link-btn.google-maps:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(66, 133, 244, 0.5);
}

.nav-link-btn.apple-maps {
  background: linear-gradient(135deg, #333333, #000000);
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.nav-link-btn.apple-maps:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
}

.nav-link-label {
  white-space: nowrap;
}

/* Apple Maps visible uniquement sur mobile (iOS) */
.mobile-only {
  display: none;
}

@media (max-width: 768px) {
  .mobile-only {
    display: flex;
  }

  .route-map-bottom-bar {
    left: 8px;
    right: 8px;
    bottom: 8px;
  }

  .route-map-info {
    padding: 8px 14px;
    gap: 12px;
  }

  .route-map-stat {
    font-size: 0.8125rem;
  }

  .nav-link-btn {
    padding: 10px 14px;
    font-size: 0.8125rem;
  }

  .nav-link-btn i {
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .route-map-info {
    flex-direction: column;
    gap: 6px;
    padding: 8px 12px;
  }

  .route-nav-links {
    flex-direction: column;
    gap: 8px;
  }

  .nav-link-btn {
    max-width: none;
    padding: 12px 16px;
  }
}

:deep(.route-map-dialog .p-dialog-content) {
  padding: 0 !important;
  overflow: hidden;
}

:deep(.route-map-dialog .p-dialog-header) {
  background: #1e293b;
  border-bottom: 1px solid #334155;
  padding: 0.75rem 1rem;
}

:deep(.route-map-dialog .p-dialog-title) {
  color: #f1f5f9;
  font-weight: 700;
  font-size: 1rem;
}

:deep(.leaflet-routing-container) {
  display: none !important;
}

/* Notes indicator in casino header */
.casino-notes-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: auto;
}

.casino-notes-indicator i {
  font-size: 0.8125rem;
  color: #818cf8;
}

.casino-notes-indicator .notes-count {
  font-size: 0.75rem;
  font-weight: 600;
  color: #818cf8;
}

.casino-notes-indicator:hover {
  background: rgba(99, 102, 241, 0.2);
  border-color: rgba(99, 102, 241, 0.4);
  transform: scale(1.03);
}

/* Time Slots */
.time-slots { padding: 6px 0; }

.time-slot {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 22px;
  transition: background 0.15s ease;
}

.time-slot:hover { background: rgba(99, 102, 241, 0.04); }
.time-slot:not(:last-child) { border-bottom: 1px solid rgba(51, 65, 85, 0.5); }

/* Ligne 1: Heure + Buy-in + Badges */
.time-slot-top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.time-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-primary, #f1f5f9);
  font-weight: 700;
  font-size: 1rem;
}

.time-badge i { font-size: 0.75rem; color: var(--accent-color, #818cf8); opacity: 0.8; }

.time-buyin { color: #22c55e; font-weight: 700; font-size: 1rem; }

/* Ligne 2: Structure */
.time-slot-structure {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-left: 2px;
}

.structure-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 5px;
  font-size: 0.6875rem;
  font-weight: 500;
}

.structure-tag i {
  font-size: 0.4375rem;
}

.structure-tag.chips {
  background: rgba(99, 102, 241, 0.1);
  color: #a5b4fc;
}

.structure-tag.levels {
  background: rgba(51, 65, 85, 0.5);
  color: var(--text-secondary, #94a3b8);
}

/* Ligne 3: Utilisateurs + Rejoindre */
.time-slot-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.time-users { display: flex; flex-wrap: wrap; gap: 8px; }

.day-badge-small {
  background: rgba(245, 158, 11, 0.12);
  color: #fbbf24;
  padding: 3px 8px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.625rem;
  text-transform: uppercase;
  border: 1px solid rgba(245, 158, 11, 0.25);
}

.restart-badge-small {
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
  padding: 3px 8px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.625rem;
  text-transform: uppercase;
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.time-users { display: flex; flex-wrap: wrap; gap: 8px; }

.user-chip-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  position: relative;
}

.user-chip {
  padding: 6px 14px;
  border-radius: 20px;
  color: white;
  font-size: 0.8125rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.user-chip:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.user-note-icon {
  width: 20px;
  height: 20px;
  background: rgba(99, 102, 241, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.user-note-icon i {
  font-size: 0.625rem;
  color: #6366f1;
}

.user-note-icon:hover {
  background: rgba(99, 102, 241, 0.4);
  transform: scale(1.1);
}

/* Mobile user notes */
.mobile-user-notes {
  display: none;
  width: 100%;
  margin-top: 10px;
  padding: 10px;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 8px;
  border-left: 3px solid #6366f1;
}

.mobile-user-note-item {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 0;
  font-size: 0.75rem;
}

.mobile-user-note-item:not(:last-child) {
  border-bottom: 1px dashed rgba(99, 102, 241, 0.3);
  padding-bottom: 8px;
  margin-bottom: 4px;
}

.mobile-note-user {
  color: #6366f1;
  font-weight: 600;
}

.mobile-note-text {
  color: var(--text-secondary, #94a3b8);
  word-break: break-word;
}

/* Desktop only elements */
.desktop-only {
  display: flex;
}

.user-chip.small { padding: 4px 10px; font-size: 0.75rem; }

.join-btn {
  color: #34d399 !important;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.join-btn:hover {
  color: #10b981 !important;
  background: rgba(16, 185, 129, 0.1) !important;
}

/* Join Dialog */
.join-dialog-content { display: flex; flex-direction: column; gap: 20px; padding: 8px 0; }

.join-tournament-summary {
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(249, 115, 22, 0.1));
  border: 1px solid rgba(236, 72, 153, 0.2);
  border-radius: 12px;
  padding: 16px;
}

.summary-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; }
.summary-row:not(:last-child) { border-bottom: 1px solid rgba(236, 72, 153, 0.1); }
.summary-label { color: var(--text-secondary, #64748b); font-size: 0.875rem; }
.summary-value { color: var(--text-primary, #1e293b); font-weight: 600; text-transform: capitalize; }
.summary-value.highlight { color: #6366f1; font-size: 1.125rem; }
.summary-value.buyin { color: #22c55e; font-size: 1.125rem; }

.current-participants { display: flex; flex-direction: column; gap: 8px; }
.participants-label { color: var(--text-secondary, #64748b); font-size: 0.875rem; }
.participants-chips { display: flex; flex-wrap: wrap; gap: 8px; }

.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-group label { color: var(--text-primary, #1e293b); font-weight: 600; font-size: 0.9375rem; }
.input-full { width: 100%; }

/* Note Dialog */
.note-dialog-content {
  padding: 32px 24px;
  text-align: center;
}

.note-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(99, 102, 241, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.note-icon i {
  font-size: 1.75rem;
  color: #6366f1;
}

.note-dialog-content h3 {
  color: var(--text-primary, #1e293b);
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 20px 0;
}

.note-input-wrapper {
  text-align: left;
  margin-bottom: 24px;
}

.note-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.confirm-note-btn {
  min-width: 120px;
}

.divider-or {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 12px 0;
}

.divider-or::before,
.divider-or::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border-color, #e2e8f0);
}

.divider-or span {
  color: var(--text-secondary, #64748b);
  font-size: 0.8125rem;
  white-space: nowrap;
}

.create-user-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.create-user-inline {
  display: flex;
  gap: 10px;
  align-items: center;
}

.input-pseudo {
  flex: 1;
}

/* Responsive */
@media (max-width: 1024px) {
  .dates-grid { grid-template-columns: repeat(2, 1fr); }
  .casinos-list { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
  .team-container { padding: 16px; }
  .dates-grid { grid-template-columns: 1fr; gap: 16px; }
  .casinos-list { grid-template-columns: 1fr; }
  .team-header { flex-direction: column; align-items: flex-start; gap: 16px; }
  .detail-header { flex-direction: column; align-items: flex-start; gap: 16px; padding: 18px; }
  .detail-stats { flex-wrap: wrap; gap: 12px; }

  .route-map-container {
    height: 50vh;
    min-height: 280px;
  }

  .route-map-info-bar {
    top: 12px;
    bottom: auto;
    left: 12px;
    transform: none;
    flex-direction: column;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 12px;
  }

  .route-map-stat {
    font-size: 0.8125rem;
  }

  .map-link-text {
    display: none;
  }

  .time-slot { padding: 14px 16px; gap: 10px; }
  .time-slot-top { flex-wrap: wrap; }
  .time-slot-bottom { flex-direction: column; align-items: flex-start; gap: 10px; }
  .time-users { width: 100%; }

  /* Show mobile notes, hide desktop elements */
  .mobile-user-notes {
    display: block;
  }

  .desktop-only {
    display: none !important;
  }

  .date-card {
    padding: 16px;
    border-radius: 12px;
  }

  .date-card-header {
    flex-direction: row;
    gap: 14px;
    margin-bottom: 14px;
  }

  .date-badge {
    min-width: 48px;
    padding: 8px 12px;
  }

  .date-number {
    font-size: 1.25rem;
  }

  .date-day-name {
    font-size: 1rem;
  }

  .casino-header {
    padding: 14px 16px;
  }

  .casino-info {
    gap: 12px;
  }

  .casino-logo-wrapper {
    width: 38px;
    height: 38px;
  }

  .casino-name {
    font-size: 0.9375rem;
  }

  .back-button {
    padding: 8px 14px;
    font-size: 0.875rem;
    margin-bottom: 18px;
  }
}

@media (max-width: 480px) {
  .team-container { padding: 12px; }
  .header-icon { width: 48px; height: 48px; font-size: 1.25rem; border-radius: 12px; }
  .header-text h1 { font-size: 1.25rem; }
  .header-subtitle { font-size: 0.875rem; }

  .dates-grid {
    gap: 12px;
  }

  .date-card {
    padding: 14px;
  }

  .date-badge {
    min-width: 44px;
    padding: 6px 10px;
    border-radius: 10px;
  }

  .date-number {
    font-size: 1.125rem;
  }

  .date-month {
    font-size: 0.625rem;
    margin-top: 2px;
  }

  .date-day-name {
    font-size: 0.9375rem;
  }

  .date-card-members {
    gap: 5px;
    margin-bottom: 12px;
    padding-bottom: 12px;
  }

  .member-tag {
    padding: 3px 10px;
    font-size: 0.6875rem;
  }

  .date-card-stats {
    gap: 10px;
  }

  .mini-stat {
    font-size: 0.75rem;
  }

  .date-total {
    font-size: 1rem;
  }

  .detail-header {
    padding: 14px;
    border-radius: 12px;
    gap: 14px;
  }

  .detail-date-badge {
    min-width: 60px;
    padding: 10px 14px;
    border-radius: 10px;
  }

  .detail-date-number {
    font-size: 1.75rem;
  }

  .detail-date-month {
    font-size: 0.6875rem;
  }

  .detail-date-info h2 {
    font-size: 1.25rem;
    margin-bottom: 6px;
  }

  .detail-stats {
    font-size: 0.8125rem;
    gap: 10px;
  }

  .casino-card {
    border-radius: 12px;
  }

  .casino-header {
    padding: 12px 14px;
  }

  .casino-logo-wrapper {
    width: 34px;
    height: 34px;
    border-radius: 8px;
  }

  .casino-name {
    font-size: 0.875rem;
  }

  .casino-count {
    font-size: 0.75rem;
  }

  .time-slot {
    padding: 12px 14px;
  }

  .time-badge {
    font-size: 0.875rem;
  }

  .time-buyin {
    font-size: 0.875rem;
  }

  .time-slot {
    padding: 12px 14px;
  }

  .time-slot-bottom {
    gap: 8px;
  }

  .time-users {
    gap: 6px;
    flex-wrap: wrap;
  }

  .user-chip {
    padding: 5px 12px;
    font-size: 0.75rem;
  }

  .join-btn {
    justify-content: center !important;
  }

  .back-button {
    padding: 8px 12px;
    font-size: 0.8125rem;
    margin-bottom: 14px;
  }

  .casinos-list {
    gap: 12px;
  }
}

/* Dialog responsive */
:deep(.p-dialog) {
  margin: 1rem;
  max-width: calc(100vw - 2rem);
}

@media (max-width: 480px) {
  :deep(.p-dialog) {
    width: calc(100vw - 1rem) !important;
    max-width: none;
    margin: 0.5rem;
  }

  .join-dialog-content {
    gap: 16px;
    padding: 6px 0;
  }

  .join-tournament-summary {
    padding: 14px;
    border-radius: 10px;
  }

  .summary-row {
    padding: 5px 0;
  }

  .summary-label {
    font-size: 0.8125rem;
  }

  .summary-value {
    font-size: 0.9375rem;
  }

  .summary-value.highlight,
  .summary-value.buyin {
    font-size: 1rem;
  }

  .current-participants {
    gap: 6px;
  }

  .participants-label {
    font-size: 0.8125rem;
  }

  .participants-chips {
    gap: 6px;
  }

  .form-group label {
    font-size: 0.875rem;
  }

  .divider-or {
    margin: 10px 0;
  }

  .divider-or span {
    font-size: 0.75rem;
  }

  .create-user-inline {
    flex-direction: column;
    gap: 8px;
  }

  .input-pseudo {
    width: 100%;
  }
}
</style>
