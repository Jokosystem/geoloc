let map;
let geocoder;
let directionsService;
let directionsRenderer;

// 🚁 Drone
let droneMarker;
let droneCircle;
let flightZoneCircle;
let flightZoneRadius = 10000; // 10 km

// 🌍 DATA
let NOTAMs = [];

// ============================
// INIT MAP
// ============================
function initMap() {

  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 48.858844, lng: 2.294351 },
    zoom: 14
  });

  geocoder = new google.maps.Geocoder();
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({ map });

  addUASLayer();
  loadUASZones();
  setupEvents();

  navigator.geolocation.getCurrentPosition(pos => {
    loadNOTAM(pos.coords.latitude, pos.coords.longitude);
  });
}

// ============================
// IGN LAYER
// ============================
function addUASLayer() {

  const uasLayer = new google.maps.ImageMapType({
    getTileUrl: (coord, zoom) =>
      "https://wxs.ign.fr/essentiels/geoportail/r/wms?" +
      "SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap" +
      "&LAYERS=TRANSPORTS.DRONES.RESTRICTIONS" +
      "&FORMAT=image/png&TRANSPARENT=true" +
      "&HEIGHT=256&WIDTH=256" +
      "&CRS=EPSG:3857" +
      "&BBOX=" + getBoundingBox(coord, zoom),

    tileSize: new google.maps.Size(256, 256),
    opacity: 0.6
  });

  map.overlayMapTypes.push(uasLayer);
}

// ============================
// GEOJSON
// ============================
function loadUASZones() {

  map.data.loadGeoJson("zones_uas.geojson");

  map.data.setStyle(feature => {

    const type = feature.getProperty("restriction");

    if (type === "interdit") {
      return { fillColor: "red", fillOpacity: 0.35, strokeColor: "red" };
    }

    if (type === "limité") {
      return { fillColor: "orange", fillOpacity: 0.25, strokeColor: "orange" };
    }

    return { visible: false };
  });
}

// ============================
// EVENTS
// ============================
function setupEvents() {

  document.getElementById("locate-button")?.addEventListener("click", locateUser);
  document.getElementById("check-drone")?.addEventListener("click", checkDroneZone);

  document.getElementById("address-input")?.addEventListener("keypress", e => {
    if (e.key === "Enter") geocodeAddress();
  });

  document.getElementById("route-button-car")?.addEventListener("click", () => calculateRoute("DRIVING"));
  document.getElementById("route-button-walk")?.addEventListener("click", () => calculateRoute("WALKING"));
  document.getElementById("route-button-bike")?.addEventListener("click", () => calculateRoute("BICYCLING"));
  document.getElementById("route-button-transit")?.addEventListener("click", () => calculateRoute("TRANSIT"));
}

// ============================
// GEOLOCALISATION
// ============================
function locateUser() {

  navigator.geolocation.getCurrentPosition(pos => {

    const p = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude
    };

    map.setCenter(p);

    new google.maps.Marker({
      map,
      position: p
    });

    loadNOTAM(p.lat, p.lng);
  });
}

// ============================
// GEOCODAGE
// ============================
function geocodeAddress() {

  const address = document.getElementById("address-input").value;
  if (!address) return;

  geocoder.geocode({ address }, (results, status) => {

    if (status === "OK") {

      const loc = results[0].geometry.location;

      map.setCenter(loc);

      new google.maps.Marker({
        map,
        position: loc
      });

      loadNOTAM(loc.lat(), loc.lng());
    }
  });
}

// ============================
// ROUTE
// ============================
function calculateRoute(mode) {

  const destination = document.getElementById("address-input").value;
  if (!destination) return;

  navigator.geolocation.getCurrentPosition(pos => {

    const start = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude
    };

    directionsService.route({
      origin: start,
      destination,
      travelMode: google.maps.TravelMode[mode]
    }, (result, status) => {

      if (status === "OK") {
        directionsRenderer.setDirections(result);
      }
    });
  });
}

// ============================
// DRONE CHECK FINAL PROPRE
// ============================
function checkDroneZone() {

  navigator.geolocation.getCurrentPosition(pos => {

    const center = new google.maps.LatLng(
      pos.coords.latitude,
      pos.coords.longitude
    );

    createFlightZone(center);

    if (droneMarker) droneMarker.setMap(null);
    droneMarker = new google.maps.Marker({ map, position: center });

    if (droneCircle) droneCircle.setMap(null);
    droneCircle = new google.maps.Circle({
      map,
      center,
      radius: 80,
      fillOpacity: 0.2,
      strokeWeight: 1
    });

    let status = "OK";

    // =========================
    // ZONES GEOJSON (10km)
    // =========================
    map.data.forEach(feature => {

      const type = feature.getProperty("restriction");
      const geom = feature.getGeometry();

      if (!geom) return;

      geom.forEachLatLng(latlng => {

        const distance = google.maps.geometry.spherical.computeDistanceBetween(center, latlng);

        if (distance > flightZoneRadius) return;

        if (distance < 50) {

          if (type === "interdit") status = "INTERDIT";
          if (type === "limité" && status !== "INTERDIT") status = "LIMITÉ";
        }
      });
    });

    // =========================
    // NOTAM CHECK
    // =========================
    NOTAMs.forEach(n => {

      if (!n.latitude || !n.longitude) return;

      const p = new google.maps.LatLng(
        parseFloat(n.latitude),
        parseFloat(n.longitude)
      );

      const d = google.maps.geometry.spherical.computeDistanceBetween(center, p);

      if (d <= flightZoneRadius) {
        status = "INTERDIT";
      }
    });

    // =========================
    // UI
    // =========================
    const box = document.getElementById("drone-info");

    if (status === "INTERDIT") {
      box.className = "danger";
      box.innerHTML = "❌ INTERDIT dans 10 km";
      droneCircle.setOptions({ fillColor: "red" });

    } else if (status === "LIMITÉ") {
      box.className = "warning";
      box.innerHTML = "⚠️ VOL LIMITÉ dans 10 km";
      droneCircle.setOptions({ fillColor: "orange" });

    } else {
      box.className = "safe";
      box.innerHTML = "✅ VOL AUTORISÉ dans 10 km";
      droneCircle.setOptions({ fillColor: "green" });
    }

    map.setCenter(center);
  });
}

// ============================
// FLIGHT ZONE
// ============================
function createFlightZone(center) {

  if (flightZoneCircle) flightZoneCircle.setMap(null);

  flightZoneCircle = new google.maps.Circle({
    map,
    center,
    radius: flightZoneRadius,
    fillOpacity: 0.05,
    strokeColor: "#2196f3",
    strokeOpacity: 0.8,
    strokeWeight: 2
  });
}

// ============================
// NOTAM
// ============================
async function loadNOTAM(lat, lng) {

  try {
    const res = await fetch(
      `https://aviation-edge.com/v2/public/notam?key=AIzaSyBA4ONxjKbF_2UZoC4zkEoSVLnYbRH944g&lat=${lat}&lng=${lng}`
    );

    const data = await res.json();
    NOTAMs = Array.isArray(data) ? data : [];

  } catch (e) {
    NOTAMs = [];
  }
}

// ============================
// BBOX
// ============================
function getBoundingBox(coord, zoom) {

  const n = 1 << zoom;

  const lon1 = coord.x / n * 360 - 180;
  const lon2 = (coord.x + 1) / n * 360 - 180;

  const lat1 = Math.atan(Math.sinh(Math.PI * (1 - 2 * (coord.y + 1) / n))) * 180 / Math.PI;
  const lat2 = Math.atan(Math.sinh(Math.PI * (1 - 2 * coord.y / n))) * 180 / Math.PI;

  return `${lon1},${lat1},${lon2},${lat2}`;
}

// ============================
// SW
// ============================
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}