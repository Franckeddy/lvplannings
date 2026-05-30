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
      <div v-if="routeInfo" class="route-info-panel" :class="{ 'both-routes-panel': showBothRoutes }">
        <div class="route-info-header">
          <i class="pi pi-map-marker"></i>
          <span>Itinéraire → {{ routeInfo.casino }}</span>
        </div>

        <!-- Mode "both" : afficher les deux trajets côte à côte -->
        <template v-if="showBothRoutes">
          <div class="both-routes-container">
            <!-- Trajet voiture - cliquable pour voir uniquement voiture -->
            <div
              class="route-card driving-card clickable"
              @click="selectRouteMode('driving')"
              title="Voir uniquement le trajet en voiture"
            >
              <div class="route-card-header">
                <i class="pi pi-car"></i>
                <span>Voiture</span>
              </div>
              <div class="route-card-stats">
                <div class="route-stat-mini">
                  <i class="pi pi-map"></i>
                  <span>{{ routeInfo.distanceMiles }} mi</span>
                </div>
                <div class="route-stat-mini">
                  <i class="pi pi-clock"></i>
                  <span>~{{ routeInfo.durationMin }} min</span>
                </div>
              </div>
            </div>

            <!-- Trajet bus - cliquable pour voir uniquement bus -->
            <div
              class="route-card transit-card clickable"
              v-if="routeInfoTransit"
              @click="selectRouteMode('transit')"
              title="Voir uniquement le trajet en bus"
            >
              <div class="route-card-header">
                <i class="pi pi-directions"></i>
                <span>Bus</span>
              </div>
              <div class="route-card-stats">
                <div class="route-stat-mini">
                  <i class="pi pi-map"></i>
                  <span>{{ routeInfoTransit.distanceMiles }} mi</span>
                </div>
                <div class="route-stat-mini">
                  <i class="pi pi-clock"></i>
                  <span>~{{ routeInfoTransit.durationMin }} min</span>
                </div>
              </div>
              <!-- Lignes de bus utilisées -->
              <div class="transit-lines-badge" v-if="routeInfoTransit.transitDetails">
                <span
                  class="line-badge"
                  :style="{ background: routeInfoTransit.transitDetails.line.color }"
                >{{ routeInfoTransit.transitDetails.line.name }}</span>
                <template v-if="routeInfoTransit.transitDetails.line2">
                  <span class="badge-separator">→</span>
                  <span
                    class="line-badge"
                    :style="{ background: routeInfoTransit.transitDetails.line2.color }"
                  >{{ routeInfoTransit.transitDetails.line2.name }}</span>
                </template>
                <template v-if="routeInfoTransit.transitDetails.line3">
                  <span class="badge-separator">→</span>
                  <span
                    class="line-badge"
                    :style="{ background: routeInfoTransit.transitDetails.line3.color }"
                  >{{ routeInfoTransit.transitDetails.line3.name }}</span>
                </template>
              </div>
              <div v-if="routeInfoTransit.noRoute" class="transit-no-route-mini">
                <i class="pi pi-info-circle"></i>
                <span>Pas de bus direct</span>
              </div>
            </div>
          </div>

          <!-- Indication cliquable -->
          <div class="routes-hint">
            <i class="pi pi-info-circle"></i>
            <span>Cliquez sur une carte pour voir uniquement ce trajet</span>
          </div>
        </template>

        <!-- Mode single : ancien affichage -->
        <template v-else>
          <!-- Toggle voiture / bus -->
          <div class="route-mode-toggle">
            <button
              class="mode-btn"
              :class="{ active: routeMode === 'driving' }"
              @click="switchRouteMode('driving')"
            >
              <i class="pi pi-car"></i> Voiture
            </button>
            <button
              class="mode-btn"
              :class="{ active: routeMode === 'transit' }"
              @click="switchRouteMode('transit')"
            >
              <i class="pi pi-directions"></i> Bus
            </button>
          </div>

          <div class="route-info-details">
            <div class="route-stat">
              <i class="pi pi-map"></i>
              <span>{{ routeInfo.distanceMiles }} mi ({{ routeInfo.distanceKm }} km)</span>
            </div>
            <div class="route-stat">
              <i class="pi pi-clock"></i>
              <span>~{{ routeInfo.durationMin }} min</span>
            </div>
          </div>

          <!-- Détails du trajet en bus/monorail -->
          <div v-if="routeMode === 'transit' && routeInfo.transitDetails" class="transit-details">
            <div class="transit-steps-simple">
              <div class="transit-segment walk-segment">
                <span class="segment-time">{{ routeInfo.transitDetails.walkToStop }}'</span>
                <span class="segment-label">à pied</span>
              </div>
              <i class="pi pi-chevron-right segment-arrow"></i>
              <div class="transit-segment bus-segment" :style="{ borderColor: routeInfo.transitDetails.line.color }">
                <span class="segment-line-badge" :style="{ background: routeInfo.transitDetails.line.color }">{{ routeInfo.transitDetails.line.name }}</span>
              </div>
              <!-- 1ère correspondance -->
              <template v-if="routeInfo.transitDetails.isTransfer && routeInfo.transitDetails.line2">
                <i class="pi pi-chevron-right segment-arrow"></i>
                <div class="transit-segment bus-segment" :style="{ borderColor: routeInfo.transitDetails.line2.color }">
                  <span class="segment-line-badge" :style="{ background: routeInfo.transitDetails.line2.color }">{{ routeInfo.transitDetails.line2.name }}</span>
                </div>
              </template>
              <!-- 2ème correspondance -->
              <template v-if="routeInfo.transitDetails.isDoubleTransfer && routeInfo.transitDetails.line3">
                <i class="pi pi-chevron-right segment-arrow"></i>
                <div class="transit-segment bus-segment" :style="{ borderColor: routeInfo.transitDetails.line3.color }">
                  <span class="segment-line-badge" :style="{ background: routeInfo.transitDetails.line3.color }">{{ routeInfo.transitDetails.line3.name }}</span>
                </div>
              </template>
              <i class="pi pi-chevron-right segment-arrow"></i>
              <div class="transit-segment walk-segment">
                <span class="segment-time">{{ routeInfo.transitDetails.walkFromStop }}'</span>
                <span class="segment-label">à pied</span>
              </div>
            </div>
            <div class="transit-stops-info">
              <span class="stop-name">{{ routeInfo.transitDetails.boardStop }}</span>
              <i class="pi pi-arrow-right"></i>
              <span v-if="routeInfo.transitDetails.transferStop" class="stop-name transfer-stop">{{ routeInfo.transitDetails.transferStop }}</span>
              <i v-if="routeInfo.transitDetails.transferStop" class="pi pi-arrow-right"></i>
              <span v-if="routeInfo.transitDetails.transferStop2" class="stop-name transfer-stop">{{ routeInfo.transitDetails.transferStop2 }}</span>
              <i v-if="routeInfo.transitDetails.transferStop2" class="pi pi-arrow-right"></i>
              <span class="stop-name">{{ routeInfo.transitDetails.alightStop }}</span>
            </div>
          </div>

          <!-- Message si aucune route transit trouvée -->
          <div v-if="routeMode === 'transit' && routeInfo.noRoute" class="transit-no-route">
            <i class="pi pi-info-circle"></i>
            <span>Aucune ligne de bus/monorail ne dessert directement ce casino</span>
          </div>
        </template>

        <!-- Liens navigation externe -->
        <div class="route-nav-links">
          <!-- Google Maps -->
          <a
            :href="getGoogleMapsUrl(routeInfo.casinoData)"
            target="_blank"
            rel="noopener noreferrer"
            class="nav-link-btn google-maps"
          >
            <i class="pi pi-map"></i>
            <span class="nav-link-label">Maps</span>
          </a>

          <!-- Apple Maps -->
          <a
            :href="getAppleMapsUrl(routeInfo.casinoData)"
            target="_blank"
            rel="noopener noreferrer"
            class="nav-link-btn apple-maps"
          >
            <i class="pi pi-apple"></i>
            <span class="nav-link-label">Apple</span>
          </a>
        </div>

        <Button
          icon="pi pi-times"
          label="Fermer"
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
            :label="isMobile ? '' : 'Recentrer'"
            size="small"
            severity="secondary"
            @click="resetMapView"
            v-tooltip.bottom="'Recentrer'"
          />
          <Button
            :icon="geolocating ? 'pi pi-spin pi-spinner' : 'pi pi-compass'"
            :label="isMobile ? '' : (userLocation ? 'Ma position' : 'Me localiser')"
            size="small"
            :severity="userLocation ? 'success' : 'secondary'"
            @click="geolocateUser"
            v-tooltip.bottom="'Me localiser'"
          />
          <Button
            :icon="showBusLines ? 'pi pi-eye-slash' : 'pi pi-directions'"
            :label="showBusLines ? 'Masquer' : 'Bus RTC'"
            size="small"
            :severity="showBusLines ? 'info' : 'secondary'"
            @click="toggleBusLines"
            class="hide-on-mobile"
          />
          <Button
            :icon="showMonorail ? 'pi pi-eye-slash' : 'pi pi-arrows-h'"
            :label="showMonorail ? 'Masquer' : 'Monorail'"
            size="small"
            :severity="showMonorail ? 'warning' : 'secondary'"
            @click="toggleMonorail"
            class="monorail-btn hide-on-mobile"
          />
        </div>
      </div>

      <!-- Liste des lignes de bus -->
      <div class="casino-list-mobile">
        <div class="casino-list-header" @click="toggleCasinoList">
          <span>{{ showBusLines ? 'Transports' : 'Lignes de Bus / Monorail' }}</span>
          <i :class="['pi', showCasinoList ? 'pi-chevron-down' : 'pi-chevron-up']"></i>
        </div>
        <div v-if="showCasinoList" class="casino-list-items">
          <!-- Bouton pour voir toutes les lignes -->
          <div
            v-if="selectedBusLine && showBusLines"
            class="show-all-lines-btn"
            @click="clearBusLineSelection"
          >
            <i class="pi pi-eye"></i>
            <span>Voir toutes les lignes</span>
          </div>

          <!-- Lignes de bus -->
          <div
            v-for="line in busLines"
            :key="line.id"
            class="casino-list-item bus-line-item"
            :class="{ 'selected': selectedBusLine === line.id }"
            @click="activateAndFocusLine(line)"
          >
            <div class="bus-line-icon" :class="{ 'monorail': line.isMonorail }" :style="{ background: line.isMonorail ? '#fff' : line.color }">
              <img v-if="line.isMonorail" src="https://www.lvmonorail.com/wp-content/uploads/2016/11/LVM-LOGO-VERT-2c.jpg" alt="Monorail" class="monorail-icon-logo" />
              <span v-else class="bus-line-number">{{ line.name }}</span>
            </div>
            <div class="casino-item-info">
              <div class="casino-item-name">{{ line.name }}</div>
              <div class="casino-item-address">{{ line.description }}</div>
              <div class="bus-line-details">
                <span><i class="pi pi-clock"></i> {{ line.frequency }}</span>
                <span><i class="pi pi-dollar"></i> {{ line.fare }}</span>
              </div>
            </div>
            <i v-if="selectedBusLine === line.id" class="pi pi-check selected-check"></i>
          </div>

          <!-- Liens externes -->
          <div class="external-links-container">
            <!-- Lien vers Transit App -->
            <a
              href="https://transitapp.com/fr/region/las-vegas/rtc/bus-deuce"
              target="_blank"
              class="transit-app-link"
            >
              <i class="pi pi-external-link"></i>
              Transit App
            </a>

            <!-- Lien vers Monorail Tickets -->
            <a
              href="https://tix.lvmonorail.com/purchase"
              target="_blank"
              class="monorail-ticket-link"
            >
              <img src="https://www.lvmonorail.com/wp-content/uploads/2016/11/LVM-LOGO-VERT-2c.jpg" alt="Monorail" class="monorail-logo" />
              Tickets
            </a>
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
const routeInfoTransit = ref(null); // Nouveau: info transit séparée
const showBusLines = ref(false);
const showMonorail = ref(false);
const selectedBusLine = ref(null);
const routeMode = ref('driving'); // 'driving' ou 'transit'
const showBothRoutes = ref(true); // Nouveau: afficher les deux trajets par défaut
const routeFrom = ref('home'); // 'home' ou 'location'
const userLocation = ref(null);
const geolocating = ref(false);
const isMobile = ref(window.innerWidth <= 768);
let map = null;
let markers = [];
let routingControl = null;
let transitLayers = []; // Layers pour l'itinéraire transit
let userLocationMarker = null;
let busLinesLayers = [];
let busStopMarkers = [];

// Coordonnées du centre de Las Vegas (vue globale)
const LAS_VEGAS_CENTER = [36.10, -115.18];
const DEFAULT_ZOOM = 11;

// Adresse de la maison (point de départ pour les itinéraires)
const HOME_LOCATION = {
  name: "Maison",
  address: "5111 Blue Onion Cir, North Las Vegas, NV 89031",
  lat: 36.2525,
  lng: -115.2061
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

// Lignes de bus RTC Las Vegas
const busLines = ref([
  {
    id: 'deuce',
    name: 'DEUCE',
    description: 'Strip & Downtown Express',
    color: '#e53935',
    frequency: '15-20 min',
    hours: '24h/24',
    fare: '$6 (2h) / $8 (24h)',
    link: 'https://transitapp.com/fr/region/las-vegas/rtc/bus-deuce',
    stops: [
      { name: 'Downtown Transit Center', lat: 36.1685, lng: -115.1481 },
      { name: 'Fremont Street Experience', lat: 36.1699, lng: -115.1424 },
      { name: 'Stratosphere', lat: 36.1475, lng: -115.1566 },
      { name: 'SLS Las Vegas', lat: 36.1410, lng: -115.1620 },
      { name: 'Circus Circus', lat: 36.1364, lng: -115.1640 },
      { name: 'Resorts World', lat: 36.1284, lng: -115.1658 },
      { name: 'Wynn / Encore', lat: 36.1263, lng: -115.1627 },
      { name: 'Fashion Show Mall', lat: 36.1269, lng: -115.1703 },
      { name: 'Treasure Island', lat: 36.1247, lng: -115.1717 },
      { name: 'Venetian / Palazzo', lat: 36.1212, lng: -115.1696 },
      { name: 'Harrah\'s / The LINQ', lat: 36.1186, lng: -115.1708 },
      { name: 'Flamingo / Caesars', lat: 36.1162, lng: -115.1720 },
      { name: 'Bellagio / Bally\'s', lat: 36.1129, lng: -115.1740 },
      { name: 'Paris / Planet Hollywood', lat: 36.1095, lng: -115.1708 },
      { name: 'CityCenter / Aria', lat: 36.1073, lng: -115.1765 },
      { name: 'Park MGM / T-Mobile Arena', lat: 36.1050, lng: -115.1740 },
      { name: 'MGM Grand', lat: 36.1024, lng: -115.1695 },
      { name: 'Tropicana', lat: 36.1005, lng: -115.1720 },
      { name: 'Excalibur', lat: 36.0989, lng: -115.1754 },
      { name: 'Luxor', lat: 36.0955, lng: -115.1760 },
      { name: 'Mandalay Bay', lat: 36.0920, lng: -115.1755 },
      { name: 'South Strip Transfer Terminal', lat: 36.0890, lng: -115.1760 }
    ]
  },
  {
    id: 'sdx',
    name: 'SDX',
    description: 'Strip & Downtown Express (Limited)',
    color: '#1e88e5',
    frequency: '12-15 min',
    hours: '9h - 00h',
    fare: '$6 (2h) / $8 (24h)',
    link: 'https://transitapp.com/fr/region/las-vegas/rtc/bus-sdx',
    stops: [
      { name: 'Downtown Transit Center', lat: 36.1685, lng: -115.1481 },
      { name: 'Bonneville Transit Center', lat: 36.1648, lng: -115.1535 },
      { name: 'Stratosphere', lat: 36.1475, lng: -115.1566 },
      { name: 'Fashion Show Mall', lat: 36.1269, lng: -115.1703 },
      { name: 'Flamingo / Caesars', lat: 36.1162, lng: -115.1720 },
      { name: 'MGM Grand', lat: 36.1024, lng: -115.1695 },
      { name: 'Mandalay Bay', lat: 36.0920, lng: -115.1755 },
      { name: 'South Strip Transfer Terminal', lat: 36.0890, lng: -115.1760 }
    ]
  },
  {
    id: '101',
    name: '101',
    description: 'Rainbow Blvd',
    color: '#7b1fa2',
    frequency: '30 min',
    hours: '5h - 22h',
    fare: '$2 / $5 (24h)',
    link: 'https://transitapp.com/fr/region/las-vegas/rtc/bus-101',
    stops: [
      { name: 'Centennial Hills Transit Center', lat: 36.2680, lng: -115.2490 },
      { name: 'Rainbow & Lake Mead', lat: 36.2150, lng: -115.2420 },
      { name: 'Rainbow & Cheyenne', lat: 36.2050, lng: -115.2420 },
      { name: 'Rainbow & Smoke Ranch', lat: 36.1850, lng: -115.2420 },
      { name: 'Rainbow & Charleston', lat: 36.1580, lng: -115.2420 },
      { name: 'Rainbow & Sahara', lat: 36.1445, lng: -115.2420 },
      { name: 'Rainbow & Spring Mountain', lat: 36.1260, lng: -115.2420 },
      { name: 'Rainbow & Flamingo', lat: 36.1150, lng: -115.2420 },
      { name: 'Rainbow & Tropicana', lat: 36.1000, lng: -115.2420 },
      { name: 'South Strip Transfer Terminal', lat: 36.0890, lng: -115.1760 }
    ]
  },
  {
    id: '102',
    name: '102',
    description: 'Lake Mead Blvd',
    color: '#00897b',
    frequency: '30 min',
    hours: '5h - 22h',
    fare: '$2 / $5 (24h)',
    link: 'https://transitapp.com/fr/region/las-vegas/rtc/bus-102',
    stops: [
      { name: 'Centennial Hills Transit Center', lat: 36.2680, lng: -115.2490 },
      { name: 'Lake Mead & Rancho', lat: 36.2150, lng: -115.2200 },
      { name: 'Lake Mead & Decatur', lat: 36.2150, lng: -115.2050 },
      { name: 'Lake Mead & Jones', lat: 36.2150, lng: -115.1900 },
      { name: 'Lake Mead & MLK', lat: 36.2150, lng: -115.1700 },
      { name: 'Lake Mead & Civic Center', lat: 36.2150, lng: -115.1500 },
      { name: 'Lake Mead & Las Vegas Blvd', lat: 36.2150, lng: -115.1400 },
      { name: 'Lake Mead & Nellis', lat: 36.2150, lng: -115.0620 }
    ]
  },
  {
    id: '103',
    name: '103',
    description: 'Decatur Blvd',
    color: '#5e35b1',
    frequency: '20-30 min',
    hours: '5h - 22h',
    fare: '$2 / $5 (24h)',
    link: 'https://transitapp.com/fr/region/las-vegas/rtc/bus-103',
    stops: [
      { name: 'Decatur & Lake Mead', lat: 36.2150, lng: -115.2050 },
      { name: 'Decatur & Cheyenne', lat: 36.2050, lng: -115.2050 },
      { name: 'Decatur & Vegas Dr', lat: 36.1850, lng: -115.2050 },
      { name: 'Decatur & Charleston', lat: 36.1580, lng: -115.2050 },
      { name: 'Decatur & Sahara', lat: 36.1445, lng: -115.2050 },
      { name: 'Decatur & Spring Mountain', lat: 36.1260, lng: -115.2050 },
      { name: 'Decatur & Flamingo', lat: 36.1150, lng: -115.2050 },
      { name: 'Decatur & Tropicana', lat: 36.1000, lng: -115.2050 },
      { name: 'South Strip Transfer Terminal', lat: 36.0890, lng: -115.1760 }
    ]
  },
  {
    id: '104',
    name: '104',
    description: 'Rancho Dr',
    color: '#ef6c00',
    frequency: '30 min',
    hours: '5h - 21h',
    fare: '$2 / $5 (24h)',
    link: 'https://transitapp.com/fr/region/las-vegas/rtc/bus-104',
    stops: [
      { name: 'Rancho & Lake Mead', lat: 36.2150, lng: -115.2200 },
      { name: 'Rancho & Cheyenne', lat: 36.2050, lng: -115.2200 },
      { name: 'Rancho & Vegas Dr', lat: 36.1850, lng: -115.2200 },
      { name: 'Rancho & US-95', lat: 36.1700, lng: -115.2100 },
      { name: 'Downtown Transit Center', lat: 36.1685, lng: -115.1481 }
    ]
  },
  {
    id: '105',
    name: '105',
    description: 'Martin L. King Blvd',
    color: '#c62828',
    frequency: '30 min',
    hours: '5h - 21h',
    fare: '$2 / $5 (24h)',
    link: 'https://transitapp.com/fr/region/las-vegas/rtc/bus-105',
    stops: [
      { name: 'MLK & Lake Mead', lat: 36.2150, lng: -115.1700 },
      { name: 'MLK & Carey', lat: 36.2000, lng: -115.1700 },
      { name: 'MLK & Cheyenne', lat: 36.2050, lng: -115.1700 },
      { name: 'MLK & Vegas Dr', lat: 36.1850, lng: -115.1700 },
      { name: 'Bonneville Transit Center', lat: 36.1648, lng: -115.1535 }
    ]
  },
  {
    id: '106',
    name: '106',
    description: 'Charleston Blvd',
    color: '#d81b60',
    frequency: '15-20 min',
    hours: '5h - 23h',
    fare: '$2 / $5 (24h)',
    link: 'https://transitapp.com/fr/region/las-vegas/rtc/bus-106',
    stops: [
      { name: 'Red Rock Casino', lat: 36.1734, lng: -115.3090 },
      { name: 'Charleston & 215', lat: 36.1580, lng: -115.2800 },
      { name: 'Charleston & Rainbow', lat: 36.1580, lng: -115.2420 },
      { name: 'Charleston & Decatur', lat: 36.1580, lng: -115.2050 },
      { name: 'Charleston & Rancho', lat: 36.1580, lng: -115.2200 },
      { name: 'Bonneville Transit Center', lat: 36.1648, lng: -115.1535 },
      { name: 'Downtown Transit Center', lat: 36.1685, lng: -115.1481 },
      { name: 'Charleston & Eastern', lat: 36.1580, lng: -115.1190 },
      { name: 'Charleston & Nellis', lat: 36.1580, lng: -115.0620 },
      { name: 'Nellis AFB', lat: 36.2350, lng: -115.0340 }
    ]
  },
  {
    id: '108',
    name: '108',
    description: 'Paradise Rd',
    color: '#0288d1',
    frequency: '30 min',
    hours: '5h - 22h',
    fare: '$2 / $5 (24h)',
    link: 'https://transitapp.com/fr/region/las-vegas/rtc/bus-108',
    stops: [
      { name: 'Convention Center', lat: 36.1280, lng: -115.1530 },
      { name: 'Paradise & Sahara', lat: 36.1445, lng: -115.1530 },
      { name: 'Paradise & Desert Inn', lat: 36.1350, lng: -115.1530 },
      { name: 'Paradise & Flamingo', lat: 36.1150, lng: -115.1530 },
      { name: 'Paradise & Tropicana', lat: 36.1000, lng: -115.1530 },
      { name: 'Harry Reid Airport T1', lat: 36.0840, lng: -115.1537 },
      { name: 'Harry Reid Airport T3', lat: 36.0860, lng: -115.1480 }
    ]
  },
  {
    id: '109',
    name: '109',
    description: 'Maryland Pkwy',
    color: '#43a047',
    frequency: '15-20 min',
    hours: '5h - 23h',
    fare: '$2 / $5 (24h)',
    link: 'https://transitapp.com/fr/region/las-vegas/rtc/bus-109',
    stops: [
      { name: 'Downtown Transit Center', lat: 36.1685, lng: -115.1481 },
      { name: 'Maryland & Fremont', lat: 36.1680, lng: -115.1190 },
      { name: 'Maryland & Charleston', lat: 36.1580, lng: -115.1190 },
      { name: 'Maryland & Sahara', lat: 36.1445, lng: -115.1190 },
      { name: 'Maryland & UNLV', lat: 36.1100, lng: -115.1400 },
      { name: 'Maryland & Tropicana', lat: 36.1000, lng: -115.1190 },
      { name: 'Maryland & Russell', lat: 36.0850, lng: -115.1190 },
      { name: 'South Strip Transfer Terminal', lat: 36.0890, lng: -115.1760 }
    ]
  },
  {
    id: '110',
    name: '110',
    description: 'Eastern Ave',
    color: '#8e24aa',
    frequency: '30 min',
    hours: '5h - 22h',
    fare: '$2 / $5 (24h)',
    link: 'https://transitapp.com/fr/region/las-vegas/rtc/bus-110',
    stops: [
      { name: 'Eastern & Lake Mead', lat: 36.2150, lng: -115.1190 },
      { name: 'Eastern & Charleston', lat: 36.1580, lng: -115.1190 },
      { name: 'Eastern & Sahara', lat: 36.1445, lng: -115.1190 },
      { name: 'Eastern & Flamingo', lat: 36.1150, lng: -115.1190 },
      { name: 'Eastern & Tropicana', lat: 36.1000, lng: -115.1190 },
      { name: 'Sunset Station', lat: 36.0600, lng: -115.1190 }
    ]
  },
  {
    id: '111',
    name: '111',
    description: 'Nellis Blvd',
    color: '#6d4c41',
    frequency: '30 min',
    hours: '5h - 21h',
    fare: '$2 / $5 (24h)',
    link: 'https://transitapp.com/fr/region/las-vegas/rtc/bus-111',
    stops: [
      { name: 'Nellis AFB', lat: 36.2350, lng: -115.0340 },
      { name: 'Nellis & Lake Mead', lat: 36.2150, lng: -115.0620 },
      { name: 'Nellis & Charleston', lat: 36.1580, lng: -115.0620 },
      { name: 'Nellis & Sahara', lat: 36.1445, lng: -115.0620 },
      { name: 'Nellis & Desert Inn', lat: 36.1350, lng: -115.0620 },
      { name: 'Nellis & Flamingo', lat: 36.1150, lng: -115.0620 },
      { name: 'Nellis & Tropicana', lat: 36.1000, lng: -115.0620 }
    ]
  },
  {
    id: '113',
    name: '113',
    description: 'Las Vegas Blvd South',
    color: '#fdd835',
    frequency: '30 min',
    hours: '5h - 21h',
    fare: '$2 / $5 (24h)',
    link: 'https://transitapp.com/fr/region/las-vegas/rtc/bus-113',
    stops: [
      { name: 'South Strip Transfer Terminal', lat: 36.0890, lng: -115.1760 },
      { name: 'Las Vegas Blvd & Cactus', lat: 36.0600, lng: -115.1730 },
      { name: 'Las Vegas Blvd & Windmill', lat: 36.0400, lng: -115.1730 },
      { name: 'South Point Casino', lat: 36.0117, lng: -115.1739 },
      { name: 'Las Vegas Blvd & Silverado Ranch', lat: 35.9900, lng: -115.1730 }
    ]
  },
  {
    id: '115',
    name: '115',
    description: 'Nellis / Stewart',
    color: '#546e7a',
    frequency: '30-40 min',
    hours: '6h - 20h',
    fare: '$2 / $5 (24h)',
    link: 'https://transitapp.com/fr/region/las-vegas/rtc/bus-115',
    stops: [
      { name: 'Nellis & Lake Mead', lat: 36.2150, lng: -115.0620 },
      { name: 'Nellis & Cheyenne', lat: 36.2050, lng: -115.0620 },
      { name: 'Stewart & Eastern', lat: 36.1730, lng: -115.1190 },
      { name: 'Downtown Transit Center', lat: 36.1685, lng: -115.1481 }
    ]
  },
  {
    id: 'monorail',
    name: 'MONORAIL',
    description: 'Las Vegas Monorail',
    color: '#232d6a',
    frequency: '4-8 min',
    hours: '7h - 00h (2h ven-dim)',
    fare: '$5 / $13 (24h)',
    link: 'https://www.lvmonorail.com/route-map/',
    isMonorail: true,
    stops: [
      { name: 'MGM Grand Station', lat: 36.1019, lng: -115.1656 },
      { name: 'Bally\'s/Paris Station', lat: 36.1118, lng: -115.1685 },
      { name: 'Flamingo/Caesars Palace Station', lat: 36.1163, lng: -115.1695 },
      { name: 'Harrah\'s/The LINQ Station', lat: 36.1198, lng: -115.1688 },
      { name: 'Las Vegas Convention Center Station', lat: 36.1280, lng: -115.1530 },
      { name: 'Westgate Station', lat: 36.1350, lng: -115.1530 },
      { name: 'SAHARA Las Vegas Station', lat: 36.1445, lng: -115.1566 }
    ]
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

// Générer le lien Google Maps pour l'itinéraire en transport en commun
const getGoogleMapsTransitUrl = (casino) => {
  const origin = `${HOME_LOCATION.lat},${HOME_LOCATION.lng}`;
  const destination = `${casino.lat},${casino.lng}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=transit`;
};

// Alias pour compatibilité avec le code existant
const getDirectionsUrl = getGoogleMapsUrl;

// Basculer le mode d'itinéraire (voiture <-> bus)
const switchRouteMode = (mode) => {
  if (routeMode.value === mode || !routeInfo.value) return;
  routeMode.value = mode;
  // Ne pas recalculer si on affiche les deux trajets
  if (!showBothRoutes.value) {
    showRoute(routeInfo.value.casinoData, mode);
  }
};

// Sélectionner un mode unique depuis le mode "both" (clic sur une carte)
const selectRouteMode = (mode) => {
  if (!routeInfo.value) return;
  // Passer du mode "both" à un mode unique
  showRoute(routeInfo.value.casinoData, mode);
};

// Calculer la distance entre deux points (en km)
const getDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Trouver le meilleur itinéraire en bus/monorail depuis la maison
// Cherche l'arrêt de bus le plus proche de la maison sur toutes les lignes
const findBestTransitRoute = (casino) => {
  // Utiliser l'algorithme générique avec les coordonnées de la maison
  return findTransitFromLocation(casino, HOME_LOCATION.lat, HOME_LOCATION.lng);
};

// Trouver un itinéraire transit depuis une position quelconque (géolocalisation ou maison)
// Cherche l'arrêt de bus le plus proche du point de départ sur TOUTES les lignes
const findTransitFromLocation = (casino, fromLat, fromLng) => {
  const results = [];
  const MAX_TRANSFER_DIST = 1.5; // km max entre arrêts pour correspondance

  // --- 1. Chercher les lignes directes depuis la position ---
  busLines.value.forEach(line => {
    // Trouver l'arrêt le plus proche du point de départ sur cette ligne
    let nearestHome = null, nearestHomeDist = Infinity, nearestHomeIdx = -1;
    line.stops.forEach((stop, idx) => {
      const dist = getDistance(fromLat, fromLng, stop.lat, stop.lng);
      if (dist < nearestHomeDist) { nearestHomeDist = dist; nearestHome = stop; nearestHomeIdx = idx; }
    });

    // Trouver l'arrêt le plus proche du casino sur cette ligne
    let nearestCasino = null, nearestCasinoDist = Infinity, nearestCasinoIdx = -1;
    line.stops.forEach((stop, idx) => {
      const dist = getDistance(casino.lat, casino.lng, stop.lat, stop.lng);
      if (dist < nearestCasinoDist) { nearestCasinoDist = dist; nearestCasino = stop; nearestCasinoIdx = idx; }
    });

    // Si les deux arrêts sont différents, on a un itinéraire direct
    if (nearestHome && nearestCasino && nearestHomeIdx !== nearestCasinoIdx) {
      const startIdx = Math.min(nearestHomeIdx, nearestCasinoIdx);
      const endIdx = Math.max(nearestHomeIdx, nearestCasinoIdx);
      let busDistance = 0;
      const busStops = [];
      for (let i = startIdx; i <= endIdx; i++) {
        busStops.push(line.stops[i]);
        if (i < endIdx) busDistance += getDistance(line.stops[i].lat, line.stops[i].lng, line.stops[i + 1].lat, line.stops[i + 1].lng);
      }

      results.push({
        line,
        nearestToHome: nearestHome,
        nearestToHomeDist: nearestHomeDist,
        nearestToHomeIdx: nearestHomeIdx,
        nearestToCasino: nearestCasino,
        nearestToCasinoDist: nearestCasinoDist,
        nearestToCasinoIdx: nearestCasinoIdx,
        busStops,
        busDistance,
        totalWalkDist: nearestHomeDist + nearestCasinoDist,
        totalDist: nearestHomeDist + nearestCasinoDist + busDistance,
        nbStops: Math.abs(nearestCasinoIdx - nearestHomeIdx),
        isTransfer: false
      });
    }
  });

  // --- 2. Chercher avec 1 correspondance ---
  for (let i = 0; i < busLines.value.length; i++) {
    const line1 = busLines.value[i];

    // Trouver l'arrêt le plus proche du départ sur line1
    let home1 = null, home1Dist = Infinity, home1Idx = -1;
    line1.stops.forEach((stop, idx) => {
      const dist = getDistance(fromLat, fromLng, stop.lat, stop.lng);
      if (dist < home1Dist) { home1Dist = dist; home1 = stop; home1Idx = idx; }
    });
    if (home1Dist > 5) continue; // Trop loin, ignorer cette ligne

    for (let j = 0; j < busLines.value.length; j++) {
      if (i === j) continue;
      const line2 = busLines.value[j];

      // Trouver l'arrêt le plus proche du casino sur line2
      let casino2 = null, casino2Dist = Infinity, casino2Idx = -1;
      line2.stops.forEach((stop, idx) => {
        const dist = getDistance(casino.lat, casino.lng, stop.lat, stop.lng);
        if (dist < casino2Dist) { casino2Dist = dist; casino2 = stop; casino2Idx = idx; }
      });

      // Trouver la meilleure correspondance entre line1 et line2
      let bestTDist = Infinity, t1Idx = -1, t2Idx = -1, tStop1 = null, tStop2 = null;
      line1.stops.forEach((s1, idx1) => {
        line2.stops.forEach((s2, idx2) => {
          const dist = getDistance(s1.lat, s1.lng, s2.lat, s2.lng);
          if (dist < bestTDist) { bestTDist = dist; t1Idx = idx1; t2Idx = idx2; tStop1 = s1; tStop2 = s2; }
        });
      });
      if (bestTDist > MAX_TRANSFER_DIST || t1Idx === home1Idx || t2Idx === casino2Idx) continue;

      // Calculer le segment line1
      const s1Start = Math.min(home1Idx, t1Idx), s1End = Math.max(home1Idx, t1Idx);
      let dist1 = 0; const stops1 = [];
      for (let k = s1Start; k <= s1End; k++) {
        stops1.push(line1.stops[k]);
        if (k < s1End) dist1 += getDistance(line1.stops[k].lat, line1.stops[k].lng, line1.stops[k+1].lat, line1.stops[k+1].lng);
      }

      // Calculer le segment line2
      const s2Start = Math.min(t2Idx, casino2Idx), s2End = Math.max(t2Idx, casino2Idx);
      let dist2 = 0; const stops2 = [];
      for (let k = s2Start; k <= s2End; k++) {
        stops2.push(line2.stops[k]);
        if (k < s2End) dist2 += getDistance(line2.stops[k].lat, line2.stops[k].lng, line2.stops[k+1].lat, line2.stops[k+1].lng);
      }

      const totalWalkDist = home1Dist + bestTDist + casino2Dist;
      results.push({
        line: line1,
        line2,
        isTransfer: true,
        nearestToHome: home1,
        nearestToHomeDist: home1Dist,
        nearestToHomeIdx: home1Idx,
        transferStop102: tStop1,
        transferStopLine: tStop2,
        transferDist: bestTDist,
        nearestToCasino: casino2,
        nearestToCasinoDist: casino2Dist,
        nearestToCasinoIdx: casino2Idx,
        busStops: stops1,
        busStops2: stops2,
        busDistance: dist1 + dist2,
        totalWalkDist,
        totalDist: totalWalkDist + dist1 + dist2,
        nbStops: (s1End - s1Start) + (s2End - s2Start)
      });
    }
  }

  // --- 3. Chercher avec 2 correspondances ---
  for (let i = 0; i < busLines.value.length; i++) {
    const line1 = busLines.value[i];

    // Trouver l'arrêt le plus proche du départ sur line1
    let home1 = null, home1Dist = Infinity, home1Idx = -1;
    line1.stops.forEach((stop, idx) => {
      const dist = getDistance(fromLat, fromLng, stop.lat, stop.lng);
      if (dist < home1Dist) { home1Dist = dist; home1 = stop; home1Idx = idx; }
    });
    if (home1Dist > 3) continue; // Limiter à 3km pour éviter trop de calculs

    for (let j = 0; j < busLines.value.length; j++) {
      if (i === j) continue;
      const line2 = busLines.value[j];

      // Correspondance line1 → line2
      let t1Dist = Infinity, t1_l1Idx = -1, t1_l2Idx = -1, t1StopL1 = null, t1StopL2 = null;
      line1.stops.forEach((s1, idx1) => {
        line2.stops.forEach((s2, idx2) => {
          const dist = getDistance(s1.lat, s1.lng, s2.lat, s2.lng);
          if (dist < t1Dist) { t1Dist = dist; t1_l1Idx = idx1; t1_l2Idx = idx2; t1StopL1 = s1; t1StopL2 = s2; }
        });
      });
      if (t1Dist > MAX_TRANSFER_DIST) continue;

      for (let k = 0; k < busLines.value.length; k++) {
        if (k === i || k === j) continue;
        const line3 = busLines.value[k];

        // Correspondance line2 → line3
        let t2Dist = Infinity, t2_l2Idx = -1, t2_l3Idx = -1, t2StopL2 = null, t2StopL3 = null;
        line2.stops.forEach((s2, idx2) => {
          line3.stops.forEach((s3, idx3) => {
            const dist = getDistance(s2.lat, s2.lng, s3.lat, s3.lng);
            if (dist < t2Dist) { t2Dist = dist; t2_l2Idx = idx2; t2_l3Idx = idx3; t2StopL2 = s2; t2StopL3 = s3; }
          });
        });
        if (t2Dist > MAX_TRANSFER_DIST) continue;
        if (t2_l2Idx === t1_l2Idx) continue;

        // Arrêt de line3 le plus proche du casino
        let casino3 = null, casino3Dist = Infinity, casino3Idx = -1;
        line3.stops.forEach((stop, idx) => {
          const dist = getDistance(casino.lat, casino.lng, stop.lat, stop.lng);
          if (dist < casino3Dist) { casino3Dist = dist; casino3 = stop; casino3Idx = idx; }
        });
        if (casino3Idx === t2_l3Idx) continue;

        // Calculer les segments
        const s1Start = Math.min(home1Idx, t1_l1Idx), s1End = Math.max(home1Idx, t1_l1Idx);
        let dist1 = 0; const stops1 = [];
        for (let x = s1Start; x <= s1End; x++) {
          stops1.push(line1.stops[x]);
          if (x < s1End) dist1 += getDistance(line1.stops[x].lat, line1.stops[x].lng, line1.stops[x+1].lat, line1.stops[x+1].lng);
        }

        const s2Start = Math.min(t1_l2Idx, t2_l2Idx), s2End = Math.max(t1_l2Idx, t2_l2Idx);
        let dist2 = 0; const stops2 = [];
        for (let x = s2Start; x <= s2End; x++) {
          stops2.push(line2.stops[x]);
          if (x < s2End) dist2 += getDistance(line2.stops[x].lat, line2.stops[x].lng, line2.stops[x+1].lat, line2.stops[x+1].lng);
        }

        const s3Start = Math.min(t2_l3Idx, casino3Idx), s3End = Math.max(t2_l3Idx, casino3Idx);
        let dist3 = 0; const stops3 = [];
        for (let x = s3Start; x <= s3End; x++) {
          stops3.push(line3.stops[x]);
          if (x < s3End) dist3 += getDistance(line3.stops[x].lat, line3.stops[x].lng, line3.stops[x+1].lat, line3.stops[x+1].lng);
        }

        const totalWalkDist = home1Dist + t1Dist + t2Dist + casino3Dist;
        results.push({
          line: line1,
          line2,
          line3,
          isTransfer: true,
          isDoubleTransfer: true,
          nearestToHome: home1,
          nearestToHomeDist: home1Dist,
          nearestToHomeIdx: home1Idx,
          transferStop102: t1StopL1,
          transferStopLine: t1StopL2,
          transferDist: t1Dist,
          transferStop2From: t2StopL2,
          transferStop2To: t2StopL3,
          transferDist2: t2Dist,
          nearestToCasino: casino3,
          nearestToCasinoDist: casino3Dist,
          nearestToCasinoIdx: casino3Idx,
          busStops: stops1,
          busStops2: stops2,
          busStops3: stops3,
          busDistance: dist1 + dist2 + dist3,
          totalWalkDist,
          totalDist: totalWalkDist + dist1 + dist2 + dist3,
          nbStops: (s1End - s1Start) + (s2End - s2Start) + (s3End - s3Start)
        });
      }
    }
  }

  // Trier par moins de marche totale
  results.sort((a, b) => a.totalWalkDist - b.totalWalkDist);

  // Retourner le meilleur
  return results.length > 0 ? [results[0]] : [];
};

// Nettoyer les layers de transit
const clearTransitLayers = () => {
  transitLayers.forEach(layer => {
    if (map) map.removeLayer(layer);
  });
  transitLayers = [];
};

// Afficher l'itinéraire en transport en commun sur la carte
const showTransitRoute = (casino, startLat = null, startLng = null) => {
  if (!map) return;

  const fromLat = startLat || HOME_LOCATION.lat;
  const fromLng = startLng || HOME_LOCATION.lng;
  const isFromHome = (fromLat === HOME_LOCATION.lat && fromLng === HOME_LOCATION.lng);

  // Si depuis la maison, utiliser l'algo avec la 102
  // Sinon, chercher la ligne la plus proche de la position
  const routes = isFromHome ? findBestTransitRoute(casino) : findTransitFromLocation(casino, fromLat, fromLng);
  if (routes.length === 0) {
    routeInfo.value = {
      casino: casino.name,
      casinoData: casino,
      distanceKm: '—',
      distanceMiles: '—',
      durationMin: '—',
      transitDetails: null,
      noRoute: true
    };
    return;
  }

  const best = routes[0];
  drawTransitOnMap(casino, best);
};

// Dessiner un itinéraire transit sur la carte
const drawTransitOnMap = (casino, best) => {
  clearTransitLayers();

  const line = best.line;
  const allBusCoords = [];

  // Point de départ (maison ou position)
  let startLat, startLng;
  if (routeFrom.value === 'location' && userLocation.value) {
    startLat = userLocation.value.lat;
    startLng = userLocation.value.lng;
  } else {
    startLat = HOME_LOCATION.lat;
    startLng = HOME_LOCATION.lng;
  }

  // Dessiner la marche départ → arrêt de bus
  const walkToStop = L.polyline(
    [[startLat, startLng], [best.nearestToHome.lat, best.nearestToHome.lng]],
    { color: '#94a3b8', weight: 4, dashArray: '6, 8', opacity: 0.8 }
  ).addTo(map);
  transitLayers.push(walkToStop);

  // Dessiner le trajet en bus (1ère ligne)
  const busCoords = best.busStops.map(s => [s.lat, s.lng]);
  allBusCoords.push(...busCoords);
  const busPolyline = L.polyline(busCoords, {
    color: line.color,
    weight: 7,
    opacity: 0.9,
    dashArray: line.isMonorail ? null : '12, 6'
  }).addTo(map);
  transitLayers.push(busPolyline);

  // Marqueur montée
  const boardIcon = L.divIcon({
    className: 'transit-stop-marker',
    html: `<div class="transit-board-icon" style="background: ${line.color}">🚏</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
  const boardMarker = L.marker([best.nearestToHome.lat, best.nearestToHome.lng], { icon: boardIcon })
    .bindPopup(`<div class="bus-stop-popup"><h4>🚏 Montée</h4><p><strong>${best.nearestToHome.name}</strong></p><p style="color: ${line.color}">${line.isMonorail ? '🚝' : '🚌'} ${line.name} - ${line.description}</p></div>`)
    .addTo(map);
  transitLayers.push(boardMarker);

  // Si correspondance (1 ou 2)
  if (best.isTransfer && best.line2) {
    // 1ère correspondance : line1 → line2
    const walkTransfer = L.polyline(
      [[best.transferStop102.lat, best.transferStop102.lng], [best.transferStopLine.lat, best.transferStopLine.lng]],
      { color: '#94a3b8', weight: 4, dashArray: '6, 8', opacity: 0.8 }
    ).addTo(map);
    transitLayers.push(walkTransfer);

    const transferIcon = L.divIcon({
      className: 'transit-stop-marker',
      html: `<div class="transit-board-icon" style="background: ${best.line2.color}">⇄</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
    const transferMarker = L.marker([best.transferStopLine.lat, best.transferStopLine.lng], { icon: transferIcon })
      .bindPopup(`<div class="bus-stop-popup"><h4>⇄ Correspondance</h4><p>${line.name} → ${best.line2.name}</p></div>`)
      .addTo(map);
    transitLayers.push(transferMarker);

    // Trajet line2
    const busCoords2 = best.busStops2.map(s => [s.lat, s.lng]);
    allBusCoords.push(...busCoords2);
    const busPolyline2 = L.polyline(busCoords2, {
      color: best.line2.color,
      weight: 7,
      opacity: 0.9,
      dashArray: best.line2.isMonorail ? null : '12, 6'
    }).addTo(map);
    transitLayers.push(busPolyline2);

    // 2ème correspondance : line2 → line3 (si double transfert)
    if (best.isDoubleTransfer && best.line3) {
      const walkTransfer2 = L.polyline(
        [[best.transferStop2From.lat, best.transferStop2From.lng], [best.transferStop2To.lat, best.transferStop2To.lng]],
        { color: '#94a3b8', weight: 4, dashArray: '6, 8', opacity: 0.8 }
      ).addTo(map);
      transitLayers.push(walkTransfer2);

      const transferIcon2 = L.divIcon({
        className: 'transit-stop-marker',
        html: `<div class="transit-board-icon" style="background: ${best.line3.color}">⇄</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      const transferMarker2 = L.marker([best.transferStop2To.lat, best.transferStop2To.lng], { icon: transferIcon2 })
        .bindPopup(`<div class="bus-stop-popup"><h4>⇄ Correspondance</h4><p>${best.line2.name} → ${best.line3.name}</p></div>`)
        .addTo(map);
      transitLayers.push(transferMarker2);

      // Trajet line3
      const busCoords3 = best.busStops3.map(s => [s.lat, s.lng]);
      allBusCoords.push(...busCoords3);
      const busPolyline3 = L.polyline(busCoords3, {
        color: best.line3.color,
        weight: 7,
        opacity: 0.9,
        dashArray: best.line3.isMonorail ? null : '12, 6'
      }).addTo(map);
      transitLayers.push(busPolyline3);
    }
  }

  // Dessiner la marche arrêt → casino
  const walkFromStop = L.polyline(
    [[best.nearestToCasino.lat, best.nearestToCasino.lng], [casino.lat, casino.lng]],
    { color: '#94a3b8', weight: 4, dashArray: '6, 8', opacity: 0.8 }
  ).addTo(map);
  transitLayers.push(walkFromStop);

  // Marqueur descente
  const alightColor = best.isDoubleTransfer ? best.line3.color : (best.isTransfer ? best.line2.color : line.color);
  const alightIcon = L.divIcon({
    className: 'transit-stop-marker',
    html: `<div class="transit-alight-icon" style="background: ${alightColor}">🚏</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
  const alightMarker = L.marker([best.nearestToCasino.lat, best.nearestToCasino.lng], { icon: alightIcon })
    .bindPopup(`<div class="bus-stop-popup"><h4>🚏 Descente</h4><p><strong>${best.nearestToCasino.name}</strong></p></div>`)
    .addTo(map);
  transitLayers.push(alightMarker);

  // Ajuster la vue
  const bounds = L.latLngBounds([
    [startLat, startLng],
    [casino.lat, casino.lng],
    ...allBusCoords
  ]);
  map.fitBounds(bounds, { padding: [100, 100], maxZoom: 13 });

  // Calcul des temps
  const walkTimeToStop = Math.round((best.nearestToHomeDist / 5) * 60);
  const walkTimeFromStop = Math.round((best.nearestToCasinoDist / 5) * 60);
  const busSpeed = line.isMonorail ? 40 : 20;
  const busTime = Math.round((best.busDistance / busSpeed) * 60);
  const waitTime = line.isMonorail ? 6 : 15;
  const transferWaitTime = best.isTransfer ? (best.isDoubleTransfer ? 20 : 10) : 0;
  const totalTime = walkTimeToStop + waitTime + busTime + transferWaitTime + walkTimeFromStop;
  const totalDistKm = (best.totalDist).toFixed(1);
  const totalDistMiles = (best.totalDist * 0.621371).toFixed(1);

  routeInfo.value = {
    casino: casino.name,
    casinoData: casino,
    distanceKm: totalDistKm,
    distanceMiles: totalDistMiles,
    durationMin: totalTime,
    transitDetails: {
      line: line,
      line2: best.line2 || null,
      line3: best.line3 || null,
      isTransfer: best.isTransfer || false,
      isDoubleTransfer: best.isDoubleTransfer || false,
      boardStop: best.nearestToHome.name,
      alightStop: best.nearestToCasino.name,
      transferStop: best.isTransfer ? best.transferStop102.name : null,
      transferStop2: best.isDoubleTransfer ? best.transferStop2From.name : null,
      nbStops: best.nbStops,
      walkToStop: walkTimeToStop,
      waitTime: waitTime,
      busTime: busTime,
      walkFromStop: walkTimeFromStop
    }
  };
};

// Afficher l'itinéraire sur la carte (les deux modes simultanément)
const showRoute = (casino, mode = 'both') => {
  if (!map) return;

  // Déterminer le point de départ
  let startLat, startLng;
  if (routeFrom.value === 'location' && userLocation.value) {
    startLat = userLocation.value.lat;
    startLng = userLocation.value.lng;
  } else {
    startLat = HOME_LOCATION.lat;
    startLng = HOME_LOCATION.lng;
  }

  // Supprimer l'itinéraire précédent
  clearRoute();

  routeMode.value = mode === 'both' ? 'driving' : mode;
  activeRoute.value = casino.name;

  // Si mode = 'both', afficher voiture ET bus
  if (mode === 'both') {
    showBothRoutes.value = true;
    // Afficher le trajet en voiture (OSRM)
    showDrivingRoute(casino, startLat, startLng);
    // Afficher le trajet en bus
    showTransitRouteOnly(casino, startLat, startLng);
  } else if (mode === 'transit') {
    showBothRoutes.value = false;
    showTransitRoute(casino, startLat, startLng);
  } else {
    // Mode voiture uniquement
    showBothRoutes.value = false;
    showDrivingRoute(casino, startLat, startLng);
  }
};

// Afficher uniquement le trajet en voiture
const showDrivingRoute = (casino, startLat, startLng) => {
  routingControl = L.Routing.control({
    waypoints: [
      L.latLng(startLat, startLng),
      L.latLng(casino.lat, casino.lng)
    ],
    routeWhileDragging: false,
    addWaypoints: false,
    draggableWaypoints: false,
    fitSelectedRoutes: false, // Désactivé pour gérer manuellement le zoom
    showAlternatives: false,
    createMarker: () => null,
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
      durationMin,
      mode: 'driving'
    };

    // Ajuster la vue avec moins de zoom
    if (showBothRoutes.value) {
      fitBoundsForBothRoutes(casino, startLat, startLng);
    } else {
      // Mode unique voiture - fit avec padding augmenté
      const bounds = L.latLngBounds([
        [startLat, startLng],
        [casino.lat, casino.lng]
      ]);
      map.fitBounds(bounds, { padding: [100, 100], maxZoom: 13 });
    }
  });

  routingControl.on('routingerror', (e) => {
    console.error('Erreur de routage:', e);
    routeInfo.value = {
      casino: casino.name,
      casinoData: casino,
      distanceKm: '—',
      distanceMiles: '—',
      durationMin: '—',
      noRoute: true,
      mode: 'driving'
    };
  });
};

// Afficher le trajet transit sans modifier routeInfo principal (pour mode "both")
const showTransitRouteOnly = (casino, startLat, startLng) => {
  const fromLat = startLat || HOME_LOCATION.lat;
  const fromLng = startLng || HOME_LOCATION.lng;
  const isFromHome = (fromLat === HOME_LOCATION.lat && fromLng === HOME_LOCATION.lng);

  const routes = isFromHome ? findBestTransitRoute(casino) : findTransitFromLocation(casino, fromLat, fromLng);
  if (routes.length === 0) {
    routeInfoTransit.value = {
      casino: casino.name,
      casinoData: casino,
      distanceKm: '—',
      distanceMiles: '—',
      durationMin: '—',
      transitDetails: null,
      noRoute: true
    };
    return;
  }

  const best = routes[0];
  drawTransitOnMapForBoth(casino, best, fromLat, fromLng);
};

// Dessiner le trajet transit pour le mode "both" (sans modifier routeInfo principal)
const drawTransitOnMapForBoth = (casino, best, startLat, startLng) => {
  // Ne pas effacer les autres layers transit ici
  const line = best.line;

  // Dessiner la marche départ → arrêt de bus
  const walkToStop = L.polyline(
    [[startLat, startLng], [best.nearestToHome.lat, best.nearestToHome.lng]],
    { color: '#22c55e', weight: 4, dashArray: '6, 8', opacity: 0.8 }
  ).addTo(map);
  transitLayers.push(walkToStop);

  // Dessiner le trajet en bus (1ère ligne)
  const busCoords = best.busStops.map(s => [s.lat, s.lng]);
  const busPolyline = L.polyline(busCoords, {
    color: line.color,
    weight: 5,
    opacity: 0.85,
    dashArray: line.isMonorail ? null : '10, 6'
  }).addTo(map);
  transitLayers.push(busPolyline);

  // Si correspondance (1 ou 2)
  if (best.isTransfer && best.line2) {
    const walkTransfer = L.polyline(
      [[best.transferStop102.lat, best.transferStop102.lng], [best.transferStopLine.lat, best.transferStopLine.lng]],
      { color: '#22c55e', weight: 4, dashArray: '6, 8', opacity: 0.8 }
    ).addTo(map);
    transitLayers.push(walkTransfer);

    const busCoords2 = best.busStops2.map(s => [s.lat, s.lng]);
    const busPolyline2 = L.polyline(busCoords2, {
      color: best.line2.color,
      weight: 5,
      opacity: 0.85,
      dashArray: best.line2.isMonorail ? null : '10, 6'
    }).addTo(map);
    transitLayers.push(busPolyline2);

    if (best.isDoubleTransfer && best.line3) {
      const walkTransfer2 = L.polyline(
        [[best.transferStop2From.lat, best.transferStop2From.lng], [best.transferStop2To.lat, best.transferStop2To.lng]],
        { color: '#22c55e', weight: 4, dashArray: '6, 8', opacity: 0.8 }
      ).addTo(map);
      transitLayers.push(walkTransfer2);

      const busCoords3 = best.busStops3.map(s => [s.lat, s.lng]);
      const busPolyline3 = L.polyline(busCoords3, {
        color: best.line3.color,
        weight: 5,
        opacity: 0.85,
        dashArray: best.line3.isMonorail ? null : '10, 6'
      }).addTo(map);
      transitLayers.push(busPolyline3);
    }
  }

  // Dessiner la marche arrêt → casino
  const walkFromStop = L.polyline(
    [[best.nearestToCasino.lat, best.nearestToCasino.lng], [casino.lat, casino.lng]],
    { color: '#22c55e', weight: 4, dashArray: '6, 8', opacity: 0.8 }
  ).addTo(map);
  transitLayers.push(walkFromStop);

  // Calcul des temps pour le panneau transit
  const walkTimeToStop = Math.round((best.nearestToHomeDist / 5) * 60);
  const walkTimeFromStop = Math.round((best.nearestToCasinoDist / 5) * 60);
  const busSpeed = line.isMonorail ? 40 : 20;
  const busTime = Math.round((best.busDistance / busSpeed) * 60);
  const waitTime = line.isMonorail ? 6 : 15;
  const transferWaitTime = best.isTransfer ? (best.isDoubleTransfer ? 20 : 10) : 0;
  const totalTime = walkTimeToStop + waitTime + busTime + transferWaitTime + walkTimeFromStop;
  const totalDistKm = (best.totalDist).toFixed(1);
  const totalDistMiles = (best.totalDist * 0.621371).toFixed(1);

  routeInfoTransit.value = {
    casino: casino.name,
    casinoData: casino,
    distanceKm: totalDistKm,
    distanceMiles: totalDistMiles,
    durationMin: totalTime,
    transitDetails: {
      line: line,
      line2: best.line2 || null,
      line3: best.line3 || null,
      isTransfer: best.isTransfer || false,
      isDoubleTransfer: best.isDoubleTransfer || false,
      boardStop: best.nearestToHome.name,
      alightStop: best.nearestToCasino.name,
      transferStop: best.isTransfer ? best.transferStop102.name : null,
      transferStop2: best.isDoubleTransfer ? best.transferStop2From.name : null,
      nbStops: best.nbStops,
      walkToStop: walkTimeToStop,
      waitTime: waitTime,
      busTime: busTime,
      walkFromStop: walkTimeFromStop
    }
  };
};

// Ajuster la vue pour montrer les deux trajets
const fitBoundsForBothRoutes = (casino, startLat, startLng) => {
  if (!map) return;
  const bounds = L.latLngBounds([
    [startLat, startLng],
    [casino.lat, casino.lng]
  ]);
  // Ajouter un petit délai pour laisser les polylines se dessiner
  setTimeout(() => {
    map.fitBounds(bounds, { padding: [100, 100], maxZoom: 13 });
  }, 100);
};

// Effacer l'itinéraire
const clearRoute = () => {
  if (routingControl && map) {
    map.removeControl(routingControl);
    routingControl = null;
  }
  clearTransitLayers();
  activeRoute.value = null;
  routeInfo.value = null;
  routeInfoTransit.value = null;
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

    // Fonction pour générer le contenu du popup dynamiquement
    const getPopupContent = () => {
      const mobileClass = isMobile.value ? ' mobile' : '';
      const hasGeoLocation = userLocation.value !== null;

      // Section "Itinéraire depuis" seulement si géolocalisation activée
      const fromSection = hasGeoLocation ? `
        <p class="popup-route-label">${isMobile.value ? '' : 'Itinéraire depuis :'}</p>
        <div class="popup-actions popup-from-actions">
          <button class="directions-btn directions-home-btn ${routeFrom.value === 'home' ? 'active' : ''}" data-casino-index="${casinoIndex}" data-from="home">
            <i class="pi pi-home"></i>${isMobile.value ? '' : ' Maison'}
          </button>
          <button class="directions-btn directions-loc-btn ${routeFrom.value === 'location' ? 'active' : ''}" data-casino-index="${casinoIndex}" data-from="location">
            <i class="pi pi-compass"></i>${isMobile.value ? '' : ' Ma position'}
          </button>
        </div>
      ` : '';

      return `
        <div class="casino-popup${mobileClass}">
          <h3>${casino.name}</h3>
          <p class="popup-address"><i class="pi pi-map-marker"></i> ${casino.address}</p>
          <p class="popup-rooms"><i class="pi pi-heart"></i> ${casino.rooms}</p>
          <p class="popup-desc">${casino.description}</p>
          ${fromSection}
          <div class="popup-actions popup-mode-actions">
            <button class="directions-btn directions-both-btn" data-casino-index="${casinoIndex}" data-mode="both">
              <i class="pi pi-car"></i><i class="pi pi-directions"></i>${isMobile.value ? '' : ' Itinéraire'}
            </button>
          </div>
        </div>
      `;
    };

    // Créer le popup avec contenu vide initialement
    const popup = L.popup({
      maxWidth: 300,
      className: 'casino-popup-container'
    });

    marker.bindPopup(popup);

    // Ajouter l'écouteur d'événement pour les boutons d'itinéraire
    marker.on('popupopen', () => {
      // Mettre à jour le contenu du popup dynamiquement
      popup.setContent(getPopupContent());

      setTimeout(() => {
        const homeBtn = document.querySelector(`.directions-home-btn[data-casino-index="${casinoIndex}"]`);
        const locBtn = document.querySelector(`.directions-loc-btn[data-casino-index="${casinoIndex}"]`);
        const bothBtn = document.querySelector(`.directions-both-btn[data-casino-index="${casinoIndex}"]`);

        // Gérer la sélection du point de départ (seulement si géoloc activée)
        if (homeBtn) {
          homeBtn.addEventListener('click', () => {
            routeFrom.value = 'home';
            homeBtn.classList.add('active');
            if (locBtn) locBtn.classList.remove('active');
          });
        }
        if (locBtn) {
          locBtn.addEventListener('click', () => {
            routeFrom.value = 'location';
            locBtn.classList.add('active');
            if (homeBtn) homeBtn.classList.remove('active');
          });
        }

        // Bouton "Itinéraire" - afficher voiture ET bus
        if (bothBtn) {
          bothBtn.addEventListener('click', () => {
            showRoute(casino, 'both');
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

// Géolocalisation de l'utilisateur
const geolocateUser = () => {
  if (!map) return;

  // Si déjà localisé, centrer sur la position
  if (userLocation.value) {
    map.setView([userLocation.value.lat, userLocation.value.lng], 15);
    return;
  }

  if (!navigator.geolocation) {
    alert('La géolocalisation n\'est pas supportée par votre navigateur');
    return;
  }

  geolocating.value = true;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      userLocation.value = { lat, lng };
      geolocating.value = false;

      // Supprimer l'ancien marqueur si existant
      if (userLocationMarker) {
        map.removeLayer(userLocationMarker);
      }

      // Créer le marqueur de position
      const locationIcon = L.divIcon({
        className: 'user-location-marker',
        html: `
          <div class="user-location-dot">
            <div class="user-location-pulse"></div>
            <div class="user-location-center"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      userLocationMarker = L.marker([lat, lng], { icon: locationIcon })
        .bindPopup(`
          <div class="casino-popup">
            <h3>📍 Ma position</h3>
            <p class="popup-address">Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}</p>
          </div>
        `)
        .addTo(map);

      // Centrer la carte sur la position
      map.setView([lat, lng], 15);
    },
    (error) => {
      geolocating.value = false;
      let message = 'Impossible de vous localiser';
      switch (error.code) {
        case error.PERMISSION_DENIED:
          message = 'Vous avez refusé la géolocalisation';
          break;
        case error.POSITION_UNAVAILABLE:
          message = 'Position indisponible';
          break;
        case error.TIMEOUT:
          message = 'Délai de géolocalisation dépassé';
          break;
      }
      alert(message);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    }
  );
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

// Toggle affichage des lignes de bus (sans monorail)
const toggleBusLines = () => {
  showBusLines.value = !showBusLines.value;
  redrawTransitLines();
};

// Toggle affichage du monorail
const toggleMonorail = () => {
  showMonorail.value = !showMonorail.value;
  redrawTransitLines();
};

// Redessiner les lignes de transport selon les filtres actifs
const redrawTransitLines = () => {
  clearBusLines();
  selectedBusLine.value = null;

  if (showBusLines.value || showMonorail.value) {
    drawBusLines();
    setCasinoMarkersOpacity(0.3);
  } else {
    setCasinoMarkersOpacity(1);
  }
};

// Dessiner les lignes de bus sur la carte
const drawBusLines = (highlightLineId = null) => {
  if (!map) return;

  // Nettoyer les lignes existantes
  clearBusLines();

  // Filtrer les lignes selon les boutons actifs ET la sélection individuelle
  let linesToDraw = busLines.value.filter(line => {
    if (line.isMonorail) {
      return showMonorail.value;
    } else {
      return showBusLines.value;
    }
  });

  // Si une ligne spécifique est sélectionnée, n'afficher que celle-ci
  if (highlightLineId !== null) {
    linesToDraw = linesToDraw.filter(line => line.id === highlightLineId);
  }

  linesToDraw.forEach(line => {
    const isHighlighted = true; // Toujours en évidence puisqu'on ne montre que les lignes sélectionnées
    const opacity = 0.9;
    const weight = 6;
    const isMonorail = line.isMonorail === true;

    // Créer la polyline pour la ligne de bus
    const coordinates = line.stops.map(stop => [stop.lat, stop.lng]);

    // Le monorail a une ligne continue, les bus ont des pointillés
    const dashArray = isMonorail
      ? null
      : (isHighlighted ? '10, 10' : '5, 5');

    const polyline = L.polyline(coordinates, {
      color: line.color,
      weight: isMonorail ? weight + 2 : weight,
      opacity: opacity,
      dashArray: dashArray,
      lineId: line.id
    }).addTo(map);

    const icon = isMonorail ? '🚝' : '🚌';
    polyline.bindPopup(`
      <div class="bus-popup">
        <h3 style="color: ${line.color}">${icon} ${line.name}</h3>
        <p>${line.description}</p>
        <p><strong>Fréquence:</strong> ${line.frequency}</p>
        <p><strong>Horaires:</strong> ${line.hours}</p>
        <p><strong>Tarif:</strong> ${line.fare}</p>
        <a href="${line.link}" target="_blank" class="bus-link">Plus d'infos →</a>
      </div>
    `);

    // Clic sur la ligne pour la sélectionner
    polyline.on('click', () => {
      focusBusLine(line);
    });

    busLinesLayers.push({ layer: polyline, lineId: line.id });

    // Ajouter les marqueurs pour les arrêts (seulement si la ligne est mise en évidence ou aucune sélection)
    if (isHighlighted) {
      line.stops.forEach((stop, index) => {
        const isTerminal = index === 0 || index === line.stops.length - 1;

        const stopIcon = L.divIcon({
          className: 'bus-stop-marker',
          html: `
            <div class="bus-stop-icon ${isTerminal ? 'terminal' : ''}" style="background: ${line.color}; opacity: ${opacity}">
              <span>${isTerminal ? '●' : '○'}</span>
            </div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        const stopMarker = L.marker([stop.lat, stop.lng], { icon: stopIcon })
          .addTo(map)
          .bindPopup(`
            <div class="bus-stop-popup">
              <h4>${stop.name}</h4>
              <p style="color: ${line.color}"><strong>${line.name}</strong> - ${line.description}</p>
            </div>
          `);

        busStopMarkers.push({ marker: stopMarker, lineId: line.id });
      });
    }
  });
};

// Effacer les lignes de bus de la carte
const clearBusLines = () => {
  busLinesLayers.forEach(item => {
    if (map) map.removeLayer(item.layer || item);
  });
  busLinesLayers = [];

  busStopMarkers.forEach(item => {
    if (map) map.removeLayer(item.marker || item);
  });
  busStopMarkers = [];
};

// Activer le toggle approprié et focus sur la ligne
const activateAndFocusLine = (line) => {
  if (line.isMonorail) {
    if (!showMonorail.value) {
      showMonorail.value = true;
    }
  } else {
    if (!showBusLines.value) {
      showBusLines.value = true;
    }
  }
  focusBusLine(line);
};

// Focus sur une ligne de bus
const focusBusLine = (line) => {
  if (!map || !line.stops.length) return;

  // Si on clique sur la même ligne déjà sélectionnée, on désélectionne
  if (selectedBusLine.value === line.id) {
    selectedBusLine.value = null;
    drawBusLines(null); // Redessiner toutes les lignes normalement
    setCasinoMarkersOpacity(1); // Restaurer l'opacité des casinos

    // Ajuster la vue pour montrer toutes les lignes
    const allBounds = L.latLngBounds();
    busLines.value.forEach(l => {
      l.stops.forEach(stop => {
        allBounds.extend([stop.lat, stop.lng]);
      });
    });
    map.fitBounds(allBounds, { padding: [50, 50] });
  } else {
    // Sélectionner la nouvelle ligne
    selectedBusLine.value = line.id;

    // Redessiner avec la ligne mise en évidence
    drawBusLines(line.id);
    setCasinoMarkersOpacity(0.2); // Rendre les casinos transparents

    // Zoom sur la ligne sélectionnée
    const bounds = L.latLngBounds();
    line.stops.forEach(stop => {
      bounds.extend([stop.lat, stop.lng]);
    });
    map.fitBounds(bounds, { padding: [50, 50] });
  }
};

// Modifier l'opacité des marqueurs de casinos
const setCasinoMarkersOpacity = (opacity) => {
  markers.forEach(marker => {
    const element = marker.getElement();
    if (element) {
      element.style.opacity = opacity;
      element.style.transition = 'opacity 0.3s ease';
    }
  });
};

// Réinitialiser la sélection de ligne
const clearBusLineSelection = () => {
  selectedBusLine.value = null;
  if (showBusLines.value || showMonorail.value) {
    drawBusLines(null);
  }
  setCasinoMarkersOpacity(1); // Restaurer l'opacité des casinos
};

// Watcher pour la visibilité
watch(() => props.modelValue, (newVal) => {
  visible.value = newVal;
  if (newVal) {
    setTimeout(() => {
      initMap();
    }, 100);
  } else {
    // Nettoyer l'itinéraire et les lignes de bus quand on ferme
    clearRoute();
    clearBusLines();
    showBusLines.value = false;
    showMonorail.value = false;
  }
});

watch(visible, (newVal) => {
  emit('update:modelValue', newVal);
  if (!newVal) {
    clearRoute();
    clearBusLines();
    showBusLines.value = false;
    showMonorail.value = false;
  }
});

onMounted(() => {
  if (visible.value) {
    initMap();
  }
  window.addEventListener('resize', handleResize);
});

const handleResize = () => {
  isMobile.value = window.innerWidth <= 768;
};

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
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

.casino-popup .directions-bus-btn {
  background: linear-gradient(135deg, #16a34a, #22c55e);
  box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
}

.casino-popup .directions-bus-btn:hover {
  background: linear-gradient(135deg, #15803d, #16a34a);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
}

.casino-popup .directions-home-btn {
  background: linear-gradient(135deg, #475569, #64748b);
  box-shadow: 0 2px 8px rgba(71, 85, 105, 0.3);
}

.casino-popup .directions-home-btn.active {
  background: linear-gradient(135deg, #6366f1, #818cf8);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
}

.casino-popup .directions-loc-btn {
  background: linear-gradient(135deg, #475569, #64748b);
  box-shadow: 0 2px 8px rgba(71, 85, 105, 0.3);
}

.casino-popup .directions-loc-btn.active {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
}

.casino-popup .popup-route-label {
  color: #64748b;
  font-size: 0.7rem;
  margin: 8px 0 4px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.casino-popup .popup-mode-actions {
  margin-top: 6px;
}

/* Bouton "Les deux" - voiture ET bus */
.casino-popup .directions-both-btn {
  background: linear-gradient(135deg, #6366f1, #22c55e);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
  display: flex;
  gap: 4px;
}

.casino-popup .directions-both-btn:hover {
  background: linear-gradient(135deg, #4f46e5, #16a34a);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

/* Petits boutons pour mode individuel */
.casino-popup .popup-mode-actions-single {
  margin-top: 4px;
  display: flex;
  gap: 6px;
  justify-content: center;
}

.casino-popup .single-mode-btn {
  padding: 6px 12px !important;
  min-width: 40px;
  flex: 0 !important;
}

.casino-popup .single-mode-btn.directions-car-btn {
  background: linear-gradient(135deg, #475569, #64748b);
  box-shadow: 0 2px 6px rgba(71, 85, 105, 0.3);
}

.casino-popup .single-mode-btn.directions-car-btn:hover {
  background: linear-gradient(135deg, #6366f1, #818cf8);
  box-shadow: 0 3px 8px rgba(99, 102, 241, 0.4);
}

.casino-popup .single-mode-btn.directions-bus-btn {
  background: linear-gradient(135deg, #475569, #64748b);
  box-shadow: 0 2px 6px rgba(71, 85, 105, 0.3);
}

.casino-popup .single-mode-btn.directions-bus-btn:hover {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  box-shadow: 0 3px 8px rgba(34, 197, 94, 0.4);
}

/* Mobile popup compact */
.casino-popup.mobile h3 {
  font-size: 0.875rem;
  margin-bottom: 4px;
}

.casino-popup.mobile .popup-address,
.casino-popup.mobile .popup-rooms {
  font-size: 0.6875rem;
  margin: 2px 0;
}

.casino-popup.mobile .popup-desc {
  font-size: 0.625rem;
  margin: 4px 0;
}

.casino-popup.mobile .popup-route-label {
  display: none;
}

.casino-popup.mobile .popup-actions {
  gap: 6px;
}

.casino-popup.mobile .directions-btn {
  padding: 8px 12px;
  font-size: 0.75rem;
  min-width: 36px;
  justify-content: center;
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

/* Styles des lignes de bus */
.bus-stop-marker {
  background: transparent !important;
  border: none !important;
}

.bus-stop-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 10px;
  font-weight: bold;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  border: 2px solid white;
}

.bus-stop-icon.terminal {
  width: 24px;
  height: 24px;
  font-size: 14px;
}

/* Popup bus */
.bus-popup {
  padding: 4px;
}

.bus-popup h3 {
  margin: 0 0 8px 0;
  font-size: 1rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.bus-popup p {
  margin: 4px 0;
  font-size: 0.8125rem;
  color: #94a3b8;
}

.bus-popup .bus-link {
  display: inline-block;
  margin-top: 8px;
  padding: 6px 12px;
  background: #6366f1;
  color: white;
  text-decoration: none;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.bus-popup .bus-link:hover {
  background: #4f46e5;
}

.bus-stop-popup h4 {
  margin: 0 0 4px 0;
  font-size: 0.9rem;
}

.bus-stop-popup p {
  margin: 0;
  font-size: 0.8rem;
}

/* Transit route markers */
.transit-stop-marker {
  background: transparent !important;
  border: none !important;
}

.transit-board-icon,
.transit-alight-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
  border: 2px solid white;
}

/* Marqueur de géolocalisation */
.user-location-marker {
  background: transparent !important;
  border: none !important;
}

.user-location-dot {
  position: relative;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-location-center {
  width: 14px;
  height: 14px;
  background: #3b82f6;
  border-radius: 50%;
  border: 3px solid white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);
  z-index: 2;
  position: absolute;
}

.user-location-pulse {
  position: absolute;
  width: 24px;
  height: 24px;
  background: rgba(59, 130, 246, 0.3);
  border-radius: 50%;
  animation: pulse-ring 2s ease-out infinite;
  z-index: 1;
}

@keyframes pulse-ring {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(2.2);
    opacity: 0;
  }
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
  padding: 12px 14px;
  z-index: 1000;
  border: 1px solid #6366f1;
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
  max-width: 320px;
  overflow: hidden;
}

/* Mode both routes - panneau élargi */
.route-info-panel.both-routes-panel {
  max-width: 380px;
}

.both-routes-container {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.route-card {
  flex: 1;
  background: #0f172a;
  border-radius: 10px;
  padding: 10px 12px;
  border: 2px solid transparent;
}

.route-card.driving-card {
  border-color: #6366f1;
}

.route-card.transit-card {
  border-color: #22c55e;
}

/* Cartes cliquables */
.route-card.clickable {
  cursor: pointer;
  transition: all 0.2s ease;
}

.route-card.clickable:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.route-card.driving-card.clickable:hover {
  border-color: #818cf8;
  background: rgba(99, 102, 241, 0.15);
}

.route-card.transit-card.clickable:hover {
  border-color: #4ade80;
  background: rgba(34, 197, 94, 0.15);
}

/* Indication pour cliquer */
.routes-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 0;
  font-size: 0.625rem;
  color: #64748b;
  border-top: 1px solid #334155;
  margin-top: 8px;
}

.routes-hint i {
  font-size: 0.625rem;
}

.route-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-weight: 700;
  font-size: 0.8125rem;
}

.driving-card .route-card-header {
  color: #818cf8;
}

.transit-card .route-card-header {
  color: #4ade80;
}

.route-card-header i {
  font-size: 1rem;
}

.route-card-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.route-stat-mini {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #f1f5f9;
  font-size: 0.75rem;
  font-weight: 500;
}

.route-stat-mini i {
  font-size: 0.625rem;
  width: 14px;
  text-align: center;
}

.driving-card .route-stat-mini i {
  color: #6366f1;
}

.transit-card .route-stat-mini i {
  color: #22c55e;
}

.transit-lines-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.line-badge {
  padding: 2px 6px;
  border-radius: 4px;
  color: white;
  font-size: 0.5625rem;
  font-weight: 800;
}

.badge-separator {
  color: #64748b;
  font-size: 0.5rem;
}

.transit-no-route-mini {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  color: #fca5a5;
  font-size: 0.625rem;
}

.transit-no-route-mini i {
  font-size: 0.625rem;
  color: #ef4444;
}

/* Légende des couleurs de route */
.routes-legend {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 10px;
  padding: 6px 0;
  border-top: 1px solid #334155;
  border-bottom: 1px solid #334155;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #94a3b8;
}

.legend-line {
  width: 20px;
  height: 4px;
  border-radius: 2px;
}

.driving-legend .legend-line {
  background: #6366f1;
}

.transit-legend .legend-line {
  background: #22c55e;
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

/* Liens de navigation externe dans le panneau d'itinéraire */
.route-nav-links {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin: 16px 0 12px 0;
}

.route-nav-links .nav-link-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 10px;
  text-decoration: none;
  font-weight: 700;
  font-size: 0.875rem;
  transition: all 0.25s ease;
  flex: 1;
}

.route-nav-links .nav-link-btn i {
  font-size: 1.125rem;
}

.route-nav-links .nav-link-btn.google-maps {
  background: linear-gradient(135deg, #4285f4, #34a853);
  color: white;
  box-shadow: 0 4px 12px rgba(66, 133, 244, 0.4);
}

.route-nav-links .nav-link-btn.google-maps:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(66, 133, 244, 0.5);
}

.route-nav-links .nav-link-btn.apple-maps {
  background: linear-gradient(135deg, #333333, #000000);
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.route-nav-links .nav-link-btn.apple-maps:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
}

.route-nav-links .nav-link-label {
  white-space: nowrap;
}

.route-close-btn {
  width: 100%;
}

/* Toggle mode voiture / bus */
.route-mode-toggle {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
  background: #0f172a;
  border-radius: 8px;
  padding: 4px;
}

.route-mode-toggle .mode-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  background: transparent;
  color: #64748b;
}

.route-mode-toggle .mode-btn.active {
  background: #6366f1;
  color: white;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
}

.route-mode-toggle .mode-btn:not(.active):hover {
  background: #1e293b;
  color: #94a3b8;
}

.route-mode-toggle .mode-btn i {
  font-size: 0.875rem;
}

/* Toggle options transit (Direct vs Moins de marche) */
.transit-option-toggle {
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
  background: #0f172a;
  border-radius: 6px;
  padding: 3px;
}

.transit-opt-btn {
  flex: 1;
  padding: 6px 8px;
  border: none;
  border-radius: 4px;
  font-size: 0.6875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  background: transparent;
  color: #64748b;
}

.transit-opt-btn.active {
  background: #22c55e;
  color: white;
  box-shadow: 0 2px 6px rgba(34, 197, 94, 0.3);
}

.transit-opt-btn:not(.active):hover {
  background: #1e293b;
  color: #94a3b8;
}

/* Détails transit */
.transit-details {
  background: #0f172a;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 12px;
}

.transit-steps-simple {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.transit-segment {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
}

.transit-segment.walk-segment {
  min-width: 32px;
}

.transit-segment.bus-segment {
  border-left: 3px solid;
  flex: 0 0 auto;
}

.segment-time {
  color: #f1f5f9;
  font-size: 0.75rem;
  font-weight: 700;
}

.segment-label {
  color: #64748b;
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.segment-line-badge {
  padding: 2px 6px;
  border-radius: 4px;
  color: white;
  font-size: 0.6rem;
  font-weight: 800;
}

.segment-arrow {
  color: #475569;
  font-size: 0.5rem;
  flex-shrink: 0;
}

.transit-stops-info {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-top: 8px;
  border-top: 1px solid #1e293b;
  font-size: 0.625rem;
  color: #94a3b8;
  flex-wrap: wrap;
}

.transit-stops-info .stop-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80px;
}

.transit-stops-info i {
  font-size: 0.5rem;
  color: #475569;
}

.transit-stops-info .transfer-stop {
  color: #f59e0b;
  font-weight: 600;
}

/* Message aucune route transit */
.transit-no-route {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 12px;
  color: #fca5a5;
  font-size: 0.75rem;
}

.transit-no-route i {
  font-size: 1rem;
  color: #ef4444;
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

/* Styles pour les lignes de bus */
.bus-line-item {
  border-left: 3px solid transparent;
  transition: all 0.2s ease;
}

.bus-line-item:hover {
  border-left-color: currentColor;
}

.bus-line-item.selected {
  background: rgba(99, 102, 241, 0.2);
  border-left-color: #6366f1;
  border-left-width: 4px;
}

.bus-line-item .selected-check {
  color: #22c55e;
  font-size: 1rem;
  margin-left: auto;
}

.show-all-lines-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 14px;
  margin: 8px;
  margin-bottom: 4px;
  background: rgba(99, 102, 241, 0.15);
  border: 1px dashed #6366f1;
  border-radius: 8px;
  color: #818cf8;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.show-all-lines-btn:hover {
  background: rgba(99, 102, 241, 0.25);
  color: #a5b4fc;
}

.show-all-lines-btn i {
  font-size: 0.875rem;
}

.bus-line-icon {
  width: 36px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.bus-line-icon .bus-line-number {
  font-size: 0.75rem;
  font-weight: 800;
  line-height: 1;
  text-transform: uppercase;
}

.bus-line-icon.monorail {
  border: 2px solid #232d6a;
  padding: 2px;
}

.bus-line-icon .monorail-icon-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 4px;
}

.bus-line-details {
  display: flex;
  gap: 10px;
  margin-top: 4px;
  font-size: 0.625rem;
  color: #64748b;
}

.bus-line-details span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.bus-line-details i {
  font-size: 0.5rem;
}

.external-links-container {
  display: flex;
  gap: 8px;
  padding: 8px;
}

.transit-app-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 14px;
  flex: 1;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.transit-app-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.transit-app-link i {
  font-size: 0.75rem;
}

.monorail-ticket-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  flex: 1;
  background: #ffffff;
  color: #1a1a1a;
  text-decoration: none;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 700;
  transition: all 0.2s ease;
  border: 2px solid #232d6a;
}

.monorail-ticket-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(35, 45, 106, 0.4);
  background: #e8eaf6;
}

.monorail-logo {
  height: 20px;
  width: auto;
  object-fit: contain;
}

.legend-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.monorail-btn {
  background: linear-gradient(135deg, #232d6a, #1a2150) !important;
  border-color: #232d6a !important;
}

.monorail-btn:hover {
  background: linear-gradient(135deg, #2a3680, #232d6a) !important;
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
  .hide-on-mobile {
    display: none !important;
  }

  .map-container {
    height: calc(100vh - 60px);
    max-height: calc(80vh - 60px);
    min-height: 300px;
    border-radius: 0;
  }

  .route-info-panel {
    top: auto;
    left: 8px;
    right: 8px;
    bottom: 8px;
    transform: none;
    max-width: none;
    width: auto;
    padding: 10px 12px;
    border-radius: 10px;
  }

  .route-info-panel.both-routes-panel {
    max-width: none;
  }

  .both-routes-container {
    gap: 8px;
  }

  .route-card {
    padding: 8px 10px;
  }

  .route-card-header {
    font-size: 0.75rem;
    margin-bottom: 6px;
  }

  .route-stat-mini {
    font-size: 0.6875rem;
  }

  .transit-lines-badge {
    margin-top: 6px;
  }

  .line-badge {
    font-size: 0.5rem;
    padding: 1px 4px;
  }

  .routes-hint {
    font-size: 0.5625rem;
    padding: 4px 0;
    margin-top: 6px;
  }

  .routes-legend {
    gap: 12px;
    padding: 4px 0;
    margin-bottom: 8px;
  }

  .legend-item {
    font-size: 0.625rem;
  }

  .route-info-header {
    font-size: 0.8125rem;
    margin-bottom: 6px;
    gap: 6px;
  }

  .route-info-header i {
    font-size: 0.875rem;
  }

  .route-info-details {
    flex-direction: row;
    justify-content: flex-start;
    gap: 16px;
    margin-bottom: 8px;
  }

  .route-stat {
    font-size: 0.8125rem;
    gap: 6px;
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
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    top: 8px;
    right: 8px;
    left: 8px;
    max-width: none;
    border-radius: 8px;
  }

  .legend-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .legend-title {
    font-size: 0.75rem;
    display: none;
  }

  .casino-list-mobile {
    top: auto;
    bottom: 12px;
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
    max-height: calc(85vh - 50px);
    min-height: 280px;
  }

  .route-info-panel {
    top: auto;
    left: 6px;
    right: 6px;
    bottom: 130px;
    transform: none;
    max-width: none;
    width: auto;
    padding: 8px 10px;
    border-radius: 8px;
  }

  .both-routes-container {
    flex-direction: column;
    gap: 6px;
  }

  .route-card {
    padding: 6px 8px;
  }

  .route-card-header {
    font-size: 0.6875rem;
    margin-bottom: 4px;
    gap: 4px;
  }

  .route-card-header i {
    font-size: 0.75rem;
  }

  .route-card-stats {
    flex-direction: row;
    gap: 12px;
  }

  .route-stat-mini {
    font-size: 0.625rem;
    gap: 4px;
  }

  .transit-lines-badge {
    margin-top: 4px;
  }

  .line-badge {
    font-size: 0.5rem;
    padding: 1px 3px;
  }

  .routes-hint {
    font-size: 0.5rem;
    padding: 3px 0;
    margin-top: 4px;
  }

  .routes-legend {
    gap: 10px;
    padding: 3px 0;
    margin-bottom: 6px;
  }

  .legend-item {
    font-size: 0.5625rem;
    gap: 4px;
  }

  .legend-line {
    width: 14px;
    height: 3px;
  }

  .route-info-header {
    font-size: 0.75rem;
    gap: 6px;
    margin-bottom: 4px;
  }

  .route-info-header i {
    font-size: 0.8125rem;
  }

  .route-info-details {
    flex-direction: row;
    gap: 12px;
    margin-bottom: 6px;
  }

  .route-stat {
    font-size: 0.75rem;
    gap: 5px;
  }

  .route-stat i {
    width: 14px;
    font-size: 0.6875rem;
  }

  .route-mode-toggle {
    margin-bottom: 6px;
  }

  .mode-btn {
    padding: 4px 8px;
    font-size: 0.6875rem;
  }

  .transit-details {
    padding: 6px;
    margin-bottom: 6px;
  }

  .transit-steps-simple {
    gap: 4px;
  }

  .segment-time, .segment-label {
    font-size: 0.625rem;
  }

  .segment-line-badge {
    font-size: 0.5625rem;
    padding: 2px 5px;
  }

  .segment-arrow {
    font-size: 0.5rem;
  }

  .transit-stops-info {
    font-size: 0.625rem;
    gap: 4px;
  }

  .route-close-btn {
    font-size: 0.6875rem !important;
    padding: 4px 8px !important;
  }

  .route-nav-links {
    gap: 8px;
    margin: 10px 0 8px 0;
  }

  .route-nav-links .nav-link-btn {
    padding: 10px 12px;
    font-size: 0.75rem;
  }

  .route-nav-links .nav-link-btn i {
    font-size: 1rem;
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
    width: fit-content;
    top: 6px;
    left: unset;
    right: 4px;
    padding: 5px 6px;
    gap: 4px;
    border-radius: 8px;
  }

  .legend-title {
    font-size: 0.6875rem;
    display: none;
  }

  .legend-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }

  :deep(.p-button.p-button-sm) {
    font-size: 0.6875rem;
    padding: 0.25rem 0.4rem;
  }

  .casino-list-mobile {
    top: auto;
    bottom: 8px;
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

