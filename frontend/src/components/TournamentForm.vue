<template>
  <Dialog
    v-model:visible="visible"
    :header="'Ajouter un tournoi pour ' + user.name"
    :modal="true"
    :style="{ width: '600px' }"
    @hide="resetForm"
  >
    <div class="form-content">
      <div class="form-group">
        <label for="date">Date *</label>
        <Select
          id="date"
          v-model="formData.date"
          :options="availableDates"
          placeholder="Sélectionnez une date"
          class="input-full"
        />
      </div>

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
        <Select
          id="casino"
          v-model="formData.casino"
          :options="casinos"
          :editable="true"
          placeholder="Sélectionnez ou saisissez un casino"
          class="input-full"
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
import { ref, computed } from 'vue';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';

const props = defineProps({
  modelValue: Boolean,
  user: Object
});

const emit = defineEmits(['update:modelValue', 'tournament-added']);

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const availableDates = [
  '03-juin',
  '04-juin',
  '05-juin',
  '06-juin',
  '07-juin',
  '08-juin',
  '09-juin',
  '10-juin',
  '11-juin',
  '12-juin'
];

const casinos = [
  'WSOP',
  'WSOP Daily',
  'The Orleans',
  'Aria',
  'Bellagio',
  'Wynn',
  'Venetian',
  'Caesars Palace'
];

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

const resetForm = () => {
  formData.value = {
    date: null,
    timeValue: null,
    casino: null,
    buyin: null,
    levels: ''
  };
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

    emit('tournament-added', {
      date: formData.value.date,
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
</style>
