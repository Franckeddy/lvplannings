<template>
  <div class="user-selector">
    <div class="selector-wrapper">
      <label for="user-select">Utilisateur:</label>
      <Select
        id="user-select"
        v-model="localSelectedUser"
        :options="users"
        optionLabel="name"
        placeholder="Sélectionnez un utilisateur"
        class="user-select"
        @change="onUserChange"
      />
      <Button
        icon="pi pi-plus"
        label="Nouvel utilisateur"
        @click="showDialog = true"
        severity="success"
      />
    </div>

    <Dialog
      v-model:visible="showDialog"
      header="Créer un nouvel utilisateur"
      :modal="true"
      :style="{ width: '400px' }"
    >
      <div class="dialog-content">
        <label for="new-user-name">Nom de l'utilisateur:</label>
        <InputText
          id="new-user-name"
          v-model="newUserName"
          placeholder="Entrez le nom"
          class="input-full"
          @keyup.enter="createUser"
        />
      </div>

      <template #footer>
        <Button label="Annuler" @click="showDialog = false" severity="secondary" />
        <Button label="Créer" @click="createUser" :disabled="!newUserName" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';

const props = defineProps({
  users: Array,
  selectedUser: Object
});

const emit = defineEmits(['user-selected', 'user-created']);

const localSelectedUser = ref(props.selectedUser);
const showDialog = ref(false);
const newUserName = ref('');

const onUserChange = () => {
  emit('user-selected', localSelectedUser.value);
};

const createUser = () => {
  if (newUserName.value.trim()) {
    emit('user-created', newUserName.value.trim());
    newUserName.value = '';
    showDialog.value = false;
  }
};
</script>

<style scoped>
.user-selector {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.selector-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.selector-wrapper label {
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.user-select {
  width: 100%;
}

:deep(.p-select) {
  width: 100%;
  border-radius: 8px;
  transition: all 0.3s ease;
}

:deep(.p-select:hover) {
  border-color: var(--accent-color);
}

:deep(.p-button) {
  width: 100%;
  border-radius: 8px;
  justify-content: center;
  transition: all 0.3s ease;
}

.dialog-content {
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dialog-content label {
  font-weight: 600;
  color: var(--text-primary);
}

.input-full {
  width: 100%;
}

/* Responsive */
@media (max-width: 768px) {
  .selector-wrapper label {
    font-size: 0.8125rem;
  }

  :deep(.p-button) {
    padding: 0.75rem 1rem;
    font-size: 0.9375rem;
  }

  :deep(.p-select) {
    font-size: 0.9375rem;
  }
}

@media (max-width: 480px) {
  .selector-wrapper {
    gap: 0.625rem;
  }

  .selector-wrapper label {
    font-size: 0.75rem;
  }

  :deep(.p-button) {
    padding: 0.625rem 0.875rem;
    font-size: 0.875rem;
  }

  :deep(.p-select) {
    font-size: 0.875rem;
  }

  .dialog-content {
    padding: 16px 0;
  }

  .dialog-content label {
    font-size: 0.9375rem;
  }
}

/* Dialog responsive */
:deep(.p-dialog) {
  max-width: calc(100vw - 2rem);
  margin: 1rem;
}

@media (max-width: 480px) {
  :deep(.p-dialog) {
    width: calc(100vw - 1rem) !important;
    max-width: none;
    margin: 0.5rem;
  }

  :deep(.p-dialog-footer) {
    flex-direction: column;
    gap: 0.5rem;
  }

  :deep(.p-dialog-footer .p-button) {
    width: 100%;
    margin: 0;
  }
}
</style>
