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
      </div>

      <div class="tournaments-grid">
        <div
          v-for="tournament in selectedDay.tournaments"
          :key="tournament.id"
          class="tournament-card"
        >
          <div class="tournament-card-header">
            <div class="tournament-time">{{ tournament.displayTime }}</div>
            <div class="tournament-buyin">{{ formatBuyIn(tournament.buyIn) }}</div>
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
              <div class="casino-name">{{ tournament.casino }}</div>
            </div>

            <div v-if="tournament.levels" class="tournament-levels">
              <i class="pi pi-clock"></i>
              {{ tournament.levels }}
            </div>

            <div v-if="hasStructureInfo(tournament)" class="tournament-structure">
              <div v-if="tournament.structureChips" class="structure-tag">
                <i class="pi pi-circle-fill"></i>
                {{ tournament.structureChips }}
              </div>
              <div v-if="tournament.structureGuarantee" class="structure-tag guarantee">
                <i class="pi pi-star-fill"></i>
                {{ tournament.structureGuarantee }}
              </div>
            </div>
          </div>

          <div class="tournament-card-footer">
            <Button
              label="Ajouter au planning"
              icon="pi pi-plus"
              @click="selectTournament(tournament)"
              class="add-button"
              size="small"
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Select from 'primevue/select';
import ProgressSpinner from 'primevue/progressspinner';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import { useCasinoLogos } from '../composables/useCasinoLogos';

const emit = defineEmits(['tournament-added']);

// Configuration API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// État
const loading = ref(false);
const timeline = ref([]);
const selectedDay = ref(null);
const showSelectionDialog = ref(false);
const selectedTournament = ref(null);
const selectedUser = ref(null);
const users = ref([]);
const adding = ref(false);

const { getCasinoLogo, getCasinoInitials } = useCasinoLogos();
const toast = useToast();

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

const openDay = (day) => {
  selectedDay.value = day;
};

const closeDay = () => {
  selectedDay.value = null;
};

const selectTournament = (tournament) => {
  selectedTournament.value = tournament;
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
    levels: selectedTournament.value.levels || ''
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
onMounted(() => {
  loadTimeline();
  loadUsers();
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
}

.tournament-card:hover {
  border-color: var(--accent-color, #818cf8);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
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

.casino-name {
  color: var(--text-primary, #f1f5f9);
  font-weight: 600;
  font-size: 1.125rem;
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

.structure-tag.guarantee {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

.structure-tag.guarantee i {
  color: #f59e0b;
}

.tournament-card-footer {
  padding: 16px;
  border-top: 1px solid var(--border-color, #334155);
}

.add-button {
  width: 100%;
  justify-content: center;
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
  color: var(--text-primary, #1e293b);
  font-size: 0.9375rem;
}

.input-full {
  width: 100%;
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
  }

  .tournament-time {
    font-size: 1.125rem;
  }

  .tournament-buyin {
    padding: 4px 10px;
    font-size: 0.875rem;
  }

  .tournament-card-body {
    padding: 14px;
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

  .selection-dialog-content {
    gap: 18px;
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

  .form-group label {
    font-size: 0.875rem;
  }
}
</style>
