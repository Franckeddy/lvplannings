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
      <Button
        icon="pi pi-refresh"
        @click="loadAllData"
        :loading="loading"
        rounded
        text
        class="refresh-btn"
      />
    </div>

    <!-- Stats globales -->
    <div v-if="!loading && teamStats" class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon members">
          <i class="pi pi-users"></i>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ teamStats.totalMembers }}</span>
          <span class="stat-label">Membres</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon tournaments">
          <i class="pi pi-trophy"></i>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ teamStats.totalTournaments }}</span>
          <span class="stat-label">Tournois</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon budget">
          <i class="pi pi-wallet"></i>
        </div>
        <div class="stat-content">
          <span class="stat-value">${{ teamStats.totalBudget.toLocaleString() }}</span>
          <span class="stat-label">Budget total</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon days">
          <i class="pi pi-calendar"></i>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ Object.keys(teamByDay).length }}</span>
          <span class="stat-label">Jours</span>
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

    <!-- Team Planning by Day -->
    <div v-else class="days-list">
      <div
        v-for="(dayData, date) in teamByDay"
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
                {{ dayData.members.size }} membre{{ dayData.members.size > 1 ? 's' : '' }}
                <span class="separator">•</span>
                {{ dayData.totalTournaments }} tournoi{{ dayData.totalTournaments > 1 ? 's' : '' }}
              </span>
            </div>
          </div>
          <div class="day-total">
            ${{ dayData.totalBuyin.toLocaleString() }}
          </div>
        </div>

        <!-- Casinos du jour -->
        <div class="day-casinos">
          <div
            v-for="(casinoData, casino) in dayData.casinos"
            :key="casino"
            class="casino-section"
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
                <span class="casino-name">{{ casino }}</span>
              </div>
              <span class="casino-count">{{ casinoData.users.length }} personne{{ casinoData.users.length > 1 ? 's' : '' }}</span>
            </div>

            <!-- Horaires du casino -->
            <div class="time-slots">
              <div
                v-for="(timeData, time) in casinoData.times"
                :key="time"
                class="time-slot"
              >
                <div class="time-badge">
                  <i class="pi pi-clock"></i>
                  {{ time }}
                </div>
                <div class="time-info">
                  <span v-if="timeData.buyin" class="time-buyin">{{ formatBuyIn(timeData.buyin) }}</span>
                  <span v-if="timeData.levels && timeData.levels !== '-'" class="time-levels">{{ timeData.levels }}</span>
                </div>
                <div class="time-users">
                  <div
                    v-for="user in timeData.users"
                    :key="user.id"
                    class="user-chip"
                    :style="{ backgroundColor: getUserColor(user.name) }"
                  >
                    {{ user.name }}
                  </div>
                </div>
                <Button
                  label="Rejoindre"
                  icon="pi pi-user-plus"
                  @click="openJoinDialog(date, casino, time, timeData)"
                  text
                  size="small"
                  class="join-btn"
                />
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
        <!-- Résumé du tournoi -->
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

        <!-- Participants actuels -->
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

        <!-- Sélection utilisateur -->
        <div class="form-group">
          <label>Qui souhaite rejoindre ?</label>
          <Select
            v-model="selectedUserToJoin"
            :options="availableUsersToJoin"
            optionLabel="name"
            placeholder="Sélectionnez un membre..."
            class="input-full"
          />
          <small v-if="availableUsersToJoin.length === 0" class="no-users-msg">
            Tous les membres sont déjà inscrits à ce tournoi
          </small>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import ProgressSpinner from 'primevue/progressspinner';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import { useCasinoLogos } from '../composables/useCasinoLogos';

// Configuration API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// État
const loading = ref(false);
const users = ref([]);
const allTournaments = ref([]);
const showJoinDialog = ref(false);
const tournamentToJoin = ref(null);
const selectedUserToJoin = ref(null);
const joining = ref(false);

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

// Utilisateurs disponibles pour rejoindre (pas déjà inscrits)
const availableUsersToJoin = computed(() => {
  if (!tournamentToJoin.value) return [];
  const enrolledIds = tournamentToJoin.value.users.map(u => u.id);
  return users.value.filter(u => !enrolledIds.includes(u.id));
});

// Stats globales
const teamStats = computed(() => {
  if (users.value.length === 0) return null;

  return {
    totalMembers: users.value.length,
    totalTournaments: allTournaments.value.length,
    totalBudget: allTournaments.value.reduce((sum, t) => sum + (t.buyin || 0), 0)
  };
});

// Grouper par jour, casino et horaire
const teamByDay = computed(() => {
  const grouped = {};

  allTournaments.value.forEach(tournament => {
    const date = tournament.date;
    const casino = tournament.casino;
    const time = tournament.time;

    // Initialiser le jour
    if (!grouped[date]) {
      grouped[date] = {
        casinos: {},
        members: new Set(),
        totalTournaments: 0,
        totalBuyin: 0
      };
    }

    // Initialiser le casino
    if (!grouped[date].casinos[casino]) {
      grouped[date].casinos[casino] = {
        times: {},
        users: []
      };
    }

    // Initialiser l'horaire
    if (!grouped[date].casinos[casino].times[time]) {
      grouped[date].casinos[casino].times[time] = {
        users: [],
        buyin: tournament.buyin,
        levels: tournament.levels
      };
    }

    // Ajouter l'utilisateur
    const user = users.value.find(u => u.id === tournament.user_id);
    if (user) {
      grouped[date].casinos[casino].times[time].users.push(user);

      // Ajouter à la liste des users du casino si pas déjà présent
      if (!grouped[date].casinos[casino].users.find(u => u.id === user.id)) {
        grouped[date].casinos[casino].users.push(user);
      }

      grouped[date].members.add(user.id);
    }

    grouped[date].totalTournaments++;
    grouped[date].totalBuyin += tournament.buyin || 0;
  });

  // Trier par date
  const sortedDates = Object.keys(grouped).sort();
  const sorted = {};
  sortedDates.forEach(date => {
    sorted[date] = grouped[date];
  });

  return sorted;
});

// Ouvrir le dialog pour rejoindre
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

// Rejoindre le tournoi
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
      // Recharger les données
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

// Charger toutes les données
const loadAllData = async () => {
  loading.value = true;

  try {
    // Charger les utilisateurs
    const usersResponse = await fetch(`${API_URL}/users`);
    if (usersResponse.ok) {
      users.value = await usersResponse.json();
    }

    // Charger tous les tournois de tous les utilisateurs
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

// Formatage
const formatBuyIn = (amount) => {
  if (!amount) return '$0';
  return '$' + amount.toLocaleString('en-US');
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

// Lifecycle
onMounted(() => {
  loadAllData();
});
</script>

<style scoped>
.team-container {
  max-width: 1000px;
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

.refresh-btn {
  color: var(--text-secondary, #94a3b8) !important;
}

.refresh-btn:hover {
  color: var(--text-primary, #f1f5f9) !important;
  background: var(--sidebar-hover, #334155) !important;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;
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

.stat-icon.members {
  background: rgba(236, 72, 153, 0.15);
  color: #ec4899;
}

.stat-icon.tournaments {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.stat-icon.budget {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.stat-icon.days {
  background: rgba(99, 102, 241, 0.15);
  color: #6366f1;
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

/* Loading & Empty States */
.loading-state,
.empty-state {
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
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Day Card */
.day-card {
  background: var(--bg-secondary, #1e293b);
  border: 1px solid var(--border-color, #334155);
  border-radius: 16px;
  overflow: hidden;
}

.day-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(249, 115, 22, 0.1));
  border-bottom: 1px solid var(--border-color, #334155);
}

.day-date-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.day-badge {
  min-width: 56px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #ec4899, #f97316);
  border-radius: 10px;
  text-align: center;
}

.day-number {
  display: block;
  color: white;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1;
}

.day-month {
  display: block;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  margin-top: 2px;
}

.day-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.day-name {
  color: var(--text-primary, #f1f5f9);
  font-size: 1.125rem;
  font-weight: 600;
  text-transform: capitalize;
}

.day-stats {
  color: var(--text-secondary, #94a3b8);
  font-size: 0.875rem;
}

.day-stats .separator {
  margin: 0 6px;
  opacity: 0.5;
}

.day-total {
  color: #22c55e;
  font-size: 1.25rem;
  font-weight: 700;
}

/* Day Casinos */
.day-casinos {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.casino-section {
  background: var(--bg-primary, #0f172a);
  border: 1px solid var(--border-color, #334155);
  border-radius: 12px;
  overflow: hidden;
}

.casino-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(99, 102, 241, 0.05);
  border-bottom: 1px solid var(--border-color, #334155);
}

.casino-info {
  display: flex;
  align-items: center;
  gap: 12px;
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
  background: var(--bg-secondary, #1e293b);
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
  font-weight: 600;
  font-size: 0.625rem;
  border-radius: 4px;
}

.casino-name {
  color: var(--text-primary, #f1f5f9);
  font-weight: 600;
  font-size: 1rem;
}

.casino-count {
  color: var(--text-secondary, #94a3b8);
  font-size: 0.875rem;
  background: var(--bg-secondary, #1e293b);
  padding: 4px 10px;
  border-radius: 12px;
}

/* Time Slots */
.time-slots {
  padding: 8px 0;
}

.time-slot {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  transition: background 0.15s ease;
}

.time-slot:hover {
  background: rgba(99, 102, 241, 0.03);
}

.time-slot:not(:last-child) {
  border-bottom: 1px solid var(--border-color, #334155);
}

.time-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 80px;
  color: var(--accent-color, #818cf8);
  font-weight: 600;
  font-size: 0.9375rem;
}

.time-badge i {
  font-size: 0.75rem;
  opacity: 0.7;
}

.time-info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 140px;
}

.time-buyin {
  color: #22c55e;
  font-weight: 600;
  font-size: 0.9375rem;
}

.time-levels {
  color: var(--text-secondary, #94a3b8);
  font-size: 0.8125rem;
  padding: 2px 8px;
  background: var(--bg-secondary, #1e293b);
  border-radius: 4px;
}

.time-users {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.user-chip {
  padding: 6px 14px;
  border-radius: 20px;
  color: white;
  font-size: 0.8125rem;
  font-weight: 600;
  white-space: nowrap;
}

.user-chip.small {
  padding: 4px 10px;
  font-size: 0.75rem;
}

/* Join Button */
.join-btn {
  color: var(--text-secondary, #94a3b8) !important;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.join-btn:hover {
  color: #10b981 !important;
  background: rgba(16, 185, 129, 0.1) !important;
}

/* Join Dialog */
.join-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 8px 0;
}

.join-tournament-summary {
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(249, 115, 22, 0.1));
  border: 1px solid rgba(236, 72, 153, 0.2);
  border-radius: 12px;
  padding: 16px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
}

.summary-row:not(:last-child) {
  border-bottom: 1px solid rgba(236, 72, 153, 0.1);
}

.summary-label {
  color: var(--text-secondary, #64748b);
  font-size: 0.875rem;
}

.summary-value {
  color: var(--text-primary, #1e293b);
  font-weight: 600;
  text-transform: capitalize;
}

.summary-value.highlight {
  color: #6366f1;
  font-size: 1.125rem;
}

.summary-value.buyin {
  color: #22c55e;
  font-size: 1.125rem;
}

.current-participants {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.participants-label {
  color: var(--text-secondary, #64748b);
  font-size: 0.875rem;
}

.participants-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  color: var(--text-primary, #1e293b);
  font-weight: 600;
  font-size: 0.9375rem;
}

.input-full {
  width: 100%;
}

.no-users-msg {
  color: #f59e0b;
  font-style: italic;
}

/* Responsive */
@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .team-container {
    padding: 16px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .team-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .day-card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .day-total {
    align-self: flex-end;
  }

  .time-slot {
    flex-wrap: wrap;
    gap: 12px;
  }

  .time-info {
    min-width: auto;
  }

  .time-users {
    flex: 1 1 100%;
    justify-content: flex-start;
  }

  .join-btn {
    opacity: 1;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .header-icon {
    width: 48px;
    height: 48px;
    font-size: 1.25rem;
  }

  .header-text h1 {
    font-size: 1.25rem;
  }
}
</style>
