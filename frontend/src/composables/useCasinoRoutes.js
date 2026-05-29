// Composable pour calculer les temps de trajet vers les casinos

const HOME_LOCATION = {
  lat: 36.2525,
  lng: -115.2061
};

// Liste des casinos avec coordonnées pour le matching
const CASINOS_COORDS = [
  { name: "WSOP", aliases: ["wsop", "world series", "paris", "horseshoe"], lat: 36.1128, lng: -115.1711 },
  { name: "Aria", aliases: ["aria"], lat: 36.1073, lng: -115.1765 },
  { name: "Bellagio", aliases: ["bellagio"], lat: 36.1129, lng: -115.1765 },
  { name: "Venetian", aliases: ["venetian", "palazzo"], lat: 36.1212, lng: -115.1696 },
  { name: "Wynn", aliases: ["wynn"], lat: 36.1263, lng: -115.1627 },
  { name: "MGM Grand", aliases: ["mgm"], lat: 36.1024, lng: -115.1695 },
  { name: "Caesars Palace", aliases: ["caesars", "caesar"], lat: 36.1162, lng: -115.1745 },
  { name: "The Orleans", aliases: ["orleans"], lat: 36.1023, lng: -115.2068 },
  { name: "South Point", aliases: ["south point", "southpoint"], lat: 36.0117, lng: -115.1739 },
  { name: "Red Rock", aliases: ["red rock", "station"], lat: 36.1734, lng: -115.3090 },
  { name: "Green Valley Ranch", aliases: ["green valley", "gvr"], lat: 36.0194, lng: -115.0797 },
  { name: "Golden Nugget", aliases: ["golden nugget", "nugget"], lat: 36.1710, lng: -115.1449 },
  { name: "Resorts World", aliases: ["resorts world"], lat: 36.1284, lng: -115.1630 },
  { name: "Encore", aliases: ["encore"], lat: 36.1287, lng: -115.1654 },
  { name: "Binion's", aliases: ["binion"], lat: 36.1709, lng: -115.1437 },
  { name: "Sahara", aliases: ["sahara"], lat: 36.1364, lng: -115.1564 },
  { name: "Planet Hollywood", aliases: ["planet hollywood", "planet"], lat: 36.1095, lng: -115.1708 },
  { name: "Treasure Island", aliases: ["treasure island", "ti "], lat: 36.1247, lng: -115.1717 },
  { name: "Flamingo", aliases: ["flamingo"], lat: 36.1161, lng: -115.1705 },
  { name: "Excalibur", aliases: ["excalibur"], lat: 36.0989, lng: -115.1754 }
];

// Cache pour les temps de trajet
const routeCache = {};

// Cache pour le géocodage (casinos inconnus)
const geocodeCache = {};

/**
 * Trouver les coordonnées d'un casino à partir de son nom (liste locale)
 */
function findCasinoCoords(casinoName) {
  if (!casinoName) return null;
  const lowerName = casinoName.toLowerCase();

  for (const casino of CASINOS_COORDS) {
    for (const alias of casino.aliases) {
      if (lowerName.includes(alias)) {
        return casino;
      }
    }
  }
  return null;
}

/**
 * Géocoder un casino inconnu via Nominatim (OpenStreetMap - gratuit)
 * Cherche le casino dans la zone de Las Vegas
 */
async function geocodeCasino(casinoName) {
  if (!casinoName) return null;

  // Vérifier le cache
  const cacheKey = casinoName.toLowerCase().trim();
  if (geocodeCache[cacheKey]) {
    return geocodeCache[cacheKey];
  }
  if (geocodeCache[cacheKey] === false) {
    return null; // Déjà cherché, pas trouvé
  }

  try {
    // Chercher avec "casino Las Vegas" pour de meilleurs résultats
    const searchQuery = `${casinoName} Las Vegas Nevada`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1&viewbox=-115.4,-115.0,36.0,36.3&bounded=0`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PokerVegasApp/1.0'
      }
    });

    if (response.ok) {
      const results = await response.json();
      if (results && results.length > 0) {
        const result = results[0];
        const coords = {
          name: casinoName,
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          type: 'geocoded',
          address: result.display_name
        };

        // Vérifier que c'est bien dans la zone de Las Vegas (approx)
        if (coords.lat > 35.8 && coords.lat < 36.4 && coords.lng > -115.5 && coords.lng < -114.8) {
          geocodeCache[cacheKey] = coords;
          return coords;
        }
      }
    }
  } catch (error) {
    console.warn(`Géocodage échoué pour "${casinoName}":`, error);
  }

  // Marquer comme non trouvé pour ne pas re-chercher
  geocodeCache[cacheKey] = false;
  return null;
}

/**
 * Calculer la distance à vol d'oiseau (Haversine) pour estimation rapide
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estimer le temps de trajet (facteur 1.4 pour tenir compte des routes)
 */
function estimateDriveTime(distanceKm) {
  // Vitesse moyenne en ville ~50 km/h, facteur route 1.4
  const routeDistance = distanceKm * 1.4;
  return Math.round((routeDistance / 50) * 60); // en minutes
}

/**
 * Obtenir le temps de trajet via OSRM (API gratuite)
 */
async function fetchRouteTime(casinoCoords) {
  const cacheKey = `${casinoCoords.lat},${casinoCoords.lng}`;

  if (routeCache[cacheKey]) {
    return routeCache[cacheKey];
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${HOME_LOCATION.lng},${HOME_LOCATION.lat};${casinoCoords.lng},${casinoCoords.lat}?overview=false`;
    const response = await fetch(url);

    if (response.ok) {
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const result = {
          durationMin: Math.round(route.duration / 60),
          distanceKm: (route.distance / 1000).toFixed(1),
          distanceMiles: (route.distance / 1609.34).toFixed(1)
        };
        routeCache[cacheKey] = result;
        return result;
      }
    }
  } catch (error) {
    console.warn('Erreur OSRM, utilisation estimation:', error);
  }

  // Fallback: estimation par Haversine
  const dist = haversineDistance(HOME_LOCATION.lat, HOME_LOCATION.lng, casinoCoords.lat, casinoCoords.lng);
  const result = {
    durationMin: estimateDriveTime(dist),
    distanceKm: (dist * 1.4).toFixed(1),
    distanceMiles: ((dist * 1.4) / 1.60934).toFixed(1)
  };
  routeCache[cacheKey] = result;
  return result;
}

export function useCasinoRoutes() {
  /**
   * Obtenir le temps de trajet pour un nom de casino
   * 1. Cherche dans la liste locale (rapide)
   * 2. Si pas trouvé, géocode via Nominatim (API gratuite OpenStreetMap)
   * 3. Calcule le trajet via OSRM
   * @param {string} casinoName - Nom du casino
   * @returns {Promise<{durationMin, distanceKm, distanceMiles}|null>}
   */
  async function getRouteForCasino(casinoName) {
    // 1. Chercher dans la liste locale
    let coords = findCasinoCoords(casinoName);

    // 2. Si pas trouvé, géocoder via Nominatim
    if (!coords) {
      coords = await geocodeCasino(casinoName);
    }

    // 3. Si toujours rien, retourner null
    if (!coords) return null;

    // 4. Calculer le trajet
    return await fetchRouteTime(coords);
  }

  /**
   * Obtenir les coordonnées d'un casino (local ou géocodé)
   */
  async function getCasinoCoords(casinoName) {
    let coords = findCasinoCoords(casinoName);
    if (!coords) {
      coords = await geocodeCasino(casinoName);
    }
    return coords;
  }

  return {
    getRouteForCasino,
    getCasinoCoords,
    CASINOS_COORDS,
    HOME_LOCATION
  };
}


