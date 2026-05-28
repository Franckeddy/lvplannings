<template>
  <Toast />
  <div class="timeline-container">
    <!-- Vue Grille des Dates -->
    <div v-if="!selectedDay" class="dates-view">
      <div class="timeline-header">
        <h2>Planning des Tournois</h2>
        <p class="subtitle">Las Vegas 2026</p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-section">
        <ProgressSpinner />
        <p>Chargement des tournois...</p>
      </div>

      <!-- Grille des dates -->
      <div v-else class="dates-grid">
        <div
          v-for="day in timeline"
          :key="day.date"
          class="date-card"
          @click="openDay(day)"
        >
          <div class="date-card-header">
            <span class="day-name">{{ getDayName(day.date) }}</span>
            <span class="day-number">{{ getDayNumber(day.date) }}</span>
            <span class="month-name">{{ getMonthName(day.date) }}</span>
          </div>
          <div class="date-card-footer">
            <div class="tournament-count">
              <i class="pi pi-trophy"></i>
              <span>{{ day.count }} tournois</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Vue Détail d'une Date -->
    <div v-else class="day-detail-view">
      <div class="day-detail-header">
        <Button
          icon="pi pi-arrow-left"
          label="Retour"
          @click="closeDay"
          text
          class="back-button"
        />
        <div class="day-detail-title">
          <h2>{{ formatDateFull(selectedDay.date) }}</h2>
          <span class="tournament-badge">{{ selectedDay.count }} tournois disponibles</span>
        </div>
        <Button
          icon="pi pi-plus"
          label="Ajouter un tournoi"
          @click="openManualTournamentDialog"
          class="add-manual-button"
          severity="success"
        />
      </div>

      <div class="tournaments-grid">
        <div
          v-for="tournament in selectedDay.tournaments"
          :key="tournament.id"
          class="tournament-card"
        >
          <!-- Indicateur d'utilisateurs inscrits avec notes -->
          <div
            v-if="getEnrolledUsers(tournament).some(u => u.user_note)"
            class="enrolled-notes-indicator desktop-only"
            v-tooltip.top="getEnrolledUsers(tournament).filter(u => u.user_note).map(u => `${u.userName}: ${u.user_note}`).join('\n')"
          >
            <i class="pi pi-comment"></i>
          </div>

          <div class="tournament-card-header">
            <div class="tournament-time">{{ tournament.displayTime }}</div>
            <div class="tournament-badges">
              <div v-if="tournament.isManual" class="manual-badge-tag">
                Manuel
              </div>
              <div v-if="tournament.day" class="day-badge-tag">
                Day {{ tournament.day }}
              </div>
              <div v-else-if="tournament.isRestart" class="restart-badge-tag">
                Restart
              </div>
              <div class="tournament-buyin">{{ formatBuyIn(tournament.buyIn) }}</div>
            </div>
          </div>

          <div class="tournament-card-body">
            <div class="casino-info">
              <div class="casino-logo-wrapper">
                <img
                  v-if="getCasinoLogo(tournament.casino)"
                  :src="getCasinoLogo(tournament.casino)"
                  :alt="tournament.casino"
                  class="casino-logo"
                  @error="handleImageError"
                />
                <div v-else class="casino-initials">
                  {{ getCasinoInitials(tournament.casino) }}
                </div>
              </div>
              <div class="casino-name-wrapper">
                <div class="casino-name">{{ tournament.casino }}</div>
                <div v-if="getRouteTime(tournament.casino)" class="casino-drive-time">
                  <i class="pi pi-car"></i>
                  <span>{{ getRouteTime(tournament.casino).durationMin }} min</span>
                  <span class="drive-distance">({{ getRouteTime(tournament.casino).distanceMiles }} mi)</span>
                </div>
              </div>
            </div>

            <div v-if="hasStructureInfo(tournament)" class="tournament-structure">
              <div v-if="tournament.structureChips" class="structure-tag chips">
                <i class="pi pi-circle-fill"></i>
                {{ tournament.structureChips }}
              </div>
              <div v-if="tournament.structureLevels" class="structure-tag levels">
                <i class="pi pi-clock"></i>
                {{ tournament.structureLevels }}
              </div>
              <div v-if="tournament.structureGuarantee" class="structure-tag guarantee">
                <i class="pi pi-star-fill"></i>
                {{ tournament.structureGuarantee }}
              </div>
            </div>

            <!-- Utilisateurs inscrits -->
            <div v-if="getEnrolledUsers(tournament).length > 0" class="enrolled-users">
              <div class="enrolled-label">
                <i class="pi pi-users"></i>
                Inscrits:
              </div>
              <div class="enrolled-chips">
                <div
                  v-for="enrolled in getEnrolledUsers(tournament)"
                  :key="enrolled.id"
                  class="enrolled-chip"
                  :style="{ backgroundColor: getUserColor(enrolled.userName) }"
                >
                  {{ enrolled.userName }}
                  <span
                    v-if="enrolled.user_note"
                    class="enrolled-note-icon desktop-only"
                    v-tooltip.top="enrolled.user_note"
                  >
                    <i class="pi pi-comment"></i>
                  </span>
                </div>
              </div>
              <!-- Notes visibles sur mobile -->
              <div class="mobile-notes" v-if="getEnrolledUsers(tournament).some(u => u.user_note)">
                <div
                  v-for="enrolled in getEnrolledUsers(tournament).filter(u => u.user_note)"
                  :key="'note-' + enrolled.id"
                  class="mobile-note-item"
                >
                  <span class="mobile-note-user">{{ enrolled.userName }}:</span>
                  <span class="mobile-note-text">{{ enrolled.user_note }}</span>
                </div>
              </div>
            </div>

          </div>

          <div class="tournament-card-footer">
            <div class="footer-buttons">
              <Button
                label="Ajouter au planning"
                icon="pi pi-plus"
                @click="selectTournament(tournament)"
                class="add-button"
                size="small"
              />
              <Button
                v-if="tournament.isManual"
                icon="pi pi-trash"
                @click="deleteManualTournament(tournament)"
                class="delete-button"
                size="small"
                severity="danger"
                text
                v-tooltip.top="'Supprimer ce tournoi'"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Dialogue de sélection -->
    <Dialog
      v-model:visible="showSelectionDialog"
      header="Ajouter le tournoi"
      :modal="true"
      :style="{ width: '500px' }"
      class="add-dialog"
    >
      <div v-if="selectedTournament" class="selection-dialog-content">
        <div class="selected-tournament-summary">
          <div class="summary-header">
            <div class="summary-time">{{ selectedTournament.displayTime }}</div>
            <div class="summary-buyin">{{ formatBuyIn(selectedTournament.buyIn) }}</div>
          </div>
          <div class="summary-casino">{{ selectedTournament.casino }}</div>
          <div class="summary-date">{{ formatDateFull(selectedTournament.date) }}</div>
        </div>

        <div class="form-group">
          <label>Sélectionnez un utilisateur</label>
          <Select
            v-model="selectedUser"
            :options="users"
            optionLabel="name"
            placeholder="Choisir un utilisateur..."
            class="input-full"
          />
        </div>

        <div class="form-group">
          <label>Note (optionnel)</label>
          <Textarea
            v-model="userNote"
            rows="2"
            placeholder="Ajouter une note personnelle..."
            class="input-full"
            autoResize
          />
        </div>
      </div>

      <template #footer>
        <Button label="Annuler" @click="showSelectionDialog = false" severity="secondary" text />
        <Button
          label="Confirmer"
          @click="addToPlanning"
          :disabled="!selectedUser || adding"
          :loading="adding"
          icon="pi pi-check"
        />
      </template>
    </Dialog>

    <!-- Dialogue d'ajout manuel de tournoi -->
    <Dialog
      v-model:visible="showManualDialog"
      header="Ajouter un tournoi"
      :modal="true"
      :style="{ width: '500px' }"
      class="add-dialog"
    >
      <div class="manual-dialog-content">
        <div class="manual-date-info">
          <i class="pi pi-calendar"></i>
          <span>{{ selectedDay ? formatDateFull(selectedDay.date) : '' }}</span>
        </div>

        <div class="form-group">
          <label>Nom du Casino <span class="required">*</span></label>
          <InputText
            v-model="manualTournament.casino"
            placeholder="Ex: Bellagio, Wynn..."
            class="input-full"
          />
        </div>

        <div class="form-row">
          <div class="form-group half">
            <label>Buy-in ($) <span class="required">*</span></label>
            <InputNumber
              v-model="manualTournament.buyin"
              :min="0"
              placeholder="Ex: 500"
              class="input-full"
              mode="currency"
              currency="USD"
              locale="en-US"
            />
          </div>
          <div class="form-group half">
            <label>Heure <span class="required">*</span></label>
            <DatePicker
              v-model="manualTournament.timeDate"
              timeOnly
              hourFormat="24"
              class="input-full"
              placeholder="Sélectionner l'heure"
            />
          </div>
        </div>

        <div class="form-group">
          <label>Niveau (durée en minutes) <span class="required">*</span></label>
          <InputNumber
            v-model="manualTournament.levelMinutes"
            :min="1"
            :max="120"
            placeholder="Ex: 20"
            class="input-full"
            suffix=" min"
          />
        </div>

        <div class="form-group">
          <label>Stack de départ (facultatif)</label>
          <InputNumber
            v-model="manualTournament.startingStack"
            :min="0"
            placeholder="Ex: 25000"
            class="input-full"
            :useGrouping="true"
          />
        </div>

        <div class="form-group">
          <label>Note (optionnel)</label>
          <Textarea
            v-model="manualTournament.note"
            rows="2"
            placeholder="Ajouter une note personnelle..."
            class="input-full"
            autoResize
          />
        </div>
      </div>

      <template #footer>
        <Button label="Annuler" @click="showManualDialog = false" severity="secondary" text />
        <Button
          label="Ajouter"
          @click="addManualTournament"
          :disabled="!isManualFormValid || addingManual"
          :loading="addingManual"
          icon="pi pi-check"
          severity="success"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import DatePicker from 'primevue/datepicker';
import ProgressSpinner from 'primevue/progressspinner';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import { useCasinoLogos } from '../composables/useCasinoLogos';
import { useCasinoRoutes } from '../composables/useCasinoRoutes';

const emit = defineEmits(['tournament-added']);

// Configuration API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Casino routes
const { getRouteForCasino } = useCasinoRoutes();
const casinoRouteTimes = ref({}); // cache: { casinoName: { durationMin, distanceMiles } }

// État
const loading = ref(false);
const timeline = ref([]);
const selectedDay = ref(null);
const showSelectionDialog = ref(false);
const selectedTournament = ref(null);
const selectedUser = ref(null);
const users = ref([]);
const adding = ref(false);
const userNote = ref('');
const allUserTournaments = ref([]);

// État pour l'ajout manuel
const showManualDialog = ref(false);
const addingManual = ref(false);
const manualTournament = ref({
  casino: '',
  buyin: null,
  timeDate: null,
  levelMinutes: null,
  startingStack: null,
  note: ''
});

// Validation du formulaire manuel
const isManualFormValid = computed(() => {
  return manualTournament.value.casino &&
         manualTournament.value.buyin !== null &&
         manualTournament.value.timeDate !== null &&
         manualTournament.value.levelMinutes !== null;
});

// Formater l'heure depuis Date vers HH:MM
const formatTimeFromDate = (date) => {
  if (!date) return '';
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

const { getCasinoLogo, getCasinoInitials } = useCasinoLogos();
const toast = useToast();

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

// Normaliser le nom du casino pour le matching
const normalizeCasinoName = (name) => {
  const lowerName = name.toLowerCase();

  // Mapping des variations de noms
  if (lowerName.includes('world series') || lowerName.includes('wsop')) {
    return 'wsop';
  }
  if (lowerName.includes('orleans')) {
    return 'orleans';
  }
  if (lowerName.includes('aria')) {
    return 'aria';
  }
  if (lowerName.includes('venetian')) {
    return 'venetian';
  }
  if (lowerName.includes('wynn')) {
    return 'wynn';
  }
  if (lowerName.includes('bellagio')) {
    return 'bellagio';
  }
  if (lowerName.includes('mgm')) {
    return 'mgm';
  }
  if (lowerName.includes('caesars')) {
    return 'caesars';
  }

  return lowerName.replace(/[^a-z0-9]/g, '');
};

// Normaliser l'heure pour le matching (format HH:MM)
const normalizeTime = (time) => {
  if (!time) return '';
  // Prendre juste HH:MM
  const parts = time.split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return time;
};

// Normaliser la date pour le matching
const normalizeDate = (dateStr) => {
  if (!dateStr) return '';
  return dateStr.toLowerCase().trim();
};

// Trouver les utilisateurs inscrits à un tournoi scrapé
const getEnrolledUsers = (scrapedTournament) => {
  const scrapedId = scrapedTournament.id;

  // D'abord chercher par ID du tournoi scrapé (matching exact)
  let matches = allUserTournaments.value.filter(ut =>
    ut.scraped_tournament_id === scrapedId
  );

  // Si pas de match par ID, fallback sur date/time/casino
  if (matches.length === 0) {
    const scrapedDate = normalizeDate(formatDateForDb(scrapedTournament.date));
    const scrapedTime = normalizeTime(scrapedTournament.time);
    const scrapedCasinoNorm = normalizeCasinoName(scrapedTournament.casino);

    matches = allUserTournaments.value.filter(ut => {
      const userDate = normalizeDate(ut.date);
      const userTime = normalizeTime(ut.time);
      const userCasinoNorm = normalizeCasinoName(ut.casino);

      const matchDate = userDate === scrapedDate;
      const matchTime = userTime === scrapedTime;
      const matchCasino = userCasinoNorm === scrapedCasinoNorm;

      return matchDate && matchTime && matchCasino;
    });
  }

  return matches;
};

const handleImageError = (event) => {
  event.target.style.display = 'none';
  const initialsDiv = event.target.nextElementSibling;
  if (initialsDiv) {
    initialsDiv.style.display = 'flex';
  }
};

// Méthodes
const loadTimeline = async () => {
  loading.value = true;

  try {
    const params = new URLSearchParams({
      startDate: '2026-06-03',
      endDate: '2026-06-12'
    });

    const response = await fetch(`${API_URL}/scraped-tournaments/timeline?${params}`);

    if (response.ok) {
      timeline.value = await response.json();
    }
  } catch (error) {
    console.error('Erreur lors du chargement de la timeline:', error);
  } finally {
    loading.value = false;
  }
};

const loadUsers = async () => {
  try {
    const response = await fetch(`${API_URL}/users`);
    if (response.ok) {
      users.value = await response.json();
    }
  } catch (error) {
    console.error('Erreur lors du chargement des utilisateurs:', error);
  }
};

const loadAllUserTournaments = async () => {
  try {
    const allTournaments = [];
    for (const user of users.value) {
      const response = await fetch(`${API_URL}/users/${user.id}/tournaments`);
      if (response.ok) {
        const tournaments = await response.json();
        tournaments.forEach(t => {
          allTournaments.push({
            ...t,
            userName: user.name,
            oderId: user.id
          });
        });
      }
    }
    allUserTournaments.value = allTournaments;
    console.log('Tournois utilisateurs chargés:', allUserTournaments.value.length);
  } catch (error) {
    console.error('Erreur lors du chargement des tournois utilisateurs:', error);
  }
};

const openDay = (day) => {
  selectedDay.value = day;
  // Charger les temps de trajet pour les casinos de ce jour
  loadRouteTimes(day.tournaments);
};

// Charger les temps de trajet pour les tournois affichés
const loadRouteTimes = async (tournaments) => {
  const uniqueCasinos = [...new Set(tournaments.map(t => t.casino))];
  for (const casinoName of uniqueCasinos) {
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

const closeDay = () => {
  selectedDay.value = null;
};

const selectTournament = (tournament) => {
  selectedTournament.value = tournament;
  userNote.value = '';
  showSelectionDialog.value = true;
};

const addToPlanning = async () => {
  if (!selectedUser.value || !selectedTournament.value) return;

  adding.value = true;

  const tournamentData = {
    userId: selectedUser.value.id,
    date: formatDateForDb(selectedTournament.value.date),
    time: selectedTournament.value.time.substring(0, 5),
    casino: selectedTournament.value.casino,
    buyin: selectedTournament.value.buyIn,
    levels: selectedTournament.value.levels || '',
    user_note: userNote.value || null,
    scraped_tournament_id: selectedTournament.value.id,
    name: selectedTournament.value.name || null,
    day: selectedTournament.value.day || null,
    isRestart: selectedTournament.value.isRestart || false
  };

  try {
    const response = await fetch(
      `${API_URL}/users/${selectedUser.value.id}/tournaments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tournamentData)
      }
    );

    if (response.ok) {
      const userName = selectedUser.value.name;
      emit('tournament-added', await response.json());
      showSelectionDialog.value = false;
      selectedTournament.value = null;
      selectedUser.value = null;
      userNote.value = '';
      // Recharger les tournois pour mettre à jour l'affichage
      await loadAllUserTournaments();
      toast.add({
        severity: 'success',
        summary: 'Tournoi ajouté',
        detail: `Le tournoi a été ajouté au planning de ${userName}`,
        life: 3000
      });
    }
  } catch (error) {
    console.error('Erreur lors de l\'ajout du tournoi:', error);
  } finally {
    adding.value = false;
  }
};

// Ouvrir la modale d'ajout manuel
const openManualTournamentDialog = () => {
  manualTournament.value = {
    casino: '',
    buyin: null,
    timeDate: null,
    levelMinutes: null,
    startingStack: null,
    note: ''
  };
  showManualDialog.value = true;
};

// Ajouter un tournoi manuel
const addManualTournament = async () => {
  if (!selectedDay.value || !isManualFormValid.value) return;

  addingManual.value = true;

  const timeString = formatTimeFromDate(manualTournament.value.timeDate);

  // Formater le stack de départ si présent
  const structureChips = manualTournament.value.startingStack
    ? `${manualTournament.value.startingStack.toLocaleString('fr-FR')} chip`
    : null;

  // Créer le tournoi dans scraped_tournaments d'abord
  const scrapedTournamentData = {
    date: selectedDay.value.date,
    time: timeString,
    casino: manualTournament.value.casino,
    buyin: manualTournament.value.buyin,
    levels: `niveau de ${manualTournament.value.levelMinutes} min`,
    structure_levels: `niveau de ${manualTournament.value.levelMinutes} min`,
    structure_chips: structureChips,
    is_manual: true
  };

  try {
    // Créer le tournoi scrapé
    const scrapedResponse = await fetch(`${API_URL}/scraped-tournaments/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scrapedTournamentData)
    });

    if (scrapedResponse.ok) {
      const newScrapedTournament = await scrapedResponse.json();

      // Ajouter le tournoi à la timeline locale
      const newTournament = {
        ...newScrapedTournament,
        displayTime: timeString,
        buyIn: manualTournament.value.buyin,
        structureLevels: `niveau de ${manualTournament.value.levelMinutes} min`,
        structureChips: structureChips
      };

      selectedDay.value.tournaments.push(newTournament);
      selectedDay.value.count = selectedDay.value.tournaments.length;

      // Trier par heure
      selectedDay.value.tournaments.sort((a, b) => {
        return a.time.localeCompare(b.time);
      });

      showManualDialog.value = false;

      toast.add({
        severity: 'success',
        summary: 'Tournoi créé',
        detail: `Le tournoi a été ajouté pour le ${formatDateFull(selectedDay.value.date)}`,
        life: 3000
      });

      // Recharger la timeline pour avoir les données à jour
      await loadTimeline();
      // Reprendre le jour sélectionné
      const updatedDay = timeline.value.find(d => d.date === selectedDay.value.date);
      if (updatedDay) {
        selectedDay.value = updatedDay;
      }
    }
  } catch (error) {
    console.error('Erreur lors de la création du tournoi manuel:', error);
    toast.add({
      severity: 'error',
      summary: 'Erreur',
      detail: 'Impossible de créer le tournoi',
      life: 3000
    });
  } finally {
    addingManual.value = false;
  }
};

// Supprimer un tournoi manuel
const deleteManualTournament = async (tournament) => {
  if (!confirm(`Supprimer le tournoi "${tournament.casino}" à ${tournament.displayTime} ?`)) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/scraped-tournaments/${tournament.id}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      // Retirer le tournoi de la liste locale
      const index = selectedDay.value.tournaments.findIndex(t => t.id === tournament.id);
      if (index > -1) {
        selectedDay.value.tournaments.splice(index, 1);
        selectedDay.value.count = selectedDay.value.tournaments.length;
      }

      toast.add({
        severity: 'success',
        summary: 'Tournoi supprimé',
        detail: `Le tournoi a été supprimé`,
        life: 3000
      });
    } else {
      throw new Error('Erreur lors de la suppression');
    }
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    toast.add({
      severity: 'error',
      summary: 'Erreur',
      detail: 'Impossible de supprimer le tournoi',
      life: 3000
    });
  }
};

// Formatage des dates
const getDayName = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { weekday: 'short' }).toUpperCase();
};

const getDayNumber = (dateStr) => {
  const date = new Date(dateStr);
  return date.getDate();
};

const getMonthName = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { month: 'short' });
};

const formatDateFull = (dateStr) => {
  const date = new Date(dateStr);
  const options = { weekday: 'long', day: 'numeric', month: 'long' };
  return date.toLocaleDateString('fr-FR', options);
};

const formatDateForDb = (dateStr) => {
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = date.toLocaleDateString('fr-FR', { month: 'long' });
  return `${day.toString().padStart(2, '0')}-${month}`;
};

const formatBuyIn = (amount) => {
  if (!amount) return '$0';
  return '$' + amount.toLocaleString('en-US');
};

const hasStructureInfo = (tournament) => {
  return tournament.structureChips || tournament.structureLevels || tournament.structureGuarantee;
};

// Lifecycle
onMounted(async () => {
  loadTimeline();
  await loadUsers();
  await loadAllUserTournaments();
});
</script>

<style scoped>
.timeline-container {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Header */
.timeline-header {
  text-align: center;
  margin-bottom: 48px;
}

.timeline-header h2 {
  color: var(--text-primary, #f1f5f9);
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0 0 8px 0;
  letter-spacing: -0.025em;
}

.timeline-header .subtitle {
  color: var(--accent-color, #818cf8);
  font-size: 1.25rem;
  font-weight: 500;
  margin: 0;
}

/* Loading */
.loading-section {
  text-align: center;
  padding: 80px 20px;
  color: var(--text-secondary, #94a3b8);
}

/* Grille des dates */
.dates-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.date-card {
  background: var(--bg-secondary, #1e293b);
  border: 1px solid var(--border-color, #334155);
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.date-card:hover {
  transform: translateY(-4px);
  border-color: var(--accent-color, #818cf8);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px var(--accent-color, #818cf8);
}

.date-card-header {
  text-align: center;
}

.day-name {
  display: block;
  color: var(--accent-color, #818cf8);
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  margin-bottom: 8px;
}

.day-number {
  display: block;
  color: var(--text-primary, #f1f5f9);
  font-size: 3.5rem;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 4px;
}

.month-name {
  display: block;
  color: var(--text-secondary, #94a3b8);
  font-size: 1rem;
  font-weight: 500;
  text-transform: capitalize;
}

.date-card-footer {
  border-top: 1px solid var(--border-color, #334155);
  padding-top: 16px;
}

.tournament-count {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.9375rem;
}

.tournament-count i {
  color: var(--accent-color, #818cf8);
}

/* Vue détail d'un jour */
.day-detail-view {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.day-detail-header {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border-color, #334155);
}

.back-button {
  color: var(--text-secondary, #94a3b8) !important;
}

.back-button:hover {
  color: var(--text-primary, #f1f5f9) !important;
  background: var(--sidebar-hover, #334155) !important;
}

.day-detail-title h2 {
  color: var(--text-primary, #f1f5f9);
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 8px 0;
  text-transform: capitalize;
}

.tournament-badge {
  display: inline-block;
  background: var(--accent-color, #818cf8);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
}

/* Grille des tournois */
.tournaments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.tournament-card {
  background: var(--bg-secondary, #1e293b);
  border: 1px solid var(--border-color, #334155);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s ease;
  position: relative;
}

.tournament-card:hover {
  border-color: var(--accent-color, #818cf8);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

/* Indicateur de notes dans le coin */
.enrolled-notes-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  background: rgba(99, 102, 241, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
}

.enrolled-notes-indicator i {
  font-size: 0.75rem;
  color: white;
}

.enrolled-notes-indicator:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.6);
}

.tournament-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
}

.tournament-time {
  color: white;
  font-size: 1.5rem;
  font-weight: 700;
}

.tournament-badges {
  display: flex;
  align-items: center;
  gap: 8px;
}

.day-badge-tag {
  background: rgba(245, 158, 11, 0.9);
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.restart-badge-tag {
  background: rgba(239, 68, 68, 0.9);
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.manual-badge-tag {
  background: rgba(16, 185, 129, 0.9);
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.tournament-buyin {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  padding: 6px 14px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 1rem;
}

.tournament-card-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.casino-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.casino-logo-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  border: 2px solid var(--border-color, #334155);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary, #0f172a);
  padding: 4px;
}

.casino-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.casino-initials {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  font-weight: 700;
  font-size: 0.875rem;
  border-radius: 6px;
}

.casino-name-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.casino-name {
  color: var(--text-primary, #f1f5f9);
  font-weight: 600;
  font-size: 1.125rem;
}

.casino-drive-time {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--accent-color, #818cf8);
  font-size: 0.8125rem;
  font-weight: 500;
}

.casino-drive-time i {
  font-size: 0.75rem;
}

.casino-drive-time .drive-distance {
  color: var(--text-secondary, #94a3b8);
  font-size: 0.75rem;
  font-weight: 400;
}

.tournament-levels {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.9375rem;
}

.tournament-levels i {
  color: var(--accent-color, #818cf8);
  font-size: 0.875rem;
}

.tournament-structure {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.structure-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--bg-primary, #0f172a);
  border-radius: 6px;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.8125rem;
  font-weight: 500;
}

.structure-tag i {
  font-size: 0.625rem;
}

.structure-tag.chips {
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
}

.structure-tag.levels {
  background: var(--bg-primary, #0f172a);
  color: var(--text-secondary, #94a3b8);
}

.structure-tag.guarantee {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

.structure-tag.guarantee i {
  color: #f59e0b;
}

/* Enrolled users */
.enrolled-users {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--border-color, #334155);
}

.enrolled-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.75rem;
  margin-bottom: 8px;
}

.enrolled-label i {
  font-size: 0.6875rem;
}

.enrolled-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.enrolled-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  color: white;
  font-size: 0.6875rem;
  font-weight: 600;
}

.enrolled-note-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  cursor: pointer;
}

.enrolled-note-icon i {
  font-size: 0.5rem;
}

.enrolled-note-icon:hover {
  background: rgba(255, 255, 255, 0.4);
}

/* Mobile notes (visible only on mobile) */
.mobile-notes {
  display: none;
  margin-top: 10px;
  padding: 10px;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 8px;
  border-left: 3px solid #6366f1;
}

.mobile-note-item {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 0;
  font-size: 0.75rem;
}

.mobile-note-item:not(:last-child) {
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

.tournament-card-footer {
  padding: 16px;
  border-top: 1px solid var(--border-color, #334155);
}

.footer-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.add-button {
  flex: 1;
  justify-content: center;
}

.delete-button {
  flex-shrink: 0;
}

/* Dialog */
.selection-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 8px 0;
}

.selected-tournament-summary {
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  padding: 20px;
  border-radius: 12px;
  color: white;
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.summary-time {
  font-size: 1.75rem;
  font-weight: 700;
}

.summary-buyin {
  background: rgba(255, 255, 255, 0.2);
  padding: 6px 14px;
  border-radius: 20px;
  font-weight: 600;
}

.summary-casino {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 4px;
}

.summary-date {
  opacity: 0.8;
  font-size: 0.9375rem;
  text-transform: capitalize;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  font-size: 0.9375rem;
}

.input-full {
  width: 100%;
}

:deep(.p-inputtext),
:deep(.p-inputnumber),
:deep(.p-inputnumber-input),
:deep(.p-select),
:deep(.p-textarea),
:deep(.p-datepicker) {
  width: 100%;
}

:deep(.p-datepicker-input) {
  width: 100%;
}

/* Bouton d'ajout manuel */
.add-manual-button {
  margin-left: auto;
}

/* Styles pour la modale d'ajout manuel */
.manual-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 8px 0;
}

.manual-date-info {
  display: flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(135deg, #10b981, #059669);
  padding: 14px 18px;
  border-radius: 10px;
  color: white;
  font-weight: 600;
  font-size: 1rem;
  text-transform: capitalize;
}

.manual-date-info i {
  font-size: 1.125rem;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-group.half {
  flex: 1;
}

.required {
  color: #ef4444;
}

/* Responsive */
@media (max-width: 1024px) {
  .dates-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .timeline-header h2 {
    font-size: 2rem;
  }

  .tournaments-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
}

@media (max-width: 768px) {
  .timeline-container {
    padding: 16px;
  }

  .timeline-header {
    margin-bottom: 32px;
  }

  .timeline-header h2 {
    font-size: 1.75rem;
  }

  .timeline-header .subtitle {
    font-size: 1rem;
  }

  .dates-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .date-card {
    padding: 18px;
  }

  .day-number {
    font-size: 2.5rem;
  }

  .tournaments-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .day-detail-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding-bottom: 20px;
    margin-bottom: 24px;
  }

  .add-manual-button {
    width: 100%;
    margin-left: 0;
  }

  .day-detail-title h2 {
    font-size: 1.5rem;
  }

  .tournament-card-header {
    padding: 14px;
  }

  .tournament-time {
    font-size: 1.25rem;
  }

  .tournament-buyin {
    padding: 5px 12px;
    font-size: 0.9375rem;
  }

  .tournament-card-body {
    padding: 16px;
    gap: 14px;
  }

  .casino-name {
    font-size: 1rem;
  }

  /* Show mobile notes, hide desktop tooltips */
  .mobile-notes {
    display: block;
  }

  .desktop-only {
    display: none !important;
  }

  /* Form row responsive */
  .form-row {
    flex-direction: column;
    gap: 16px;
  }
}

@media (max-width: 640px) {
  .timeline-container {
    padding: 12px;
  }

  .dates-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .date-card {
    padding: 16px;
    gap: 16px;
    border-radius: 12px;
  }

  .day-name {
    font-size: 0.75rem;
  }

  .day-number {
    font-size: 2.25rem;
  }

  .month-name {
    font-size: 0.875rem;
  }

  .tournament-count {
    font-size: 0.875rem;
  }

  .timeline-header {
    margin-bottom: 24px;
  }

  .timeline-header h2 {
    font-size: 1.5rem;
  }

  .timeline-header .subtitle {
    font-size: 0.9375rem;
  }

  .day-detail-header {
    gap: 12px;
  }

  .back-button {
    padding: 0.625rem 1rem;
  }

  .day-detail-title h2 {
    font-size: 1.25rem;
  }

  .tournament-badge {
    font-size: 0.8125rem;
    padding: 3px 10px;
  }

  .tournament-card {
    border-radius: 10px;
  }

  .casino-logo-wrapper {
    width: 40px;
    height: 40px;
    border-radius: 8px;
  }

  .casino-name {
    font-size: 0.9375rem;
  }

  .tournament-levels {
    font-size: 0.875rem;
  }

  .structure-tag {
    padding: 5px 10px;
    font-size: 0.75rem;
  }

  .tournament-card-footer {
    padding: 14px;
  }

  .add-button {
    font-size: 0.875rem;
  }
}

@media (max-width: 480px) {
  .timeline-container {
    padding: 8px;
  }

  .date-card {
    padding: 14px;
  }

  .day-number {
    font-size: 2rem;
  }

  .tournament-card-header {
    padding: 12px;
    flex-wrap: wrap;
    gap: 8px;
  }

  .tournament-badges {
    flex-wrap: wrap;
    gap: 6px;
  }

  .tournament-time {
    font-size: 1.125rem;
  }

  .tournament-buyin {
    padding: 4px 10px;
    font-size: 0.875rem;
  }

  .day-badge-tag,
  .restart-badge-tag,
  .manual-badge-tag {
    padding: 3px 8px;
    font-size: 0.6875rem;
  }

  .tournament-card-body {
    padding: 14px;
    gap: 12px;
  }

  .footer-buttons {
    flex-direction: row;
  }

  .add-button {
    font-size: 0.8125rem;
    padding: 0.5rem 0.75rem;
  }

  .delete-button {
    padding: 0.5rem;
  }

  /* Modale responsive */
  .manual-dialog-content {
    gap: 16px;
  }

  .manual-date-info {
    padding: 12px 14px;
    font-size: 0.875rem;
  }

  .manual-date-info i {
    font-size: 1rem;
  }

  .form-group label {
    font-size: 0.875rem;
  }
}

@media (max-width: 360px) {
  .tournament-badges {
    justify-content: flex-end;
  }

  .footer-buttons {
    flex-direction: column;
    gap: 8px;
  }

  .add-button,
  .delete-button {
    width: 100%;
  }

  .delete-button {
    justify-content: center;
  }

  .day-detail-title h2 {
    font-size: 1.125rem;
  }

  .tournament-badge {
    font-size: 0.75rem;
    padding: 2px 8px;
  }
}

/* Dialog responsive */
:deep(.p-dialog) {
  margin: 1rem;
  max-width: calc(100vw - 2rem);
}

:deep(.p-dialog-header) {
  padding: 1rem 1.25rem;
}

:deep(.p-dialog-content) {
  padding: 0 1.25rem 1.25rem;
}

:deep(.p-dialog-footer) {
  padding: 1rem 1.25rem;
}

@media (max-width: 768px) {
  :deep(.p-dialog) {
    width: calc(100vw - 2rem) !important;
  }
}

@media (max-width: 480px) {
  :deep(.p-dialog) {
    width: calc(100vw - 1rem) !important;
    max-width: none;
    margin: 0.5rem;
  }

  :deep(.p-dialog-header) {
    padding: 0.875rem 1rem;
  }

  :deep(.p-dialog-content) {
    padding: 0 1rem 1rem;
  }

  :deep(.p-dialog-footer) {
    padding: 0.875rem 1rem;
    flex-wrap: wrap;
    gap: 8px;
  }

  :deep(.p-dialog-footer button) {
    flex: 1;
    min-width: 120px;
  }

  .selection-dialog-content,
  .manual-dialog-content {
    gap: 16px;
    padding: 4px 0;
  }

  .selected-tournament-summary {
    padding: 16px;
    border-radius: 10px;
  }

  .summary-header {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }

  .summary-time {
    font-size: 1.5rem;
  }

  .summary-casino {
    font-size: 1.125rem;
  }

  .summary-date {
    font-size: 0.875rem;
  }
}
</style>
