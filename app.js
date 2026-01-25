const BASE_URL =
  "https://departureboard-io-api-mj7fisk44q-nw.a.run.app/api/v1.0";

console.log("[app] script loaded at", performance.now().toFixed(0), "ms");

const ROUTES = {
  outbound: {
    from: "ELW",
    to: "CST",
    label: "Eltham to London Cannon Street",
    pill: "ELW → CST",
  },
  inbound: {
    from: "CST",
    to: "ELW",
    label: "London Cannon Street to Eltham",
    pill: "CST → ELW",
  },
};

const REFRESH_INTERVAL_MS = 60000;
const LOOP_MINUTES = 45;
const LOOP_STOPS = 12;

const elements = {
  tabs: document.querySelectorAll(".tab"),
  routeLabel: document.getElementById("route-label"),
  routePill: document.getElementById("route-pill"),
  state: document.getElementById("state"),
  departures: document.getElementById("departures"),
  alerts: document.getElementById("alerts"),
  lastUpdated: document.getElementById("last-updated"),
  refresh: document.getElementById("refresh"),
};

let activeRoute = localStorage.getItem("route") || "outbound";
let refreshTimer = null;

const pad = (value) => value.toString().padStart(2, "0");

const formatTimestamp = (date) =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

const parseDurationMinutes = (duration) => {
  if (!duration) return 0;
  const hoursMatch = duration.match(/(\d+)\s*hour/);
  const minutesMatch = duration.match(/(\d+)\s*minute/);
  const hours = hoursMatch ? Number(hoursMatch[1]) : 0;
  const minutes = minutesMatch ? Number(minutesMatch[1]) : 0;
  return hours * 60 + minutes;
};

const isLoopService = (service) => {
  const durationMinutes = parseDurationMinutes(service.duration);
  const stopCount = service.callingPoints ? service.callingPoints.length : 0;
  return durationMinutes > LOOP_MINUTES || stopCount > LOOP_STOPS;
};

const statusClass = (service) => {
  if (service.isCancelled) return "cancelled";
  if (!service.departureDue || service.departureDue === "On time") return "ontime";
  return "delayed";
};

const statusLabel = (service) =>
  service.isCancelled ? "Cancelled" : service.departureDue || "On time";

const reasonText = (service) =>
  service.cancelReason ||
  service.delayReason ||
  service.nrCancelReason ||
  service.nrDelayReason ||
  "";

const formatStops = (service) => {
  if (!service.callingPoints) return "Stops: --";
  return `Stops: ${service.callingPoints.length}`;
};

const renderAlerts = (payload) => {
  const alerts = [];
  if (payload.alert_messages) {
    if (Array.isArray(payload.alert_messages)) {
      alerts.push(...payload.alert_messages);
    } else {
      alerts.push(payload.alert_messages);
    }
  }

  if (!alerts.length) {
    elements.alerts.hidden = true;
    elements.alerts.innerHTML = "";
    return;
  }

  elements.alerts.hidden = false;
  elements.alerts.innerHTML = alerts
    .map((message) => `<div>${message}</div>`)
    .join("");
};

const renderServices = (services) => {
  if (!services.length) {
    elements.state.textContent = "No departures right now.";
    elements.departures.innerHTML = "";
    return;
  }

  elements.state.textContent = "";
  elements.departures.innerHTML = services
    .map((service) => {
      const loop = isLoopService(service);
      const quick = service.isQuickest;
      const platform = service.platformHidden
        ? "Platform tbd"
        : `Platform ${service.departingPlatform || "TBD"}`;
      const terminates = service.trainTerminates || service.destFullName;
      const dueClass = statusClass(service);
      const reason = reasonText(service);
      const badges = [
        loop ? '<span class="badge loop">Loop</span>' : "",
        quick ? '<span class="badge quickest">Fastest</span>' : "",
      ]
        .filter(Boolean)
        .join("");

      return `
        <article class="service-card">
          <div class="service-top">
            <div>
              <div class="time">${service.departureScheduled}</div>
              <div class="service-meta">To ${terminates}</div>
            </div>
            <div class="status ${dueClass}">${statusLabel(service)}</div>
          </div>
          <div class="service-meta">
            <div>${platform} • ${service.duration || ""}</div>
            <div>${formatStops(service)} • Arrive ${service.arrivalScheduled}</div>
          </div>
          <div class="badges">${badges}</div>
          ${reason ? `<div class="reason">${reason}</div>` : ""}
        </article>
      `;
    })
    .join("");
};

const fetchDepartures = async (routeKey) => {
  const route = ROUTES[routeKey];
  const url = `${BASE_URL}/getFormattedJourneyByCRS?sourceCRS=${route.from}&destCRS=${route.to}`;
  console.log("[fetch] starting request to", url);
  const t0 = performance.now();
  const response = await fetch(url, { cache: "no-store" });
  console.log(`[fetch] response received in ${(performance.now() - t0).toFixed(0)}ms, status=${response.status}`);
  if (!response.ok) {
    throw new Error(`Network ${response.status}`);
  }
  const t1 = performance.now();
  const data = await response.json();
  console.log(`[fetch] json parsed in ${(performance.now() - t1).toFixed(0)}ms`);
  return data;
};

const setRoute = (routeKey) => {
  activeRoute = routeKey;
  localStorage.setItem("route", routeKey);
  elements.tabs.forEach((tab) => {
    const isActive = tab.dataset.route === routeKey;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  const route = ROUTES[routeKey];
  elements.routeLabel.textContent = route.label;
  elements.routePill.textContent = route.pill;
};

const refresh = async () => {
  const t0 = performance.now();
  const log = (msg) => console.log(`[${(performance.now() - t0).toFixed(0)}ms] ${msg}`);
  try {
    log("refresh start");
    elements.state.textContent = "Loading departures…";
    log("before fetch");
    const payload = await fetchDepartures(activeRoute);
    log("after fetch");
    renderAlerts(payload);
    log("after renderAlerts");
    renderServices(payload.data || []);
    log("after renderServices");
    elements.lastUpdated.textContent = formatTimestamp(new Date());
    // Show ambient effects and load fonts only after first successful render
    if (window.__deferredInit) window.__deferredInit();
    log("done");
  } catch (error) {
    log("error: " + error.message);
    elements.state.textContent = "Unable to load departures.";
    elements.departures.innerHTML = "";
  }
};

const scheduleRefresh = () => {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(refresh, REFRESH_INTERVAL_MS);
};

const init = () => {
  setRoute(activeRoute);
  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const routeKey = tab.dataset.route;
      if (routeKey === activeRoute) return;
      setRoute(routeKey);
      refresh();
    });
  });

  elements.refresh.addEventListener("click", refresh);
  refresh();
  scheduleRefresh();
};

init();
