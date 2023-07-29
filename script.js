var map;
var geocoder;
var directionsService;
var directionsRenderer;

// Fonction d'initialisation de la carte
function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 48.858844, lng: 2.294351 }, // Coordonnées par défaut
    zoom: 15 // Niveau de zoom initial
  });

  geocoder = new google.maps.Geocoder();
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer();

  directionsRenderer.setMap(map);

  // Récupérer l'adresse saisie par l'utilisateur lorsqu'il appuie sur la touche "Entrée"
  document.getElementById('address-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      geocodeAddress();
    }
  });
}

// Fonction pour géocoder l'adresse saisie par l'utilisateur
function geocodeAddress() {
  var address = document.getElementById('address-input').value;

  geocoder.geocode({ 'address': address }, function (results, status) {
    if (status === 'OK') {
      map.setCenter(results[0].geometry.location);
      var marker = new google.maps.Marker({
        map: map,
        position: results[0].geometry.location,
        title: 'Adresse trouvée'
      });
    } else {
      alert('Impossible de trouver l\'adresse : ' + status);
    }
  });
}

// Bouton de localisation
  var locateButton = document.getElementById('locate-button');
  locateButton.addEventListener('click', function () {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (position) {
        var userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        map.setCenter(userLocation);
        var marker = new google.maps.Marker({
          map: map,
          position: userLocation,
          title: 'Vous etes ici'
        });
      }, function () {
        alert("Impossible de recuperer votre position actuelle.");
      });
    } else {
      alert("La geolocalisation n'est pas prise en charge par ce navigateur.");
    }
  });

  // Bouton d'itinéraire en voiture
  var routeButtonCar = document.getElementById('route-button-car');
  routeButtonCar.addEventListener('click', function () {
    calculateRoute('DRIVING');
  });

  // Bouton d'itinéraire à pied
  var routeButtonWalk = document.getElementById('route-button-walk');
  routeButtonWalk.addEventListener('click', function () {
    calculateRoute('WALKING');
  });

  // Bouton d'itinéraire à vélo
  var routeButtonBike = document.getElementById('route-button-bike');
  routeButtonBike.addEventListener('click', function () {
    calculateRoute('BICYCLING');
  });

  // Bouton d'itinéraire en transports en commun
  var routeButtonTransit = document.getElementById('route-button-transit');
  routeButtonTransit.addEventListener('click', function () {
    calculateRoute('TRANSIT');
  });

  

// Fonction pour calculer l'itinéraire avec différentes options de voyage
function calculateRoute(travelMode) {
  var start = null;
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function (position) {
      start = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
      var end = document.getElementById('address-input').value;

      var request = {
        origin: start,
        destination: end,
        travelMode: travelMode
      };

      directionsService.route(request, function (result, status) {
        if (status == 'OK') {
          directionsRenderer.setDirections(result);
        } else {
          alert('Impossible de calculer l\'itineraire : ' + status);
        }
      });
    }, function () {
      alert("Impossible de recuperer votre position actuelle.");
    });
  } else {
    alert("La geolocalisation n'est pas prise en charge par ce navigateur.");
  }
}





 