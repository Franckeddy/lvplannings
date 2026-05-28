<template>
  <Dialog
    v-model:visible="visible"
    header="Casinos de Poker - Las Vegas"
    :modal="true"
    :style="{ width: '95vw', maxWidth: '1200px' }"
    :breakpoints="{ '768px': '100vw' }"
    class="casino-map-dialog"
  >
    <div class="map-container">
      <div ref="mapContainer" class="leaflet-map"></div>

      <!-- Légende -->
      <div class="map-legend">
        <div class="legend-title">
          <i class="pi pi-map-marker"></i>
          {{ casinos.length }} Casinos de Poker
        </div>
        <div class="legend-actions">
          <Button
            icon="pi pi-refresh"
            label="Recentrer"
            size="small"
            severity="secondary"
            @click="resetMapView"
          />
        </div>
      </div>

      <!-- Liste des casinos (mobile) -->
      <div class="casino-list-mobile">
        <div class="casino-list-header" @click="toggleCasinoList">
          <span>Liste des casinos</span>
          <i :class="['pi', showCasinoList ? 'pi-chevron-down' : 'pi-chevron-up']"></i>
        </div>
        <div v-if="showCasinoList" class="casino-list-items">
          <div
            v-for="casino in casinos"
            :key="casino.name"
            class="casino-list-item"
            @click="focusCasino(casino)"
          >
            <div class="casino-item-icon" :style="{ background: getCasinoColor(casino.type) }">
              {{ casino.name.charAt(0) }}
            </div>
            <div class="casino-item-info">
              <div class="casino-item-name">{{ casino.name }}</div>
              <div class="casino-item-address">{{ casino.address }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Dialog>
</template>

<script setup>
import { ref, onMounted, watch, nextTick, onUnmounted } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue']);

const visible = ref(props.modelValue);
const mapContainer = ref(null);
const showCasinoList = ref(false);
let map = null;
let markers = [];

// Coordonnées du centre de Las Vegas (vue globale)
const LAS_VEGAS_CENTER = [36.10, -115.18];
const DEFAULT_ZOOM = 11;

// Liste des casinos de poker à Las Vegas avec leurs coordonnées
const casinos = ref([
  {
    name: "WSOP - Paris/Horseshoe",
    address: "3655 S Las Vegas Blvd",
    lat: 36.1128,
    lng: -115.1711,
    type: "major",
    rooms: "Poker Room - WSOP",
    description: "World Series of Poker - Événement principal"
  },
  {
    name: "Aria",
    address: "3730 S Las Vegas Blvd",
    lat: 36.1073,
    lng: -115.1765,
    type: "major",
    rooms: "Aria Poker Room",
    description: "24/7 - Cash games et tournois quotidiens"
  },
  {
    name: "Bellagio",
    address: "3600 S Las Vegas Blvd",
    lat: 36.1129,
    lng: -115.1765,
    type: "major",
    rooms: "Bobby's Room + Salle principale",
    description: "Le plus prestigieux poker room de Vegas"
  },
  {
    name: "Venetian / Palazzo",
    address: "3355 S Las Vegas Blvd",
    lat: 36.1212,
    lng: -115.1696,
    type: "major",
    rooms: "Venetian Poker Room",
    description: "DeepStack Extravaganza - Grande salle"
  },
  {
    name: "Wynn",
    address: "3131 S Las Vegas Blvd",
    lat: 36.1263,
    lng: -115.1627,
    type: "major",
    rooms: "Wynn Poker Room",
    description: "Tournois high stakes - Ambiance luxueuse"
  },
  {
    name: "MGM Grand",
    address: "3799 S Las Vegas Blvd",
    lat: 36.1024,
    lng: -115.1695,
    type: "standard",
    rooms: "MGM Poker Room",
    description: "Room spacieuse, bonne action"
  },
  {
    name: "Caesars Palace",
    address: "3570 S Las Vegas Blvd",
    lat: 36.1162,
    lng: -115.1745,
    type: "major",
    rooms: "Caesars Poker Room",
    description: "Tournois et cash games 24/7"
  },
  {
    name: "The Orleans",
    address: "4500 W Tropicana Ave",
    lat: 36.1023,
    lng: -115.2068,
    type: "standard",
    rooms: "Orleans Poker Room",
    description: "Bon rapport tournois/buy-in - Locals room"
  },
  {
    name: "South Point",
    address: "9777 S Las Vegas Blvd",
    lat: 36.0117,
    lng: -115.1739,
    type: "standard",
    rooms: "South Point Poker Room",
    description: "Locals favoris - Tournois abordables"
  },
  {
    name: "Station Casinos - Red Rock",
    address: "11011 W Charleston Blvd",
    lat: 36.1734,
    lng: -115.3090,
    type: "standard",
    rooms: "Red Rock Poker Room",
    description: "Locals room - Bon niveau de jeu"
  },
  {
    name: "Green Valley Ranch",
    address: "2300 Paseo Verde Pkwy",
    lat: 36.0194,
    lng: -115.0797,
    type: "standard",
    rooms: "GVR Poker Room",
    description: "Station Casinos - Henderson"
  },
  {
    name: "Golden Nugget",
    address: "129 Fremont St",
    lat: 36.1710,
    lng: -115.1449,
    type: "standard",
    rooms: "Golden Nugget Poker",
    description: "Downtown Vegas - Ambiance vintage"
  },
  {
    name: "Resorts World",
    address: "3000 S Las Vegas Blvd",
    lat: 36.1284,
    lng: -115.1630,
    type: "standard",
    rooms: "Resorts World Poker Room",
    description: "Nouveau resort - Poker room moderne"
  },
  {
    name: "Encore",
    address: "3121 S Las Vegas Blvd",
    lat: 36.1287,
    lng: -115.1654,
    type: "major",
    rooms: "Wynn/Encore Poker",
    description: "Adjacent au Wynn - High stakes"
  },
  {
    name: "Binion's",
    address: "128 Fremont St",
    lat: 36.1709,
    lng: -115.1437,
    type: "historical",
    rooms: "Berceau du WSOP",
    description: "Historique - Où tout a commencé"
  },
  {
    name: "Sahara",
    address: "2535 S Las Vegas Blvd",
    lat: 36.1364,
    lng: -115.1564,
    type: "standard",
    rooms: "Sahara Poker Room",
    description: "Poker room récente"
  },
  {
    name: "Planet Hollywood",
    address: "3667 S Las Vegas Blvd",
    lat: 36.1095,
    lng: -115.1708,
    type: "standard",
    rooms: "Planet Hollywood Poker",
    description: "Centre du Strip - Tournois réguliers"
  },
  {
    name: "Treasure Island (TI)",
    address: "3300 S Las Vegas Blvd",
    lat: 36.1247,
    lng: -115.1717,
    type: "standard",
    rooms: "TI Poker Room",
    description: "Small room - Low stakes"
  },
  {
    name: "Flamingo",
    address: "3555 S Las Vegas Blvd",
    lat: 36.1161,
    lng: -115.1705,
    type: "standard",
    rooms: "Flamingo Poker",
    description: "Centre Strip - Cash games"
  },
  {
    name: "Excalibur",
    address: "3850 S Las Vegas Blvd",
    lat: 36.0989,
    lng: -115.1754,
    type: "standard",
    rooms: "Excalibur Poker Room",
    description: "Low stakes - Débutants friendly"
  }
]);

// Couleurs par type de casino
const getCasinoColor = (type) => {
  const colors = {
    major: '#6366f1',      // Violet - Majeurs
    standard: '#22c55e',   // Vert - Standard
    historical: '#f59e0b'  // Orange - Historique
  };
  return colors[type] || colors.standard;
};

// Créer une icône personnalisée
const createCustomIcon = (casino) => {
  const color = getCasinoColor(casino.type);
  const initial = casino.name.charAt(0);

  return L.divIcon({
    className: 'custom-casino-marker',
    html: `
      <div class="marker-container" style="background: ${color}">
        <span class="marker-initial">${initial}</span>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
};

// Initialiser la carte
const initMap = async () => {
  await nextTick();

  if (!mapContainer.value || map) return;

  // Créer la carte
  map = L.map(mapContainer.value, {
    center: LAS_VEGAS_CENTER,
    zoom: DEFAULT_ZOOM,
    zoomControl: true,
    scrollWheelZoom: true
  });

  // Ajouter le layer de tuiles (OpenStreetMap)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  // Créer un groupe pour les bounds
  const bounds = L.latLngBounds();

  // Ajouter les marqueurs pour chaque casino
  casinos.value.forEach(casino => {
    const marker = L.marker([casino.lat, casino.lng], {
      icon: createCustomIcon(casino)
    });

    // Ajouter au bounds
    bounds.extend([casino.lat, casino.lng]);

    // Popup avec les informations du casino
    const popupContent = `
      <div class="casino-popup">
        <h3>${casino.name}</h3>
        <p class="popup-address"><i class="pi pi-map-marker"></i> ${casino.address}</p>
        <p class="popup-rooms"><i class="pi pi-heart"></i> ${casino.rooms}</p>
        <p class="popup-desc">${casino.description}</p>
      </div>
    `;

    marker.bindPopup(popupContent, {
      maxWidth: 280,
      className: 'casino-popup-container'
    });

    marker.addTo(map);
    markers.push(marker);
  });

  // Ajuster la vue pour montrer tous les casinos
  setTimeout(() => {
    if (map) {
      map.invalidateSize();
      // Fit bounds avec un peu de padding pour bien voir tous les marqueurs
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, 300);
};

// Recentrer la carte pour voir tous les casinos
const resetMapView = () => {
  if (map && casinos.value.length > 0) {
    const bounds = L.latLngBounds();
    casinos.value.forEach(casino => {
      bounds.extend([casino.lat, casino.lng]);
    });
    map.fitBounds(bounds, { padding: [30, 30] });
  }
};

// Focus sur un casino spécifique
const focusCasino = (casino) => {
  if (map) {
    map.setView([casino.lat, casino.lng], 16);
    // Ouvrir le popup du marqueur correspondant
    const marker = markers.find((m, index) => casinos.value[index].name === casino.name);
    if (marker) {
      marker.openPopup();
    }
  }
};

// Toggle liste des casinos (mobile)
const toggleCasinoList = () => {
  showCasinoList.value = !showCasinoList.value;
};

// Watcher pour la visibilité
watch(() => props.modelValue, (newVal) => {
  visible.value = newVal;
  if (newVal) {
    setTimeout(() => {
      initMap();
    }, 100);
  }
});

watch(visible, (newVal) => {
  emit('update:modelValue', newVal);
});

onMounted(() => {
  if (visible.value) {
    initMap();
  }
});

onUnmounted(() => {
  if (map) {
    map.remove();
    map = null;
  }
  markers = [];
});
</script>

<style>
/* Styles globaux pour les marqueurs Leaflet */
.custom-casino-marker {
  background: transparent !important;
  border: none !important;
}

.marker-container {
  width: 36px;
  height: 36px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  border: 2px solid white;
}

.marker-initial {
  transform: rotate(45deg);
  color: white;
  font-weight: 700;
  font-size: 14px;
}

/* Popup styles */
.casino-popup-container .leaflet-popup-content-wrapper {
  background: #1e293b;
  color: #f1f5f9;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.casino-popup-container .leaflet-popup-tip {
  background: #1e293b;
}

.casino-popup h3 {
  color: #818cf8;
  margin: 0 0 10px 0;
  font-size: 1.1rem;
  font-weight: 700;
}

.casino-popup p {
  margin: 6px 0;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.casino-popup .popup-address {
  color: #94a3b8;
}

.casino-popup .popup-rooms {
  color: #22c55e;
  font-weight: 500;
}

.casino-popup .popup-desc {
  color: #cbd5e1;
  font-style: italic;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #334155;
}

.casino-popup i {
  font-size: 0.75rem;
  opacity: 0.8;
}
</style>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  height: 70vh;
  min-height: 400px;
  max-height: calc(100vh - 120px);
  border-radius: 12px;
  overflow: hidden;
  background: #0f172a;
}

.leaflet-map {
  width: 100%;
  height: 100%;
  z-index: 1;
}

/* Légende */
.map-legend {
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(30, 41, 59, 0.95);
  backdrop-filter: blur(8px);
  border-radius: 10px;
  padding: 12px 16px;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #334155;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.legend-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #f1f5f9;
  font-weight: 600;
  font-size: 0.9375rem;
}

.legend-title i {
  color: #818cf8;
}

/* Liste mobile - flottant en bas à gauche */
.casino-list-mobile {
  position: absolute;
  bottom: 12px;
  left: 12px;
  width: fit-content;
  max-width: 280px;
  background: rgba(30, 41, 59, 0.95);
  backdrop-filter: blur(8px);
  border-radius: 10px;
  z-index: 1000;
  max-height: 50%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid #334155;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.casino-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  color: #f1f5f9;
  font-weight: 600;
  font-size: 0.9375rem;
  background: transparent;
  white-space: nowrap;
}

.casino-list-header i {
  color: #818cf8;
}

.casino-list-header:hover {
  background: rgba(51, 65, 85, 0.5);
  border-radius: 10px;
}

.casino-list-items {
  overflow-y: auto;
  padding: 8px;
  max-height: 200px;
}

.casino-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.casino-list-item:hover {
  background: #334155;
}

.casino-item-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 0.8125rem;
  flex-shrink: 0;
}

.casino-item-info {
  flex: 1;
  min-width: 0;
}

.casino-item-name {
  color: #f1f5f9;
  font-weight: 600;
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.casino-item-address {
  color: #94a3b8;
  font-size: 0.6875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Dialog styles */
:deep(.casino-map-dialog .p-dialog-content) {
  padding: 0 !important;
  overflow: hidden;
}

:deep(.casino-map-dialog .p-dialog-header) {
  background: #1e293b;
  border-bottom: 1px solid #334155;
  padding: 0.75rem 1rem;
}

:deep(.casino-map-dialog .p-dialog-title) {
  color: #f1f5f9;
  font-weight: 700;
  font-size: 1rem;
}

/* Responsive */
@media (max-width: 768px) {
  .map-container {
    height: calc(100vh - 60px);
    max-height: calc(80vh - 60px);
    min-height: 300px;
    border-radius: 0;
  }

  .map-legend {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 12px;
    top: 8px;
    left: 8px;
  }

  .legend-title {
    font-size: 0.8125rem;
  }

  .casino-list-mobile {
    bottom: 8px;
    left: 8px;
    max-width: 240px;
  }

  .casino-list-header {
    padding: 8px 12px;
    font-size: 0.8125rem;
  }

  :deep(.casino-map-dialog .p-dialog-header) {
    padding: 0.625rem 1rem;
  }

  :deep(.casino-map-dialog .p-dialog-title) {
    font-size: 0.9375rem;
  }
}

@media (max-width: 480px) {
  .map-container {
    height: calc(100vh - 50px);
    max-height: calc(100vh - 50px);
    min-height: 280px;
  }

  .map-legend {
    top: 6px;
    left: 6px;
    right: auto;
    padding: 6px 10px;
    gap: 6px;
  }

  .legend-title {
    font-size: 0.75rem;
  }

  .legend-actions {
    display: flex;
  }

  :deep(.p-button.p-button-sm) {
    font-size: 0.6875rem;
    padding: 0.3rem 0.5rem;
  }

  .casino-list-mobile {
    bottom: 6px;
    left: 6px;
    max-width: 180px;
  }

  .casino-list-header {
    padding: 6px 10px;
    font-size: 0.75rem;
    gap: 8px;
  }

  .casino-list-items {
    max-height: 180px;
    padding: 6px;
  }

  .casino-list-item {
    padding: 8px 10px;
    gap: 10px;
  }

  .casino-item-icon {
    width: 28px;
    height: 28px;
    font-size: 0.75rem;
  }

  .casino-item-name {
    font-size: 0.8125rem;
  }

  .casino-item-address {
    font-size: 0.625rem;
  }

  :deep(.casino-map-dialog .p-dialog-header) {
    padding: 0.5rem 0.75rem;
  }

  :deep(.casino-map-dialog .p-dialog-title) {
    font-size: 0.875rem;
  }
}

@media (max-height: 600px) {
  .map-container {
    height: calc(100vh - 60px);
    max-height: calc(100vh - 60px);
  }

  .casino-list-items {
    max-height: 120px;
  }

  .map-legend {
    padding: 5px 8px;
  }

  .legend-title {
    font-size: 0.6875rem;
  }
}
</style>

