const BASE_URL =
  "https://departureboard-io-api-mj7fisk44q-nw.a.run.app/api/v1.0";

const ROUTES = {
  outbound: {
    from: "ELW",
    to: "CST",
    label: "Eltham to London Cannon Street",
    destination: "London Cannon Street",
    pill: "ELW → CST",
  },
  inbound: {
    from: "CST",
    to: "ELW",
    label: "London Cannon Street to Eltham",
    destination: "Eltham",
    pill: "CST → ELW",
  },
};

const REFRESH_INTERVAL_MS = 60000;
const LOOP_MINUTES = 45;
const LOOP_STOPS = 12;

const elements = {
  tabs: Array.from(document.querySelectorAll(".tab")),
  routeLabel: document.getElementById("route-label"),
  routePill: document.getElementById("route-pill"),
  state: document.getElementById("state"),
  departures: document.getElementById("departures"),
  departuresPanel: document.getElementById("departures-panel"),
  alerts: document.getElementById("alerts"),
  lastUpdated: document.getElementById("last-updated"),
  refresh: document.getElementById("refresh"),
};

let activeRoute = "outbound";
let refreshTimer = null;
let requestController = null;
let requestId = 0;

const hasRoute = (routeKey) =>
  Object.prototype.hasOwnProperty.call(ROUTES, routeKey);

const readStoredRoute = () => {
  try {
    const storedRoute = window.localStorage.getItem("route");
    return hasRoute(storedRoute) ? storedRoute : "outbound";
  } catch (error) {
    return "outbound";
  }
};

const storeRoute = (routeKey) => {
  try {
    window.localStorage.setItem("route", routeKey);
  } catch (error) {
    // Storage can be unavailable in private browsing or blocked contexts.
  }
};

const pad = (value) => value.toString().padStart(2, "0");

const formatTimestamp = (date) =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

const displayValue = (value, fallback = "") => {
  if (typeof value === "string" || typeof value === "number") {
    const text = String(value).trim();
    return text || fallback;
  }
  return fallback;
};

const escapeHTML = (value) =>
  displayValue(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const parseDurationMinutes = (duration) => {
  const text = displayValue(duration).toLowerCase();
  if (!text) return 0;
  const hoursMatch = text.match(/(\d+)\s*hour/);
  const minutesMatch = text.match(/(\d+)\s*minute/);
  const hours = hoursMatch ? Number(hoursMatch[1]) : 0;
  const minutes = minutesMatch ? Number(minutesMatch[1]) : 0;
  return hours * 60 + minutes;
};

const isLoopService = (service) => {
  const durationMinutes = parseDurationMinutes(service.duration);
  const stopCount = Array.isArray(service.callingPoints)
    ? service.callingPoints.length
    : 0;
  return durationMinutes > LOOP_MINUTES || stopCount > LOOP_STOPS;
};

const isTrue = (value) => value === true || value === 1 || value === "true";

const isTime = (value) => /^\d{1,2}:\d{2}$/.test(value);

const sameTime = (first, second) => {
  if (!isTime(first) || !isTime(second)) return false;
  const [firstHours, firstMinutes] = first.split(":").map(Number);
  const [secondHours, secondMinutes] = second.split(":").map(Number);
  return firstHours === secondHours && firstMinutes === secondMinutes;
};

const status = (service) => {
  if (isTrue(service.isCancelled)) {
    return { className: "cancelled", label: "Cancelled" };
  }

  const scheduled = displayValue(service.departureScheduled);
  const due = displayValue(service.departureDue);
  if (!due || /^on time$/i.test(due) || sameTime(due, scheduled)) {
    return { className: "ontime", label: "On time" };
  }
  if (isTime(due) && !sameTime(due, scheduled)) {
    return { className: "delayed", label: `Expected ${due}` };
  }
  return { className: "delayed", label: due };
};

const reasonText = (service) =>
  displayValue(
    service.cancelReason ||
      service.delayReason ||
      service.nrCancelReason ||
      service.nrDelayReason
  );

const formatStops = (service) => {
  if (!Array.isArray(service.callingPoints)) return "Stops: --";
  return `Stops: ${service.callingPoints.length}`;
};

const renderAlerts = (payload) => {
  const rawAlerts =
    payload && typeof payload === "object" ? payload.alert_messages : null;
  const alerts = Array.isArray(rawAlerts)
    ? rawAlerts
    : rawAlerts === null || rawAlerts === undefined
      ? []
      : [rawAlerts];

  if (!alerts.length) {
    elements.alerts.hidden = true;
    elements.alerts.innerHTML = "";
    return;
  }

  elements.alerts.hidden = false;
  elements.alerts.innerHTML = alerts
    .map((message) => `<div>${escapeHTML(message)}</div>`)
    .join("");
};

const renderServices = (services, routeKey) => {
  if (!services.length) {
    elements.state.textContent = "No departures right now.";
    elements.departures.innerHTML = "";
    return;
  }

  const destination = ROUTES[routeKey].destination;
  elements.state.textContent = "";
  elements.departures.innerHTML = services
    .map((service) => {
      const loop = isLoopService(service);
      const quick = isTrue(service.isQuickest);
      const scheduled = displayValue(service.departureScheduled, "--:--");
      const arrival = displayValue(service.arrivalScheduled, "--:--");
      const duration = displayValue(service.duration, "Duration --");
      const platform = isTrue(service.platformHidden)
        ? "tbd"
        : displayValue(service.departingPlatform, "tbd");
      const serviceDestination = displayValue(service.destFullName, destination);
      const serviceStatus = status(service);
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
            <div class="service-heading">
              <div class="time">${escapeHTML(scheduled)}</div>
              <div class="service-destination">To ${escapeHTML(
                serviceDestination
              )}</div>
            </div>
            <div class="status ${serviceStatus.className}">${escapeHTML(
              serviceStatus.label
            )}</div>
          </div>
          <div class="journey-meta">
            <div class="platform-block">
              <span class="platform-label">Platform</span>
              <span class="platform-value">${escapeHTML(platform)}</span>
            </div>
            <div><span class="meta-label">${escapeHTML(duration)}</span></div>
            <div><span class="meta-label">Arrive</span> ${escapeHTML(arrival)}</div>
          </div>
          <div class="service-meta">${escapeHTML(formatStops(service))}</div>
          <div class="badges">${badges}</div>
          ${reason ? `<div class="reason">${escapeHTML(reason)}</div>` : ""}
        </article>
      `;
    })
    .join("");
};

const fetchDepartures = async (routeKey, signal) => {
  const route = ROUTES[routeKey];
  const url = `${BASE_URL}/getFormattedJourneyByCRS?sourceCRS=${route.from}&destCRS=${route.to}`;
  const response = await fetch(url, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`Network ${response.status}`);
  return response.json();
};

const setLoading = (loading) => {
  elements.refresh.disabled = loading;
  elements.refresh.setAttribute("aria-disabled", loading ? "true" : "false");
  elements.refresh.textContent = loading ? "Refreshing…" : "Refresh departures";
  elements.refresh.setAttribute(
    "aria-label",
    loading ? "Refreshing departures" : "Refresh departures"
  );
  elements.departuresPanel.setAttribute("aria-busy", loading ? "true" : "false");
};

const setRoute = (routeKey) => {
  if (!hasRoute(routeKey)) routeKey = "outbound";
  activeRoute = routeKey;
  storeRoute(routeKey);
  elements.tabs.forEach((tab) => {
    const isActive = tab.dataset.route === routeKey;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", isActive ? "true" : "false");
    tab.setAttribute("tabindex", isActive ? "0" : "-1");
    if (isActive) elements.departuresPanel.setAttribute("aria-labelledby", tab.id);
  });

  const route = ROUTES[routeKey];
  elements.routeLabel.textContent = route.label;
  elements.routePill.textContent = route.pill;
  elements.state.textContent = "Loading departures…";
  elements.departures.innerHTML = "";
  elements.alerts.hidden = true;
  elements.alerts.innerHTML = "";
};

const refresh = async () => {
  const routeKey = activeRoute;
  const currentRequestId = ++requestId;
  if (requestController) requestController.abort();
  requestController =
    typeof AbortController === "function" ? new AbortController() : null;
  const signal = requestController ? requestController.signal : undefined;

  setLoading(true);
  elements.state.textContent = "Loading departures…";
  try {
    const payload = await fetchDepartures(routeKey, signal);
    if (currentRequestId !== requestId || routeKey !== activeRoute) return;
    const services =
      payload && typeof payload === "object" && Array.isArray(payload.data)
        ? payload.data.filter((service) => service && typeof service === "object")
        : [];
    renderAlerts(payload);
    renderServices(services, routeKey);
    elements.lastUpdated.textContent = formatTimestamp(new Date());
  } catch (error) {
    if ((error && error.name === "AbortError") || currentRequestId !== requestId) return;
    elements.state.textContent = "Unable to load departures. Select Refresh departures to retry.";
    elements.departures.innerHTML = "";
    elements.alerts.hidden = true;
    elements.alerts.innerHTML = "";
  } finally {
    if (currentRequestId === requestId) {
      requestController = null;
      setLoading(false);
    }
  }
};

const scheduleRefresh = () => {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(refresh, REFRESH_INTERVAL_MS);
};

const activateTab = (tab) => {
  const routeKey = tab.dataset.route;
  if (!hasRoute(routeKey) || routeKey === activeRoute) return;
  setRoute(routeKey);
  refresh();
};

const init = () => {
  activeRoute = readStoredRoute();
  setRoute(activeRoute);
  elements.tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateTab(tab));
    tab.addEventListener("keydown", (event) => {
      const key = event.key;
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return;
      event.preventDefault();
      const offset = key === "ArrowLeft" ? -1 : key === "ArrowRight" ? 1 : 0;
      const nextIndex =
        key === "Home" ? 0 : key === "End" ? elements.tabs.length - 1 : index + offset;
      const nextTab =
        elements.tabs[(nextIndex + elements.tabs.length) % elements.tabs.length];
      nextTab.focus();
      activateTab(nextTab);
    });
  });

  elements.refresh.addEventListener("click", refresh);
  if (window.__deferredInit) window.__deferredInit();
  refresh();
  scheduleRefresh();
};

init();
