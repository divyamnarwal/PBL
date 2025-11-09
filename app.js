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

document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", event => {
    const targetId = link.getAttribute("href");
    if (!targetId || targetId === "#") return;
    event.preventDefault();
    const targetEl = document.querySelector(targetId);
    if (!targetEl) return;
    const headerOffset = 80;
    const top = targetEl.getBoundingClientRect().top + window.pageYOffset - headerOffset;
    window.scrollTo({ top, behavior: "smooth" });
  });
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

// ===== LIVE CO2 SENSOR (SIMULATED) =====
const liveCO2ValueEl = document.getElementById("live-co2-value");
const liveCO2StatusEl = document.getElementById("live-co2-status");

function updateLiveCO2() {
  if (!liveCO2ValueEl || !liveCO2StatusEl) return;

  const base = 410;
  const variance = (Math.random() - 0.5) * 120;
  const reading = Math.round(base + variance);

  requestAnimationFrame(() => {
    liveCO2ValueEl.textContent = `${reading} ppm`;
    if (reading < 420) {
      liveCO2StatusEl.textContent = "Normal";
      liveCO2StatusEl.className = "font-medium text-green-600";
    } else if (reading < 550) {
      liveCO2StatusEl.textContent = "Moderate";
      liveCO2StatusEl.className = "font-medium text-yellow-600";
    } else {
      liveCO2StatusEl.textContent = "High";
      liveCO2StatusEl.className = "font-medium text-red-600";
    }
  });
}

updateLiveCO2();
setInterval(updateLiveCO2, 5000);

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
const fpCarEl = document.getElementById("fp-car-kms");
const fpCarValEl = document.getElementById("fp-car-kms-val");
const fpFlightsEl = document.getElementById("fp-flights");
const fpFlightsValEl = document.getElementById("fp-flights-val");
const fpElectricityEl = document.getElementById("fp-electricity");
const fpElectricityValEl = document.getElementById("fp-electricity-val");
const fpShoppingEl = document.getElementById("fp-shopping");
const fpShoppingValEl = document.getElementById("fp-shopping-val");
const fpDietEl = document.getElementById("fp-diet");
const fpCalcBtn = document.getElementById("fp-calc");
const fpTotalEl = document.getElementById("fp-total");
const fpTipsEl = document.getElementById("fp-tips");

[fpCarEl, fpFlightsEl, fpElectricityEl, fpShoppingEl].forEach(input => {
  input?.addEventListener("input", updateRangeLabels);
});

function updateRangeLabels() {
  if (fpCarEl && fpCarValEl) fpCarValEl.textContent = fpCarEl.value;
  if (fpFlightsEl && fpFlightsValEl) fpFlightsValEl.textContent = fpFlightsEl.value;
  if (fpElectricityEl && fpElectricityValEl) fpElectricityValEl.textContent = fpElectricityEl.value;
  if (fpShoppingEl && fpShoppingValEl) fpShoppingValEl.textContent = fpShoppingEl.value;
}

updateRangeLabels();

function calculateFootprint() {
  if (!fpCarEl || !fpFlightsEl || !fpElectricityEl || !fpShoppingEl || !fpDietEl || !fpTotalEl || !fpTipsEl) return;

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

  footprintChart?.destroy();
  if (!footprintChartCtx) return;

  footprintChart = new Chart(footprintChartCtx, {
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

fpCalcBtn?.addEventListener("click", event => {
  event.preventDefault();
  updateRangeLabels();
  calculateFootprint();
});

calculateFootprint();

// ===== TRAVEL PLANNER =====
const tOriginEl = document.getElementById("t-origin");
const tDestEl = document.getElementById("t-dest");
const tModeEl = document.getElementById("t-mode");
const tTripsEl = document.getElementById("t-trips");
const tRoundEl = document.getElementById("t-round");
const tMonthsEl = document.getElementById("t-months");
const tAddBtn = document.getElementById("t-add");
const tClearBtn = document.getElementById("t-clear");
const tTableBody = document.querySelector("#t-table tbody");
const tTotalEl = document.getElementById("t-total");
const tRecsEl = document.getElementById("t-recs");

let travelLegs = [];

const distances = {
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

const emissionRates = {
  flight: 0.255,
  train: 0.041,
  car: 0.192,
  bus: 0.089
};

function getDistance(origin, dest) {
  const direct = `${origin}-${dest}`;
  const reverse = `${dest}-${origin}`;
  return distances[direct] ?? distances[reverse] ?? 500;
}

function computeLegEmission(origin, dest, mode, roundTrip) {
  const distance = getDistance(origin, dest);
  const factor = emissionRates[mode] ?? emissionRates.flight;
  return distance * factor * (roundTrip ? 2 : 1);
}
tAddBtn?.addEventListener("click", () => {
  if (!tOriginEl || !tDestEl || !tModeEl || !tTripsEl || !tRoundEl || !tMonthsEl) return;
  if (tOriginEl.value === tDestEl.value) {
    alert("Origin and destination cannot be the same.");
    return;
  }

  const leg = {
    id: Date.now(),
    origin: tOriginEl.value,
    dest: tDestEl.value,
    mode: tModeEl.value,
    trips: Math.max(Number(tTripsEl.value) || 1, 1),
    months: Math.min(Math.max(Number(tMonthsEl.value) || 1, 1), 12),
    roundTrip: tRoundEl.value === "round"
  };

  leg.distance = getDistance(leg.origin, leg.dest);
  leg.emissionPerTrip = computeLegEmission(leg.origin, leg.dest, leg.mode, leg.roundTrip);

  travelLegs.push(leg);
  renderTravelTable();
  updateTravelSummary();
});

tClearBtn?.addEventListener("click", () => {
  travelLegs = [];
  renderTravelTable();
  updateTravelSummary();
});

window.removeTravelLeg = function (id) {
  travelLegs = travelLegs.filter(leg => leg.id !== id);
  renderTravelTable();
  updateTravelSummary();
};

function renderTravelTable() {
  if (!tTableBody) return;
  tTableBody.innerHTML = "";

  travelLegs.forEach((leg, idx) => {
    const row = document.createElement("tr");
    row.className = "border-b dark:border-gray-700 text-sm";
    row.innerHTML = `
      <td class="py-2">${idx + 1}</td>
      <td>${leg.origin} to ${leg.dest}<div class="text-xs text-gray-500">${leg.mode}, ${leg.roundTrip ? "Round" : "One-way"}</div></td>
      <td>${leg.distance} km</td>
      <td>${leg.emissionPerTrip.toFixed(1)} kg</td>
      <td><button class="text-red-600 text-xs" onclick="removeTravelLeg(${leg.id})">Remove</button></td>
    `;
    tTableBody.appendChild(row);
  });
}

function updateTravelSummary() {
  if (!tTotalEl || !tRecsEl) return;

  const total = travelLegs.reduce((sum, leg) => sum + leg.emissionPerTrip * leg.trips * leg.months, 0);
  tTotalEl.textContent = `${total.toFixed(1)} kg CO2e`;

  const recs = [];
  if (travelLegs.some(leg => leg.mode === "flight")) recs.push("Consider rail for short-haul trips to cut emissions.");
  if (travelLegs.some(leg => leg.mode === "car")) recs.push("Try carpooling or switching to bus for regular routes.");
  if (total > 1500) recs.push("High travel footprint detected. Explore virtual meetings or fewer trips.");
  tRecsEl.innerHTML = recs.length ? recs.map(r => `<li>${r}</li>`).join("") : "<li>Plan looks efficient!</li>";

  renderTravelChart();
  updateInsights(total);
}

function renderTravelChart() {
  if (!travelChartCtx) return;
  travelChart?.destroy();
  if (!travelLegs.length) return;

  const maxMonths = Math.max(...travelLegs.map(leg => leg.months));
  const labels = Array.from({ length: maxMonths }, (_, idx) => `M${idx + 1}`);
  const series = labels.map((_, idx) => {
    const monthIdx = idx + 1;
    return travelLegs.reduce((sum, leg) => sum + (monthIdx <= leg.months ? leg.emissionPerTrip * leg.trips : 0), 0);
  });

  travelChart = new Chart(travelChartCtx, {
    type: "bar",
    data: {
      labels,
      datasets: [{ data: series, backgroundColor: "#3b82f6", borderRadius: 6 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      aspectRatio: 1.4,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { font: { size: 10 } } },
        y: { beginAtZero: true, ticks: { font: { size: 10 } } }
      }
    }
  });
}

const quickTripCountEl = document.getElementById("quick-trip-count");
const quickCO2ValueEl = document.getElementById("quick-co2-value");
const quickCO2StatusEl = document.getElementById("quick-co2-status");

function updateQuickStats() {
  if (quickTripCountEl) quickTripCountEl.textContent = `${travelLegs.length} legs`;
  if (quickCO2ValueEl && liveCO2ValueEl) quickCO2ValueEl.textContent = liveCO2ValueEl.textContent;
  if (quickCO2StatusEl && liveCO2StatusEl) quickCO2StatusEl.textContent = liveCO2StatusEl.textContent;
}

setInterval(updateQuickStats, 2500);

const insightsForecastEl = document.getElementById("ins-forecast");
const insightsTreesEl = document.getElementById("ins-trees");
const insightsTopEl = document.getElementById("ins-top");
const insightsTipEl = document.getElementById("ins-tip");

function updateInsights(totalTravel) {
  if (insightsForecastEl) insightsForecastEl.textContent = `${totalTravel.toFixed(0)} kg`;
  if (insightsTreesEl) insightsTreesEl.textContent = `${Math.ceil(totalTravel / 20)} trees`;

  if (insightsTopEl) {
    if (!travelLegs.length) {
      insightsTopEl.textContent = "NA";
    } else {
      const top = travelLegs.reduce((max, leg) => {
        const legTotal = leg.emissionPerTrip * leg.trips * leg.months;
        return !max || legTotal > max.total ? { name: `${leg.mode} (${leg.origin} to ${leg.dest})`, total: legTotal } : max;
      }, null);
      insightsTopEl.textContent = top?.name ?? "NA";
    }
  }

  if (insightsTipEl) {
    insightsTipEl.textContent = totalTravel > 800
      ? "Swap high-emission legs with trains or buses to cut travel emissions quickly."
      : "Great job! Keep monitoring and balancing travel plans.";
  }
}

console.log("Carbon Neutrality app initialized");
