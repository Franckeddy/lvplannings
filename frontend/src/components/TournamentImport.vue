<template>
  <Dialog
    v-model:visible="visible"
    :header="'Import rapide - ' + user.name"
    :modal="true"
    :style="{ width: '800px' }"
    @hide="resetForm"
  >
    <div class="import-content">
      <div class="instructions">
        <h3>📋 Comment importer vos tournois ?</h3>
        <ol>
          <li>Allez sur <a href="https://www.pokeratlas.com/poker-tournaments/las-vegas" target="_blank">PokerAtlas Las Vegas</a></li>
          <li>Copiez les informations des tournois qui vous intéressent</li>
          <li>Collez-les dans la zone ci-dessous</li>
          <li>Ou uploadez un fichier CSV/Excel</li>
        </ol>

        <div class="format-example">
          <strong>Format attendu (séparé par des tabulations ou virgules):</strong>
          <code>Date | Heure | Casino | Buy-in | Niveaux</code>
          <br>
          <small>Exemple: 04-juin | 11:00 | The Orleans | 400 | 30/40 mn</small>
        </div>
      </div>

      <Tabs value="0">
        <TabList>
          <Tab value="0">Copier-Coller</Tab>
          <Tab value="1">Upload Fichier</Tab>
        </TabList>

        <TabPanels>
          <TabPanel value="0">
            <div class="paste-section">
              <label for="paste-area">Collez vos données ici:</label>
              <Textarea
                id="paste-area"
                v-model="pasteData"
                rows="10"
                placeholder="Collez vos données ici...&#10;&#10;Exemple:&#10;04-juin&#9;11:00&#9;The Orleans&#9;400&#9;30/40 mn&#10;04-juin&#9;13:00&#9;WSOP Daily&#9;250&#9;30 mn"
                class="paste-area"
              />
              <div class="actions">
                <Button
                  label="Analyser les données"
                  @click="parsePastedData"
                  :disabled="!pasteData"
                  icon="pi pi-search"
                />
              </div>
            </div>
          </TabPanel>

          <TabPanel value="1">
            <div class="upload-section">
              <FileUpload
                mode="basic"
                accept=".csv,.xlsx,.txt,.pdf"
                :maxFileSize="5000000"
                @select="handleFileUpload"
                chooseLabel="Choisir un fichier"
                class="file-upload"
              />
              <small>Formats acceptés: CSV, Excel (.xlsx), TXT, PDF</small>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <div v-if="parsedTournaments.length > 0" class="preview-section">
        <h3>🎯 Tournois détectés ({{ parsedTournaments.length }})</h3>

        <DataTable
          :value="parsedTournaments"
          size="small"
          stripedRows
          showGridlines
        >
          <Column field="date" header="Date" />
          <Column field="time" header="Heure" />
          <Column field="casino" header="Casino" />
          <Column field="buyin" header="Buy-in ($)" />
          <Column field="levels" header="Niveaux" />
          <Column header="Actions">
            <template #body="slotProps">
              <Button
                icon="pi pi-times"
                severity="danger"
                text
                rounded
                @click="removeTournament(slotProps.index)"
              />
            </template>
          </Column>
        </DataTable>
      </div>
    </div>

    <template #footer>
      <Button label="Annuler" @click="visible = false" severity="secondary" />
      <Button
        label="Importer les tournois"
        @click="importTournaments"
        :disabled="parsedTournaments.length === 0"
        icon="pi pi-upload"
        :loading="importing"
      />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Textarea from 'primevue/textarea';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import FileUpload from 'primevue/fileupload';
import * as pdfjsLib from 'pdfjs-dist';

const props = defineProps({
  modelValue: Boolean,
  user: Object
});

const emit = defineEmits(['update:modelValue', 'tournaments-imported']);

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const pasteData = ref('');
const parsedTournaments = ref([]);
const importing = ref(false);

const validDates = [
  '03-juin', '04-juin', '05-juin', '06-juin', '07-juin',
  '08-juin', '09-juin', '10-juin', '11-juin', '12-juin'
];

// Configuration de PDF.js pour utiliser le worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const parsePastedData = () => {
  try {
    const lines = pasteData.value.split('\n').filter(line => line.trim());
    const tournaments = [];

    for (const line of lines) {
      // Essayer différents séparateurs: tabulation, virgule, point-virgule
      const parts = line.split(/[\t,;]/).map(p => p.trim()).filter(p => p);

      if (parts.length >= 4) {
        const tournament = {
          date: parts[0],
          time: parts[1],
          casino: parts[2],
          buyin: parts[3] === '-' || parts[3].toLowerCase() === 'n/a' ? null : parseInt(parts[3]),
          levels: parts[4] || 'N/A'
        };

        // Valider la date
        if (validDates.includes(tournament.date)) {
          tournaments.push(tournament);
        }
      }
    }

    parsedTournaments.value = tournaments;

    if (tournaments.length === 0) {
      alert('Aucun tournoi valide détecté. Vérifiez le format des données.');
    }
  } catch (error) {
    console.error('Erreur de parsing:', error);
    alert('Erreur lors de l\'analyse des données. Vérifiez le format.');
  }
};

const handleFileUpload = async (event) => {
  const file = event.files[0];

  if (!file) return;

  // Si c'est un PDF, utiliser le parser PDF
  if (file.name.toLowerCase().endsWith('.pdf')) {
    await parsePdfFile(file);
  } else {
    // Pour CSV, TXT, Excel - lecture en texte
    const reader = new FileReader();

    reader.onload = (e) => {
      pasteData.value = e.target.result;
      parsePastedData();
    };

    reader.readAsText(file);
  }
};

const parsePdfFile = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';

    // Extraire le texte de toutes les pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }

    // Mettre le texte extrait dans pasteData pour parsing
    pasteData.value = fullText;
    parsePastedData();

  } catch (error) {
    console.error('Erreur lors de la lecture du PDF:', error);
    alert('Erreur lors de la lecture du fichier PDF. Assurez-vous que le fichier est valide.');
  }
};

const removeTournament = (index) => {
  parsedTournaments.value.splice(index, 1);
};

const importTournaments = () => {
  importing.value = true;
  emit('tournaments-imported', parsedTournaments.value);
  setTimeout(() => {
    importing.value = false;
    visible.value = false;
  }, 500);
};

const resetForm = () => {
  pasteData.value = '';
  parsedTournaments.value = [];
  importing.value = false;
};
</script>

<style scoped>
.import-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.instructions {
  background: #f0f9ff;
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #3b82f6;
}

.instructions h3 {
  margin-top: 0;
  color: #1e40af;
}

.instructions ol {
  margin: 10px 0;
  padding-left: 20px;
}

.instructions ol li {
  margin: 5px 0;
}

.instructions a {
  color: #3b82f6;
  text-decoration: none;
}

.instructions a:hover {
  text-decoration: underline;
}

.format-example {
  margin-top: 15px;
  padding: 10px;
  background: white;
  border-radius: 4px;
}

.format-example code {
  display: block;
  margin: 8px 0;
  padding: 8px;
  background: #f1f5f9;
  border-radius: 4px;
  font-family: monospace;
}

.paste-section {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 20px 0;
}

.paste-section label {
  font-weight: 600;
  color: #333;
}

.paste-area {
  width: 100%;
  font-family: monospace;
  font-size: 0.9rem;
}

.actions {
  display: flex;
  justify-content: flex-end;
}

.upload-section {
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.file-upload {
  width: 100%;
}

.preview-section {
  margin-top: 20px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 8px;
}

.preview-section h3 {
  margin-top: 0;
  color: #059669;
}
</style>
