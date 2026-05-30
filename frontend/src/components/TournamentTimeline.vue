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
          <!-- Top section: Time + Buy-in + Badges -->
          <div class="tournament-card-top">
            <div class="card-top-left">
              <div class="tournament-time">{{ tournament.displayTime }}</div>
              <div class="tournament-badges">
                <div v-if="tournament.isManual" class="manual-badge-tag">Manuel</div>
                <div v-if="tournament.day" class="day-badge-tag">Day {{ tournament.day }}</div>
                <div v-else-if="tournament.isRestart" class="restart-badge-tag">Restart</div>
              </div>
            </div>
            <div class="tournament-buyin">{{ formatBuyIn(tournament.buyIn) }}</div>
          </div>

          <!-- Casino section -->
          <div class="tournament-card-body">
            <div class="casino-section">
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
              </div>
            </div>

            <!-- Carte trajet voiture -->
            <div
              v-if="getRouteTime(tournament.casino)"
              class="route-card driving-card clickable"
              @click.stop="openRouteMap(tournament.casino)"
              title="Voir l'itinéraire"
            >
              <div class="route-card-header">
                <i class="pi pi-car"></i>
                <span>Voiture</span>
              </div>
              <div class="route-card-stats">
                <div class="route-stat-mini">
                  <i class="pi pi-map"></i>
                  <span>{{ getRouteTime(tournament.casino).distanceMiles }} mi</span>
                </div>
                <div class="route-stat-mini">
                  <i class="pi pi-clock"></i>
                  <span>~{{ getRouteTime(tournament.casino).durationMin }} min</span>
                </div>
              </div>
            </div>

            <!-- Structure info -->
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
                  :class="{ 'enrolled-chip-itm': enrolled.liveWinnings }"
                  :style="{ backgroundColor: getUserColor(enrolled.userName) }"
                >
                  {{ enrolled.userName }}<span v-if="enrolled.liveWinnings" class="chip-flame">🔥</span>
                </div>
              </div>
              <!-- Notes toujours visibles -->
              <div class="enrolled-notes-list" v-if="getEnrolledUsers(tournament).some(u => u.user_note)">
                <div
                  v-for="enrolled in getEnrolledUsers(tournament).filter(u => u.user_note)"
                  :key="'note-' + enrolled.id"
                  class="enrolled-note-item"
                >
                  <i class="pi pi-comment"></i>
                  <span class="note-user">{{ enrolled.userName }}:</span>
                  <span class="note-text">{{ enrolled.user_note }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer actions -->
          <div class="tournament-card-footer">
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

    <!-- Modale carte itinéraire -->
    <Dialog
      v-model:visible="showRouteMapDialog"
      :header="`Itinéraire vers ${routeMapCasino}`"
      :modal="true"
      :style="{ width: '95vw', maxWidth: '900px' }"
      :breakpoints="{ '768px': '100vw' }"
      class="route-map-dialog"
    >
      <div class="route-map-wrapper">
        <!-- Panneau infos itinéraire -->
        <div v-if="routeMapInfo" class="route-info-panel">
          <!-- Stats de l'itinéraire -->
          <div class="route-info-details">
            <div class="route-stat">
              <i class="pi pi-car"></i>
              <span>{{ routeMapInfo.durationMin }} min</span>
            </div>
            <div class="route-stat">
              <i class="pi pi-map"></i>
              <span>{{ routeMapInfo.distanceMiles }} mi ({{ routeMapInfo.distanceKm }} km)</span>
            </div>
          </div>

          <!-- Liens navigation externe -->
          <div class="route-nav-links">
            <a
              :href="getGoogleMapsUrl()"
              target="_blank"
              rel="noopener noreferrer"
              class="nav-link-btn google-maps"
            >
              <i class="pi pi-map"></i>
              <span class="nav-link-label">Google Maps</span>
            </a>
            <a
              :href="getAppleMapsUrl()"
              target="_blank"
              rel="noopener noreferrer"
              class="nav-link-btn apple-maps"
            >
              <i class="pi pi-apple"></i>
              <span class="nav-link-label">Apple Maps</span>
            </a>
          </div>
        </div>

        <!-- Carte -->
        <div class="route-map-container">
          <div ref="routeMapContainer" class="route-leaflet-map"></div>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from 'vue';
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
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

const emit = defineEmits(['tournament-added']);

// Configuration API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Casino routes
const { getRouteForCasino, getCasinoCoords, HOME_LOCATION } = useCasinoRoutes();
const casinoRouteTimes = ref({}); // cache: { casinoName: { durationMin, distanceMiles } }

// Route map modal
const showRouteMapDialog = ref(false);
const routeMapCasino = ref('');
const routeMapContainer = ref(null);
const routeMapInfo = ref(null);
const routeMode = ref('driving'); // 'driving' ou 'transit'
let routeMap = null;
let routeMapControl = null;
let transitLayers = []; // Layers pour l'itinéraire transit

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

// Lignes de bus RTC Las Vegas (simplifiées pour les trajets)
const busLines = [
  {
    id: 'deuce',
    name: 'DEUCE',
    description: 'Strip & Downtown Express',
    color: '#e53935',
    frequency: '15-20 min',
    stops: [
      { name: 'Downtown Transit Center', lat: 36.1685, lng: -115.1481 },
      { name: 'Fremont Street Experience', lat: 36.1699, lng: -115.1424 },
      { name: 'Stratosphere', lat: 36.1475, lng: -115.1566 },
      { name: 'Circus Circus', lat: 36.1364, lng: -115.1640 },
      { name: 'Resorts World', lat: 36.1284, lng: -115.1658 },
      { name: 'Wynn / Encore', lat: 36.1263, lng: -115.1627 },
      { name: 'Venetian / Palazzo', lat: 36.1212, lng: -115.1696 },
      { name: 'Harrah\'s / The LINQ', lat: 36.1186, lng: -115.1708 },
      { name: 'Flamingo / Caesars', lat: 36.1162, lng: -115.1720 },
      { name: 'Bellagio / Bally\'s', lat: 36.1129, lng: -115.1740 },
      { name: 'Paris / Planet Hollywood', lat: 36.1095, lng: -115.1708 },
      { name: 'CityCenter / Aria', lat: 36.1073, lng: -115.1765 },
      { name: 'MGM Grand', lat: 36.1024, lng: -115.1695 },
      { name: 'Excalibur', lat: 36.0989, lng: -115.1754 },
      { name: 'Mandalay Bay', lat: 36.0920, lng: -115.1755 },
      { name: 'South Strip Transfer Terminal', lat: 36.0890, lng: -115.1760 }
    ]
  },
  {
    id: 'sdx',
    name: 'SDX',
    description: 'Strip & Downtown Express (Limited)',
    color: '#1e88e5',
    frequency: '12-15 min',
    stops: [
      { name: 'Downtown Transit Center', lat: 36.1685, lng: -115.1481 },
      { name: 'Bonneville Transit Center', lat: 36.1648, lng: -115.1535 },
      { name: 'Stratosphere', lat: 36.1475, lng: -115.1566 },
      { name: 'Fashion Show Mall', lat: 36.1269, lng: -115.1703 },
      { name: 'Flamingo / Caesars', lat: 36.1162, lng: -115.1720 },
      { name: 'MGM Grand', lat: 36.1024, lng: -115.1695 },
      { name: 'Mandalay Bay', lat: 36.0920, lng: -115.1755 },
      { name: 'South Strip Transfer Terminal', lat: 36.0890, lng: -115.1760 }
    ]
  },
  {
    id: '104',
    name: '104',
    description: 'Rancho Dr',
    color: '#ef6c00',
    frequency: '30 min',
    stops: [
      { name: 'Rancho & Lake Mead', lat: 36.2150, lng: -115.2200 },
      { name: 'Rancho & Cheyenne', lat: 36.2050, lng: -115.2200 },
      { name: 'Rancho & Vegas Dr', lat: 36.1850, lng: -115.2200 },
      { name: 'Rancho & US-95', lat: 36.1700, lng: -115.2100 },
      { name: 'Downtown Transit Center', lat: 36.1685, lng: -115.1481 }
    ]
  },
  {
    id: '106',
    name: '106',
    description: 'Charleston Blvd',
    color: '#d81b60',
    frequency: '15-20 min',
    stops: [
      { name: 'Red Rock Casino', lat: 36.1734, lng: -115.3090 },
      { name: 'Charleston & Rainbow', lat: 36.1580, lng: -115.2420 },
      { name: 'Charleston & Decatur', lat: 36.1580, lng: -115.2050 },
      { name: 'Bonneville Transit Center', lat: 36.1648, lng: -115.1535 },
      { name: 'Downtown Transit Center', lat: 36.1685, lng: -115.1481 }
    ]
  },
  {
    id: 'monorail',
    name: 'MONORAIL',
    description: 'Las Vegas Monorail',
    color: '#232d6a',
    frequency: '4-8 min',
    isMonorail: true,
    stops: [
      { name: 'MGM Grand Station', lat: 36.1019, lng: -115.1656 },
      { name: 'Bally\'s/Paris Station', lat: 36.1118, lng: -115.1685 },
      { name: 'Flamingo/Caesars Palace Station', lat: 36.1163, lng: -115.1695 },
      { name: 'Harrah\'s/The LINQ Station', lat: 36.1198, lng: -115.1688 },
      { name: 'Las Vegas Convention Center Station', lat: 36.1280, lng: -115.1530 },
      { name: 'Westgate Station', lat: 36.1350, lng: -115.1530 },
      { name: 'SAHARA Las Vegas Station', lat: 36.1445, lng: -115.1566 }
    ]
  }
];

// Normaliser le nom du casino pour le matching
const normalizeCasinoName = (name) => {
  if (!name) return '';
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
  if (lowerName.includes('venetian') || lowerName.includes('palazzo')) {
    return 'venetian';
  }
  if (lowerName.includes('wynn') || lowerName.includes('encore')) {
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
  if (lowerName.includes('golden nugget')) {
    return 'goldennugget';
  }
  if (lowerName.includes('south point')) {
    return 'southpoint';
  }
  if (lowerName.includes('red rock')) {
    return 'redrock';
  }
  if (lowerName.includes('green valley')) {
    return 'greenvalley';
  }
  if (lowerName.includes('planet hollywood')) {
    return 'planethollywood';
  }
  if (lowerName.includes('flamingo')) {
    return 'flamingo';
  }
  if (lowerName.includes('horseshoe') || lowerName.includes('paris')) {
    return 'wsop';
  }
  if (lowerName.includes('resorts world')) {
    return 'resortsworld';
  }
  if (lowerName.includes('sahara')) {
    return 'sahara';
  }
  if (lowerName.includes('treasure island') || lowerName.includes(' ti ')) {
    return 'treasureisland';
  }
  if (lowerName.includes('excalibur')) {
    return 'excalibur';
  }
  if (lowerName.includes('binion')) {
    return 'binions';
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

  // Si c'est déjà au format "DD-mois" (ex: "08-juin"), normaliser
  if (dateStr.match(/^\d{1,2}-[a-zA-Zéû]+$/)) {
    const parts = dateStr.split('-');
    const day = parts[0].padStart(2, '0');
    const month = parts[1].toLowerCase();
    return `${day}-${month}`;
  }

  // Si c'est au format ISO "YYYY-MM-DD", convertir
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
    // Parser manuellement pour éviter les problèmes de timezone
    const parts = dateStr.split('-');
    const day = parts[2].padStart(2, '0');
    const monthNum = parseInt(parts[1], 10);
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
                    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const month = months[monthNum - 1];
    return `${day}-${month}`;
  }

  return dateStr.toLowerCase().trim();
};

// Trouver les utilisateurs inscrits à un tournoi scrapé
const getEnrolledUsers = (scrapedTournament) => {
  const scrapedId = scrapedTournament.id;
  const matchesById = new Map();
  const matchesByDetails = new Map();

  // 1. Chercher par ID du tournoi scrapé (matching exact)
  allUserTournaments.value.forEach(ut => {
    if (ut.scraped_tournament_id && String(ut.scraped_tournament_id) === String(scrapedId)) {
      matchesById.set(ut.id, ut);
    }
  });

  // 2. Chercher aussi par date/time/casino (pour les tournois ajoutés manuellement ou avec des IDs différents)
  const scrapedDate = normalizeDate(scrapedTournament.date);
  const scrapedTime = normalizeTime(scrapedTournament.time || scrapedTournament.displayTime);
  const scrapedCasinoNorm = normalizeCasinoName(scrapedTournament.casino);

  allUserTournaments.value.forEach(ut => {
    const userDate = normalizeDate(ut.date);
    const userTime = normalizeTime(ut.time);
    const userCasinoNorm = normalizeCasinoName(ut.casino);

    const matchDate = userDate === scrapedDate;
    const matchTime = userTime === scrapedTime;
    const matchCasino = userCasinoNorm === scrapedCasinoNorm;

    if (matchDate && matchTime && matchCasino) {
      matchesByDetails.set(ut.id, ut);
    }
  });

  // 3. Combiner les résultats (union des deux méthodes)
  const allMatches = new Map([...matchesById, ...matchesByDetails]);

  return Array.from(allMatches.values());
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

// Ouvrir la modale de carte avec itinéraire
const openRouteMap = async (casinoName) => {
  routeMapCasino.value = casinoName;
  routeMapInfo.value = casinoRouteTimes.value[casinoName] || null;
  routeMode.value = 'driving'; // Reset au mode voiture
  showRouteMapDialog.value = true;

  await nextTick();
  setTimeout(() => {
    initRouteMap(casinoName);
  }, 200);
};

// Initialiser la carte d'itinéraire
const initRouteMap = async (casinoName) => {
  if (!routeMapContainer.value) return;

  // Nettoyer la carte précédente
  if (routeMap) {
    routeMap.remove();
    routeMap = null;
    routeMapControl = null;
  }

  const casinoCoords = await getCasinoCoords(casinoName);
  if (!casinoCoords) return;

  // Sauvegarder les coordonnées pour les liens de navigation
  currentCasinoCoords.value = casinoCoords;

  // Créer la carte
  routeMap = L.map(routeMapContainer.value, {
    center: [36.15, -115.15],
    zoom: 12,
    zoomControl: true
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19
  }).addTo(routeMap);

  // Marqueur maison
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

  // Marqueur casino
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

  // Ajouter l'itinéraire
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

  // Fit bounds
  setTimeout(() => {
    if (routeMap) {
      routeMap.invalidateSize();
    }
  }, 300);
};

// Calculer la distance entre deux points (en km)
const getDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Trouver le meilleur itinéraire en bus depuis la maison
const findBestTransitRoute = (casinoCoords) => {
  const results = [];
  const MAX_TRANSFER_DIST = 1.5; // km max entre arrêts pour correspondance

  // Chercher les lignes directes
  busLines.forEach(line => {
    let nearestHome = null, nearestHomeDist = Infinity, nearestHomeIdx = -1;
    line.stops.forEach((stop, idx) => {
      const dist = getDistance(HOME_LOCATION.lat, HOME_LOCATION.lng, stop.lat, stop.lng);
      if (dist < nearestHomeDist) { nearestHomeDist = dist; nearestHome = stop; nearestHomeIdx = idx; }
    });

    let nearestCasino = null, nearestCasinoDist = Infinity, nearestCasinoIdx = -1;
    line.stops.forEach((stop, idx) => {
      const dist = getDistance(casinoCoords.lat, casinoCoords.lng, stop.lat, stop.lng);
      if (dist < nearestCasinoDist) { nearestCasinoDist = dist; nearestCasino = stop; nearestCasinoIdx = idx; }
    });

    if (nearestHome && nearestCasino && nearestHomeIdx !== nearestCasinoIdx) {
      const startIdx = Math.min(nearestHomeIdx, nearestCasinoIdx);
      const endIdx = Math.max(nearestHomeIdx, nearestCasinoIdx);
      let busDistance = 0;
      const busStops = [];
      for (let i = startIdx; i <= endIdx; i++) {
        busStops.push(line.stops[i]);
        if (i < endIdx) busDistance += getDistance(line.stops[i].lat, line.stops[i].lng, line.stops[i + 1].lat, line.stops[i + 1].lng);
      }

      results.push({
        line,
        nearestToHome: nearestHome,
        nearestToHomeDist: nearestHomeDist,
        nearestToCasino: nearestCasino,
        nearestToCasinoDist: nearestCasinoDist,
        busStops,
        busDistance,
        totalWalkDist: nearestHomeDist + nearestCasinoDist,
        isTransfer: false
      });
    }
  });

  // Chercher avec correspondance
  for (let i = 0; i < busLines.length; i++) {
    const line1 = busLines[i];
    let home1 = null, home1Dist = Infinity, home1Idx = -1;
    line1.stops.forEach((stop, idx) => {
      const dist = getDistance(HOME_LOCATION.lat, HOME_LOCATION.lng, stop.lat, stop.lng);
      if (dist < home1Dist) { home1Dist = dist; home1 = stop; home1Idx = idx; }
    });
    if (home1Dist > 5) continue;

    for (let j = 0; j < busLines.length; j++) {
      if (i === j) continue;
      const line2 = busLines[j];

      let casino2 = null, casino2Dist = Infinity, casino2Idx = -1;
      line2.stops.forEach((stop, idx) => {
        const dist = getDistance(casinoCoords.lat, casinoCoords.lng, stop.lat, stop.lng);
        if (dist < casino2Dist) { casino2Dist = dist; casino2 = stop; casino2Idx = idx; }
      });

      let bestTDist = Infinity, t1Idx = -1, t2Idx = -1, tStop1 = null, tStop2 = null;
      line1.stops.forEach((s1, idx1) => {
        line2.stops.forEach((s2, idx2) => {
          const dist = getDistance(s1.lat, s1.lng, s2.lat, s2.lng);
          if (dist < bestTDist) { bestTDist = dist; t1Idx = idx1; t2Idx = idx2; tStop1 = s1; tStop2 = s2; }
        });
      });
      if (bestTDist > MAX_TRANSFER_DIST || t1Idx === home1Idx || t2Idx === casino2Idx) continue;

      // Calculer les arrêts de la 1ère ligne (maison → transfert)
      const s1Start = Math.min(home1Idx, t1Idx);
      const s1End = Math.max(home1Idx, t1Idx);
      let dist1 = 0;
      const busStops1 = [];
      for (let k = s1Start; k <= s1End; k++) {
        busStops1.push(line1.stops[k]);
        if (k < s1End) dist1 += getDistance(line1.stops[k].lat, line1.stops[k].lng, line1.stops[k+1].lat, line1.stops[k+1].lng);
      }

      // Calculer les arrêts de la 2ème ligne (transfert → casino)
      const s2Start = Math.min(t2Idx, casino2Idx);
      const s2End = Math.max(t2Idx, casino2Idx);
      let dist2 = 0;
      const busStops2 = [];
      for (let k = s2Start; k <= s2End; k++) {
        busStops2.push(line2.stops[k]);
        if (k < s2End) dist2 += getDistance(line2.stops[k].lat, line2.stops[k].lng, line2.stops[k+1].lat, line2.stops[k+1].lng);
      }

      const totalWalkDist = home1Dist + bestTDist + casino2Dist;
      results.push({
        line: line1,
        line2,
        isTransfer: true,
        nearestToHome: home1,
        nearestToHomeDist: home1Dist,
        nearestToHomeIdx: home1Idx,
        transferStop102: tStop1,
        transferStopLine: tStop2,
        transferDist: bestTDist,
        nearestToCasino: casino2,
        nearestToCasinoDist: casino2Dist,
        nearestToCasinoIdx: casino2Idx,
        busStops: busStops1,
        busStops2: busStops2,
        busDistance: dist1 + dist2,
        totalWalkDist
      });
    }
  }

  results.sort((a, b) => a.totalWalkDist - b.totalWalkDist);
  return results.length > 0 ? results[0] : null;
};

// Nettoyer les layers de transit
const clearTransitLayers = () => {
  transitLayers.forEach(layer => {
    if (routeMap) routeMap.removeLayer(layer);
  });
  transitLayers = [];
};

// Afficher l'itinéraire en transport en commun
const showTransitRoute = (casinoCoords) => {
  if (!routeMap) return;

  // Supprimer l'itinéraire voiture
  if (routeMapControl) {
    routeMap.removeControl(routeMapControl);
    routeMapControl = null;
  }
  clearTransitLayers();

  const best = findBestTransitRoute(casinoCoords);
  if (!best) {
    routeMapInfo.value = {
      ...routeMapInfo.value,
      noRoute: true,
      transitDetails: null
    };
    return;
  }

  const line = best.line;

  // Dessiner la marche vers l'arrêt
  const walkToStop = L.polyline(
    [[HOME_LOCATION.lat, HOME_LOCATION.lng], [best.nearestToHome.lat, best.nearestToHome.lng]],
    { color: '#94a3b8', weight: 4, dashArray: '6, 8', opacity: 0.8 }
  ).addTo(routeMap);
  transitLayers.push(walkToStop);

  // Dessiner le trajet en bus
  const busCoords = best.busStops ? best.busStops.map(s => [s.lat, s.lng]) : [[best.nearestToHome.lat, best.nearestToHome.lng]];
  const busPolyline = L.polyline(busCoords, {
    color: line.color,
    weight: 7,
    opacity: 0.9,
    dashArray: line.isMonorail ? null : '12, 6'
  }).addTo(routeMap);
  transitLayers.push(busPolyline);

  // Si correspondance
  if (best.isTransfer && best.line2) {
    const walkTransfer = L.polyline(
      [[best.transferStop102.lat, best.transferStop102.lng], [best.transferStopLine.lat, best.transferStopLine.lng]],
      { color: '#94a3b8', weight: 4, dashArray: '6, 8', opacity: 0.8 }
    ).addTo(routeMap);
    transitLayers.push(walkTransfer);

    // Trajet sur la 2ème ligne avec les arrêts intermédiaires
    const busCoords2 = best.busStops2 ? best.busStops2.map(s => [s.lat, s.lng]) : [[best.transferStopLine.lat, best.transferStopLine.lng], [best.nearestToCasino.lat, best.nearestToCasino.lng]];
    const busPolyline2 = L.polyline(busCoords2, {
      color: best.line2.color,
      weight: 7,
      opacity: 0.9,
      dashArray: best.line2.isMonorail ? null : '12, 6'
    }).addTo(routeMap);
    transitLayers.push(busPolyline2);
  }

  // Dessiner la marche vers le casino
  const walkFromStop = L.polyline(
    [[best.nearestToCasino.lat, best.nearestToCasino.lng], [casinoCoords.lat, casinoCoords.lng]],
    { color: '#94a3b8', weight: 4, dashArray: '6, 8', opacity: 0.8 }
  ).addTo(routeMap);
  transitLayers.push(walkFromStop);

  // Calcul des temps
  const walkTimeToStop = Math.round((best.nearestToHomeDist / 5) * 60);
  const walkTimeFromStop = Math.round((best.nearestToCasinoDist / 5) * 60);
  const busSpeed = line.isMonorail ? 40 : 20;
  const busDistance = best.busDistance || getDistance(best.nearestToHome.lat, best.nearestToHome.lng, best.nearestToCasino.lat, best.nearestToCasino.lng);
  const busTime = Math.round((busDistance / busSpeed) * 60);
  const waitTime = line.isMonorail ? 6 : 15;
  const transferWaitTime = best.isTransfer ? 10 : 0;
  const totalTime = walkTimeToStop + waitTime + busTime + transferWaitTime + walkTimeFromStop;
  const totalDistKm = (best.totalWalkDist + busDistance).toFixed(1);
  const totalDistMiles = ((best.totalWalkDist + busDistance) * 0.621371).toFixed(1);

  routeMapInfo.value = {
    distanceKm: totalDistKm,
    distanceMiles: totalDistMiles,
    durationMin: totalTime,
    noRoute: false,
    transitDetails: {
      line: line,
      line2: best.line2 || null,
      isTransfer: best.isTransfer || false,
      isDoubleTransfer: false,
      boardStop: best.nearestToHome.name,
      alightStop: best.nearestToCasino.name,
      transferStop: best.isTransfer ? best.transferStop102.name : null,
      walkToStop: walkTimeToStop,
      walkFromStop: walkTimeFromStop
    }
  };

  // Ajuster la vue
  const bounds = L.latLngBounds([
    [HOME_LOCATION.lat, HOME_LOCATION.lng],
    [casinoCoords.lat, casinoCoords.lng]
  ]);
  routeMap.fitBounds(bounds, { padding: [80, 80], maxZoom: 13 });
};

// Afficher l'itinéraire voiture
const showDrivingRoute = (casinoCoords) => {
  if (!routeMap) return;

  clearTransitLayers();

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
      distanceMiles: (route.summary.totalDistance / 1609.34).toFixed(1),
      noRoute: false,
      transitDetails: null
    };

    setTimeout(() => {
      if (routeMap) {
        const currentZoom = routeMap.getZoom();
        routeMap.setZoom(currentZoom - 1.5);
      }
    }, 100);
  });
};

// Basculer entre mode voiture et transit
const switchRouteMode = async (mode) => {
  if (routeMode.value === mode) return;
  routeMode.value = mode;

  const casinoCoords = await getCasinoCoords(routeMapCasino.value);
  if (!casinoCoords) return;

  if (mode === 'transit') {
    if (routeMapControl) {
      routeMap.removeControl(routeMapControl);
      routeMapControl = null;
    }
    showTransitRoute(casinoCoords);
  } else {
    showDrivingRoute(casinoCoords);
  }
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

// Nettoyer la carte quand la modale se ferme
watch(showRouteMapDialog, (val) => {
  if (!val && routeMap) {
    routeMap.remove();
    routeMap = null;
    routeMapControl = null;
    routeMapInfo.value = null;
    transitLayers = [];
    routeMode.value = 'driving';
  }
});

// Lifecycle
onMounted(async () => {
  loadTimeline();
  await loadUsers();
  await loadAllUserTournaments();
});

onUnmounted(() => {
  if (routeMap) {
    routeMap.remove();
    routeMap = null;
  }
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
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}

.tournament-card {
  background: var(--bg-secondary, #1e293b);
  border: 1px solid var(--border-color, #334155);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  display: flex;
  flex-direction: column;
}

.tournament-card:hover {
  border-color: var(--accent-color, #818cf8);
  box-shadow: 0 12px 32px rgba(99, 102, 241, 0.12), 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

/* Indicateur de notes dans le coin */
.enrolled-notes-indicator {
  position: absolute;
  top: 12px;
  right: 12px;
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

/* Top section */
.tournament-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(99, 102, 241, 0.08));
  border-bottom: 1px solid var(--border-color, #334155);
}

.card-top-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tournament-time {
  color: var(--text-primary, #f1f5f9);
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1;
}

.tournament-badges {
  display: flex;
  align-items: center;
  gap: 6px;
}

.day-badge-tag {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  padding: 4px 10px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.restart-badge-tag {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  padding: 4px 10px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.manual-badge-tag {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  padding: 4px 10px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.tournament-buyin {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
  padding: 8px 16px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 1.125rem;
  letter-spacing: -0.01em;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.25);
}

/* Card body */
.tournament-card-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
}

.casino-section {
  display: flex;
  align-items: center;
  gap: 14px;
}

.casino-logo-wrapper {
  width: 50px;
  height: 50px;
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
  border-radius: 8px;
}

.casino-name-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.casino-name {
  color: var(--text-primary, #f1f5f9);
  font-weight: 600;
  font-size: 1.0625rem;
  line-height: 1.3;
}

/* Tournament structure */

/* Route map modal - Wrapper */
.route-map-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0;
  height: 60vh;
  min-height: 400px;
}

/* Carte */
.route-map-container {
  flex: 1;
  min-height: 300px;
  border-radius: 0 0 12px 12px;
  overflow: hidden;
  position: relative;
  background: #0f172a;
}

.route-leaflet-map {
  width: 100%;
  height: 100%;
}

/* Panneau infos itinéraire */
.route-info-panel {
  background: rgba(30, 41, 59, 0.97);
  backdrop-filter: blur(12px);
  border-radius: 12px 12px 0 0;
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-bottom: none;
  padding: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

/* Stats de l'itinéraire */
.route-info-details {
  display: flex;
  gap: 20px;
}

.route-stat {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #f1f5f9;
  font-size: 0.9375rem;
  font-weight: 600;
}

.route-stat i {
  color: #818cf8;
  font-size: 0.875rem;
}

/* Liens de navigation externe */
.route-nav-links {
  display: flex;
  gap: 10px;
}

.nav-link-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 10px;
  text-decoration: none;
  font-weight: 700;
  font-size: 0.8125rem;
  transition: all 0.25s ease;
}

.nav-link-btn i {
  font-size: 1rem;
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

/* Responsive pour la modale route-map */
@media (max-width: 768px) {
  .route-map-wrapper {
    height: auto;
    min-height: auto;
  }

  .route-map-container {
    height: 50vh;
    min-height: 280px;
  }

  .route-info-panel {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .route-info-details {
    justify-content: center;
  }

  .route-nav-links {
    justify-content: center;
  }

  .nav-link-btn {
    flex: 1;
    justify-content: center;
  }
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
  width: fit-content;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 14px;
  background: rgba(15, 23, 42, 0.4);
  border-radius: 10px;
  border: 1px solid var(--border-color, #334155);
}

.structure-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: transparent;
  border-radius: 6px;
  color: var(--text-secondary, #94a3b8);
  font-size: 0.8125rem;
  font-weight: 500;
}

.structure-tag i {
  font-size: 0.5625rem;
}

.structure-tag.chips {
  color: #a5b4fc;
}

.structure-tag.chips i {
  color: #6366f1;
}

.structure-tag.levels {
  color: var(--text-secondary, #94a3b8);
}

.structure-tag.levels i {
  color: #64748b;
}

.structure-tag.guarantee {
  color: #fbbf24;
}

.structure-tag.guarantee i {
  color: #f59e0b;
}

/* Route card styles */
.route-card {
  width: fit-content;
  background: #0f172a;
  border-radius: 10px;
  padding: 10px 12px;
  border: 2px solid transparent;
  margin-top: 10px;
}

.route-card.driving-card {
  border-color: #6366f1;
}

.route-card.clickable {
  cursor: pointer;
  transition: all 0.2s ease;
}

.route-card.clickable:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.route-card.driving-card.clickable:hover {
  border-color: #818cf8;
  background: rgba(99, 102, 241, 0.15);
}

.route-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-weight: 700;
  font-size: 0.75rem;
}

.driving-card .route-card-header {
  color: #818cf8;
}

.route-card-header i {
  font-size: 0.875rem;
}

.route-card-stats {
  display: flex;
  flex-direction: row;
  gap: 12px;
}

.route-stat-mini {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #f1f5f9;
  font-size: 0.6875rem;
  font-weight: 500;
}

.route-stat-mini i {
  font-size: 0.5625rem;
  width: 12px;
  text-align: center;
}

.driving-card .route-stat-mini i {
  color: #6366f1;
}

/* Enrolled users */
.enrolled-users {
  margin-top: 10px;
  padding: 12px 14px;
  background: rgba(99, 102, 241, 0.05);
  border-radius: 10px;
  border: 1px solid rgba(99, 102, 241, 0.1);
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

.enrolled-chip-itm {
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.5);
}

.chip-flame {
  margin-left: 2px;
  font-size: 0.75rem;
}

/* Notes toujours visibles */
.enrolled-notes-list {
  margin-top: 10px;
  padding: 10px 12px;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 8px;
  border-left: 3px solid #6366f1;
}

.enrolled-note-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 0;
  font-size: 0.75rem;
}

.enrolled-note-item:not(:last-child) {
  border-bottom: 1px dashed rgba(99, 102, 241, 0.3);
  padding-bottom: 8px;
  margin-bottom: 4px;
}

.enrolled-note-item > i {
  color: #6366f1;
  font-size: 0.75rem;
  flex-shrink: 0;
  margin-top: 2px;
}

.enrolled-note-item .note-user {
  color: #818cf8;
  font-weight: 600;
  flex-shrink: 0;
}

.enrolled-note-item .note-text {
  color: var(--text-secondary, #94a3b8);
  word-break: break-word;
  flex: 1;
}

/* Footer card */

.tournament-card-footer {
  padding: 14px 20px;
  border-top: 1px solid var(--border-color, #334155);
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(15, 23, 42, 0.3);
}

.add-button {
  flex: 1;
  justify-content: center;
  border-radius: 10px !important;
}

.delete-button {
  flex-shrink: 0;
  border-radius: 10px !important;
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

  .tournament-card-header,
  .tournament-card-top {
    padding: 14px 16px;
  }

  .tournament-time {
    font-size: 1.375rem;
  }

  .tournament-buyin {
    padding: 6px 12px;
    font-size: 1rem;
  }

  .tournament-card-body {
    padding: 16px;
    gap: 12px;
  }

  .casino-section {
    gap: 12px;
  }

  .casino-logo-wrapper {
    width: 42px;
    height: 42px;
  }

  .casino-name {
    font-size: 0.9375rem;
  }

  .route-map-container {
    height: 50vh;
    min-height: 280px;
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

  .route-nav-links .mobile-only {
    display: flex;
  }

  .nav-link-btn {
    padding: 10px 14px;
    font-size: 0.8125rem;
  }

  .nav-link-btn i {
    font-size: 1rem;
  }

  .casino-section {
    flex-wrap: wrap;
    gap: 12px;
  }

  /* Route card responsive */
  .route-card {
    padding: 12px 14px;
  }

  .route-card-header {
    font-size: 0.875rem;
    margin-bottom: 8px;
  }

  .route-card-header i {
    font-size: 1rem;
  }

  .route-card-stats {
    gap: 16px;
  }

  .route-stat-mini {
    font-size: 0.8125rem;
    gap: 8px;
  }

  .route-stat-mini i {
    font-size: 0.75rem;
    width: 16px;
  }

  /* Notes responsive */
  .enrolled-notes-list {
    padding: 12px 14px;
  }

  .enrolled-note-item {
    font-size: 0.8125rem;
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

  .tournament-card-header,
  .tournament-card-top {
    padding: 12px 14px;
    flex-wrap: wrap;
    gap: 8px;
  }

  .tournament-badges {
    flex-wrap: wrap;
    gap: 6px;
  }

  .tournament-time {
    font-size: 1.375rem;
  }

  .tournament-buyin {
    padding: 6px 12px;
    font-size: 0.9375rem;
  }

  .day-badge-tag,
  .restart-badge-tag,
  .manual-badge-tag {
    padding: 3px 8px;
    font-size: 0.625rem;
  }

  .tournament-card-body {
    padding: 14px;
    gap: 12px;
  }

  .casino-section {
    gap: 10px;
  }

  .casino-logo-wrapper {
    width: 38px;
    height: 38px;
    border-radius: 10px;
  }

  .casino-name {
    font-size: 0.875rem;
  }

  .tournament-structure {
    padding: 10px 12px;
  }

  .structure-tag {
    font-size: 0.75rem;
    padding: 4px 8px;
  }

  .tournament-card-footer {
    padding: 12px 14px;
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
  .tournament-card-top {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .tournament-buyin {
    align-self: flex-end;
  }

  .tournament-card-footer {
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

/* Route map dialog */
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

/* Cacher le panneau d'instructions de Leaflet Routing Machine */
:deep(.leaflet-routing-container) {
  display: none !important;
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
