// ===============================================
// CARBON NEUTRALITY - MAIN APP.JS
// ===============================================

// ===== THEME & NAVIGATION =====
const htmlEl = document.documentElement;
const themeToggle = document.getElementById("theme-toggle");
const iconSun = document.getElementById("icon-sun");
const iconMoon = document.getElementById("icon-moon");
const mobileOpen = document.getElementById("mobile-open");

(function initTheme() {
  const stored = localStorage.getItem("theme") || "light";
  const isDark = stored === "dark";
  htmlEl.classList.toggle("dark", isDark);
  iconSun?.classList.toggle("hidden", !isDark);
  iconMoon?.classList.toggle("hidden", isDark);
})();

themeToggle?.addEventListener("click", () => {
  const nowDark = !htmlEl.classList.contains("dark");
  htmlEl.classList.toggle("dark", nowDark);
  localStorage.setItem("theme", nowDark ? "dark" : "light");
  iconSun?.classList.toggle("hidden", !nowDark);
  iconMoon?.classList.toggle("hidden", nowDark);
});

mobileOpen?.addEventListener("click", () => {
  alert("Mobile navigation drawer coming soon!");
});

document.querySelectorAll("a[href^='#']").forEach(anchor => {
  anchor.addEventListener("click", event => {
    const href = anchor.getAttribute("href");
    if (!href || href === "#") return;
    event.preventDefault();
    const targetEl = document.querySelector(href);
    if (!targetEl) return;
    const headerOffset = 80;
    const top = targetEl.getBoundingClientRect().top + window.pageYOffset - headerOffset;
    window.scrollTo({ top, behavior: "smooth" });
  });
});

// ===== AQI DASHBOARD (Legacy API) =====
const WAQI_TOKEN = "c1ebca30b3f4338ff326ce803a2174bbfe4d66c4"; // Replace with your token from https://aqicn.org/api/

const aqiCityInput = document.getElementById("aqi-city-input");
const aqiSearchBtn = document.getElementById("aqi-search");
const aqiValueEl = document.getElementById("aqi-value-container");
const aqiCityEl = document.getElementById("aqi-city");
const aqiTimestampEl = document.getElementById("aqi-timestamp");
const aqiDominantEl = document.getElementById("aqi-dominant");
const aqiLoadingOverlay = document.getElementById("aqi-loading-overlay");
const pollutantDetailsEl = document.getElementById("pollutant-details");
const showPollutantsBtn = document.getElementById("show-pollutants");

const pollutantLabel = {
  pm25: "PM2.5",
  pm10: "PM10",
  carbon_monoxide: "CO",
  nitrogen_dioxide: "NO",
  sulphur_dioxide: "SO",
  ozone: "O"
};

const fallbackAQI = {
  jaipur: {
    location: { name: "Jaipur, India" },
    aqi: 128,
    timestamp: () => new Date().toISOString(),
    dominant: "PM2.5",
    pollutants: {
      pm25: 94,
      pm10: 78,
      carbon_monoxide: 0.5,
      nitrogen_dioxide: 26,
      sulphur_dioxide: 11,
      ozone: 31
    }
  },
  delhi: {
    location: { name: "Delhi, India" },
    aqi: 182,
    timestamp: () => new Date().toISOString(),
    dominant: "PM2.5",
    pollutants: {
      pm25: 145,
      pm10: 122,
      carbon_monoxide: 0.7,
      nitrogen_dioxide: 48,
      sulphur_dioxide: 18,
      ozone: 22
    }
  },
  mumbai: {
    location: { name: "Mumbai, India" },
    aqi: 96,
    timestamp: () => new Date().toISOString(),
    dominant: "PM2.5",
    pollutants: {
      pm25: 68,
      pm10: 82,
      carbon_monoxide: 0.4,
      nitrogen_dioxide: 32,
      sulphur_dioxide: 10,
      ozone: 28
    }
  },
  bengaluru: {
    location: { name: "Bengaluru, India" },
    aqi: 88,
    timestamp: () => new Date().toISOString(),
    dominant: "PM10",
    pollutants: {
      pm25: 54,
      pm10: 76,
      carbon_monoxide: 0.3,
      nitrogen_dioxide: 22,
      sulphur_dioxide: 7,
      ozone: 36
    }
  },
  hyderabad: {
    location: { name: "Hyderabad, India" },
    aqi: 102,
    timestamp: () => new Date().toISOString(),
    dominant: "PM2.5",
    pollutants: {
      pm25: 73,
      pm10: 81,
      carbon_monoxide: 0.4,
      nitrogen_dioxide: 29,
      sulphur_dioxide: 9,
      ozone: 30
    }
  },
  chennai: {
    location: { name: "Chennai, India" },
    aqi: 84,
    timestamp: () => new Date().toISOString(),
    dominant: "PM10",
    pollutants: {
      pm25: 52,
      pm10: 69,
      carbon_monoxide: 0.3,
      nitrogen_dioxide: 20,
      sulphur_dioxide: 6,
      ozone: 34
    }
  },
  kolkata: {
    location: { name: "Kolkata, India" },
    aqi: 165,
    timestamp: () => new Date().toISOString(),
    dominant: "PM2.5",
    pollutants: {
      pm25: 132,
      pm10: 118,
      carbon_monoxide: 0.6,
      nitrogen_dioxide: 44,
      sulphur_dioxide: 16,
      ozone: 25
    }
  },
  pune: {
    location: { name: "Pune, India" },
    aqi: 92,
    timestamp: () => new Date().toISOString(),
    dominant: "PM2.5",
    pollutants: {
      pm25: 64,
      pm10: 74,
      carbon_monoxide: 0.4,
      nitrogen_dioxide: 24,
      sulphur_dioxide: 8,
      ozone: 33
    }
  },
  udaipur: {
    location: { name: "Udaipur, India" },
    aqi: 105,
    timestamp: () => new Date().toISOString(),
    dominant: "PM2.5",
    pollutants: {
      pm25: 76,
      pm10: 82,
      carbon_monoxide: 0.4,
      nitrogen_dioxide: 27,
      sulphur_dioxide: 9,
      ozone: 29
    }
  }
};

let latestAQIData = null;

function normalizeCityKey(city) {
  return city.trim().toLowerCase();
}

function styleAQI(aqi) {
  if (!isFinite(aqi)) {
    aqiValueEl.textContent = "-";
    aqiValueEl.style.backgroundColor = "#6b7280";
    aqiValueEl.style.color = "#ffffff";
    return;
  }

  aqiValueEl.textContent = Math.round(aqi);
  aqiValueEl.style.color = "#ffffff";

  if (aqi <= 50) aqiValueEl.style.backgroundColor = "#22c55e";
  else if (aqi <= 100) {
    aqiValueEl.style.backgroundColor = "#eab308";
    aqiValueEl.style.color = "#111827";
  } else if (aqi <= 150) aqiValueEl.style.backgroundColor = "#f97316";
  else if (aqi <= 200) aqiValueEl.style.backgroundColor = "#ef4444";
  else if (aqi <= 300) aqiValueEl.style.backgroundColor = "#a855f7";
  else aqiValueEl.style.backgroundColor = "#7f1d1d";
}

function renderPollutants(pollutants) {
  pollutantDetailsEl.innerHTML = "";
  pollutantDetailsEl.classList.add("hidden");
  showPollutantsBtn.textContent = "Details";

  if (!pollutants) return;
  const entries = Object.entries(pollutants).filter(([, value]) => value !== null && isFinite(value));
  if (!entries.length) return;

  let html = '<div class="grid grid-cols-2 gap-2 text-xs">';
  entries.forEach(([key, value]) => {
    const label = pollutantLabel[key] || key;
    html += `<div><strong>${label}:</strong> ${Number(value).toFixed(1)}</div>`;
  });
  html += "</div>";
  pollutantDetailsEl.innerHTML = html;
}

async function fetchFromLegacyAPI(city) {
  const url = `https://api.waqi.info/feed/${encodeURIComponent(city)}/?token=${WAQI_TOKEN}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("AQI service unavailable");

  const payload = await response.json();
  if (payload.status !== "ok") throw new Error(typeof payload.data === "string" ? payload.data : "City not supported");

  const station = payload.data;
  const pollutants = {
    pm25: station.iaqi?.pm25?.v ?? null,
    pm10: station.iaqi?.pm10?.v ?? null,
    carbon_monoxide: station.iaqi?.co?.v ?? null,
    nitrogen_dioxide: station.iaqi?.no2?.v ?? null,
    sulphur_dioxide: station.iaqi?.so2?.v ?? null,
    ozone: station.iaqi?.o3?.v ?? null
  };

  return {
    aqi: Number(station.aqi),
    timestamp: station.time?.iso || new Date().toISOString(),
    location: { name: station.city?.name || city },
    dominant: station.dominentpol || null,
    pollutants
  };
}

function useFallbackAQI(cityKey) {
  const fallbackEntry = fallbackAQI[cityKey] || fallbackAQI.jaipur;
  if (!fallbackEntry) return null;

  return {
    aqi: fallbackEntry.aqi,
    timestamp: fallbackEntry.timestamp(),
    location: fallbackEntry.location,
    dominant: fallbackEntry.dominant,
    pollutants: fallbackEntry.pollutants
  };
}

async function fetchAQI(city = "Jaipur") {
  const searchValue = city.trim() || "Jaipur";
  const normalizedKey = normalizeCityKey(searchValue);

  try {
    aqiLoadingOverlay?.classList.remove("hidden");
    if (aqiSearchBtn) {
      aqiSearchBtn.disabled = true;
      aqiSearchBtn.textContent = "Loading";
    }

    const apiResult = await fetchFromLegacyAPI(searchValue);
    latestAQIData = apiResult;

    styleAQI(apiResult.aqi);
    aqiCityEl.textContent = apiResult.location.name;
    aqiTimestampEl.textContent = `Updated: ${new Date(apiResult.timestamp).toLocaleString()}`;

    if (apiResult.dominant) {
      const dominantKey = apiResult.dominant.toLowerCase();
      const label = pollutantLabel[dominantKey] || apiResult.dominant.toUpperCase();
      aqiDominantEl.textContent = label;
    } else {
      aqiDominantEl.textContent = "-";
    }

    renderPollutants(apiResult.pollutants);
  } catch (error) {
    console.error("AQI fetch error:", error);

    const fallback = useFallbackAQI(normalizedKey);
    if (fallback) {
      latestAQIData = fallback;
      styleAQI(fallback.aqi);
      aqiCityEl.textContent = `${fallback.location.name} (cached)`;
      aqiTimestampEl.textContent = `Cached: ${new Date(fallback.timestamp).toLocaleString()}`;
      aqiDominantEl.textContent = fallback.dominant || "-";
      renderPollutants(fallback.pollutants);
      return;
    }

    aqiValueEl.textContent = "?";
    aqiValueEl.style.backgroundColor = "#6b7280";
    aqiValueEl.style.color = "#ffffff";
    aqiCityEl.textContent = "Unable to fetch AQI";
    aqiTimestampEl.textContent = error.message || "Please try a different city";
    aqiDominantEl.textContent = "-";
    pollutantDetailsEl.innerHTML = "";
  } finally {
    aqiLoadingOverlay?.classList.add("hidden");
    if (aqiSearchBtn) {
      aqiSearchBtn.disabled = false;
      aqiSearchBtn.textContent = "Search";
    }
  }
}

aqiSearchBtn?.addEventListener("click", () => {
  fetchAQI(aqiCityInput?.value || "Jaipur");
});

aqiCityInput?.addEventListener("keypress", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    fetchAQI(aqiCityInput.value || "Jaipur");
  }
});

showPollutantsBtn?.addEventListener("click", () => {
  if (!latestAQIData) return;
  pollutantDetailsEl.classList.toggle("hidden");
  showPollutantsBtn.textContent = pollutantDetailsEl.classList.contains("hidden") ? "Details" : "Hide Details";
});

fetchAQI("Jaipur");

// ===== CHART HELPERS =====
const miniForecastCtx = document.getElementById("mini-forecast");
const dashboardForecastCtx = document.getElementById("dashboard-forecast");
const footprintChartCtx = document.getElementById("fp-chart");
const travelChartCtx = document.getElementById("t-chart");

let miniForecastChart;
let dashboardForecastChart;
let footprintChart;
let travelChart;

function createMiniForecastChart() {
  if (!miniForecastCtx) return;
  miniForecastChart?.destroy();

  miniForecastChart = new Chart(miniForecastCtx, {
    type: "bar",
    data: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      datasets: [{
        data: [120, 150, 180, 140, 160, 190],
        backgroundColor: "#10b981",
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      aspectRatio: 2,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { font: { size: 10 } } },
        y: { beginAtZero: true, ticks: { font: { size: 10 } } }
      }
    }
  });
}

function createDashboardForecastChart() {
  if (!dashboardForecastCtx) return;
  dashboardForecastChart?.destroy();

  const labels = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const values = labels.map(() => Math.random() * 250 + 100);

  dashboardForecastChart = new Chart(dashboardForecastCtx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.12)",
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      aspectRatio: 2,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { font: { size: 10 } } },
        y: { beginAtZero: true, ticks: { font: { size: 10 } } }
      }
    }
  });
}

createMiniForecastChart();
createDashboardForecastChart();

// ===== FOOTPRINT CALCULATOR =====
let fpCarEl, fpCarValEl, fpFlightsEl, fpFlightsValEl;
let fpElectricityEl, fpElectricityValEl, fpShoppingEl, fpShoppingValEl;
let fpDietEl, fpCalcBtn, fpTotalEl, fpTipsEl;

function initializeFootprintCalculator() {
  fpCarEl = document.getElementById("fp-car-kms");
  fpCarValEl = document.getElementById("fp-car-kms-val");
  fpFlightsEl = document.getElementById("fp-flights");
  fpFlightsValEl = document.getElementById("fp-flights-val");
  fpElectricityEl = document.getElementById("fp-electricity");
  fpElectricityValEl = document.getElementById("fp-electricity-val");
  fpShoppingEl = document.getElementById("fp-shopping");
  fpShoppingValEl = document.getElementById("fp-shopping-val");
  fpDietEl = document.getElementById("fp-diet");
  fpCalcBtn = document.getElementById("fp-calc");
  fpTotalEl = document.getElementById("fp-total");
  fpTipsEl = document.getElementById("fp-tips");

  const elements = { fpCarEl, fpCarValEl, fpFlightsEl, fpFlightsValEl, fpElectricityEl, fpElectricityValEl, fpShoppingEl, fpShoppingValEl, fpDietEl, fpCalcBtn, fpTotalEl, fpTipsEl };
  const missing = Object.entries(elements).filter(([key, val]) => !val);

  if (missing.length > 0) {
    console.error("Footprint Calculator: Missing elements:", missing.map(([key]) => key));
    return;
  }

  console.log("Footprint Calculator: All elements found successfully");

  // Add event listeners for real-time updates
  [fpCarEl, fpFlightsEl, fpElectricityEl, fpShoppingEl].forEach(input => {
    input?.addEventListener("input", () => {
      updateRangeLabels();
      calculateFootprint();
    });
  });

  // Diet dropdown uses 'change' event
  fpDietEl?.addEventListener("change", () => {
    calculateFootprint();
  });

  // Initialize labels and calculate initial footprint
  updateRangeLabels();
  calculateFootprint();
}

function updateRangeLabels() {
  if (fpCarEl && fpCarValEl) fpCarValEl.textContent = fpCarEl.value;
  if (fpFlightsEl && fpFlightsValEl) fpFlightsValEl.textContent = fpFlightsEl.value;
  if (fpElectricityEl && fpElectricityValEl) fpElectricityValEl.textContent = fpElectricityEl.value;
  if (fpShoppingEl && fpShoppingValEl) fpShoppingValEl.textContent = fpShoppingEl.value;
}

function calculateFootprint() {
  if (!fpCarEl || !fpFlightsEl || !fpElectricityEl || !fpShoppingEl || !fpDietEl || !fpTotalEl || !fpTipsEl) {
    console.log("Footprint Calculator: Some elements not found, skipping calculation");
    return;
  }

  const car = Number(fpCarEl.value);
  const flights = Number(fpFlightsEl.value);
  const electricity = Number(fpElectricityEl.value);
  const shopping = Number(fpShoppingEl.value);
  const diet = fpDietEl.value;

  const carEmission = (car * 52 * 0.12) / 1000;
  const flightEmission = flights * 0.09;
  const electricityEmission = (electricity * 12 * 0.82) / 1000;
  const shoppingEmission = (shopping * 12 * 0.5) / 1000;

  const dietEmissionMap = {
    "meat-high": 3.3,
    "meat-medium": 2.5,
    "meat-low": 1.9,
    vegetarian: 1.5,
    vegan: 1.0
  };
  const dietEmission = dietEmissionMap[diet] ?? 2.0;

  const totals = {
    car: carEmission,
    flight: flightEmission,
    electricity: electricityEmission,
    shopping: shoppingEmission,
    diet: dietEmission
  };

  const total = Object.values(totals).reduce((sum, value) => sum + value, 0);
  fpTotalEl.textContent = `${total.toFixed(2)} t CO2e / yr`;

  const tips = [];
  if (car > 300) tips.push("Consider carpooling or switching commute modes.");
  if (flights > 20) tips.push("Try consolidating trips or exploring rail alternatives.");
  if (electricity > 6000) tips.push("Upgrade to energy-efficient appliances.");
  if (diet === "meat-high") tips.push("Swap a few meat meals for plant-based options each week.");
  fpTipsEl.innerHTML = tips.length ? tips.join("<br>") : "Great job! Your footprint is relatively low.";

  // Update chart only if canvas is available
  const chartCtx = footprintChartCtx || document.getElementById("fp-chart");
  if (chartCtx) {
    footprintChart?.destroy();

    footprintChart = new Chart(chartCtx, {
      type: "doughnut",
      data: {
        labels: ["Car", "Flights", "Electricity", "Shopping", "Diet"],
        datasets: [{
          data: [totals.car, totals.flight, totals.electricity, totals.shopping, totals.diet],
          backgroundColor: ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1,
        plugins: {
          legend: {
            position: "bottom",
            labels: { font: { size: 10 }, boxWidth: 10, padding: 8 }
          }
        }
      }
    });
  }
}

fpCalcBtn?.addEventListener("click", event => {
  event.preventDefault();
  updateRangeLabels();
  calculateFootprint();
});

calculateFootprint();

// ===== TRAVEL PLANNER =====
// ============================================================================
// CALCULATION ASSUMPTIONS & CONSTANTS
// ============================================================================
// DISTANCE MATRIX: Road distances between major Indian cities (km)
// Source: Approximate actual road/travel distances
// ----------------------------------------------------------------------------
const DISTANCE_MATRIX = {
  "Jaipur-Mumbai": 1150,
  "Jaipur-Delhi": 280,
  "Jaipur-Bengaluru": 2050,
  "Jaipur-Udaipur": 400,
  "Delhi-Mumbai": 1400,
  "Delhi-Bengaluru": 2150,
  "Delhi-Udaipur": 650,
  "Mumbai-Bengaluru": 980,
  "Mumbai-Udaipur": 750,
  "Bengaluru-Udaipur": 1650
};

// EMISSION FACTORS: kg CO2e per kilometer per passenger
// Source: IPCC 2014, DEFRA UK, Indian specific factors where available
// ----------------------------------------------------------------------------
// Flight: 0.255 kg/km (includes radiative forcing factor for high-altitude emissions)
// Train: 0.041 kg/km (Indian Railways average electrified rail)
// Car: 0.192 kg/km (average passenger car, assumes 1.5 passengers/vehicle)
// Bus: 0.089 kg/km (intercity bus, assumes 60% seat occupancy)
// ----------------------------------------------------------------------------
const EMISSION_FACTORS = {
  flight: 0.255,
  train: 0.041,
  car: 0.192,
  bus: 0.089
};

// ROUND TRIP MULTIPLIER: One-way trips are multiplied by 1, round trips by 2
// This accounts for the return journey distance
const ROUND_TRIP_MULTIPLIER = {
  "round": 2,
  "oneway": 1
};

// TREE EQUIVALENCY: 20 kg CO2e absorbed per tree per year (conservative estimate)
// Source: Various environmental organizations (20-50kg range, using 20kg for conservative estimate)
const TREE_SEQUESTRATION_RATE = 20; // kg CO2e per tree per year

// ============================================================================
// STATE MANAGEMENT
// ============================================================================
let travelLegs = [];

// ============================================================================
// DOM ELEMENT REFERENCES (initialized when DOM is ready)
// ============================================================================
let tOriginEl, tDestEl, tModeEl, tTripsEl, tRoundEl, tMonthsEl;
let tAddBtn, tClearBtn, tTableBody, tTotalEl, tRecsEl;

// Initialize DOM elements and event listeners when DOM is ready
function initializeTravelPlanner() {
  tOriginEl = document.getElementById("t-origin");
  tDestEl = document.getElementById("t-dest");
  tModeEl = document.getElementById("t-mode");
  tTripsEl = document.getElementById("t-trips");
  tRoundEl = document.getElementById("t-round");
  tMonthsEl = document.getElementById("t-months");
  tAddBtn = document.getElementById("t-add");
  tClearBtn = document.getElementById("t-clear");
  tTableBody = document.querySelector("#t-table tbody");
  tTotalEl = document.getElementById("t-total");
  tRecsEl = document.getElementById("t-recs");

  // Debug: Check if all elements are found
  const elements = { tOriginEl, tDestEl, tModeEl, tTripsEl, tRoundEl, tMonthsEl, tAddBtn, tClearBtn, tTableBody, tTotalEl, tRecsEl };
  const missing = Object.entries(elements).filter(([key, val]) => !val);

  if (missing.length > 0) {
    console.error("Travel Planner: Missing elements:", missing.map(([key]) => key));
    return;
  }

  console.log("Travel Planner: All elements found successfully");

  // Setup event listeners
  setupTravelPlannerEventListeners();
}

// ============================================================================
// CORE CALCULATION FUNCTIONS (Centralized & Deterministic)
// ============================================================================

/**
 * Get distance between two cities from the distance matrix
 * @param {string} origin - Origin city name
 * @param {string} destination - Destination city name
 * @returns {number} Distance in kilometers
 */
function getDistance(origin, destination) {
  const directKey = `${origin}-${destination}`;
  const reverseKey = `${destination}-${origin}`;

  return DISTANCE_MATRIX[directKey] ??
         DISTANCE_MATRIX[reverseKey] ??
         500; // Fallback for undefined routes (average intercity distance)
}

/**
 * Get emission factor for a transport mode
 * @param {string} mode - Transport mode (flight, train, car, bus)
 * @returns {number} Emission factor in kg CO2e per km
 */
function getEmissionFactor(mode) {
  return EMISSION_FACTORS[mode] ?? EMISSION_FACTORS.flight; // Default to flight (highest)
}

/**
 * Get round trip multiplier
 * @param {string} tripType - "round" or "oneway"
 * @returns {number} Multiplier (2 for round trip, 1 for one-way)
 */
function getRoundTripMultiplier(tripType) {
  return ROUND_TRIP_MULTIPLIER[tripType] ?? 1;
}

/**
 * Calculate emission for a single trip leg (one-way or round trip)
 * Formula: distance × emissionFactor × roundTripMultiplier
 *
 * @param {Object} params - Calculation parameters
 * @param {string} params.origin - Origin city
 * @param {string} params.destination - Destination city
 * @param {string} params.mode - Transport mode
 * @param {boolean} params.isRoundTrip - Whether this is a round trip
 * @returns {Object} Calculation result with all intermediate values
 */
function calculateLegEmission({ origin, destination, mode, isRoundTrip }) {
  const distance = getDistance(origin, destination);
  const emissionFactor = getEmissionFactor(mode);
  const roundTripMultiplier = isRoundTrip ? 2 : 1;

  const emissionPerTrip = distance * emissionFactor * roundTripMultiplier;

  return {
    distance,
    emissionFactor,
    roundTripMultiplier,
    emissionPerTrip,
    // For traceability
    calculation: `${distance} km × ${emissionFactor} kg/km × ${roundTripMultiplier} = ${emissionPerTrip.toFixed(2)} kg CO2e`
  };
}

/**
 * Calculate total emissions for a leg over multiple months and trips
 * Formula: emissionPerTrip × tripsPerMonth × numberOfMonths
 *
 * @param {Object} leg - Travel leg object
 * @returns {Object} Aggregated emissions data
 */
function calculateLegTotal(leg) {
  const emissionPerTrip = leg.emissionPerTrip;
  const tripsPerMonth = leg.trips;
  const numberOfMonths = leg.months;

  const totalEmission = emissionPerTrip * tripsPerMonth * numberOfMonths;
  const monthlyEmission = emissionPerTrip * tripsPerMonth;

  return {
    totalEmission,
    monthlyEmission,
    emissionPerTrip,
    breakdown: {
      perTrip: emissionPerTrip,
      perMonth: monthlyEmission,
      overPeriod: totalEmission
    }
  };
}

/**
 * Calculate aggregate statistics for the entire travel plan
 * This is the ONLY function that performs aggregation across all legs
 *
 * @param {Array} legs - Array of travel leg objects
 * @returns {Object} Aggregate statistics
 */
function calculatePlanStatistics(legs) {
  if (!legs.length) {
    return {
      totalEmission: 0,
      totalDistance: 0,
      totalTrips: 0,
      legsByMode: {},
      topContributor: null,
      monthlyForecast: []
    };
  }

  let totalEmission = 0;
  let totalDistance = 0;
  let totalTrips = 0;
  const legsByMode = {};
  let topContributor = null;
  let maxLegEmission = 0;

  // Find maximum months for forecast chart
  const maxMonths = Math.max(...legs.map(leg => leg.months));

  // Calculate monthly forecast (sum of all legs' monthly emissions for each month)
  const monthlyForecast = Array.from({ length: maxMonths }, (_, monthIndex) => {
    const monthNum = monthIndex + 1;
    return legs.reduce((monthSum, leg) => {
      if (monthNum <= leg.months) {
        return monthSum + (leg.emissionPerTrip * leg.trips);
      }
      return monthSum;
    }, 0);
  });

  // Aggregate across all legs
  legs.forEach(leg => {
    const legTotal = calculateLegTotal(leg);
    const legEmissionTotal = legTotal.totalEmission;

    totalEmission += legEmissionTotal;
    totalDistance += leg.distance;
    totalTrips += leg.trips * leg.months;

    // Track emissions by mode
    if (!legsByMode[leg.mode]) {
      legsByMode[leg.mode] = { count: 0, emission: 0, distance: 0 };
    }
    legsByMode[leg.mode].count += 1;
    legsByMode[leg.mode].emission += legEmissionTotal;
    legsByMode[leg.mode].distance += leg.distance;

    // Track top contributor
    if (legEmissionTotal > maxLegEmission) {
      maxLegEmission = legEmissionTotal;
      topContributor = {
        name: `${leg.mode} (${leg.origin} → ${leg.dest})`,
        emission: legEmissionTotal,
        percentage: 0 // Will calculate after total is known
      };
    }
  });

  // Calculate percentage for top contributor
  if (topContributor && totalEmission > 0) {
    topContributor.percentage = (topContributor.emission / totalEmission) * 100;
  }

  return {
    totalEmission,
    totalDistance,
    totalTrips,
    legsByMode,
    topContributor,
    monthlyForecast,
    treesNeeded: Math.ceil(totalEmission / TREE_SEQUESTRATION_RATE)
  };
}

// ============================================================================
// INPUT VALIDATION
// ============================================================================

/**
 * Validate travel planner input fields
 * @returns {Object} Validation result with isValid and errors
 */
function validateTravelInput() {
  const errors = [];

  if (!tOriginEl || !tDestEl || !tModeEl || !tTripsEl || !tRoundEl || !tMonthsEl) {
    return { isValid: false, errors: ["Form elements not found"] };
  }

  const origin = tOriginEl.value;
  const destination = tDestEl.value;
  const trips = parseInt(tTripsEl.value, 10);
  const months = parseInt(tMonthsEl.value, 10);

  // Validate origin/destination are different
  if (origin === destination) {
    errors.push("Origin and destination cannot be the same");
  }

  // Validate trips per month
  if (isNaN(trips) || trips < 1) {
    errors.push("Trips per month must be at least 1");
  } else if (trips > 100) {
    errors.push("Trips per month cannot exceed 100");
  }

  // Validate forecast period
  if (isNaN(months) || months < 1) {
    errors.push("Forecast period must be at least 1 month");
  } else if (months > 12) {
    errors.push("Forecast period cannot exceed 12 months");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============================================================================
// UI UPDATE FUNCTIONS
// ============================================================================

/**
 * Render the travel legs table with current data
 */
function renderTravelTable() {
  if (!tTableBody) return;

  tTableBody.innerHTML = "";

  if (!travelLegs.length) {
    tTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="py-8 text-center text-gray-500 dark:text-gray-400">
          <div class="flex flex-col items-center gap-2">
            <svg class="w-12 h-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <p>No travel legs added yet</p>
            <p class="text-xs">Add a trip to see calculations and forecasts</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  travelLegs.forEach((leg, idx) => {
    const row = document.createElement("tr");
    row.className = "border-b dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors";

    const legTotal = calculateLegTotal(leg);
    const modeLabel = leg.mode.charAt(0).toUpperCase() + leg.mode.slice(1);

    row.innerHTML = `
      <td class="py-3 font-medium">${idx + 1}</td>
      <td>
        <div class="font-medium">${leg.origin} → ${leg.dest}</div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          ${modeLabel} · ${leg.roundTrip ? "Round trip" : "One-way"}
        </div>
      </td>
      <td>${leg.distance.toLocaleString()} km</td>
      <td>
        <div class="font-medium">${leg.emissionPerTrip.toFixed(1)} kg</div>
        <div class="text-xs text-gray-500">
          ${leg.trips} trip${leg.trips > 1 ? 's' : ''}/mo × ${leg.months} mo
        </div>
      </td>
      <td>
        <button
          class="text-red-600 hover:text-red-700 text-xs font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
          onclick="removeTravelLeg(${leg.id})"
          aria-label="Remove this leg"
        >
          Remove
        </button>
      </td>
    `;
    tTableBody.appendChild(row);
  });
}

/**
 * Update the travel plan summary with aggregated statistics
 */
function updateTravelSummary() {
  if (!tTotalEl || !tRecsEl) return;

  const stats = calculatePlanStatistics(travelLegs);

  // Update total display
  if (stats.totalEmission === 0) {
    tTotalEl.textContent = "0 kg CO2e";
    tTotalEl.classList.add("text-gray-400");
  } else {
    tTotalEl.textContent = `${stats.totalEmission.toFixed(1)} kg CO2e`;
    tTotalEl.classList.remove("text-gray-400");
  }

  // Generate recommendations based on statistics
  const recommendations = generateRecommendations(stats);

  if (stats.totalEmission === 0) {
    tRecsEl.innerHTML = `
      <li class="text-gray-500 dark:text-gray-400">
        Add travel legs to see personalized recommendations
      </li>
    `;
  } else if (recommendations.length === 0) {
    tRecsEl.innerHTML = `<li class="text-green-600 dark:text-green-400">✓ Your travel plan looks efficient!</li>`;
  } else {
    tRecsEl.innerHTML = recommendations.map(rec => `<li>${rec}</li>`).join("");
  }

  // Update chart and insights
  renderTravelChart(stats.monthlyForecast);
  updateInsights(stats);
}

/**
 * Generate personalized recommendations based on travel statistics
 * @param {Object} stats - Plan statistics from calculatePlanStatistics
 * @returns {Array<string>} List of recommendations
 */
function generateRecommendations(stats) {
  const recommendations = [];

  if (!stats.totalEmission) return recommendations;

  // Mode-specific recommendations
  if (stats.legsByMode.flight && stats.legsByMode.flight.count > 0) {
    recommendations.push("Consider rail for short-haul flights (<500 km) to reduce emissions by up to 80%.");
  }

  if (stats.legsByMode.car && stats.legsByMode.car.count > 2) {
    recommendations.push("Multiple car trips detected. Carpooling or switching to bus could cut emissions significantly.");
  }

  // High emission warnings
  if (stats.totalEmission > 2000) {
    recommendations.push(`High travel footprint: ${stats.totalEmission.toFixed(0)} kg CO2e. Consider virtual meetings for some trips.`);
  } else if (stats.totalEmission > 1000) {
    recommendations.push("Moderate-high emissions. Explore train options for longer routes to reduce impact.");
  }

  // Efficiency tip
  if (stats.totalTrips > 20 && stats.legsByMode.flight) {
    recommendations.push("Frequent flying detected. Consider trip consolidation to reduce total journeys.");
  }

  return recommendations;
}

/**
 * Render the monthly forecast chart
 * @param {Array<number>} monthlyData - Array of monthly emissions
 */
function renderTravelChart(monthlyData = []) {
  if (!travelChartCtx) return;

  travelChart?.destroy();

  if (!monthlyData.length) {
    // Show empty state placeholder
    const canvas = travelChartCtx;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Add travel legs to see forecast', canvas.width / 2, canvas.height / 2);
    return;
  }

  const labels = monthlyData.map((_, idx) => `Month ${idx + 1}`);

  travelChart = new Chart(travelChartCtx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "kg CO₂e",
        data: monthlyData,
        backgroundColor: "#3b82f6",
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      aspectRatio: 1.4,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          padding: 12,
          callbacks: {
            label: (context) => `${context.parsed.y.toFixed(1)} kg CO₂e`
          }
        }
      },
      scales: {
        x: {
          ticks: { font: { size: 10 } },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          ticks: {
            font: { size: 10 },
            callback: (value) => `${value} kg`
          },
          grid: {
            color: "rgba(0, 0, 0, 0.05)"
          }
        }
      }
    }
  });
}

/**
 * Update insights section with plan statistics
 * @param {Object} stats - Plan statistics
 */
function updateInsights(stats) {
  if (insightsForecastEl) {
    insightsForecastEl.textContent = stats.totalEmission > 0
      ? `${stats.totalEmission.toFixed(0)} kg`
      : "0 kg";
  }

  if (insightsTreesEl) {
    insightsTreesEl.textContent = stats.totalEmission > 0
      ? `${stats.treesNeeded} tree${stats.treesNeeded !== 1 ? 's' : ''}`
      : "0 trees";
  }

  if (insightsTopEl) {
    if (!stats.topContributor) {
      insightsTopEl.textContent = "—";
      insightsTopEl.classList.add("text-gray-400");
    } else {
      insightsTopEl.textContent = stats.topContributor.name;
      insightsTopEl.classList.remove("text-gray-400");
    }
  }

  if (insightsTipEl) {
    if (stats.totalEmission === 0) {
      insightsTipEl.textContent = "Add travel legs to get actionable tips";
      insightsTipEl.classList.add("text-gray-400");
    } else if (stats.totalEmission > 800) {
      insightsTipEl.textContent = "Swap high-emission legs with trains or buses to cut travel emissions quickly.";
      insightsTipEl.classList.remove("text-gray-400");
    } else {
      insightsTipEl.textContent = "Great job! Keep monitoring and balancing travel plans.";
      insightsTipEl.classList.remove("text-gray-400");
    }
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

function setupTravelPlannerEventListeners() {
  // Add travel leg
  if (!tAddBtn) {
    console.error("Travel Planner: Add button not found, cannot attach event listener");
    return;
  }

  tAddBtn.addEventListener("click", () => {
    console.log("Travel Planner: Add button clicked");
    // Validate inputs
    const validation = validateTravelInput();
    if (!validation.isValid) {
      alert(validation.errors.join("\n"));
      return;
    }

    const origin = tOriginEl.value;
    const destination = tDestEl.value;
    const mode = tModeEl.value;
    const trips = parseInt(tTripsEl.value, 10);
    const months = parseInt(tMonthsEl.value, 10);
    const isRoundTrip = tRoundEl.value === "round";

    // Calculate leg emissions (centralized calculation)
    const emissionData = calculateLegEmission({ origin, destination, mode, isRoundTrip });

    // Create leg object with pre-calculated values
    const leg = {
      id: Date.now(),
      origin,
      dest: destination,
      mode,
      trips,
      months,
      roundTrip: isRoundTrip,
      // Store calculated values for consistency
      distance: emissionData.distance,
      emissionPerTrip: emissionData.emissionPerTrip,
      // Store calculation details for transparency (optional, can be removed for production)
      _calculation: emissionData.calculation
    };

    travelLegs.push(leg);

    // Update UI
    renderTravelTable();
    updateTravelSummary();
  });

  // Clear all legs
  if (tClearBtn) {
    tClearBtn.addEventListener("click", () => {
      if (travelLegs.length === 0) return;

      if (confirm("Are you sure you want to clear all travel legs?")) {
        travelLegs = [];
        renderTravelTable();
        updateTravelSummary();
      }
    });
  }
}

// Remove specific leg (exposed to window for onclick handler)
window.removeTravelLeg = function (id) {
  const leg = travelLegs.find(l => l.id === id);
  if (leg && confirm(`Remove leg: ${leg.origin} → ${leg.dest}?`)) {
    travelLegs = travelLegs.filter(l => l.id !== id);
    renderTravelTable();
    updateTravelSummary();
  }
};

// ============================================================================
// QUICK STATS UPDATER (for home page summary)
// ============================================================================
const quickTripCountEl = document.getElementById("quick-trip-count");

function updateQuickStats() {
  if (quickTripCountEl) {
    const count = travelLegs.length;
    quickTripCountEl.textContent = count === 0 ? "0 legs" : `${count} leg${count !== 1 ? 's' : ''}`;
  }
}

setInterval(updateQuickStats, 2500);

// ============================================================================
// INSIGHTS ELEMENT REFERENCES (shared with other modules)
// ============================================================================
const insightsForecastEl = document.getElementById("ins-forecast");
const insightsTreesEl = document.getElementById("ins-trees");
const insightsTopEl = document.getElementById("ins-top");
const insightsTipEl = document.getElementById("ins-tip");

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize when DOM is fully loaded
// Always wait for DOMContentLoaded to ensure all elements are available
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeFootprintCalculator();
    initializeTravelPlanner();
    console.log("Carbon Neutrality app initialized");
  });
} else {
  // DOM is already ready, but use setTimeout to ensure all elements are rendered
  setTimeout(() => {
    initializeFootprintCalculator();
    initializeTravelPlanner();
    console.log("Carbon Neutrality app initialized");
  }, 0);
}
