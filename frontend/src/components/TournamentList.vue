<template>
  <div class="tournament-container">
    <Card class="summary-card">
      <template #title>
        <div class="card-header">
          <span>Programme de {{ user.name }}</span>
          <Button
            icon="pi pi-refresh"
            @click="$emit('refresh', user.id)"
            :loading="loading"
            text
            rounded
          />
        </div>
      </template>
      <template #content>
        <div v-if="summary" class="summary-grid">
          <div class="summary-item">
            <i class="pi pi-calendar summary-icon"></i>
            <div>
              <div class="summary-label">Période</div>
              <div class="summary-value">{{ summary.startDate }} au {{ summary.endDate }}</div>
            </div>
          </div>

          <div class="summary-item">
            <i class="pi pi-list summary-icon"></i>
            <div>
              <div class="summary-label">Nombre de tournois</div>
              <div class="summary-value">{{ summary.totalTournaments }}</div>
            </div>
          </div>

          <div class="summary-item">
            <i class="pi pi-dollar summary-icon"></i>
            <div>
              <div class="summary-label">Budget total</div>
              <div class="summary-value">{{ summary.totalBuyins }} $</div>
            </div>
          </div>

          <div class="summary-item">
            <i class="pi pi-building summary-icon"></i>
            <div>
              <div class="summary-label">Casinos</div>
              <div class="summary-value">{{ summary.casinos.join(', ') }}</div>
            </div>
          </div>
        </div>
      </template>
    </Card>

    <Card class="tournaments-card">
      <template #title>
        <div class="card-header">
          <span>Tournois programmés</span>
          <Button
            icon="pi pi-upload"
            label="Import rapide"
            @click="showImportDialog = true"
            severity="info"
            outlined
          />
        </div>
      </template>
      <template #content>
        <DataTable
          :value="tournaments"
          :loading="loading"
          stripedRows
          showGridlines
          responsiveLayout="scroll"
        >
          <Column field="date" header="Date" :sortable="true">
            <template #body="slotProps">
              <span class="date-badge">{{ slotProps.data.date }}</span>
            </template>
          </Column>

          <Column field="time" header="Heure" :sortable="true" />

          <Column field="casino" header="Casino" :sortable="true">
            <template #body="slotProps">
              <div class="casino-cell">
                <div class="casino-logo-container">
                  <img
                    v-if="getCasinoLogo(slotProps.data.casino)"
                    :src="getCasinoLogo(slotProps.data.casino)"
                    :alt="slotProps.data.casino"
                    class="casino-logo"
                    @error="handleImageError"
                  />
                  <div v-else class="casino-initials">
                    {{ getCasinoInitials(slotProps.data.casino) }}
                  </div>
                </div>
                <Tag :value="slotProps.data.casino" severity="info" class="casino-tag" />
              </div>
            </template>
          </Column>

          <Column field="buyin" header="Buy-In ($)" :sortable="true">
            <template #body="slotProps">
              <span v-if="slotProps.data.buyin" class="buyin-value">
                {{ formatBuyIn(slotProps.data.buyin) }}
              </span>
              <span v-else class="no-buyin">-</span>
            </template>
          </Column>

          <Column field="levels" header="Niveaux" />

          <Column header="Actions" :exportable="false" style="width: 100px;">
            <template #body="slotProps">
              <Button
                icon="pi pi-trash"
                @click="confirmDelete(slotProps.data)"
                severity="danger"
                text
                rounded
                aria-label="Supprimer"
              />
            </template>
          </Column>

          <template #empty>
            <div class="empty-state">
              <i class="pi pi-inbox" style="font-size: 3rem; color: #94a3b8;"></i>
              <p>Aucun tournoi programmé</p>
            </div>
          </template>
        </DataTable>
      </template>
    </Card>

    <TournamentImport
      v-model="showImportDialog"
      :user="user"
      @tournaments-imported="handleTournamentsImported"
    />

    <Dialog
      v-model:visible="showDeleteDialog"
      header="Confirmer la suppression"
      :modal="true"
      :style="{ width: '450px' }"
    >
      <div v-if="tournamentToDelete" class="delete-dialog-content">
        <div class="warning-icon">
          <i class="pi pi-exclamation-triangle"></i>
        </div>
        <p class="confirmation-text">
          Êtes-vous sûr de vouloir supprimer ce tournoi ?
        </p>
        <div class="tournament-info-delete">
          <div class="info-row">
            <span class="label">Date:</span>
            <span class="value">{{ tournamentToDelete.date }}</span>
          </div>
          <div class="info-row">
            <span class="label">Heure:</span>
            <span class="value">{{ tournamentToDelete.time }}</span>
          </div>
          <div class="info-row">
            <span class="label">Casino:</span>
            <span class="value">{{ tournamentToDelete.casino }}</span>
          </div>
          <div v-if="tournamentToDelete.buyin" class="info-row">
            <span class="label">Buy-in:</span>
            <span class="value">{{ formatBuyIn(tournamentToDelete.buyin) }}</span>
          </div>
        </div>
        <p class="warning-text">Cette action est irréversible.</p>
      </div>

      <template #footer>
        <Button
          label="Annuler"
          @click="showDeleteDialog = false"
          severity="secondary"
          outlined
        />
        <Button
          label="Supprimer"
          @click="deleteTournament"
          severity="danger"
          icon="pi pi-trash"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import TournamentImport from './TournamentImport.vue';
import { useCasinoLogos } from '../composables/useCasinoLogos';

// Configuration API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

defineProps({
  user: Object,
  tournaments: Array,
  summary: Object,
  loading: Boolean
});

const emit = defineEmits(['refresh', 'import-tournaments', 'delete-tournament']);

const showImportDialog = ref(false);
const showDeleteDialog = ref(false);
const tournamentToDelete = ref(null);

const { getCasinoLogo, getCasinoInitials } = useCasinoLogos();

const formatBuyIn = (amount) => {
  if (!amount) return '$0';
  return '$' + amount.toLocaleString('en-US');
};

const handleImageError = (event) => {
  event.target.style.display = 'none';
  const initialsDiv = event.target.nextElementSibling;
  if (initialsDiv) {
    initialsDiv.style.display = 'flex';
  }
};

const handleTournamentsImported = (tournaments) => {
  emit('import-tournaments', tournaments);
};

const confirmDelete = (tournament) => {
  tournamentToDelete.value = tournament;
  showDeleteDialog.value = true;
};

const deleteTournament = async () => {
  if (!tournamentToDelete.value) return;

  try {
    const response = await fetch(
      `${API_URL}/tournaments/${tournamentToDelete.value.id}`,
      { method: 'DELETE' }
    );

    if (response.ok) {
      emit('delete-tournament', tournamentToDelete.value.id);
      showDeleteDialog.value = false;
      tournamentToDelete.value = null;
    } else {
      console.error('Erreur lors de la suppression');
    }
  } catch (error) {
    console.error('Erreur:', error);
  }
};
</script>

<style scoped>
.tournament-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.summary-card,
.tournaments-card {
  background: var(--bg-secondary, white);
  box-shadow: var(--card-shadow, 0 2px 8px rgba(0, 0, 0, 0.1));
  transition: all 0.3s ease;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 10px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: var(--bg-primary, #f8fafc);
  border-radius: 8px;
  border-left: 4px solid #3b82f6;
  transition: background 0.3s ease;
}

.summary-icon {
  font-size: 2rem;
  color: #3b82f6;
}

.summary-label {
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 5px;
}

.summary-value {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
  transition: color 0.3s ease;
}

.date-badge {
  display: inline-block;
  padding: 4px 12px;
  background: #e0f2fe;
  color: #0c4a6e;
  border-radius: 4px;
  font-weight: 600;
}

.buyin-value {
  font-weight: 600;
  color: #059669;
}

.no-buyin {
  color: #94a3b8;
}

.empty-state {
  text-align: center;
  padding: 40px;
}

.empty-state p {
  margin-top: 15px;
  color: #64748b;
  font-size: 1.1rem;
}

@media (max-width: 768px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}

.delete-dialog-content {
  padding: 20px 0;
  text-align: center;
}

.warning-icon {
  font-size: 3rem;
  color: #ef4444;
  margin-bottom: 20px;
}

.warning-icon i {
  font-size: 3rem;
}

.confirmation-text {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 20px;
}

.tournament-info-delete {
  background: #fef2f2;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #fecaca;
  margin-bottom: 16px;
  text-align: left;
}

.tournament-info-delete .info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.tournament-info-delete .info-row:not(:last-child) {
  border-bottom: 1px solid #fecaca;
}

.tournament-info-delete .label {
  font-weight: 600;
  color: #991b1b;
}

.tournament-info-delete .value {
  font-weight: 500;
  color: #dc2626;
}

.warning-text {
  color: #dc2626;
  font-size: 0.875rem;
  font-style: italic;
}

.casino-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.casino-logo-container {
  position: relative;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary, #f8fafc);
  border-radius: 8px;
  border: 1px solid var(--border-color, #e2e8f0);
  padding: 6px;
  flex-shrink: 0;
  overflow: hidden;
  transition: all 0.3s ease;
}

.casino-logo-container:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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

.casino-tag {
  flex: 1;
  min-width: 0;
}

@media (max-width: 768px) {
  .casino-logo-container {
    width: 40px;
    height: 40px;
  }
}
</style>
