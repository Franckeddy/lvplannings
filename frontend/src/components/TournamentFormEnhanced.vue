<template>
  <Dialog
    v-model:visible="visible"
    :header="'Ajouter un tournoi pour ' + user.name"
    :modal="true"
    :style="{ width: '700px' }"
    @hide="resetForm"
  >
    <div class="form-content">
      <!-- Sélection de la date -->
      <div class="form-group">
        <label for="date">Date *</label>
        <Select
          id="date"
          v-model="formData.date"
          :options="availableDates"
          placeholder="Sélectionnez une date"
          class="input-full"
          @change="onDateChange"
        />
      </div>

      <!-- Autocomplétion des tournois -->
      <div v-if="formData.date && tournaments.length > 0" class="suggestions-section">
        <label>Sélectionner un tournoi existant (optionnel)</label>
        <div class="tournaments-grid">
          <div
            v-for="tournament in tournaments"
            :key="tournament.id"
            class="tournament-card"
            :class="{ selected: selectedTournament?.id === tournament.id }"
            @click="selectTournament(tournament)"
          >
            <div class="tournament-time">{{ tournament.displayTime }}</div>
            <div class="tournament-casino">{{ tournament.casino }}</div>
            <div class="tournament-buyin">${{ tournament.buyIn }}</div>
            <div class="tournament-levels">{{ tournament.levels }}</div>
          </div>
        </div>
        <Button
          v-if="selectedTournament"
          label="Effacer la sélection"
          @click="clearSelection"
          severity="secondary"
          text
          size="small"
          class="clear-btn"
        />
      </div>

      <!-- Séparateur -->
      <div v-if="formData.date && tournaments.length > 0" class="separator">
        <span>ou saisir manuellement</span>
      </div>

      <!-- Formulaire manuel -->
      <div class="form-group">
        <label for="time">Heure *</label>
        <DatePicker
          id="time"
          v-model="formData.timeValue"
          timeOnly
          hourFormat="24"
          placeholder="Sélectionnez l'heure"
          class="input-full"
        />
      </div>

      <div class="form-group">
        <label for="casino">Casino *</label>
        <AutoComplete
          id="casino"
          v-model="formData.casino"
          :suggestions="filteredCasinos"
          @complete="searchCasino"
          placeholder="Saisissez le nom du casino"
          class="input-full"
          dropdown
        />
      </div>

      <div class="form-group">
        <label for="buyin">Buy-In ($)</label>
        <InputText
          id="buyin"
          v-model="formData.buyin"
          type="number"
          placeholder="Montant du buy-in"
          class="input-full"
          min="0"
        />
        <small class="help-text">Laisser vide pour les DAY 2</small>
      </div>

      <div class="form-group">
        <label for="levels">Niveaux *</label>
        <InputText
          id="levels"
          v-model="formData.levels"
          placeholder="Ex: 30 mn, DAY 2 MS, 30/40 mn"
          class="input-full"
        />
      </div>
    </div>

    <template #footer>
      <Button label="Annuler" @click="visible = false" severity="secondary" />
      <Button
        label="Ajouter"
        @click="submitForm"
        :disabled="!isFormValid"
        icon="pi pi-plus"
      />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';
import AutoComplete from 'primevue/autocomplete';

const props = defineProps({
  modelValue: Boolean,
  user: Object
});

const emit = defineEmits(['update:modelValue', 'tournament-added']);

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

// Dates disponibles (format pour la base: 2026-06-XX)
const availableDates = [
  { label: '03-juin', value: '2026-06-03' },
  { label: '04-juin', value: '2026-06-04' },
  { label: '05-juin', value: '2026-06-05' },
  { label: '06-juin', value: '2026-06-06' },
  { label: '07-juin', value: '2026-06-07' },
  { label: '08-juin', value: '2026-06-08' },
  { label: '09-juin', value: '2026-06-09' },
  { label: '10-juin', value: '2026-06-10' },
  { label: '11-juin', value: '2026-06-11' },
  { label: '12-juin', value: '2026-06-12' }
];

// Liste des casinos pour l'autocomplétion
const allCasinos = ref([
  'World Series of Poker',
  'WSOP Daily',
  'The Orleans',
  'Aria Casino',
  'Bellagio Casino',
  'Wynn Las Vegas',
  'Venetian Las Vegas',
  'Caesars Palace',
  'Horseshoe Las Vegas',
  'MGM Grand',
  'Mandalay Bay',
  'South Point Casino',
  'Red Rock Casino',
  'Westgate Las Vegas Resort & Casino'
]);

const filteredCasinos = ref([]);
const tournaments = ref([]);
const selectedTournament = ref(null);
const loading = ref(false);

const formData = ref({
  date: null,
  timeValue: null,
  casino: null,
  buyin: null,
  levels: ''
});

const isFormValid = computed(() => {
  return formData.value.date &&
         formData.value.timeValue &&
         formData.value.casino &&
         formData.value.levels;
});

// Charger les tournois pour la date sélectionnée
const onDateChange = async () => {
  if (!formData.value.date) return;

  loading.value = true;
  tournaments.value = [];
  selectedTournament.value = null;

  try {
    const dateValue = formData.value.date.value || formData.value.date;
    const response = await fetch(
      `http://localhost:3000/api/scraped-tournaments/suggestions?date=${dateValue}`
    );

    if (response.ok) {
      tournaments.value = await response.json();
    }
  } catch (error) {
    console.error('Erreur lors du chargement des tournois:', error);
  } finally {
    loading.value = false;
  }
};

// Sélectionner un tournoi depuis la liste
const selectTournament = (tournament) => {
  selectedTournament.value = tournament;

  // Pré-remplir le formulaire
  const [hours, minutes] = tournament.time.split(':');
  const timeObj = new Date();
  timeObj.setHours(parseInt(hours), parseInt(minutes), 0);

  formData.value.timeValue = timeObj;
  formData.value.casino = tournament.casino;
  formData.value.buyin = tournament.buyIn.toString();
  formData.value.levels = tournament.levels; // Pré-rempli depuis la base de données
};

// Effacer la sélection
const clearSelection = () => {
  selectedTournament.value = null;
  formData.value.timeValue = null;
  formData.value.casino = null;
  formData.value.buyin = null;
  formData.value.levels = '';
};

// Autocomplétion des casinos
const searchCasino = (event) => {
  const query = event.query.toLowerCase();
  filteredCasinos.value = allCasinos.value.filter((casino) =>
    casino.toLowerCase().includes(query)
  );
};

const resetForm = () => {
  formData.value = {
    date: null,
    timeValue: null,
    casino: null,
    buyin: null,
    levels: ''
  };
  tournaments.value = [];
  selectedTournament.value = null;
};

const formatTime = (dateObj) => {
  if (!dateObj) return '';
  const hours = dateObj.getHours().toString().padStart(2, '0');
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

const submitForm = () => {
  if (isFormValid.value) {
    const buyinValue = formData.value.buyin ? parseInt(formData.value.buyin) : null;
    const timeString = formatTime(formData.value.timeValue);
    const dateLabel = availableDates.find(d => d.value === formData.value.date.value)?.label || formData.value.date.label;

    emit('tournament-added', {
      date: dateLabel,
      time: timeString,
      casino: formData.value.casino,
      buyin: buyinValue,
      levels: formData.value.levels
    });
    visible.value = false;
  }
};
</script>

<style scoped>
.form-content {
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
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

.help-text {
  color: #64748b;
  font-size: 0.875rem;
  margin-top: -4px;
}

.suggestions-section {
  background: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.suggestions-section label {
  display: block;
  font-weight: 600;
  color: #334155;
  margin-bottom: 12px;
}

.tournaments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.tournament-card {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.tournament-card:hover {
  border-color: #3b82f6;
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.tournament-card.selected {
  border-color: #10b981;
  background: #ecfdf5;
}

.tournament-time {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
}

.tournament-casino {
  font-size: 0.875rem;
  color: #475569;
  margin-bottom: 8px;
  font-weight: 500;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tournament-buyin {
  font-size: 1rem;
  font-weight: 600;
  color: #059669;
}

.tournament-levels {
  font-size: 0.875rem;
  color: #6366f1;
  font-weight: 500;
  margin-top: 4px;
  padding: 2px 8px;
  background: #eef2ff;
  border-radius: 4px;
  display: inline-block;
}

.clear-btn {
  margin-top: 12px;
}

.separator {
  text-align: center;
  position: relative;
  margin: 16px 0;
}

.separator::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: #e2e8f0;
}

.separator span {
  position: relative;
  background: white;
  padding: 0 16px;
  color: #64748b;
  font-size: 0.875rem;
  font-weight: 500;
}
</style>
