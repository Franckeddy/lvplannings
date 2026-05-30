<template>
  <Toast />
  <div class="program-container">

    <!-- Modale alerte tournoi en cours -->
    <Dialog
      v-model:visible="showTournamentAlert"
      :modal="true"
      :style="{ width: '450px' }"
      :showHeader="false"
      class="tournament-alert-dialog"
      :closable="true"
    >
      <div class="alert-dialog-content">
        <h3>Tournoi imminent !</h3>

        <div v-if="activeTournament" class="alert-tournament-info">
          <div class="alert-info-row time">
            <span>{{ activeTournament.time }}</span>
          </div>
          <div class="alert-info-row casino">
            <span>{{ activeTournament.casino }}</span>
          </div>
          <div class="alert-info-row buyin">
            <span>{{ formatBuyIn(activeTournament.buyin) }}</span>
          </div>
          <div v-if="activeTournament.structureChips" class="alert-info-row stack">
            <span>Stack de départ : {{ activeTournament.structureChips }}</span>
          </div>
          <div v-if="activeTournament.structureLevels" class="alert-info-row levels">
            <span>Niveaux : {{ activeTournament.structureLevels }}</span>
          </div>
        </div>

        <div class="alert-actions">
          <Button
            label="Plus tard"
            @click="dismissAlert"
            severity="secondary"
            text
            class="cancel-btn"
          />
          <Button
            label="C'est parti !"
            @click="confirmTournamentStart"
            icon="pi pi-check"
            class="confirm-alert-btn"
          />
        </div>
      </div>
    </Dialog>

    <!-- Modale récap des tournois non saisis -->
    <Dialog
      v-model:visible="showMissedRecapDialog"
      :modal="true"
      :style="{ width: '550px', maxWidth: '95vw' }"
      :showHeader="false"
      class="missed-recap-dialog"
      :closable="true"
    >
      <div class="missed-recap-content">
        <div class="missed-recap-header">
          <div class="missed-recap-icon">
            <i class="pi pi-history"></i>
          </div>
          <h3>Tournois non saisis</h3>
          <p class="missed-recap-subtitle">
            {{ missedTournaments.length }} tournoi{{ missedTournaments.length > 1 ? 's' : '' }} passé{{ missedTournaments.length > 1 ? 's' : '' }} sans résultat
          </p>
        </div>

        <div class="missed-tournaments-list">
          <div
            v-for="tournament in missedTournaments"
            :key="tournament.id"
            class="missed-tournament-item"
          >
            <div class="missed-tournament-info">
              <div class="missed-tournament-date">{{ tournament.date }}</div>
              <div class="missed-tournament-details">
                <span class="missed-time">{{ tournament.time }}</span>
                <span class="missed-casino">{{ tournament.casino }}</span>
                <span class="missed-buyin">{{ formatBuyIn(tournament.buyin) }}</span>
              </div>
            </div>
            <div class="missed-tournament-actions">
              <button
                class="missed-btn itm-btn"
                @click="setMissedResult(tournament, 'itm')"
                :class="{ active: missedResults[tournament.id]?.type === 'itm' }"
              >
                🔥 ITM
              </button>
              <button
                class="missed-btn bust-btn"
                @click="setMissedResult(tournament, 'bust')"
                :class="{ active: missedResults[tournament.id]?.type === 'bust' }"
              >
                ❌ Éliminé
              </button>
            </div>
            <div v-if="missedResults[tournament.id]?.type === 'itm'" class="missed-winnings-input">
              <label>Gains ($) :</label>
              <InputText
                v-model="missedResults[tournament.id].winnings"
                type="number"
                placeholder="Montant gagné"
                class="winnings-input"
              />
            </div>
          </div>
        </div>

        <div class="missed-recap-actions">
          <Button
            label="Plus tard"
            @click="dismissMissedRecap"
            severity="secondary"
            text
            class="cancel-btn"
          />
          <Button
            label="Enregistrer"
            @click="saveMissedResults"
            icon="pi pi-check"
            :loading="savingMissedResults"
            :disabled="!hasAnyMissedResult"
            class="confirm-missed-btn"
          />
        </div>
      </div>
    </Dialog>

    <!-- Header avec stats -->
    <div class="program-header">
      <div class="header-top">
        <div class="user-info">
          <div class="user-avatar">
            {{ user.name.charAt(0).toUpperCase() }}
          </div>
          <div class="user-details">
            <h1>Programme de {{ user.name }}</h1>
            <p class="user-subtitle">Las Vegas 2026</p>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div v-if="summary" class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon tournaments">
            <i class="pi pi-trophy"></i>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ summary.totalTournaments }}</span>
            <span class="stat-label">Tournois</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon budget">
            <i class="pi pi-wallet"></i>
          </div>
          <div class="stat-content">
            <span class="stat-value">${{ summary.totalBuyins?.toLocaleString() || 0 }}</span>
            <span class="stat-label">Budget total</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon casinos">
            <i class="pi pi-building"></i>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ summary.casinos?.length || 0 }}</span>
            <span class="stat-label">Casinos</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon days">
            <i class="pi pi-calendar"></i>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ Object.keys(tournamentsByDay).length }}</span>
            <span class="stat-label">Jours</span>
          </div>
        </div>

        <div class="stat-card stat-card-itm" v-if="summary.totalWinnings > 0">
          <div class="stat-icon itm">
            <i class="pi pi-dollar"></i>
          </div>
          <div class="stat-content">
            <span class="stat-value itm-value">${{ summary.totalWinnings?.toLocaleString() || 0 }}</span>
            <span class="stat-label">Gains ITM ({{ summary.itmCount || 0 }})</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Liste des tournois par jour -->
    <div class="tournaments-section">
      <div class="section-header">
        <h2>Mon planning</h2>
        <span class="tournament-count">{{ tournaments?.length || 0 }} tournoi(s)</span>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <ProgressSpinner />
        <p>Chargement...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="!tournaments || tournaments.length === 0" class="empty-state">
        <div class="empty-icon">
          <i class="pi pi-calendar-plus"></i>
        </div>
        <h3>Aucun tournoi programmé</h3>
        <p>Ajoutez des tournois depuis le planning des tournois</p>
      </div>

      <!-- Tournaments grouped by day -->
      <div v-else class="days-list">
        <div
          v-for="(dayData, date) in tournamentsByDay"
          :key="date"
          class="day-card"
        >
          <!-- Day Header -->
          <div class="day-card-header">
            <div class="day-date-info">
              <div class="day-badge">
                <span class="day-number">{{ extractDay(date) }}</span>
                <span class="day-month">{{ extractMonth(date) }}</span>
              </div>
              <div class="day-details">
                <span class="day-name">{{ getDayName(date) }}</span>
                <span class="day-stats">
                  {{ dayData.tournaments.length }} tournoi{{ dayData.tournaments.length > 1 ? 's' : '' }}
                  <span class="separator">•</span>
                  {{ formatBuyIn(dayData.totalBuyin) }}
                </span>
              </div>
            </div>

            <!-- Notes du jour (desktop: tooltip, mobile: visible) -->
            <div
              v-if="getDayNotes(dayData.tournaments).length > 0"
              class="day-notes-indicator desktop-only"
              v-tooltip.top="formatDayNotes(dayData.tournaments)"
            >
              <i class="pi pi-comment"></i>
              <span class="notes-count">{{ getDayNotes(dayData.tournaments).length }}</span>
            </div>

            <div class="day-total">
              {{ formatBuyIn(dayData.totalBuyin) }}
            </div>
          </div>

          <!-- Day Tournaments -->
          <div class="day-tournaments">
            <div
              v-for="tournament in dayData.tournaments"
              :key="tournament.id"
              class="tournament-row"
              :class="{ 'tournament-in-progress': tournament.liveStatus === 'playing', 'tournament-eliminated': tournament.liveStatus === 'eliminated' && !tournament.liveWinnings, 'tournament-itm': tournament.liveStatus === 'eliminated' && tournament.liveWinnings }"
            >
              <!-- Bannière EN JEU -->
              <div v-if="tournament.liveStatus === 'playing'" class="live-banner">
                <div class="live-dot"></div>
                <span>En jeu depuis {{ tournament.time }}</span>
                <span v-if="tournament.liveStack" class="live-banner-stack">
                  Stack: {{ tournament.liveStack.toLocaleString() }}
                </span>
                <span class="live-banner-level">
                  Niveau {{ tournament.liveLevel || 1 }}
                </span>
                <button
                  class="live-update-btn"
                  @click="openLiveStatusDialog(tournament)"
                >
                  Mettre à jour
                </button>
              </div>

              <div v-if="tournament.liveStatus !== 'playing'" class="tournament-time-slot">
                <i class="pi pi-clock"></i>
                <span>{{ tournament.time }}</span>
                <!-- Bannière éliminé avec gains (ITM) -->
                <span v-if="tournament.liveStatus === 'eliminated' && tournament.liveWinnings" class="itm-badge">
                  🔥 ITM ${{ tournament.liveWinnings.toLocaleString() }}
                </span>
                <!-- Bannière éliminé sans gains -->
                <span v-else-if="tournament.liveStatus === 'eliminated'" class="eliminated-badge">
                  Éliminé
                </span>
              </div>

              <div class="tournament-info">
                <div class="casino-badge">
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
                    <span class="casino-name">{{ tournament.casino }}</span>
                  </div>
                  <span v-if="tournament.day" class="day-badge-small">Day {{ tournament.day }}</span>
                  <span v-else-if="tournament.isRestart" class="restart-badge-small">Restart</span>
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

                <!-- Structure info: chips et niveaux -->
                <div class="tournament-structure-info">
                  <div v-if="tournament.structureChips" class="structure-tag chips">
                    <i class="pi pi-circle-fill"></i>
                    {{ tournament.structureChips }}
                  </div>
                  <div v-if="tournament.structureLevels" class="structure-tag levels">
                    <i class="pi pi-clock"></i>
                    {{ tournament.structureLevels }}
                  </div>
                  <div v-else-if="tournament.levels && tournament.levels !== '-'" class="structure-tag levels">
                    <i class="pi pi-clock"></i>
                    {{ tournament.levels }}
                  </div>
                </div>

                <!-- Note utilisateur toujours visible -->
                <div v-if="tournament.user_note" class="tournament-note-display">
                  <i class="pi pi-comment"></i>
                  <span>{{ tournament.user_note }}</span>
                </div>

                <!-- Inscrits au tournoi -->
                <div v-if="tournament.participants && tournament.participants.length > 0" class="tournament-participants">
                  <i class="pi pi-users"></i>
                  <span class="participants-label">Inscrits:</span>
                  <div class="participants-list">
                    <span
                      v-for="participant in tournament.participants"
                      :key="participant.id"
                      class="participant-chip"
                    >
                      {{ participant.name }}
                    </span>
                  </div>
                </div>
              </div>


              <div v-if="tournament.liveStatus !== 'playing' && tournament.liveStatus !== 'eliminated'" class="tournament-actions">
                <Button
                  icon="pi pi-pencil"
                  @click="openNoteDialog(tournament)"
                  severity="secondary"
                  text
                  rounded
                  size="small"
                  class="edit-note-btn"
                  v-tooltip.top="'Modifier la note'"
                />
                <Button
                  icon="pi pi-user-plus"
                  label="Rejoindre"
                  @click="openJoinDialog(tournament)"
                  text
                  size="small"
                  class="join-btn"
                />
                <Button
                  icon="pi pi-trash"
                  @click="confirmDelete(tournament)"
                  severity="danger"
                  text
                  rounded
                  size="small"
                  class="delete-btn"
                  v-tooltip.top="'Supprimer'"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Dialog pour rejoindre un tournoi -->
    <Dialog
      v-model:visible="showJoinDialog"
      :modal="true"
      :style="{ width: '400px' }"
      :showHeader="false"
      class="join-dialog"
    >
      <div class="join-dialog-content">
        <div class="join-icon">
          <i class="pi pi-user-plus"></i>
        </div>
        <h3>Ajouter un membre à ce tournoi</h3>

        <div v-if="tournamentToJoin" class="join-tournament-info">
          <div class="join-info-row">
            <span>{{ tournamentToJoin.date }} à {{ tournamentToJoin.time }}</span>
          </div>
          <div class="join-info-row casino">
            {{ tournamentToJoin.casino }}
          </div>
          <div class="join-info-row buyin">
            {{ formatBuyIn(tournamentToJoin.buyin) }}
          </div>
        </div>

        <div class="join-select-wrapper">
          <label>Choisir un membre</label>
          <Select
            v-if="availableUsers.length > 0"
            v-model="selectedUserToJoin"
            :options="availableUsers"
            optionLabel="name"
            placeholder="Sélectionner..."
            class="w-full"
          />
          <div class="divider-or" v-if="availableUsers.length > 0">
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

        <div class="join-actions">
          <Button
            label="Annuler"
            @click="showJoinDialog = false"
            severity="secondary"
            text
            class="cancel-btn"
          />
          <Button
            label="Ajouter"
            @click="joinTournament"
            icon="pi pi-user-plus"
            :loading="joining"
            :disabled="!selectedUserToJoin"
            class="confirm-join-btn"
          />
        </div>
      </div>
    </Dialog>

    <!-- Dialog de suppression -->
    <Dialog
      v-model:visible="showDeleteDialog"
      :modal="true"
      :style="{ width: '400px' }"
      :showHeader="false"
      class="delete-dialog"
    >
      <div class="delete-dialog-content">
        <div class="delete-icon">
          <i class="pi pi-trash"></i>
        </div>
        <h3>Supprimer ce tournoi ?</h3>

        <div v-if="tournamentToDelete" class="delete-tournament-info">
          <div class="delete-info-row">
            <span>{{ tournamentToDelete.date }} à {{ tournamentToDelete.time }}</span>
          </div>
          <div class="delete-info-row casino">
            {{ tournamentToDelete.casino }}
          </div>
          <div class="delete-info-row buyin">
            {{ formatBuyIn(tournamentToDelete.buyin) }}
          </div>
        </div>

        <p class="delete-warning">Cette action est irréversible</p>

        <div class="delete-actions">
          <Button
            label="Annuler"
            @click="showDeleteDialog = false"
            severity="secondary"
            text
            class="cancel-btn"
          />
          <Button
            label="Supprimer"
            @click="deleteTournament"
            severity="danger"
            icon="pi pi-trash"
            :loading="deleting"
            class="confirm-delete-btn"
          />
        </div>
      </div>
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
        <h3>Note pour ce tournoi</h3>

        <div v-if="tournamentToEdit" class="note-tournament-info">
          <div class="note-info-row">
            <span>{{ tournamentToEdit.date }} à {{ tournamentToEdit.time }}</span>
          </div>
          <div class="note-info-row casino">
            {{ tournamentToEdit.casino }}
          </div>
        </div>

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

    <!-- Dialog Statut Live -->
    <Dialog
      v-model:visible="showLiveDialog"
      :modal="true"
      :style="{ width: '420px' }"
      :showHeader="false"
      class="live-dialog"
    >
      <div class="live-dialog-content">
        <h3>Statut du tournoi</h3>

        <div v-if="tournamentForLive" class="live-tournament-info">
          <span>{{ tournamentForLive.time }} — {{ tournamentForLive.casino }}</span>
        </div>

        <div class="live-status-selector">
          <label>Statut :</label>
          <div class="status-buttons">
            <button
              class="status-btn playing"
              :class="{ active: liveStatusValue === 'playing' }"
              @click="liveStatusValue = 'playing'"
            >
              🟢 En jeu
            </button>
            <button
              class="status-btn eliminated"
              :class="{ active: liveStatusValue === 'eliminated' }"
              @click="liveStatusValue = 'eliminated'"
            >
              🔴 Éliminé
            </button>
          </div>
        </div>

        <div class="live-inputs-row">
          <div class="live-input-field">
            <label>Stack actuel :</label>
            <InputText
              v-model="liveStackValue"
              type="number"
              placeholder="Chips"
              class="w-full"
              :disabled="liveStatusValue === 'eliminated'"
            />
          </div>

          <div class="live-input-field">
            <label>Niveau :</label>
            <InputText
              v-model="liveLevelValue"
              type="number"
              placeholder=""
              class="w-full"
              :disabled="liveStatusValue === 'eliminated'"
            />
          </div>

          <div class="live-input-field">
            <label>Gains ($) :</label>
            <InputText
              v-model="liveWinningsValue"
              type="number"
              placeholder="ITM"
              class="w-full"
              :disabled="liveStatusValue !== 'eliminated'"
            />
          </div>
        </div>

        <div class="live-actions">
          <Button
            label="Annuler"
            @click="showLiveDialog = false"
            severity="secondary"
            text
          />
          <Button
            label="Enregistrer"
            @click="saveLiveStatus"
            icon="pi pi-check"
            :loading="savingLive"
            class="confirm-live-btn"
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
import { ref, computed, watch, nextTick, onUnmounted, onMounted } from 'vue';
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

// Configuration API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const props = defineProps({
  user: Object,
  tournaments: Array,
  summary: Object,
  loading: Boolean
});

const emit = defineEmits(['refresh', 'delete-tournament', 'import-tournaments', 'user-created']);

const showDeleteDialog = ref(false);
const tournamentToDelete = ref(null);
const deleting = ref(false);

// Note dialog state
const showNoteDialog = ref(false);
const tournamentToEdit = ref(null);
const editingNote = ref('');
const savingNote = ref(false);

// Join tournament state
const showJoinDialog = ref(false);
const tournamentToJoin = ref(null);
const selectedUserToJoin = ref(null);
const joining = ref(false);
const users = ref([]);
const newUserName = ref('');
const creatingUser = ref(false);

const { getCasinoLogo, getCasinoInitials } = useCasinoLogos();
const { getRouteForCasino, getCasinoCoords, HOME_LOCATION } = useCasinoRoutes();
const toast = useToast();
const casinoRouteTimes = ref({});

// Alerte tournoi en cours
const showTournamentAlert = ref(false);
const activeTournament = ref(null);
let alertCheckInterval = null;

// Missed tournaments recap
const showMissedRecapDialog = ref(false);
const missedTournaments = ref([]);
const missedResults = ref({});
const savingMissedResults = ref(false);

const hasAnyMissedResult = computed(() => {
  return Object.values(missedResults.value).some(r => r.type);
});

// Détecte les tournois passés sans statut (non saisis)
const checkMissedTournaments = () => {
  if (!props.tournaments || props.tournaments.length === 0) return;

  const now = new Date();
  const missed = [];

  for (const tournament of props.tournaments) {
    // Ignorer les tournois déjà saisis
    if (tournament.liveStatus === 'playing' || tournament.liveStatus === 'eliminated') continue;

    const tournamentDate = parseTournamentDate(tournament.date, tournament.time);
    if (!tournamentDate) continue;

    // Le tournoi est passé depuis au moins 3h (il est terminé)
    const diffMs = now.getTime() - tournamentDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours >= 3) {
      missed.push(tournament);
    }
  }

  if (missed.length > 0) {
    // Vérifier si déjà dismiss aujourd'hui
    const dismissedKey = `dismissed_missed_recap_${props.user?.id}`;
    const lastDismissed = localStorage.getItem(dismissedKey);
    const today = now.toISOString().split('T')[0];

    if (lastDismissed === today) return;

    missedTournaments.value = missed;
    // Initialiser les résultats
    missed.forEach(t => {
      if (!missedResults.value[t.id]) {
        missedResults.value[t.id] = { type: null, winnings: '' };
      }
    });
    showMissedRecapDialog.value = true;
  }
};

const setMissedResult = (tournament, type) => {
  if (missedResults.value[tournament.id]?.type === type) {
    // Toggle off
    missedResults.value[tournament.id] = { type: null, winnings: '' };
  } else {
    missedResults.value[tournament.id] = { type, winnings: '' };
  }
};

const dismissMissedRecap = () => {
  const dismissedKey = `dismissed_missed_recap_${props.user?.id}`;
  const today = new Date().toISOString().split('T')[0];
  localStorage.setItem(dismissedKey, today);
  showMissedRecapDialog.value = false;
};

const saveMissedResults = async () => {
  savingMissedResults.value = true;

  try {
    for (const tournament of missedTournaments.value) {
      const result = missedResults.value[tournament.id];
      if (!result || !result.type) continue;

      const body = {
        live_status: 'eliminated',
        live_stack: null,
        live_level: null,
        live_winnings: result.type === 'itm' && result.winnings ? parseInt(result.winnings) : null
      };

      await fetch(`${API_URL}/tournaments/${tournament.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    }

    toast.add({
      severity: 'success',
      summary: 'Résultats enregistrés',
      detail: 'Tous les résultats ont été sauvegardés',
      life: 3000
    });

    showMissedRecapDialog.value = false;
    dismissMissedRecap();
    emit('refresh');
  } catch (error) {
    console.error('Erreur:', error);
    toast.add({
      severity: 'error',
      summary: 'Erreur',
      detail: 'Une erreur est survenue lors de la sauvegarde',
      life: 3000
    });
  } finally {
    savingMissedResults.value = false;
  }
};

// Convertir une date de tournoi "04-juin" + "10:00" en objet Date
const parseTournamentDate = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;
  const match = dateStr.match(/^(\d+)-(.+)$/);
  if (!match) return null;

  const day = parseInt(match[1]);
  const timeParts = timeStr.match(/^(\d+):(\d+)/);
  if (!timeParts) return null;

  // Tous les tournois sont en juin 2026
  return new Date(2026, 5, day, parseInt(timeParts[1]), parseInt(timeParts[2]));
};

// Vérifier s'il y a un tournoi imminent (dans les 30 minutes avant jusqu'à 15 min après le début)
const checkForActiveTournament = () => {
  if (!props.tournaments || props.tournaments.length === 0) return;

  // Ne pas afficher l'alerte si un tournoi est déjà en cours
  const hasInProgress = props.tournaments.some(t => t.liveStatus === 'playing');
  if (hasInProgress) return;

  const now = new Date();
  const dismissedKey = `dismissed_tournament_${props.user?.id}`;
  const dismissed = JSON.parse(localStorage.getItem(dismissedKey) || '{}');

  for (const tournament of props.tournaments) {
    const tournamentDate = parseTournamentDate(tournament.date, tournament.time);
    if (!tournamentDate) continue;

    const diffMs = tournamentDate.getTime() - now.getTime();
    const diffMin = diffMs / (1000 * 60);

    // Alerte : entre 30 min avant et 15 min après le début
    if (diffMin >= -15 && diffMin <= 30) {
      // Ne pas réafficher si déjà dismiss pour ce tournoi aujourd'hui
      const dismissKey = `${tournament.id}_${tournament.date}`;
      if (dismissed[dismissKey]) continue;

      activeTournament.value = tournament;
      showTournamentAlert.value = true;
      return;
    }
  }
};

const dismissAlert = () => {
  if (activeTournament.value && props.user) {
    const dismissedKey = `dismissed_tournament_${props.user.id}`;
    const dismissed = JSON.parse(localStorage.getItem(dismissedKey) || '{}');
    const dismissKey = `${activeTournament.value.id}_${activeTournament.value.date}`;
    dismissed[dismissKey] = true;
    localStorage.setItem(dismissedKey, JSON.stringify(dismissed));
  }
  showTournamentAlert.value = false;
  activeTournament.value = null;
};

const confirmTournamentStart = async () => {
  if (!activeTournament.value) return;

  // Mettre le statut à "playing"
  try {
    const response = await fetch(
      `${API_URL}/tournaments/${activeTournament.value.id}/status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ live_stack: null, live_status: 'playing' })
      }
    );
    if (response.ok) {
      activeTournament.value.liveStatus = 'playing';
    }
  } catch (error) {
    console.error('Erreur mise à jour statut:', error);
  }

  toast.add({
    severity: 'success',
    summary: 'Bonne chance ! 🍀',
    detail: `Go ${activeTournament.value?.casino} !`,
    life: 5000
  });
  dismissAlert();
  emit('refresh');
};

// Vérifier s'il y a un tournoi en cours et ouvrir la modale
const checkForInProgressTournament = () => {
  if (!props.tournaments || props.tournaments.length === 0) return;

  const inProgress = props.tournaments.find(t => t.liveStatus === 'playing');
  if (inProgress) {
    openLiveStatusDialog(inProgress);
  }
};

// Lancer la vérification au montage et toutes les minutes
onMounted(() => {
  setTimeout(() => {
    if (props.tournaments && props.tournaments.length > 0) {
      // Vérifier s'il y a un tournoi en cours → ouvrir la modale de mise à jour
      const inProgress = props.tournaments.find(t => t.liveStatus === 'playing');
      if (inProgress) {
        openLiveStatusDialog(inProgress);
      } else {
        // Vérifier les tournois passés non saisis
        checkMissedTournaments();
      }
    }
  }, 500);

  setTimeout(() => checkForActiveTournament(), 1000);
  alertCheckInterval = setInterval(checkForActiveTournament, 60000);
});

// Vérifier aussi quand les tournois changent
watch(() => props.tournaments, (newTournaments) => {
  if (newTournaments && newTournaments.length > 0) {
    // Si un tournoi est en cours et la modale n'est pas déjà ouverte
    const inProgress = newTournaments.find(t => t.liveStatus === 'playing');
    if (inProgress && !showLiveDialog.value && !showTournamentAlert.value) {
      openLiveStatusDialog(inProgress);
    } else {
      setTimeout(() => checkForActiveTournament(), 500);
    }
  }
}, { deep: true });

// Route map modal
const showRouteMapDialog = ref(false);
const routeMapCasino = ref('');
const routeMapContainer = ref(null);
const routeMapInfo = ref(null);
let routeMap = null;
let routeMapControl = null;

// Live status dialog
const showLiveDialog = ref(false);
const tournamentForLive = ref(null);
const liveStatusValue = ref('');
const liveStackValue = ref('');
const liveLevelValue = ref('');
const liveWinningsValue = ref('');
const savingLive = ref(false);

const openLiveStatusDialog = (tournament) => {
  tournamentForLive.value = tournament;
  liveStatusValue.value = tournament.liveStatus || '';
  liveStackValue.value = tournament.liveStack || '';
  liveLevelValue.value = tournament.liveLevel || 1;
  liveWinningsValue.value = tournament.liveWinnings || '';
  showLiveDialog.value = true;
};

const saveLiveStatus = async () => {
  if (!tournamentForLive.value) return;
  savingLive.value = true;

  try {
    const response = await fetch(
      `${API_URL}/tournaments/${tournamentForLive.value.id}/status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          live_stack: liveStackValue.value ? parseInt(liveStackValue.value) : null,
          live_status: liveStatusValue.value || null,
          live_level: liveLevelValue.value ? parseInt(liveLevelValue.value) : null,
          live_winnings: liveWinningsValue.value ? parseInt(liveWinningsValue.value) : null
        })
      }
    );

    if (response.ok) {
      tournamentForLive.value.liveStack = liveStackValue.value ? parseInt(liveStackValue.value) : null;
      tournamentForLive.value.liveStatus = liveStatusValue.value || null;
      tournamentForLive.value.liveLevel = liveLevelValue.value ? parseInt(liveLevelValue.value) : null;
      tournamentForLive.value.liveWinnings = liveWinningsValue.value ? parseInt(liveWinningsValue.value) : null;
      showLiveDialog.value = false;
      toast.add({
        severity: 'success',
        summary: 'Statut mis à jour',
        detail: liveStatusValue.value === 'eliminated' ? 'Bien joué ! 💪' : 'Go go go ! 🔥',
        life: 3000
      });
      emit('refresh');
    } else {
      toast.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de sauvegarder', life: 3000 });
    }
  } catch (error) {
    console.error('Erreur:', error);
    toast.add({ severity: 'error', summary: 'Erreur', detail: 'Une erreur est survenue', life: 3000 });
  } finally {
    savingLive.value = false;
  }
};

const resetLiveStatus = async () => {
  liveStatusValue.value = '';
  liveStackValue.value = '';
  liveLevelValue.value = '';
  liveWinningsValue.value = '';
  await saveLiveStatus();
};

// Charger les temps de trajet pour les tournois
const loadRouteTimes = async () => {
  if (!props.tournaments) return;
  const uniqueCasinos = [...new Set(props.tournaments.map(t => t.casino))];
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

// Charger les routes quand les tournois changent
watch(() => props.tournaments, (newTournaments) => {
  if (newTournaments && newTournaments.length > 0) {
    loadRouteTimes();
  }
}, { immediate: true });

// Charger les utilisateurs
const loadUsers = async () => {
  try {
    const response = await fetch(`${API_URL}/users`);
    users.value = await response.json();
  } catch (error) {
    console.error('Erreur chargement users:', error);
  }
};

// Utilisateurs disponibles (exclure l'utilisateur actuel)
const availableUsers = computed(() => {
  return users.value.filter(u => u.id !== props.user?.id);
});

// Ouvrir le dialog pour rejoindre
const openJoinDialog = (tournament) => {
  tournamentToJoin.value = tournament;
  selectedUserToJoin.value = null;
  showJoinDialog.value = true;
};

// Ajouter le tournoi à un autre utilisateur
const joinTournament = async () => {
  if (!tournamentToJoin.value || !selectedUserToJoin.value) return;

  joining.value = true;

  try {
    const response = await fetch(
      `${API_URL}/users/${selectedUserToJoin.value.id}/tournaments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: tournamentToJoin.value.date,
          time: tournamentToJoin.value.time,
          casino: tournamentToJoin.value.casino,
          buyin: tournamentToJoin.value.buyin,
          levels: tournamentToJoin.value.levels
        })
      }
    );

    if (response.ok) {
      showJoinDialog.value = false;
      toast.add({
        severity: 'success',
        summary: 'Membre ajouté',
        detail: `${selectedUserToJoin.value.name} rejoint ce tournoi`,
        life: 3000
      });
      selectedUserToJoin.value = null;
      tournamentToJoin.value = null;
    } else {
      toast.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Impossible d\'ajouter le membre',
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

// Créer un utilisateur et l'ajouter au tournoi
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
    const joinResponse = await fetch(
      `${API_URL}/users/${newUser.id}/tournaments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: tournamentToJoin.value.date,
          time: tournamentToJoin.value.time,
          casino: tournamentToJoin.value.casino,
          buyin: tournamentToJoin.value.buyin,
          levels: tournamentToJoin.value.levels || '-'
        })
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
      await loadUsers();
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

// Charger les users au démarrage
loadUsers();

// Grouper les tournois par jour
const tournamentsByDay = computed(() => {
  if (!props.tournaments) return {};

  const grouped = {};

  // Trier d'abord tous les tournois
  const sorted = [...props.tournaments].sort((a, b) => {
    const dateA = a.date + ' ' + a.time;
    const dateB = b.date + ' ' + b.time;
    return dateA.localeCompare(dateB);
  });

  // Grouper par date
  sorted.forEach(tournament => {
    const date = tournament.date;
    if (!grouped[date]) {
      grouped[date] = {
        tournaments: [],
        totalBuyin: 0
      };
    }
    grouped[date].tournaments.push(tournament);
    grouped[date].totalBuyin += tournament.buyin || 0;
  });

  return grouped;
});

const formatBuyIn = (amount) => {
  if (!amount) return '$0';
  return '$' + amount.toLocaleString('en-US');
};

// Obtenir les notes d'un jour
const getDayNotes = (tournaments) => {
  return tournaments.filter(t => t.user_note);
};

// Formatter les notes du jour pour le tooltip
const formatDayNotes = (tournaments) => {
  const notesWithInfo = tournaments
    .filter(t => t.user_note)
    .map(t => `${t.time} - ${t.casino}: ${t.user_note}`);
  return notesWithInfo.join('\n');
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
  // Format attendu: "04-juin" ou similaire
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

const confirmDelete = (tournament) => {
  tournamentToDelete.value = tournament;
  showDeleteDialog.value = true;
};

// Note management
const openNoteDialog = (tournament) => {
  tournamentToEdit.value = tournament;
  editingNote.value = tournament.user_note || '';
  showNoteDialog.value = true;
};

const saveNote = async () => {
  if (!tournamentToEdit.value) return;

  savingNote.value = true;

  try {
    const response = await fetch(
      `${API_URL}/tournaments/${tournamentToEdit.value.id}/note`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_note: editingNote.value || null })
      }
    );

    if (response.ok) {
      // Mettre à jour localement le tournoi
      tournamentToEdit.value.user_note = editingNote.value || null;
      showNoteDialog.value = false;
      toast.add({
        severity: 'success',
        summary: 'Note enregistrée',
        detail: editingNote.value ? 'Votre note a été sauvegardée' : 'Note supprimée',
        life: 3000
      });
      emit('refresh');
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

const deleteTournament = async () => {
  if (!tournamentToDelete.value) return;

  deleting.value = true;

  try {
    const response = await fetch(
      `${API_URL}/tournaments/${tournamentToDelete.value.id}`,
      { method: 'DELETE' }
    );

    if (response.ok) {
      emit('delete-tournament', tournamentToDelete.value.id);
      showDeleteDialog.value = false;
      toast.add({
        severity: 'success',
        summary: 'Tournoi supprimé',
        detail: 'Le tournoi a été retiré de votre planning',
        life: 3000
      });
      tournamentToDelete.value = null;
    } else {
      toast.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Impossible de supprimer le tournoi',
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
    deleting.value = false;
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

onUnmounted(() => {
  if (routeMap) {
    routeMap.remove();
    routeMap = null;
  }
  if (alertCheckInterval) {
    clearInterval(alertCheckInterval);
    alertCheckInterval = null;
  }
});
</script>

<style scoped>
.program-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
}

/* Header */
.program-header {
  margin-bottom: 32px;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-avatar {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.75rem;
  font-weight: 700;
}

.user-details h1 {
  color: var(--text-primary, #f1f5f9);
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 4px 0;
}

.user-subtitle {
  color: var(--accent-color, #818cf8);
  font-size: 1rem;
  margin: 0;
  font-weight: 500;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.stat-card {
  background: var(--bg-secondary, #1e293b);
  border: 1px solid var(--border-color, #334155);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.2s ease;
}

.stat-card:hover {
  border-color: var(--accent-color, #818cf8);
  transform: translateY(-2px);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.stat-icon.tournaments {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.stat-icon.budget {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.stat-icon.casinos {
  background: rgba(99, 102, 241, 0.15);
  color: #6366f1;
}

.stat-icon.days {
  background: rgba(236, 72, 153, 0.15);
  color: #ec4899;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  color: var(--text-primary, #f1f5f9);
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
}

.stat-label {
  color: var(--text-secondary, #94a3b8);
  font-size: 0.875rem;
  margin-top: 2px;
}

/* Tournaments Section */
.tournaments-section {
  background: var(--bg-secondary, #1e293b);
  border: 1px solid var(--border-color, #334155);
  border-radius: 16px;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color, #334155);
}

.section-header h2 {
  color: var(--text-primary, #f1f5f9);
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.tournament-count {
  background: var(--accent-color, #818cf8);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
}

/* Loading & Empty States */
.loading-state,
.empty-state {
  padding: 60px 24px;
  text-align: center;
  color: var(--text-secondary, #94a3b8);
}

.empty-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--bg-primary, #0f172a);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
}

.empty-icon i {
  font-size: 2rem;
  color: var(--accent-color, #818cf8);
}

.empty-state h3 {
  color: var(--text-primary, #f1f5f9);
  font-size: 1.25rem;
  margin: 0 0 8px 0;
}

.empty-state p {
  margin: 0;
  font-size: 0.9375rem;
}

/* Days List */
.days-list {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Day Card */
.day-card {
  background: var(--bg-secondary, #1e293b);
  border: 1px solid var(--border-color, #334155);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.day-card:hover {
  border-color: rgba(129, 140, 248, 0.4);
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.08), 0 4px 12px rgba(0, 0, 0, 0.1);
}

.day-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 22px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.06), rgba(99, 102, 241, 0.06));
  border-bottom: 1px solid var(--border-color, #334155);
}

.day-date-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.day-badge {
  min-width: 54px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
}

.day-number {
  display: block;
  color: white;
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1;
}

.day-month {
  display: block;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  margin-top: 3px;
  text-transform: uppercase;
}

.day-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.day-name {
  color: var(--text-primary, #f1f5f9);
  font-size: 1.125rem;
  font-weight: 700;
  text-transform: capitalize;
}

.day-stats {
  color: var(--text-secondary, #94a3b8);
  font-size: 0.8125rem;
}

.day-stats .separator {
  margin: 0 6px;
  opacity: 0.4;
}

.day-total {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
  font-size: 1rem;
  font-weight: 700;
  padding: 8px 14px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.25);
}

/* Notes indicator in day header */
.day-notes-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(99, 102, 241, 0.15);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.day-notes-indicator i {
  font-size: 0.875rem;
  color: #6366f1;
}

.day-notes-indicator .notes-count {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6366f1;
}

.day-notes-indicator:hover {
  background: rgba(99, 102, 241, 0.25);
  transform: scale(1.05);
}

/* Day Tournaments */
.day-tournaments {
  padding: 6px 0;
}

.tournament-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 22px;
  transition: background 0.15s ease;
  position: relative;
}

.tournament-row:hover {
  background: rgba(99, 102, 241, 0.04);
}

.tournament-row:not(:last-child) {
  border-bottom: 1px solid rgba(51, 65, 85, 0.5);
}

/* Tournoi en cours */
.tournament-in-progress {
  background: rgba(34, 197, 94, 0.05) !important;
  border: 2px solid #22c55e !important;
  border-radius: 12px;
  margin: 6px 12px;
  padding: 0 !important;
  flex-direction: column !important;
  overflow: hidden;
}

.tournament-in-progress .tournament-time-slot,
.tournament-in-progress .tournament-info,
.tournament-in-progress .tournament-actions {
  padding: 0 18px 18px;
}

.tournament-in-progress .tournament-actions {
  padding-bottom: 14px;
}

/* Bannière EN JEU */
.live-banner {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 18px;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
  font-weight: 800;
  font-size: 0.875rem;
  letter-spacing: 0.05em;
  width: 100%;
}

.live-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: white;
  animation: blink 1.5s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.live-banner-stack {
  font-weight: 700;
  font-size: 1rem;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 6px;
  margin: 0 auto;
}

.live-banner-level {
  font-weight: 700;
  font-size: 1rem;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 6px;
}

.live-update-btn {
  margin-left: auto;
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 6px;
  color: white;
  font-weight: 600;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.live-update-btn:hover {
  background: rgba(255, 255, 255, 0.35);
  border-color: white;
}

/* Tournoi éliminé sans gains */
.tournament-eliminated {
  opacity: 0.5;
  border-left: 4px solid #ef4444;
}

/* Tournoi éliminé avec gains (ITM) */
.tournament-itm {
  border: 2px solid #22c55e !important;
  border-radius: 12px;
  margin: 6px 12px;
  background:
    linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(245, 158, 11, 0.08)) !important;
  position: relative;
  overflow: hidden;
}

.tournament-itm::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 20% 50%, rgba(245, 158, 11, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 50%, rgba(34, 197, 94, 0.1) 0%, transparent 50%);
  pointer-events: none;
}

.itm-badge {
  padding: 4px 12px;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.8125rem;
  margin-left: auto;
}

.eliminated-badge {
  padding: 4px 10px;
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.75rem;
  border: 1px solid rgba(239, 68, 68, 0.3);
  margin-left: auto;
}

@keyframes live-pulse {
  0%, 100% { background: rgba(34, 197, 94, 0.05); }
  50% { background: rgba(34, 197, 94, 0.1); }
}

/* Note indicator in corner */
.note-indicator-corner {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  background: rgba(99, 102, 241, 0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 5;
}

.note-indicator-corner i {
  font-size: 0.75rem;
  color: #6366f1;
}

.note-indicator-corner:hover {
  background: rgba(99, 102, 241, 0.3);
  transform: scale(1.1);
}

.tournament-time-slot {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 80px;
  color: var(--text-primary, #f1f5f9);
  font-weight: 700;
  font-size: 1rem;
}

.tournament-time-slot i {
  font-size: 0.75rem;
  color: var(--accent-color, #818cf8);
  opacity: 0.8;
}

.tournament-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
}

.casino-badge {
  display: flex;
  align-items: center;
  gap: 10px;
}

.casino-logo-wrapper {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--border-color, #334155);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary, #0f172a);
  padding: 3px;
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
  font-weight: 600;
  font-size: 0.625rem;
  border-radius: 4px;
}

.casino-name-wrapper {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.casino-name {
  color: var(--text-primary, #f1f5f9);
  font-weight: 600;
  font-size: 0.9375rem;
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
.route-nav-links .mobile-only {
  display: none;
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

.day-badge-small {
  background: rgba(245, 158, 11, 0.12);
  color: #fbbf24;
  padding: 3px 8px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
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
  letter-spacing: 0.05em;
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.tournament-structure-info {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
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

/* Note utilisateur toujours visible */
.tournament-note-display {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  margin-top: 10px;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 8px;
  border-left: 3px solid #6366f1;
  font-size: 0.8125rem;
  color: var(--text-secondary, #94a3b8);
}

.tournament-note-display i {
  color: #6366f1;
  font-size: 0.875rem;
  flex-shrink: 0;
  margin-top: 2px;
}

.tournament-note-display span {
  flex: 1;
  line-height: 1.4;
}

/* Inscrits au tournoi */
.tournament-participants {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(34, 197, 94, 0.1);
  border-radius: 8px;
  border-left: 3px solid #22c55e;
  font-size: 0.8125rem;
}

.tournament-participants > i {
  color: #22c55e;
  font-size: 0.875rem;
}

.tournament-participants .participants-label {
  color: var(--text-secondary, #94a3b8);
  font-weight: 500;
}

.participants-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.participant-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.tournament-buyin {
  color: #22c55e;
  font-weight: 700;
  font-size: 1rem;
  min-width: 75px;
  text-align: right;
  letter-spacing: -0.01em;
}

.delete-btn {
  color: #f87171 !important;
  transition: all 0.2s ease;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.12) !important;
}

.join-btn {
  color: #34d399 !important;
  transition: all 0.2s ease;
}

.join-btn:hover {
  background: rgba(34, 197, 94, 0.12) !important;
}

.edit-note-btn {
  transition: all 0.2s ease;
}

.edit-note-btn:hover {
  background: rgba(99, 102, 241, 0.12) !important;
  color: #818cf8 !important;
}

.tournament-actions {
  display: flex;
  gap: 2px;
  align-items: center;
}

/* Join Dialog */
.join-dialog-content {
  padding: 32px 24px;
  text-align: center;
}

.join-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(34, 197, 94, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.join-icon i {
  font-size: 1.75rem;
  color: #22c55e;
}

.join-dialog-content h3 {
  color: var(--text-primary, #1e293b);
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 20px 0;
}

.join-tournament-info {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 20px;
}

.join-info-row {
  color: #166534;
  font-size: 0.9375rem;
  padding: 4px 0;
}

.join-info-row.casino {
  font-weight: 600;
  font-size: 1rem;
}

.join-info-row.buyin {
  color: #15803d;
  font-weight: 700;
}

.join-select-wrapper {
  text-align: left;
  margin-bottom: 24px;
}

.join-select-wrapper label {
  display: block;
  color: #64748b;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 8px;
}

.join-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.confirm-join-btn {
  min-width: 120px;
}

/* Create user section */
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
  background: #e2e8f0;
}

.divider-or span {
  color: #64748b;
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

/* Delete Dialog */
.delete-dialog-content {
  padding: 32px 24px;
  text-align: center;
}

.delete-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.delete-icon i {
  font-size: 1.75rem;
  color: #ef4444;
}

.delete-dialog-content h3 {
  color: var(--text-primary, #1e293b);
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 20px 0;
}

.delete-tournament-info {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
}

.delete-info-row {
  color: #991b1b;
  font-size: 0.9375rem;
  padding: 4px 0;
}

.delete-info-row.casino {
  font-weight: 600;
  font-size: 1rem;
}

.delete-info-row.buyin {
  color: #dc2626;
  font-weight: 700;
}

.delete-warning {
  color: #94a3b8;
  font-size: 0.875rem;
  margin: 0 0 24px 0;
}

.delete-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.cancel-btn {
  min-width: 100px;
}

.confirm-delete-btn {
  min-width: 120px;
}

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

.note-tournament-info {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 20px;
}

.note-info-row {
  color: #0369a1;
  font-size: 0.9375rem;
  padding: 4px 0;
}

.note-info-row.casino {
  font-weight: 600;
  font-size: 1rem;
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

/* Responsive */
@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .stat-card {
    padding: 16px;
  }

  .stat-icon {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }

  .stat-value {
    font-size: 1.25rem;
  }
}

@media (max-width: 768px) {
  .program-container {
    padding: 12px;
  }

  .live-banner {
    flex-wrap: wrap;
    padding: 8px 14px;
    gap: 8px;
  }

  .live-banner-stack {
    font-size: 0.75rem;
  }

  .live-update-btn {
    padding: 5px 10px;
    font-size: 0.6875rem;
  }

  .tournament-in-progress {
    margin: 4px 8px;
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

  .map-link-text {
    display: none;
  }


  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .stat-card {
    padding: 14px;
    gap: 12px;
  }

  .header-top {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 20px;
  }

  .day-card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
  }

  .day-total {
    align-self: flex-end;
  }

  .tournament-row {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 14px 16px;
  }

  .tournament-time-slot {
    min-width: auto;
    justify-content: flex-start;
  }

  .tournament-info {
    flex: 1 1 100%;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .casino-badge {
    width: 100%;
  }

  .tournament-levels {
    margin-left: 42px;
  }

  .tournament-buyin {
    min-width: auto;
    text-align: left;
    font-size: 1rem;
  }

  .tournament-actions {
    width: 100%;
    justify-content: flex-end;
    margin-top: 4px;
    padding-top: 10px;
    border-top: 1px dashed var(--border-color, #334155);
  }

  .join-btn {
    flex: 1;
    justify-content: start !important;
  }

  .section-header {
    padding: 16px;
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }

  .section-header h2 {
    font-size: 1.125rem;
  }


  .tournament-count {
    font-size: 0.75rem;
    padding: 3px 10px;
  }

  .day-badge {
    min-width: 48px;
    padding: 6px 10px;
    border-radius: 8px;
  }

  .day-number {
    font-size: 1.25rem;
  }

  .day-month {
    font-size: 0.625rem;
  }

  .day-name {
    font-size: 1rem;
  }

  .day-stats {
    font-size: 0.8125rem;
  }

  .day-total {
    font-size: 0.875rem;
    padding: 6px 10px;
  }

  .casino-name {
    font-size: 0.875rem;
  }

  .tournament-buyin {
    font-size: 0.875rem;
  }

  .tournament-time-slot {
    font-size: 0.875rem;
  }

  .tournaments-section {
    border-radius: 12px;
  }

  .day-card {
    border-radius: 12px;
  }

  .day-card-header {
    padding: 14px 16px;
  }

  .tournament-row {
    padding: 12px 16px;
    gap: 12px;
  }

  .days-list {
    padding: 8px;
    gap: 10px;
  }

  .day-tournaments {
    padding: 4px 0;
  }

  .join-btn :deep(.p-button-label) {
    font-size: 0.8125rem;
  }
}

/* Dialog responsive mobile */
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

  .delete-dialog-content,
  .join-dialog-content {
    padding: 24px 16px;
  }

  .delete-icon,
  .join-icon {
    width: 56px;
    height: 56px;
    margin-bottom: 16px;
  }

  .delete-icon i,
  .join-icon i {
    font-size: 1.5rem;
  }

  .delete-dialog-content h3,
  .join-dialog-content h3 {
    font-size: 1.125rem;
    margin-bottom: 16px;
  }

  .delete-tournament-info,
  .join-tournament-info {
    padding: 14px;
  }

  .delete-actions,
  .join-actions {
    flex-direction: column;
    gap: 10px;
  }

  .cancel-btn,
  .confirm-delete-btn,
  .confirm-join-btn {
    width: 100%;
    min-width: auto;
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

/* Carte de trajet voiture */
.route-card {
  background: #0f172a;
  border-radius: 10px;
  padding: 10px 12px;
  border: 2px solid transparent;
  margin-left: auto;
  flex-shrink: 0;
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
  flex-direction: column;
  gap: 3px;
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

/* Responsive pour route-card */
@media (max-width: 768px) {
  .route-card {
    margin-left: 0;
    margin-top: 10px;
    width: 100%;
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
    flex-direction: row;
    gap: 16px;
    flex-wrap: wrap;
  }

  .route-stat-mini {
    font-size: 0.8125rem;
    gap: 8px;
  }

  .route-stat-mini i {
    font-size: 0.75rem;
    width: 16px;
  }
}

@media (max-width: 480px) {
  .route-card {
    padding: 10px 12px;
  }

  .route-card-header {
    font-size: 0.8125rem;
    margin-bottom: 6px;
  }

  .route-card-header i {
    font-size: 0.875rem;
  }

  .route-stat-mini {
    font-size: 0.75rem;
  }

  .route-stat-mini i {
    font-size: 0.6875rem;
  }
}

/* Alerte tournoi en cours */
.alert-dialog-content {
  padding: 32px 24px;
  text-align: center;
}

.alert-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  box-shadow: 0 4px 20px rgba(245, 158, 11, 0.4);
}

.alert-icon.pulse {
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 4px 20px rgba(245, 158, 11, 0.4); }
  50% { box-shadow: 0 4px 30px rgba(245, 158, 11, 0.7), 0 0 60px rgba(239, 68, 68, 0.3); }
}

.alert-icon i {
  font-size: 2rem;
  color: white;
}

.alert-dialog-content h3 {
  color: #f1f5f9;
  font-size: 1.375rem;
  font-weight: 700;
  margin: 0 0 20px 0;
}

.alert-tournament-info {
  background: linear-gradient(135deg, #fffbeb, #fef3c7);
  border: 1px solid #fbbf24;
  border-radius: 12px;
  padding: 18px;
  margin-bottom: 20px;
  text-align: left;
}

.alert-info-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  color: #92400e;
  font-size: 0.9375rem;
}


.alert-info-row.time {
  font-size: 1.125rem;
  font-weight: 700;
  color: #78350f;
}

.alert-info-row.casino {
  font-weight: 600;
  font-size: 1rem;
}

.alert-info-row.buyin {
  font-weight: 700;
  color: #15803d;
}


.alert-info-row.stack {
  font-weight: 600;
  color: #4338ca;
}


.alert-info-row.levels {
  color: #64748b;
}

.alert-message {
  color: #64748b;
  font-size: 1rem;
  margin: 0 0 24px 0;
  font-weight: 500;
}

.alert-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.confirm-alert-btn {
  min-width: 160px;
  background: #fef6d2 !important;
  border: none !important;
  font-weight: 700 !important;
  border-radius: 10px !important;
}

.confirm-alert-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.4);
}

/* Live Dialog */
.live-dialog-content {
  padding: 28px 24px;
  text-align: center;
}

.live-dialog-content h3 {
  color: #f1f5f9;
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 16px 0;
}

.live-tournament-info {
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 20px;
  color: #a5b4fc;
  font-weight: 600;
  font-size: 0.9375rem;
}

.live-status-selector {
  text-align: left;
  margin-bottom: 16px;
}

.live-status-selector label {
  display: block;
  color: #94a3b8;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 8px;
}

.status-buttons {
  display: flex;
  gap: 10px;
}

.status-btn {
  flex: 1;
  padding: 12px 16px;
  border-radius: 10px;
  border: 2px solid #334155;
  background: transparent;
  color: #94a3b8;
  font-weight: 600;
  font-size: 0.9375rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.status-btn:hover {
  border-color: #64748b;
}

.status-btn.playing.active {
  background: rgba(34, 197, 94, 0.15);
  border-color: #22c55e;
  color: #22c55e;
}

.status-btn.eliminated.active {
  background: rgba(239, 68, 68, 0.15);
  border-color: #ef4444;
  color: #ef4444;
}

.live-inputs-row {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.live-input-field {
  flex: 1;
  text-align: left;
  min-width: 0;
}

.live-input-field label {
  display: block;
  color: #94a3b8;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 8px;
}

.live-input-field :deep(.p-inputtext) {
  width: 100%;
}

.live-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  align-items: center;
}

.confirm-live-btn {
  min-width: 140px;
}

/* ITM Stat Card */
.stat-icon.itm {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.stat-card-itm {
  border-color: rgba(34, 197, 94, 0.3) !important;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.05), rgba(245, 158, 11, 0.05)) !important;
}

.stat-card-itm:hover {
  border-color: #22c55e !important;
  box-shadow: 0 4px 16px rgba(34, 197, 94, 0.2);
}

.itm-value {
  color: #22c55e !important;
}

/* Missed Recap Dialog */
.missed-recap-content {
  padding: 32px 24px;
}

.missed-recap-header {
  text-align: center;
  margin-bottom: 24px;
}

.missed-recap-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(245, 158, 11, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.missed-recap-icon i {
  font-size: 1.75rem;
  color: #f59e0b;
}

.missed-recap-content h3 {
  color: #f1f5f9;
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 8px 0;
}

.missed-recap-subtitle {
  color: #94a3b8;
  font-size: 0.9375rem;
  margin: 0;
}

.missed-tournaments-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 24px;
}

.missed-tournament-item {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s ease;
}

.missed-tournament-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.missed-tournament-date {
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  color: white;
  padding: 6px 10px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.75rem;
  white-space: nowrap;
}

.missed-tournament-details {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.missed-time {
  color: #f1f5f9;
  font-weight: 700;
  font-size: 0.9375rem;
}

.missed-casino {
  color: #94a3b8;
  font-size: 0.875rem;
}

.missed-buyin {
  color: #22c55e;
  font-weight: 700;
  font-size: 0.875rem;
}

.missed-tournament-actions {
  display: flex;
  gap: 8px;
}

.missed-btn {
  flex: 1;
  padding: 10px 14px;
  border-radius: 8px;
  border: 2px solid #334155;
  background: transparent;
  color: #94a3b8;
  font-weight: 600;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.missed-btn:hover {
  border-color: #64748b;
  color: #f1f5f9;
}

.missed-btn.itm-btn.active {
  background: rgba(34, 197, 94, 0.15);
  border-color: #22c55e;
  color: #22c55e;
}

.missed-btn.bust-btn.active {
  background: rgba(239, 68, 68, 0.15);
  border-color: #ef4444;
  color: #ef4444;
}

.missed-winnings-input {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #334155;
}

.missed-winnings-input label {
  color: #94a3b8;
  font-size: 0.8125rem;
  font-weight: 500;
  white-space: nowrap;
}

.winnings-input {
  flex: 1;
  max-width: 150px;
}

.missed-recap-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.confirm-missed-btn {
  min-width: 160px;
  background: linear-gradient(135deg, #f59e0b, #d97706) !important;
  border: none !important;
}

.confirm-missed-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.4);
}
</style>
