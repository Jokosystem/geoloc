let map;
let geocoder;
let directionsService;
let directionsRenderer;

// ============================
// INITIALISATION
// ============================
function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 48.858844, lng: 2.294351 },
    zoom: 14
  });

  geocoder = new google.maps.Geocoder();
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({ map });

  setupEvents();
  const trafficLayer = new google.maps.TrafficLayer();
trafficLayer.setMap(map);
}

// ============================
// EVENTS
// ============================
function setupEvents() {
  document.getElementById("address-input").addEventListener("keypress", e => {
    if (e.key === "Enter") geocodeAddress();
  });

  document.getElementById("locate-button").addEventListener("click", locateUser);
  document.getElementById("route-button-car").addEventListener("click", () => calculateRoute("DRIVING"));
  document.getElementById("route-button-walk").addEventListener("click", () => calculateRoute("WALKING"));
  document.getElementById("route-button-bike").addEventListener("click", () => calculateRoute("BICYCLING"));
  document.getElementById("route-button-transit").addEventListener("click", () => calculateRoute("TRANSIT"));
}

// ============================
// GEOLOCALISATION
// ============================
function locateUser() {
  if (!navigator.geolocation) {
    alert("La géolocalisation n’est pas supportée.");
    return;
  }

  navigator.geolocation.getCurrentPosition(pos => {
    const userLocation = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude
    };

    map.setCenter(userLocation);
    new google.maps.Marker({ map, position: userLocation, title: "Vous êtes ici" });
  });
}

// ============================
// GEOCODAGE
// ============================
function geocodeAddress() {
  const address = document.getElementById("address-input").value;

  geocoder.geocode({ address }, (results, status) => {
    if (status === "OK") {
      map.setCenter(results[0].geometry.location);
      new google.maps.Marker({
        map,
        position: results[0].geometry.location
      });
    } else {
      alert("Adresse introuvable : " + status);
    }
  });
}

// ============================
// ITINERAIRES
// ============================
function calculateRoute(mode) {
  if (!navigator.geolocation) {
    alert("Géolocalisation non supportée.");
    return;
  }

  navigator.geolocation.getCurrentPosition(pos => {
    const start = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude
    };

    const end = document.getElementById("address-input").value;

    const request = {
      origin: start,
      destination: end,
      travelMode: google.maps.TravelMode[mode]
    };

    if (mode === "TRANSIT") {
      request.transitOptions = {
        departureTime: new Date(),
        modes: ["BUS", "SUBWAY", "TRAIN", "TRAM"],
        routingPreference: "FEWER_TRANSFERS"
      };
    }

    directionsService.route(request, (result, status) => {
      if (status === "OK") {
        directionsRenderer.setDirections(result);
        if (mode === "TRANSIT") displayTransitInfo(result);
      } else {
        alert("Erreur itinéraire : " + status);
      }
    });
  });
}

// ============================
// HORAIRES TRANSPORT
// ============================
function displayTransitInfo(result) {
  const container = document.getElementById("transit-info");
  container.innerHTML = "";

  const steps = result.routes[0].legs[0].steps;

  steps.forEach(step => {
    if (step.travel_mode === "TRANSIT") {
      const t = step.transit;
      container.innerHTML += `
        <div class="line">
          <strong>${t.line.name}</strong><br>
          ${t.departure_stop.name} → ${t.arrival_stop.name}<br>
          ⏰ ${t.departure_time.text} - ${t.arrival_time.text}
        </div><hr>
      `;
    }
  });
}

result.routes.forEach(route => {
  const time = route.legs[0].duration.value; // en secondes
  const transfers = route.legs[0].steps.filter(s => s.travel_mode === "TRANSIT").length;
});