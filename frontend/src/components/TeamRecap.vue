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
          <span class="date-total">${{ dayData.totalBuyin.toLocaleString() }}</span>
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
            <span class="detail-total"><i class="pi pi-wallet"></i> ${{ teamByDay[selectedDate].totalBuyin.toLocaleString() }}</span>
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
              </div>
            </div>

            <!-- Notes du casino -->
            <div
              v-if="getCasinoNotes(casinoData).length > 0"
              class="casino-notes-indicator"
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
              <div class="time-left">
                <div class="time-badge">
                  <i class="pi pi-clock"></i>
                  {{ time }}
                </div>
                <div class="time-info">
                  <span v-if="timeData.buyin" class="time-buyin">{{ formatBuyIn(timeData.buyin) }}</span>
                  <span v-if="timeData.levels && timeData.levels !== '-'" class="time-levels">{{ timeData.levels }}</span>
                </div>
              </div>
              <div class="time-right">
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
                      class="user-note-icon"
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import ProgressSpinner from 'primevue/progressspinner';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import { useCasinoLogos } from '../composables/useCasinoLogos';

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
        levels: tournament.levels
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
    sorted[date] = grouped[date];
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

onMounted(() => {
  loadAllData();
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
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.casino-card {
  background: var(--bg-secondary, #1e293b);
  border: 1px solid var(--border-color, #334155);
  border-radius: 16px;
  overflow: hidden;
}

.casino-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: rgba(99, 102, 241, 0.05);
  border-bottom: 1px solid var(--border-color, #334155);
}

.casino-info {
  display: flex;
  align-items: center;
  gap: 14px;
}

.casino-logo-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: 1px solid var(--border-color, #334155);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary, #0f172a);
  padding: 6px;
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
  font-weight: 600;
  font-size: 0.75rem;
  border-radius: 6px;
}

.casino-details { display: flex; flex-direction: column; gap: 2px; }
.casino-name { color: var(--text-primary, #f1f5f9); font-weight: 600; font-size: 1.0625rem; }
.casino-count { color: var(--text-secondary, #94a3b8); font-size: 0.8125rem; }

/* Notes indicator in casino header */
.casino-notes-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(99, 102, 241, 0.15);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: auto;
}

.casino-notes-indicator i {
  font-size: 0.875rem;
  color: #6366f1;
}

.casino-notes-indicator .notes-count {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6366f1;
}

.casino-notes-indicator:hover {
  background: rgba(99, 102, 241, 0.25);
  transform: scale(1.05);
}

/* Time Slots */
.time-slots { padding: 8px 0; }

.time-slot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  transition: background 0.15s ease;
}

.time-slot:hover { background: rgba(99, 102, 241, 0.03); }
.time-slot:not(:last-child) { border-bottom: 1px solid var(--border-color, #334155); }

.time-left {
  display: flex;
  align-items: center;
  gap: 16px;
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

.time-badge i { font-size: 0.75rem; opacity: 0.7; }

.time-info { display: flex; align-items: center; gap: 12px; }
.time-buyin { color: #22c55e; font-weight: 600; font-size: 0.9375rem; }
.time-levels { color: var(--text-secondary, #94a3b8); font-size: 0.8125rem; padding: 2px 8px; background: var(--bg-primary, #0f172a); border-radius: 4px; }

.time-right {
  display: flex;
  align-items: center;
  gap: 16px;
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
}

.user-chip:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
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

.user-chip.small { padding: 4px 10px; font-size: 0.75rem; }

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
}

@media (max-width: 768px) {
  .team-container { padding: 16px; }
  .dates-grid { grid-template-columns: 1fr; gap: 16px; }
  .team-header { flex-direction: column; align-items: flex-start; gap: 16px; }
  .detail-header { flex-direction: column; align-items: flex-start; gap: 16px; padding: 18px; }
  .detail-stats { flex-wrap: wrap; gap: 12px; }
  .time-slot { flex-direction: column; align-items: flex-start; gap: 12px; padding: 14px 16px; }
  .time-right { width: 100%; justify-content: space-between; }
  .time-left { width: 100%; flex-wrap: wrap; }

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
    min-width: 70px;
    font-size: 0.875rem;
  }

  .time-buyin {
    font-size: 0.875rem;
  }

  .time-levels {
    font-size: 0.75rem;
  }

  .time-right {
    gap: 10px;
    align-items: flex-start;
    width: 100%;
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
