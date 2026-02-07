const API_BASE = "http://localhost:4000/api";

// Route database with estimated times
const routeDatabase = {
  'Warsaw-Berlin': { plane: '1h 30min', train: '6h', bus: '8h', car: '5h 30min' },
  'Warsaw-Vienna': { plane: '1h 30min', train: '7h', bus: '9h', car: '6h 30min' },
  'Warsaw-Rzeszów': { train: '6h', bus: '5h', car: '4h' },
  'Warsaw-Prague': { plane: '1h 30min', train: '8h', bus: '10h', car: '7h' },
  'Warsaw-Istanbul': { plane: '2h 30min' },
  'Kraków-Prague': { train: '8h', bus: '9h', car: '6h' },
  'Prague-Vienna': { train: '4h', bus: '5h', car: '3h 30min' },
  'Budapest-Vienna': { train: '3h', bus: '3h 30min', car: '2h 30min' },
  'Amsterdam-Paris': { train: '3h 20min', plane: '1h 20min', car: '5h' },
  'Paris-Madrid': { plane: '2h', train: '10h' },
  'Paris-Barcelona': { plane: '1h 50min', train: '6h 30min', car: '10h' },
  'Paris-Nice': { plane: '1h 30min', train: '5h 30min', car: '9h' },
  'Milan-Vienna': { plane: '1h 30min', train: '11h', car: '7h' },
  'Milan-Rome': { plane: '1h 15min', train: '3h', car: '5h 30min' },
  'Berlin-Amsterdam': { train: '6h', plane: '1h 30min', car: '6h 30min' },
  'Istanbul-Vienna': { plane: '2h 30min' },
  'Istanbul-Athens': { plane: '1h 30min' },
  'Vienna-Budapest': { train: '3h', bus: '3h 30min', car: '2h 30min' },
  'Berlin-Prague': { train: '4h 30min', bus: '5h', car: '3h 30min' },
  'Barcelona-Madrid': { plane: '1h 20min', train: '2h 45min', car: '6h' },
  'Barcelona-Nice': { plane: '1h 30min', train: '5h', car: '5h 30min' },
  'Barcelona-Mallorca': { plane: '1h' },
  'Lisbon-Madrid': { plane: '1h 20min', train: '10h', car: '6h' },
  'Lisbon-Barcelona': { plane: '2h', car: '11h' },
  'Athens-Santorini': { plane: '45min' },
  'Rome-Athens': { plane: '2h' },
  'Rome-Barcelona': { plane: '2h', train: '20h' },
  'Dubrovnik-Athens': { plane: '1h 45min' },
  'Nice-Milan': { train: '5h', car: '3h 30min' },
  'Amsterdam-Berlin': { train: '6h', plane: '1h 30min', car: '6h 30min' },
  'Vienna-Prague': { train: '4h', bus: '5h', car: '3h 30min' }
};

function getRouteKey(origin, destination) {
  const key1 = `${origin}-${destination}`;
  const key2 = `${destination}-${origin}`;
  return routeDatabase[key1] || routeDatabase[key2];
}

function updateRouteInfo() {
  const origin = document.getElementById('trip-origin').value.trim();
  const destination = document.getElementById('trip-destination').value.trim();
  const transport = document.getElementById('trip-transport').value;
  const routeInfo = document.getElementById('route-info');
  const routeInfoText = document.getElementById('route-info-text');
  
  if (origin && destination && origin !== destination) {
    const times = getRouteKey(origin, destination);
    
    if (times) {
      if (transport && times[transport.toLowerCase()]) {
        routeInfoText.innerHTML = `⏱️ Estimated time: <strong>${times[transport.toLowerCase()]}</strong> by ${transport}`;
        routeInfo.classList.remove('hidden');
      } else if (!transport) {
        const timeOptions = Object.entries(times)
          .map(([mode, time]) => `${mode.charAt(0).toUpperCase() + mode.slice(1)}: ${time}`)
          .join(' • ');
        routeInfoText.innerHTML = `⏱️ Available routes: ${timeOptions}`;
        routeInfo.classList.remove('hidden');
      } else {
        routeInfo.classList.add('hidden');
      }
    } else {
      routeInfo.classList.add('hidden');
    }
  } else {
    routeInfo.classList.add('hidden');
  }
}

// Helper function to format dates
function formatDate(dateString) {
  // Parse date as UTC to avoid timezone shifts
  const [year, month, day] = dateString.split('T')[0].split('-');
  const date = new Date(year, month - 1, day);
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

// State
let authToken = localStorage.getItem("token");
let currentUser = JSON.parse(localStorage.getItem("user") || "null");
let isGuestMode = !authToken;
let allTrips = [];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// Auth
function setAuth(token, user) {
  authToken = token;
  currentUser = user;
  isGuestMode = !token;
  if (token) {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
  } else {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }
  updateNav();
}

// API Helper
async function apiCall(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  if (authToken) headers.Authorization = "Bearer " + authToken;

  const response = await fetch(API_BASE + path, { ...options, headers });

  if (!response.ok) {
    let errorMsg = "Error";
    try {
      const data = await response.json();
      if (data.error) errorMsg = data.error;
    } catch (e) {}
    throw new Error(errorMsg);
  }

  if (response.status === 204) return null;
  return response.json();
}

// DOM Elements
const viewHero = document.getElementById("view-hero");
const viewTrips = document.getElementById("view-trips");
const viewNewTrip = document.getElementById("view-new-trip");
const viewTripDetails = document.getElementById("view-trip-details");
const viewProfile = document.getElementById("view-profile");
const viewCalendar = document.getElementById("view-calendar");

const modalAuth = document.getElementById("modal-auth");
const modalOverlay = document.getElementById("modal-overlay");

// Navigation
function showView(view) {
  [viewHero, viewTrips, viewNewTrip, viewTripDetails, viewProfile, viewCalendar].forEach(v => 
    v.classList.remove("active")
  );
  view.classList.add("active");
}

function updateNav() {
  const navAuth = document.getElementById("nav-auth");
  const navUser = document.getElementById("nav-user");
  const navGuest = document.getElementById("nav-guest");
  const navUsername = document.getElementById("nav-username");
  
  if (authToken && currentUser) {
    navAuth.classList.add("hidden");
    navUser.classList.remove("hidden");
    navGuest.classList.add("hidden");
    navUsername.textContent = currentUser.name || currentUser.email;
  } else if (isGuestMode) {
    navAuth.classList.add("hidden");
    navUser.classList.add("hidden");
    navGuest.classList.remove("hidden");
  } else {
    navAuth.classList.remove("hidden");
    navUser.classList.add("hidden");
    navGuest.classList.add("hidden");
  }
}

// Modal
function showModal() { modalAuth.classList.remove("hidden"); }
function hideModal() { modalAuth.classList.add("hidden"); }

function showLoginForm() {
  document.getElementById("auth-title").textContent = "Login";
  document.getElementById("form-login").classList.remove("hidden");
  document.getElementById("form-register").classList.add("hidden");
  document.getElementById("login-error").textContent = "";
  document.getElementById("register-error").textContent = "";
  showModal();
}

function showRegisterForm() {
  document.getElementById("auth-title").textContent = "Create Account";
  document.getElementById("form-login").classList.add("hidden");
  document.getElementById("form-register").classList.remove("hidden");
  document.getElementById("login-error").textContent = "";
  document.getElementById("register-error").textContent = "";
  showModal();
}

// Load Trips
async function loadTrips() {
  const tripsList = document.getElementById("trips-list");
  const tripsEmpty = document.getElementById("trips-empty");
  const tripsTitle = document.getElementById("trips-title");
  
  tripsList.innerHTML = "";
  tripsEmpty.classList.remove("hidden");
  
  tripsTitle.textContent = (isGuestMode && !authToken) ? "Sample Trips" : "My Trips";
  
  try {
    allTrips = await apiCall("/trips");
    
    if (allTrips.length === 0) {
      tripsEmpty.innerHTML = `
        <div class="empty-icon">✈️</div>
        <p>${(isGuestMode && !authToken) 
          ? "No sample trips available. Sign up to create your own!"
          : "No trips yet. Start planning your adventure!"}</p>
      `;
      return;
    }
    
    tripsEmpty.classList.add("hidden");
    
    allTrips.forEach(trip => {
      const card = document.createElement("div");
      card.className = "trip-card";
      card.style.cursor = "pointer";
      
      const startDate = formatDate(trip.start_date);
      const endDate = trip.end_date ? formatDate(trip.end_date) : null;
      const transportIcon = trip.transport === 'Plane' ? '✈️' : trip.transport === 'Train' ? '🚆' : trip.transport === 'Bus' ? '🚌' : trip.transport === 'Car' ? '🚗' : '🔀';
      
      let transportDisplay = '';
      if (trip.transport) {
        const times = getRouteKey(trip.origin, trip.destination);
        const estimatedTime = times && times[trip.transport.toLowerCase()] ? ` - ${times[trip.transport.toLowerCase()]}` : '';
        transportDisplay = `<div class="trip-transport">${transportIcon} ${trip.transport}${estimatedTime}</div>`;
      }
      
      card.innerHTML = `
        <div class="trip-route">${trip.origin} → ${trip.destination}</div>
        <div class="trip-dates">📅 ${startDate}${endDate ? ' – ' + endDate : ''}</div>
        ${transportDisplay}
      `;
      
      card.addEventListener("click", () => showTripDetails(trip));
      tripsList.appendChild(card);
    });
  } catch (err) {
    tripsEmpty.classList.remove("hidden");
    tripsEmpty.innerHTML = `<p style="color: #f44336;">Error: ${err.message}</p>`;
  }
}

function showTripDetails(trip) {
  const content = document.getElementById("trip-details-content");
  
  const startDate = formatDate(trip.start_date);
  const endDate = trip.end_date ? formatDate(trip.end_date) : null;
  const transportIcon = trip.transport === 'Plane' ? '✈️' : trip.transport === 'Train' ? '🚆' : trip.transport === 'Bus' ? '🚌' : trip.transport === 'Car' ? '🚗' : '🔀';
  
  let transportDisplay = '';
  if (trip.transport) {
    transportDisplay = `<div class="trip-detail-transport">${transportIcon} ${trip.transport}</div>`;
  }
  
  // Build info grid items - always show them with placeholder if empty
  let infoItems = [];
  infoItems.push(`<div class="trip-info-item"><span class="info-icon">🏨</span><div><strong>Accommodation</strong><br>${trip.accommodation || '<em style="color: #999;">Not specified</em>'}</div></div>`);
  infoItems.push(`<div class="trip-info-item"><span class="info-icon">💰</span><div><strong>Budget</strong><br>${trip.budget ? '$' + trip.budget : '<em style="color: #999;">Not specified</em>'}</div></div>`);
  infoItems.push(`<div class="trip-info-item"><span class="info-icon">👥</span><div><strong>Travelers</strong><br>${trip.travelers || 1} ${(trip.travelers || 1) > 1 ? 'people' : 'person'}</div></div>`);
  const statusEmoji = trip.status === 'Planning' ? '📝' : trip.status === 'Booked' ? '✅' : trip.status === 'Ongoing' ? '🎒' : trip.status === 'Completed' ? '🏁' : '📝';
  infoItems.push(`<div class="trip-info-item"><span class="info-icon">${statusEmoji}</span><div><strong>Status</strong><br>${trip.status || 'Planning'}</div></div>`);
  
  content.innerHTML = `
    <div class="trip-detail-card">
      <div class="trip-detail-header">
        <div class="trip-detail-route">${trip.origin} → ${trip.destination}</div>
        <div class="trip-detail-dates">📅 ${startDate}${endDate ? ' – ' + endDate : ''}</div>
        ${transportDisplay}
      </div>
      
      <div class="trip-info-section">
        <h4>📋 Trip Information</h4>
        <div class="trip-detail-info-grid">
          ${infoItems.join('')}
        </div>
      </div>
      
      <div class="trip-detail-section">
        <h4>🎯 Activities & Plans</h4>
        <div class="trip-detail-activities">${trip.activities || '<em style="color: #999;">No activities planned yet. Click "Edit Trip" to add some!</em>'}</div>
      </div>
      
      ${!isGuestMode && authToken ? `
        <div class="trip-detail-actions">
          <button class="btn-edit" id="btn-edit-trip">Edit Trip</button>
          <button class="btn-delete-trip" id="btn-delete-this-trip">Delete Trip</button>
        </div>
      ` : ''}
    </div>
  `;
  
  showView(viewTripDetails);
  
  // Attach event listeners
  if (!isGuestMode && authToken) {
    document.getElementById("btn-edit-trip")?.addEventListener("click", () => editTrip(trip));
    document.getElementById("btn-delete-this-trip")?.addEventListener("click", () => deleteTrip(trip.id));
  }
}

// Edit Trip
function editTrip(trip) {
  document.getElementById("trip-form-title").textContent = "Edit Trip";
  document.getElementById("trip-id").value = trip.id;
  document.getElementById("trip-origin").value = trip.origin;
  document.getElementById("trip-destination").value = trip.destination;
  document.getElementById("trip-transport").value = trip.transport || "";
  
  // Set dates directly without timezone conversion (database returns YYYY-MM-DD format)
  if (trip.start_date) {
    // Extract just the date part (YYYY-MM-DD) without time/timezone issues
    const startDate = trip.start_date.split('T')[0];
    document.getElementById("trip-start-date").value = startDate;
  }
  if (trip.end_date) {
    const endDate = trip.end_date.split('T')[0];
    document.getElementById("trip-end-date").value = endDate;
  }
  
  document.getElementById("trip-accommodation").value = trip.accommodation || "";
  document.getElementById("trip-budget").value = trip.budget || "";
  document.getElementById("trip-travelers").value = trip.travelers || 1;
  document.getElementById("trip-status").value = trip.status || "Planning";
  document.getElementById("trip-activities").value = trip.activities || "";
  showView(viewNewTrip);
}

// Delete Trip
async function deleteTrip(tripId) {
  if (!confirm("Delete this trip?")) return;
  
  try {
    await apiCall(`/trips/${tripId}`, { method: "DELETE" });
    showView(viewTrips);
    loadTrips();
  } catch (err) {
    alert(err.message);
  }
}

// Load Profile
async function loadProfile() {
  if (!currentUser) return;
  
  document.getElementById("profile-name").textContent = currentUser.name || "User";
  document.getElementById("profile-email").textContent = currentUser.email;
  
  try {
    const trips = await apiCall("/trips");
    
    // Stats
    const now = new Date();
    const upcoming = trips.filter(t => new Date(t.startDate) > now).length;
    const countries = new Set(trips.map(t => t.destination.split(",").pop().trim())).size;
    
    document.getElementById("stat-trips").textContent = trips.length;
    document.getElementById("stat-upcoming").textContent = upcoming;
    document.getElementById("stat-countries").textContent = countries;
    
    // Recent destinations
    const destinations = document.getElementById("recent-destinations");
    const recent = trips.slice(-5).reverse();
    
    if (recent.length > 0) {
      destinations.innerHTML = recent.map(t => 
        `<div class="destination-tag">${t.destination}</div>`
      ).join("");
    } else {
      destinations.innerHTML = "<p style='color: #999;'>No trips yet</p>";
    }
  } catch (err) {
    console.error(err);
  }
}

// Load Calendar
function loadCalendar() {
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  
  document.getElementById("calendar-month").textContent = 
    `${monthNames[currentMonth]} ${currentYear}`;
  
  const grid = document.getElementById("calendar-grid");
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  grid.innerHTML = `
    <div class="calendar-weekdays">
      <div class="calendar-weekday">Sun</div>
      <div class="calendar-weekday">Mon</div>
      <div class="calendar-weekday">Tue</div>
      <div class="calendar-weekday">Wed</div>
      <div class="calendar-weekday">Thu</div>
      <div class="calendar-weekday">Fri</div>
      <div class="calendar-weekday">Sat</div>
    </div>
    <div class="calendar-days"></div>
  `;
  
  const daysContainer = grid.querySelector(".calendar-days");
  
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    daysContainer.innerHTML += '<div class="calendar-day"></div>';
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const tripsOnDay = allTrips.filter(t => 
      (t.start_date <= dateStr && (!t.end_date || t.end_date >= dateStr)) ||
      t.start_date === dateStr
    );
    
    const hasTrip = tripsOnDay.length > 0;
    const tripText = tripsOnDay.length > 0 ? tripsOnDay[0].destination : '';
    
    daysContainer.innerHTML += `
      <div class="calendar-day ${hasTrip ? 'has-trip' : ''}">
        <div class="calendar-day-number">${day}</div>
        ${hasTrip ? `<div class="calendar-trip-indicator">${tripText}</div>` : ''}
      </div>
    `;
  }
}

// Event Listeners
document.getElementById("logo")?.addEventListener("click", () => {
  showView(viewHero);
});

document.getElementById("btn-hero-search")?.addEventListener("click", () => {
  const origin = document.getElementById("hero-origin").value;
  const dest = document.getElementById("hero-destination").value;
  
  if (origin && dest) {
    if (isGuestMode && !authToken) {
      showLoginForm();
    } else {
      document.getElementById("trip-origin").value = origin;
      document.getElementById("trip-destination").value = dest;
      showView(viewNewTrip);
    }
  }
});

document.getElementById("btn-browse-guest")?.addEventListener("click", () => {
  isGuestMode = true;
  updateNav();
  showView(viewTrips);
  loadTrips();
});

document.getElementById("btn-nav-login")?.addEventListener("click", showLoginForm);
document.getElementById("btn-nav-register")?.addEventListener("click", showRegisterForm);
document.getElementById("btn-guest-login")?.addEventListener("click", showLoginForm);
document.getElementById("btn-guest-register")?.addEventListener("click", showRegisterForm);

document.getElementById("btn-nav-trips")?.addEventListener("click", () => {
  showView(viewTrips);
  loadTrips();
});

document.getElementById("btn-nav-new-trip")?.addEventListener("click", () => {
  document.getElementById("trip-form-title").textContent = "Plan a New Trip";
  document.getElementById("form-new-trip").reset();
  document.getElementById("trip-id").value = "";
  showView(viewNewTrip);
});

document.getElementById("btn-nav-logout")?.addEventListener("click", () => {
  setAuth(null, null);
  showView(viewHero);
});

document.getElementById("btn-close-modal")?.addEventListener("click", hideModal);
document.getElementById("modal-overlay")?.addEventListener("click", hideModal);

document.getElementById("link-show-register")?.addEventListener("click", e => {
  e.preventDefault();
  showRegisterForm();
});

document.getElementById("link-show-login")?.addEventListener("click", e => {
  e.preventDefault();
  showLoginForm();
});

// Profile & Calendar buttons
document.getElementById("btn-view-profile")?.addEventListener("click", () => {
  if (isGuestMode && !authToken) {
    showLoginForm();
  } else {
    loadProfile();
    showView(viewProfile);
  }
});

document.getElementById("btn-view-calendar")?.addEventListener("click", () => {
  if (isGuestMode && !authToken) {
    showLoginForm();
  } else {
    loadCalendar();
    showView(viewCalendar);
  }
});

document.getElementById("btn-back-to-trips")?.addEventListener("click", () => {
  showView(viewTrips);
});

document.getElementById("btn-back-from-profile")?.addEventListener("click", () => {
  showView(viewTrips);
});

document.getElementById("btn-back-from-calendar")?.addEventListener("click", () => {
  showView(viewTrips);
});

document.getElementById("btn-prev-month")?.addEventListener("click", () => {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  loadCalendar();
});

document.getElementById("btn-next-month")?.addEventListener("click", () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  loadCalendar();
});

// Forms
document.getElementById("form-login")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  document.getElementById("login-error").textContent = "";
  
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  
  try {
    const data = await apiCall("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    setAuth(data.token, data.user);
    hideModal();
    showView(viewTrips);
    loadTrips();
  } catch (err) {
    document.getElementById("login-error").textContent = err.message;
  }
});

document.getElementById("form-register")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  document.getElementById("register-error").textContent = "";
  
  const name = document.getElementById("register-name").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;
  
  try {
    const data = await apiCall("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password })
    });
    setAuth(data.token, data.user);
    hideModal();
    showView(viewTrips);
    loadTrips();
  } catch (err) {
    document.getElementById("register-error").textContent = err.message;
  }
});


document.getElementById("btn-cancel-new-trip")?.addEventListener("click", () => {
  showView(viewTrips);
});

document.getElementById("form-new-trip")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  document.getElementById("new-trip-error").textContent = "";
  
  if (isGuestMode && !authToken) {
    document.getElementById("new-trip-error").textContent = "Please log in to create trips";
    return;
  }
  
  const tripId = document.getElementById("trip-id").value;
  const origin = document.getElementById("trip-origin").value.trim();
  const destination = document.getElementById("trip-destination").value.trim();
  const transport = document.getElementById("trip-transport").value;
  const start_date = document.getElementById("trip-start-date").value;
  const end_date = document.getElementById("trip-end-date").value || null;
  const accommodation = document.getElementById("trip-accommodation").value.trim();
  const budget = document.getElementById("trip-budget").value || null;
  const travelers = document.getElementById("trip-travelers").value || 1;
  const status = document.getElementById("trip-status").value || 'Planning';
  const activities = document.getElementById("trip-activities").value.trim();

  if (!origin || !destination || !start_date) {
    document.getElementById("new-trip-error").textContent = "Origin, destination and start date are required.";
    return;
  }
  
  if (origin.toLowerCase() === destination.toLowerCase()) {
    document.getElementById("new-trip-error").textContent = "Origin and destination must be different cities.";
    return;
  }

  try {
    if (tripId) {
      // Update existing trip
      await apiCall(`/trips/${tripId}`, {
        method: "PUT",
        body: JSON.stringify({ origin, destination, transport, start_date, end_date, accommodation, budget, travelers, status, activities })
      });
    } else {
      // Create new trip
      await apiCall("/trips", {
        method: "POST",
        body: JSON.stringify({ origin, destination, transport, start_date, end_date, accommodation, budget, travelers, status, activities })
      });
    }
    
    document.getElementById("form-new-trip").reset();
    showView(viewTrips);
    loadTrips();
  } catch (err) {
    document.getElementById("new-trip-error").textContent = err.message;
  }
});

// Load cities from database
async function loadCities() {
  try {
    const cities = await apiCall("/cities");
    const datalist = document.getElementById('city-list');
    datalist.innerHTML = cities.map(city => `<option value="${city.name}">${city.name}, ${city.country}</option>`).join('');
    
    // Generate random example trips after cities are loaded
    generateExampleTrips(cities);
  } catch (error) {
    console.error("Error loading cities:", error);
  }
}

// Generate random example trips
function generateExampleTrips(cities) {
  const grid = document.getElementById('example-trips-grid');
  if (!grid) return;
  
  const examples = [];
  const numExamples = 12;
  
  // Generate random unique routes (just city pairs, no transport)
  while (examples.length < numExamples && cities.length >= 2) {
    const origin = cities[Math.floor(Math.random() * cities.length)];
    let destination = cities[Math.floor(Math.random() * cities.length)];
    
    // Ensure origin and destination are different
    let attempts = 0;
    while (destination.name === origin.name && attempts < 10) {
      destination = cities[Math.floor(Math.random() * cities.length)];
      attempts++;
    }
    
    if (destination.name !== origin.name) {
      examples.push({
        origin: origin.name,
        destination: destination.name
      });
    }
  }
  
  // Render example trips (only routes, no transport or dates)
  grid.innerHTML = examples.map(trip => `
    <div class="example-trip" data-origin="${trip.origin}" data-dest="${trip.destination}">
      <div class="example-route">${trip.origin} → ${trip.destination}</div>
      <button class="btn-add-example">+ Add to My Trips</button>
    </div>
  `).join('');
  
  // Attach event listeners to example trip buttons
  attachExampleTripHandlers();
}

// Attach event handlers to example trip buttons
function attachExampleTripHandlers() {
  document.querySelectorAll('.btn-add-example').forEach(btn => {
    btn.addEventListener('click', () => {
      const parentTrip = btn.closest('.example-trip');
      const origin = parentTrip.dataset.origin;
      const destination = parentTrip.dataset.dest;
      
      if (!authToken) {
        showLoginForm();
        return;
      }
      
      // Open new trip form with pre-filled data (only cities, no transport or dates)
      document.getElementById('trip-form-title').textContent = 'Plan Your Trip';
      document.getElementById('trip-id').value = '';
      document.getElementById('trip-origin').value = origin;
      document.getElementById('trip-destination').value = destination;
      
      showView(viewNewTrip);
    });
  });
}

// Init
updateNav();
// Always start on home page
showView(viewHero);
// Load cities from database
loadCities();

// Set min date to today for date inputs
const today = new Date().toISOString().split('T')[0];
document.getElementById('trip-start-date').setAttribute('min', today);
document.getElementById('trip-end-date').setAttribute('min', today);
