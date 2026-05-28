<template>
  <Dialog
    v-model:visible="visible"
    header="Casinos - Las Vegas"
    :modal="true"
    :style="{ width: '95vw', maxWidth: '1200px' }"
    :breakpoints="{ '768px': '100vw' }"
    class="casino-map-dialog"
  >
    <div class="map-container">
      <div ref="mapContainer" class="leaflet-map"></div>

      <!-- Infos de l'itinéraire actif -->
      <div v-if="routeInfo" class="route-info-panel">
        <div class="route-info-header">
          <i class="pi pi-car"></i>
          <span>Itinéraire vers {{ routeInfo.casino }}</span>
        </div>
        <div class="route-info-details">
          <div class="route-stat">
            <i class="pi pi-map"></i>
            <span>{{ routeInfo.distanceMiles }} mi ({{ routeInfo.distanceKm }} km)</span>
          </div>
          <div class="route-stat">
            <i class="pi pi-clock"></i>
            <span>{{ routeInfo.durationMin }} min</span>
          </div>
        </div>

        <!-- Boutons pour ouvrir dans une app externe -->
        <div class="external-nav-buttons">
          <a
            :href="getGoogleMapsUrl(routeInfo.casinoData)"
            target="_blank"
            class="nav-btn google-maps-btn"
          >
            <i class="pi pi-map"></i>
            <span>Google Maps</span>
          </a>
          <a
            :href="getAppleMapsUrl(routeInfo.casinoData)"
            target="_blank"
            class="nav-btn apple-maps-btn mobile-only"
          >
            <i class="pi pi-apple"></i>
            <span>Apple Maps</span>
          </a>
        </div>

        <Button
          icon="pi pi-times"
          label="Fermer l'itinéraire"
          size="small"
          severity="secondary"
          @click="clearRoute"
          class="route-close-btn"
        />
      </div>

      <!-- Légende -->
      <div class="map-legend">
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
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

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
const activeRoute = ref(null);
const routeInfo = ref(null);
let map = null;
let markers = [];
let routingControl = null;

// Coordonnées du centre de Las Vegas (vue globale)
const LAS_VEGAS_CENTER = [36.10, -115.18];
const DEFAULT_ZOOM = 11;

// Adresse de la maison (point de départ pour les itinéraires)
const HOME_LOCATION = {
  name: "Maison",
  address: "5111 Blue Onion Cir, North Las Vegas, NV 89031",
  lat: 36.2693,
  lng: -115.1241
};

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

// Créer l'icône de la maison avec image personnalisée
const createHomeIcon = () => {
  return L.icon({
    iconUrl: '/home-icon.png',
    iconSize: [48, 48],
    iconAnchor: [24, 48],
    popupAnchor: [0, -48],
    className: 'home-marker-img'
  });
};

// Générer le lien Google Maps pour l'itinéraire
const getGoogleMapsUrl = (casino) => {
  const origin = `${HOME_LOCATION.lat},${HOME_LOCATION.lng}`;
  const destination = `${casino.lat},${casino.lng}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
};

// Générer le lien Apple Maps pour l'itinéraire
const getAppleMapsUrl = (casino) => {
  const origin = `${HOME_LOCATION.lat},${HOME_LOCATION.lng}`;
  const destination = `${casino.lat},${casino.lng}`;
  return `https://maps.apple.com/?saddr=${origin}&daddr=${destination}&dirflg=d`;
};

// Alias pour compatibilité avec le code existant
const getDirectionsUrl = getGoogleMapsUrl;

// Afficher l'itinéraire sur la carte
const showRoute = (casino) => {
  if (!map) return;

  // Supprimer l'itinéraire précédent
  clearRoute();

  activeRoute.value = casino.name;

  // Créer le contrôle de routage
  routingControl = L.Routing.control({
    waypoints: [
      L.latLng(HOME_LOCATION.lat, HOME_LOCATION.lng),
      L.latLng(casino.lat, casino.lng)
    ],
    routeWhileDragging: false,
    addWaypoints: false,
    draggableWaypoints: false,
    fitSelectedRoutes: true,
    showAlternatives: false,
    createMarker: () => null, // On garde nos propres marqueurs
    lineOptions: {
      styles: [
        { color: '#6366f1', opacity: 0.9, weight: 6 },
        { color: '#818cf8', opacity: 0.5, weight: 10 }
      ],
      extendToWaypoints: true,
      missingRouteTolerance: 0
    },
    router: L.Routing.osrmv1({
      serviceUrl: 'https://router.project-osrm.org/route/v1',
      profile: 'driving'
    })
  }).addTo(map);

  // Écouter le calcul de la route pour récupérer les infos
  routingControl.on('routesfound', (e) => {
    const route = e.routes[0];
    const distanceKm = (route.summary.totalDistance / 1000).toFixed(1);
    const distanceMiles = (route.summary.totalDistance / 1609.34).toFixed(1);
    const durationMin = Math.round(route.summary.totalTime / 60);

    routeInfo.value = {
      casino: casino.name,
      casinoData: casino,
      distanceKm,
      distanceMiles,
      durationMin
    };
  });

  routingControl.on('routingerror', (e) => {
    console.error('Erreur de routage:', e);
    // Fallback vers Google Maps si erreur
    window.open(getDirectionsUrl(casino), '_blank');
  });
};

// Effacer l'itinéraire
const clearRoute = () => {
  if (routingControl && map) {
    map.removeControl(routingControl);
    routingControl = null;
  }
  activeRoute.value = null;
  routeInfo.value = null;
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

  // Ajouter le marqueur de la maison
  const homeMarker = L.marker([HOME_LOCATION.lat, HOME_LOCATION.lng], {
    icon: createHomeIcon()
  });

  const homePopupContent = `
    <div class="casino-popup home-popup">
      <h3>🏠 ${HOME_LOCATION.name}</h3>
      <p class="popup-address"><i class="pi pi-map-marker"></i> ${HOME_LOCATION.address}</p>
      <p class="popup-desc">Point de départ pour les itinéraires</p>
    </div>
  `;

  homeMarker.bindPopup(homePopupContent, {
    maxWidth: 280,
    className: 'casino-popup-container home-popup-container'
  });

  homeMarker.addTo(map);
  bounds.extend([HOME_LOCATION.lat, HOME_LOCATION.lng]);

  // Ajouter les marqueurs pour chaque casino
  casinos.value.forEach(casino => {
    const marker = L.marker([casino.lat, casino.lng], {
      icon: createCustomIcon(casino)
    });

    // Ajouter au bounds
    bounds.extend([casino.lat, casino.lng]);

    const directionsUrl = getDirectionsUrl(casino);
    const casinoIndex = casinos.value.findIndex(c => c.name === casino.name);

    // Popup avec les informations du casino et bouton itinéraire
    const popupContent = `
      <div class="casino-popup">
        <h3>${casino.name}</h3>
        <p class="popup-address"><i class="pi pi-map-marker"></i> ${casino.address}</p>
        <p class="popup-rooms"><i class="pi pi-heart"></i> ${casino.rooms}</p>
        <p class="popup-desc">${casino.description}</p>
        <div class="popup-actions">
          <button class="directions-btn" data-casino-index="${casinoIndex}">
            <i class="pi pi-car"></i> Itinéraire
          </button>
        </div>
      </div>
    `;

    marker.bindPopup(popupContent, {
      maxWidth: 300,
      className: 'casino-popup-container'
    });

    // Ajouter l'écouteur d'événement pour le bouton d'itinéraire
    marker.on('popupopen', () => {
      setTimeout(() => {
        const btn = document.querySelector(`.directions-btn[data-casino-index="${casinoIndex}"]`);
        if (btn) {
          btn.addEventListener('click', () => {
            showRoute(casino);
            marker.closePopup();
          });
        }
      }, 10);
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
  } else {
    // Nettoyer l'itinéraire quand on ferme
    clearRoute();
  }
});

watch(visible, (newVal) => {
  emit('update:modelValue', newVal);
  if (!newVal) {
    clearRoute();
  }
});

onMounted(() => {
  if (visible.value) {
    initMap();
  }
});

onUnmounted(() => {
  clearRoute();
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

/* Bouton itinéraire */
.casino-popup .popup-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.casino-popup .directions-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.8125rem;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
  border: none;
  cursor: pointer;
}

.casino-popup .directions-btn:hover {
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.casino-popup .gmaps-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  background: #334155;
  color: #94a3b8;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.75rem;
  transition: all 0.2s ease;
  border: 1px solid #475569;
}

.casino-popup .gmaps-btn:hover {
  background: #475569;
  color: #f1f5f9;
}

.casino-popup .directions-btn i,
.casino-popup .gmaps-btn i {
  font-size: 0.875rem;
  opacity: 1;
}

/* Cacher le panneau par défaut de Leaflet Routing Machine */
.leaflet-routing-container {
  display: none !important;
}

/* Marqueur maison avec image */
.home-marker-img {
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4));
  border-radius: 50%;
}

/* Popup maison */
.home-popup h3 {
  color: #ef4444 !important;
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

/* Panneau d'info de l'itinéraire */
.route-info-panel {
  position: absolute;
  bottom: 12px;
  left: 12px;
  background: rgba(30, 41, 59, 0.98);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 14px 18px;
  z-index: 1000;
  border: 1px solid #6366f1;
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
  max-width: 280px;
}

.route-info-header {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #818cf8;
  font-weight: 700;
  font-size: 0.9375rem;
  margin-bottom: 12px;
}

.route-info-header i {
  font-size: 1.125rem;
}

.route-info-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.route-stat {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #f1f5f9;
  font-size: 0.9375rem;
  font-weight: 500;
}

.route-stat i {
  color: #6366f1;
  width: 18px;
  text-align: center;
}

/* Boutons de navigation externe */
.external-nav-buttons {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.nav-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.8125rem;
  transition: all 0.2s ease;
}

.nav-btn i {
  font-size: 1rem;
}

.google-maps-btn {
  background: linear-gradient(135deg, #34a853, #4285f4);
  color: white;
  box-shadow: 0 2px 8px rgba(66, 133, 244, 0.3);
}

.google-maps-btn:hover {
  background: linear-gradient(135deg, #2d9248, #3b78e7);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(66, 133, 244, 0.4);
}

.apple-maps-btn {
  background: linear-gradient(135deg, #555555, #333333);
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.apple-maps-btn:hover {
  background: linear-gradient(135deg, #666666, #444444);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

/* Apple Maps caché sur desktop, visible uniquement sur mobile */
.mobile-only {
  display: none;
}

.route-close-btn {
  width: 100%;
}

/* Légende */
.map-legend {
  position: absolute;
  top: 12px;
  right: 12px;
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

/* Liste casinos - flottant à droite */
.casino-list-mobile {
  position: absolute;
  bottom: 12px;
  right: 12px;
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

  .route-info-panel {
    top: 50%;
    left: 50%;
    right: auto;
    bottom: auto;
    transform: translate(-50%, -50%);
    max-width: 320px;
    width: calc(100% - 32px);
    padding: 16px;
  }

  .route-info-header {
    font-size: 0.875rem;
    margin-bottom: 10px;
  }

  .route-info-details {
    flex-direction: row;
    justify-content: space-around;
    margin-bottom: 12px;
  }

  .route-stat {
    font-size: 0.875rem;
  }

  .external-nav-buttons {
    gap: 6px;
    margin-bottom: 10px;
  }

  .nav-btn {
    padding: 8px 10px;
    font-size: 0.75rem;
  }

  .nav-btn i {
    font-size: 0.875rem;
  }

  .mobile-only {
    display: flex;
  }

  .map-legend {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 12px;
    top: 8px;
    right: 8px;
  }

  .legend-title {
    font-size: 0.8125rem;
  }

  .casino-list-mobile {
    top: 85px;
    bottom: auto;
    right: 8px;
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

  .route-info-panel {
    top: 50%;
    left: 50%;
    right: auto;
    bottom: auto;
    transform: translate(-50%, -50%);
    max-width: 290px;
    width: calc(100% - 24px);
    padding: 12px 14px;
    border-radius: 10px;
  }

  .route-info-header {
    font-size: 0.8125rem;
    gap: 8px;
    margin-bottom: 8px;
  }

  .route-info-header i {
    font-size: 1rem;
  }

  .route-info-details {
    gap: 6px;
    margin-bottom: 10px;
  }

  .route-stat {
    font-size: 0.8125rem;
    gap: 6px;
  }

  .external-nav-buttons {
    flex-direction: row;
    gap: 6px;
    margin-bottom: 8px;
  }

  .nav-btn {
    padding: 8px;
    font-size: 0.75rem;
    gap: 6px;
  }

  .nav-btn i {
    font-size: 0.875rem;
  }

  .map-legend {
    top: 6px;
    right: 6px;
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
    top: 70px;
    bottom: auto;
    right: 6px;
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

