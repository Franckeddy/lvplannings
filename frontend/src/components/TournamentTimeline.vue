<template>
  <div class="timeline-container">
    <div class="timeline-header">
      <h2>Timeline des Tournois - Las Vegas</h2>
      <p class="subtitle">Sélectionnez un tournoi pour l'ajouter à votre planning</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-section">
      <ProgressSpinner />
      <p>Chargement des tournois...</p>
    </div>

    <!-- Timeline par jour -->
    <div v-else class="timeline-content">
      <div
        v-for="day in timeline"
        :key="day.date"
        class="day-section"
      >
        <div class="day-header">
          <div class="day-info">
            <h3>{{ formatDate(day.date) }}</h3>
            <span class="day-count">{{ day.count }} tournois</span>
          </div>
          <Button
            :label="expandedDays[day.date] ? 'Réduire' : 'Développer'"
            @click="toggleDay(day.date)"
            text
            :icon="expandedDays[day.date] ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
          />
        </div>

        <div v-if="expandedDays[day.date]" class="tournaments-list">
          <div
            v-for="tournament in day.tournaments"
            :key="tournament.id"
            class="tournament-item"
            @click="selectTournament(tournament)"
          >
            <div class="tournament-main">
              <div class="tournament-time-badge">{{ tournament.displayTime }}</div>
              <div class="casino-logo-container">
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
              <div class="tournament-details">
                <div class="tournament-casino">{{ tournament.casino }}</div>
                <div class="tournament-meta">
                  <span class="buyin">{{ formatBuyIn(tournament.buyIn) }}</span>
                  <span v-if="tournament.levels" class="levels-badge">{{ tournament.levels }}</span>
                </div>
                <div v-if="hasStructureInfo(tournament)" class="tournament-structure">
                  <span v-if="tournament.structureChips" class="structure-item">
                    <i class="pi pi-circle-fill"></i>
                    {{ tournament.structureChips }}
                  </span>
                  <span v-if="tournament.structureLevels" class="structure-item">
                    <i class="pi pi-clock"></i>
                    {{ tournament.structureLevels }}
                  </span>
                  <span v-if="tournament.structureGuarantee" class="structure-item guarantee">
                    <i class="pi pi-star-fill"></i>
                    {{ tournament.structureGuarantee }}
                  </span>
                </div>
              </div>
            </div>
            <Button
              label="Ajouter"
              @click.stop="selectTournament(tournament)"
              size="small"
              icon="pi pi-plus"
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
    >
      <div v-if="selectedTournament" class="selection-dialog-content">
        <div class="selected-tournament-info">
          <div class="info-row">
            <span class="label">Date:</span>
            <span class="value">{{ formatDate(selectedTournament.date) }}</span>
          </div>
          <div class="info-row">
            <span class="label">Heure:</span>
            <span class="value">{{ selectedTournament.displayTime }}</span>
          </div>
          <div class="info-row">
            <span class="label">Casino:</span>
            <span class="value">{{ selectedTournament.casino }}</span>
          </div>
          <div class="info-row">
            <span class="label">Buy-in:</span>
            <span class="value">{{ formatBuyIn(selectedTournament.buyIn) }}</span>
          </div>
          <div v-if="selectedTournament.levels" class="info-row">
            <span class="label">Niveaux:</span>
            <span class="value">{{ selectedTournament.levels }}</span>
          </div>
        </div>

        <div v-if="hasStructureInfo(selectedTournament)" class="structure-section">
          <h4>Structure du tournoi</h4>
          <div class="structure-info">
            <div v-if="selectedTournament.structureChips" class="structure-detail">
              <i class="pi pi-circle-fill"></i>
              <span>{{ selectedTournament.structureChips }}</span>
            </div>
            <div v-if="selectedTournament.structureLevels" class="structure-detail">
              <i class="pi pi-clock"></i>
              <span>{{ selectedTournament.structureLevels }}</span>
            </div>
            <div v-if="selectedTournament.structureGuarantee" class="structure-detail guarantee">
              <i class="pi pi-star-fill"></i>
              <span>{{ selectedTournament.structureGuarantee }}</span>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>Utilisateur *</label>
          <Select
            v-model="selectedUser"
            :options="users"
            optionLabel="name"
            placeholder="Sélectionnez un utilisateur"
            class="input-full"
          />
        </div>

        <div class="form-group">
          <label>Niveaux *</label>
          <InputText
            v-model="levels"
            :placeholder="`Par défaut: ${selectedTournament.levels}`"
            class="input-full"
          />
          <small class="help-text">Laissez vide pour utiliser "{{ selectedTournament.levels }}"</small>
        </div>
      </div>

      <template #footer>
        <Button label="Annuler" @click="showSelectionDialog = false" severity="secondary" />
        <Button
          label="Ajouter au planning"
          @click="addToPlanning"
          :disabled="!selectedUser || !levels"
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
import InputText from 'primevue/inputtext';
import ProgressSpinner from 'primevue/progressspinner';
import { useCasinoLogos } from '../composables/useCasinoLogos';

const emit = defineEmits(['tournament-added']);

// État
const loading = ref(false);
const timeline = ref([]);
const expandedDays = ref({});
const showSelectionDialog = ref(false);
const selectedTournament = ref(null);
const selectedUser = ref(null);
const levels = ref('');
const users = ref([]);

const { getCasinoLogo, getCasinoInitials } = useCasinoLogos();

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

    const response = await fetch(`http://localhost:3000/api/scraped-tournaments/timeline?${params}`);

    if (response.ok) {
      timeline.value = await response.json();

      // Développer le premier jour par défaut
      if (timeline.value.length > 0) {
        expandedDays.value[timeline.value[0].date] = true;
      }
    }
  } catch (error) {
    console.error('Erreur lors du chargement de la timeline:', error);
  } finally {
    loading.value = false;
  }
};

const loadUsers = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/users');
    if (response.ok) {
      users.value = await response.json();
    }
  } catch (error) {
    console.error('Erreur lors du chargement des utilisateurs:', error);
  }
};

const toggleDay = (date) => {
  expandedDays.value[date] = !expandedDays.value[date];
};

const selectTournament = (tournament) => {
  selectedTournament.value = tournament;
  levels.value = tournament.levels; // Pré-rempli avec les niveaux du tournoi
  showSelectionDialog.value = true;
};

const addToPlanning = async () => {
  if (!selectedUser.value || !levels.value || !selectedTournament.value) return;

  const tournamentData = {
    userId: selectedUser.value.id,
    date: formatDateForDb(selectedTournament.value.date),
    time: selectedTournament.value.time.substring(0, 5),
    casino: selectedTournament.value.casino,
    buyin: selectedTournament.value.buyIn,
    levels: levels.value
  };

  try {
    const response = await fetch(
      `http://localhost:3000/api/users/${selectedUser.value.id}/tournaments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tournamentData)
      }
    );

    if (response.ok) {
      emit('tournament-added', await response.json());
      showSelectionDialog.value = false;
      selectedTournament.value = null;
      selectedUser.value = null;
      levels.value = '';
    }
  } catch (error) {
    console.error('Erreur lors de l\'ajout du tournoi:', error);
  }
};

const formatDate = (dateStr) => {
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
  max-width: 1200px;
  margin: 0 auto;
}

.timeline-header {
  margin-bottom: 32px;
  text-align: center;
}

.timeline-header h2 {
  color: var(--text-primary, #1e293b);
  margin-bottom: 8px;
  transition: color 0.3s ease;
}

.subtitle {
  color: var(--text-secondary, #64748b);
  font-size: 1.125rem;
  transition: color 0.3s ease;
}

.loading-section {
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
}

.timeline-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.day-section {
  background: var(--bg-secondary, white);
  border-radius: 12px;
  border: 1px solid var(--border-color, #e2e8f0);
  overflow: hidden;
  transition: all 0.3s ease;
}

.day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.day-info h3 {
  margin: 0;
  font-size: 1.25rem;
  text-transform: capitalize;
}

.day-count {
  font-size: 0.875rem;
  opacity: 0.9;
  margin-top: 4px;
  display: block;
}

.tournaments-list {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tournament-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--bg-primary, #f8fafc);
  border: 2px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tournament-item:hover {
  border-color: #3b82f6;
  transform: translateX(4px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.tournament-main {
  display: flex;
  gap: 16px;
  align-items: center;
  flex: 1;
}

.tournament-time-badge {
  background: #3b82f6;
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 1.125rem;
  min-width: 80px;
  text-align: center;
}

.tournament-details {
  flex: 1;
}

.tournament-casino {
  font-weight: 600;
  color: var(--text-primary, #1e293b);
  font-size: 1.125rem;
  margin-bottom: 4px;
  transition: color 0.3s ease;
}

.tournament-meta {
  display: flex;
  gap: 16px;
  color: #64748b;
}

.buyin {
  font-weight: 600;
  color: #059669;
  font-size: 1.125rem;
}

.levels-badge {
  background: #eef2ff;
  color: #6366f1;
  padding: 4px 12px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.875rem;
}

.help-text {
  color: #64748b;
  font-size: 0.875rem;
  margin-top: 4px;
}

.selection-dialog-content {
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.selected-tournament-info {
  background: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-row .label {
  font-weight: 600;
  color: #64748b;
}

.info-row .value {
  font-weight: 600;
  color: #1e293b;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  color: #333;
}

.input-full {
  width: 100%;
}

.casino-logo-container {
  position: relative;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary, white);
  border-radius: 8px;
  border: 2px solid var(--border-color, #e2e8f0);
  padding: 6px;
  flex-shrink: 0;
  overflow: hidden;
  transition: all 0.3s ease;
}

.tournament-item:hover .casino-logo-container {
  transform: scale(1.05);
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

.casino-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.casino-initials {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--gradient-start, #667eea), var(--gradient-end, #764ba2));
  color: white;
  font-weight: 700;
  font-size: 0.875rem;
  border-radius: 6px;
}

.tournament-structure {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}

.structure-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  color: #64748b;
  padding: 4px 10px;
  background: #f1f5f9;
  border-radius: 4px;
  font-weight: 500;
}

.structure-item i {
  font-size: 0.65rem;
  color: #94a3b8;
}

.structure-item.guarantee {
  color: #d97706;
  background: #fef3c7;
}

.structure-item.guarantee i {
  color: #f59e0b;
}

.structure-section {
  background: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.structure-section h4 {
  margin: 0 0 12px 0;
  color: #1e293b;
  font-size: 1rem;
  font-weight: 600;
}

.structure-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.structure-detail {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9375rem;
  color: #64748b;
  padding: 8px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.structure-detail i {
  font-size: 0.75rem;
  color: #94a3b8;
}

.structure-detail.guarantee {
  color: #d97706;
  border-color: #fbbf24;
  background: #fffbeb;
}

.structure-detail.guarantee i {
  color: #f59e0b;
}
</style>
