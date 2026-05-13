const state = {
  data: null,
  records: [],
  filteredRecords: [],
  recordById: new Map(),
  facetCountsByKey: new Map(),
  fuzzyScores: new Map(),
  fuse: null,
  standardsLookup: new Map(),
  standardsFuzzyCandidates: [],
  standardInfoCache: new Map(),
  selectedId: null,
  searchDebounceId: null,
  tooltipShowTimerId: null,
  tooltipHideTimerId: null,
  tooltipLockUntilTs: 0,
  search: "",
  quickTag: "",
  sort: "relevance",
  view: "grid",
  pageSize: 24,
  visibleCount: 24,
  filters: {
    dataset: new Set(),
    gradeBand: new Set(),
    gradeLevels: new Set(),
    source: new Set(),
    type: new Set(),
    scope: new Set(),
    collectionName: new Set(),
    projectNames: new Set(),
    subjectAreas: new Set(),
    practices: new Set(),
    dciTags: new Set(),
    crossCuttingConcepts: new Set(),
    ngssPe: new Set()
  }
};

const filterConfig = [
  { key: "dataset", label: "Dataset" },
  { key: "subjectAreas", label: "Subject Areas" },
  { key: "gradeBand", label: "Grade Band" },
  { key: "gradeLevels", label: "Grade Level" },
  { key: "source", label: "Source" },
  { key: "type", label: "Type" },
  { key: "scope", label: "Scope" },
  { key: "collectionName", label: "Collection" },
  { key: "projectNames", label: "Project" },
  { key: "practices", label: "Science and Engineering Practices" },
  { key: "dciTags", label: "Disciplinary Core Ideas" },
  { key: "crossCuttingConcepts", label: "Crosscutting Concepts" },
  { key: "ngssPe", label: "Performance Expectations" },
  // Disabled/hidden filters available in state but not shown in UI:
  // { key: "keywords", label: "Keywords" },
  // { key: "notableFeatures", label: "Notable Features" },
  // { key: "additionalAspects", label: "Additional Aspects" },
  // { key: "stse", label: "STSE" },
  // { key: "natureOfScience", label: "Nature of Science" }
];

const defaultExpandedFilters = new Set();

const STANDARD_ALIASES = {
  "analyzing data": "analyzing and interpreting data",
  "using math": "using mathematics and computational thinking",
  "constructing explanations": "constructing explanations and designing solutions",
  "evaluating evidence": "engaging in argument from evidence",
  "evaluating models": "developing and using models",
  "evaluating investigations": "planning and carrying out investigations"
};

const PRACTICE_CANONICAL = {
  "analyzing and interpreting data": "Analyzing and Interpreting Data",
  "analyzing data": "Analyzing and Interpreting Data",
  "asking questions": "Asking Questions and Defining Problems",
  "asking questions and defining problems": "Asking Questions and Defining Problems",
  "constructing explanations": "Constructing Explanations and Designing Solutions",
  "constructing explanations and designing solutions": "Constructing Explanations and Designing Solutions",
  "developing and using models": "Developing and Using Models",
  "engaging in argument from evidence": "Engaging in Argument from Evidence",
  "obtaining": "Obtaining, Evaluating, and Communicating Information",
  "and communicating information": "Obtaining, Evaluating, and Communicating Information",
  "obtaining, evaluating, and communicating information": "Obtaining, Evaluating, and Communicating Information",
  "obtaining, evaluating, and communcating information": "Obtaining, Evaluating, and Communicating Information",
  "planning and carrying out investigations": "Planning and Carrying Out Investigations",
  "planning carrying out investigations": "Planning and Carrying Out Investigations",
  "using mathematics and computational thinking": "Using Mathematics and Computational Thinking",
  "mathematics and computational thinking": "Using Mathematics and Computational Thinking"
};

const CROSS_CUTTING_CANONICAL = {
  "cause and effect": "Cause and Effect",
  "cause and effect: mechanism and explanation": "Cause and Effect",
  "energy and matter": "Energy and Matter",
  "energy and matter: flow, cycles, and conservation": "Energy and Matter",
  "patterns": "Patterns",
  "scale, proportion and quantity": "Scale, Proportion, and Quantity",
  "scale, proportion, and quantity": "Scale, Proportion, and Quantity",
  "stability and change": "Stability and Change",
  "structure and function": "Structure and Function",
  "systems and system models": "Systems and System Models",
  "systems and systems models": "Systems and System Models"
};

const SUBJECT_AREA_CANONICAL = {
  "physical science": "Physical Science",
  "physical sciences": "Physical Science",
  "life science": "Life Science",
  "life sciences": "Life Science",
  "earth and space science": "Earth and Space Science",
  "earth and space sciences": "Earth and Space Science"
};

const SUBJECT_AREA_PARENT = {
  Physics: "Physical Science",
  Chemistry: "Physical Science"
};

const SUBJECT_AREA_PARENT_ORDER = [
  "Physical Science",
  "Life Science",
  "Earth and Space Science",
  "Engineering"
];

const SUBJECT_AREA_CHILD_ORDER = {
  Physics: 1,
  Chemistry: 2
};

const PLACEHOLDER_IMAGE_TEMPLATE = `
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" role="img" aria-label="No image available">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f1f5f9" />
      <stop offset="100%" stop-color="#e2e8f0" />
    </linearGradient>
  </defs>
  <rect width="640" height="360" fill="url(#bg)" />
  <rect x="24" y="24" width="592" height="312" rx="14" fill="none" stroke="#cbd5e1" stroke-width="2" />
  <circle cx="320" cy="145" r="40" fill="#cbd5e1" />
  <rect x="198" y="214" width="244" height="14" rx="7" fill="#94a3b8" />
  <text x="320" y="258" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="24" fill="#475569">No image available</text>
  <text x="320" y="290" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="18" fill="#64748b">__DATASET__</text>
</svg>`;

const CACHE_SETTINGS = {
  enabled: typeof window !== "undefined" && "indexedDB" in window,
  dbName: "assessment-explorer-cache",
  dbVersion: 1,
  storeName: "json-cache",
  cacheVersion: "2026-05-11-ngss-components-cleanup-1",
  maxAgeMs: 24 * 60 * 60 * 1000
};

const CACHE_KEYS = {
  database: "database:assessment_examples",
  ngssReference: "ngss:reference-payloads"
};

const TOOLTIP_DELAY_MS = {
  showHover: 180,
  showFocus: 0,
  hideHover: 120,
  hideFocus: 0
};

const TOOLTIP_LOCK_MS = {
  onEnter: 450,
  onLeave: 220
};

const elements = {
  searchInput: document.querySelector("#search-input"),
  resetButton: document.querySelector("#reset-button"),
  activeFilters: document.querySelector("#active-filters"),
  activeFilterCount: document.querySelector("#active-filter-count"),
  filterGroups: document.querySelector("#filter-groups"),
  resultsSummary: document.querySelector("#results-summary"),
  resultsPageSize: document.querySelector("#results-page-size"),
  sortSelect: document.querySelector("#sort-select"),
  quickResetButton: document.querySelector("#quick-reset-button"),
  clearCacheButton: document.querySelector("#clear-cache-button"),
  resultsList: document.querySelector("#results-list"),
  resultsPagination: document.querySelector("#results-pagination"),
  detailEmpty: document.querySelector("#detail-empty"),
  detailContent: document.querySelector("#detail-content"),
  detailDataset: document.querySelector("#detail-dataset"),
  detailTitle: document.querySelector("#detail-title"),
  detailDescription: document.querySelector("#detail-description"),
  detailLinks: document.querySelector("#detail-links"),
  detailMetadata: document.querySelector("#detail-metadata"),
  detailRaw: document.querySelector("#detail-raw"),
  detailClose: document.querySelector("#detail-close"),
  standardsTooltip: document.querySelector("#standards-tooltip"),
  resultCardTemplate: document.querySelector("#result-card-template"),
  filtersToggleButton: document.querySelector("#filters-toggle-button"),
  inspectorToggleButton: document.querySelector("#inspector-toggle-button"),
  mobileFiltersButton: document.querySelector("#mobile-filters-button"),
  mobileInspectorButton: document.querySelector("#mobile-inspector-button"),
  mobileFiltersClose: document.querySelector("#mobile-filters-close"),
  mobileDetailClose: document.querySelector("#mobile-detail-close"),
  mobileScrim: document.querySelector("#mobile-scrim"),
  desktopScrim: document.querySelector("#desktop-scrim"),
  gridViewButton: document.querySelector("#grid-view-button"),
  listViewButton: document.querySelector("#list-view-button")
};

initialize();

async function initialize() {
  wireEvents();

  try {
    await refreshData();
  }
  catch (error) {
    elements.resultsSummary.textContent = "Database failed to load";
    elements.resultsList.innerHTML = `<div class="empty-state"><h3>Unable to load the database</h3><p>${escapeHtml(error.message)}</p><p>Serve this folder over a local web server and make sure assessment_examples_database.json exists.</p></div>`;
  }
}

async function refreshData(options = {}) {
  const { bypassCache = false } = options;
  state.data = await loadDatabaseData({ bypassCache });
  state.standardsLookup = await loadNgssReferenceData({ bypassCache });
  state.records = annotateCrossDatasetConnections(mergeOverlappingRecords(dedupeById(state.data.records || [])));
  prepareRuntimeCaches();
  initializeFuzzySearch();
  renderFilters();
  updateSearchClearButtonVisibility(state.search);
  applyFilters();
}

async function loadDatabaseData(options = {}) {
  const { bypassCache = false } = options;
  const databaseCandidates = [
    "./assessment_examples_database_deduped.json",
    "./assessment_examples_database.json"
  ];

  if (!bypassCache) {
    const cached = await getCachedJson(CACHE_KEYS.database, { maxAgeMs: CACHE_SETTINGS.maxAgeMs });
    if (cached && cached.records) {
      return cached;
    }
  }

  try {
    for (const candidate of databaseCandidates) {
      const attempt = await fetch(candidate);
      if (!attempt.ok) {
        continue;
      }

      const payload = await attempt.json();
      if (payload && payload.records) {
        void setCachedJson(CACHE_KEYS.database, payload);
      }
      return payload;
    }
  }
  catch (error) {
    console.warn("Database fetch failed, attempting stale cache fallback.", error);
  }

  const stale = await getCachedJson(CACHE_KEYS.database, { allowStale: true });
  if (stale && stale.records) {
    return stale;
  }

  throw new Error("Failed to load database JSON file.");
}

function openCacheDatabase() {
  if (!CACHE_SETTINGS.enabled) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(CACHE_SETTINGS.dbName, CACHE_SETTINGS.dbVersion);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(CACHE_SETTINGS.storeName)) {
          db.createObjectStore(CACHE_SETTINGS.storeName, { keyPath: "key" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn("IndexedDB unavailable; running without persistent cache.", request.error);
        resolve(null);
      };
    }
    catch (error) {
      console.warn("IndexedDB open failed; running without persistent cache.", error);
      resolve(null);
    }
  });
}

async function getCachedJson(key, options = {}) {
  const { maxAgeMs = CACHE_SETTINGS.maxAgeMs, allowStale = false } = options;
  const db = await openCacheDatabase();
  if (!db) {
    return null;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(CACHE_SETTINGS.storeName, "readonly");
      const store = tx.objectStore(CACHE_SETTINGS.storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result;
        if (!entry || entry.version !== CACHE_SETTINGS.cacheVersion) {
          resolve(null);
          return;
        }

        if (allowStale) {
          resolve(entry.value || null);
          return;
        }

        const ageMs = Date.now() - Number(entry.cachedAt || 0);
        resolve(ageMs <= maxAgeMs ? entry.value || null : null);
      };

      request.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
      tx.onabort = () => db.close();
    }
    catch (error) {
      db.close();
      console.warn("Cache read failed.", error);
      resolve(null);
    }
  });
}

async function setCachedJson(key, value) {
  const db = await openCacheDatabase();
  if (!db) {
    return;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(CACHE_SETTINGS.storeName, "readwrite");
      const store = tx.objectStore(CACHE_SETTINGS.storeName);
      store.put({
        key,
        version: CACHE_SETTINGS.cacheVersion,
        cachedAt: Date.now(),
        value
      });

      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
      tx.onabort = () => {
        db.close();
        resolve();
      };
    }
    catch (error) {
      db.close();
      console.warn("Cache write failed.", error);
      resolve();
    }
  });
}

async function clearCachedJson(key) {
  const db = await openCacheDatabase();
  if (!db) {
    return;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(CACHE_SETTINGS.storeName, "readwrite");
      const store = tx.objectStore(CACHE_SETTINGS.storeName);
      store.delete(key);

      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
      tx.onabort = () => {
        db.close();
        resolve();
      };
    }
    catch (error) {
      db.close();
      console.warn("Cache delete failed.", error);
      resolve();
    }
  });
}

async function clearAllCachedJson() {
  await Promise.all([
    clearCachedJson(CACHE_KEYS.database),
    clearCachedJson(CACHE_KEYS.ngssReference)
  ]);
}

function wireEvents() {
  elements.searchInput?.addEventListener("input", (event) => {
    const nextSearch = event.target.value.trim().toLowerCase();
    state.search = nextSearch;
    updateSearchClearButtonVisibility(nextSearch);
    if (state.searchDebounceId) {
      window.clearTimeout(state.searchDebounceId);
    }

    state.searchDebounceId = window.setTimeout(() => {
      state.searchDebounceId = null;
      applyFilters();
    }, 150);
  });

  elements.resetButton?.addEventListener("click", clearSearchInput);
  elements.quickResetButton?.addEventListener("click", resetFilters);
  elements.clearCacheButton?.addEventListener("click", async () => {
    const button = elements.clearCacheButton;
    if (!button) {
      return;
    }

    const previousText = button.textContent;
    button.disabled = true;
    button.textContent = "Refreshing...";

    try {
      await clearAllCachedJson();
      await refreshData({ bypassCache: true });
      button.textContent = "Cache Cleared";
    }
    catch (error) {
      console.warn("Cache clear refresh failed.", error);
      button.textContent = "Refresh Failed";
    }
    finally {
      window.setTimeout(() => {
        button.textContent = previousText || "Clear Cache";
        button.disabled = false;
      }, 1200);
    }
  });
  elements.resultsPageSize?.addEventListener("change", (event) => {
    const nextPageSize = Number(event.target.value) || 24;
    state.pageSize = nextPageSize;
    resetVisibleResults();
    renderResults(state.search.split(/\s+/).filter(Boolean));
  });
  elements.sortSelect?.addEventListener("change", (event) => {
    state.sort = event.target.value;
    applyFilters();
  });

  elements.gridViewButton?.addEventListener("click", () => changeView("grid"));
  elements.listViewButton?.addEventListener("click", () => changeView("list"));

  elements.detailClose?.addEventListener("click", closeDetailPanel);
  elements.filtersToggleButton?.addEventListener("click", () => togglePanel("filters"));
  elements.inspectorToggleButton?.addEventListener("click", () => togglePanel("inspector"));
  elements.mobileFiltersButton?.addEventListener("click", () => toggleMobilePanel("filters"));
  elements.mobileInspectorButton?.addEventListener("click", () => toggleMobilePanel("inspector"));
  elements.mobileFiltersClose?.addEventListener("click", closePanels);
  elements.mobileDetailClose?.addEventListener("click", closePanels);
  elements.mobileScrim?.addEventListener("click", closeMobilePanels);
  elements.desktopScrim?.addEventListener("click", closePanels);
  elements.filterGroups?.addEventListener("change", handleFilterToggle);
  document.addEventListener("mouseenter", handleStandardTooltipTrigger, true);
  document.addEventListener("focusin", handleStandardTooltipTrigger);
  document.addEventListener("mouseleave", handleStandardTooltipExit, true);
  document.addEventListener("focusout", handleStandardTooltipExit);
  elements.standardsTooltip?.addEventListener("pointerdown", handleStandardsTooltipAction);
  elements.standardsTooltip?.addEventListener("click", handleStandardsTooltipAction);
  elements.standardsTooltip?.addEventListener("mouseenter", handleStandardTooltipEnterTooltip);
  elements.standardsTooltip?.addEventListener("focusin", handleStandardTooltipEnterTooltip);
  elements.standardsTooltip?.addEventListener("mouseleave", handleStandardTooltipLeaveTooltip);
  window.addEventListener("scroll", hideStandardTooltip, true);

  window.addEventListener("resize", () => {
    if (!isMobileView()) {
      closeMobilePanels();
    }

    hideStandardTooltip();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== elements.searchInput) {
      event.preventDefault();
      elements.searchInput?.focus();
      elements.searchInput?.select();
      return;
    }

    if (event.key === "Escape") {
      closePanels();
    }
  });
}

function initializeFuzzySearch() {
  if (typeof Fuse === "undefined") {
    return;
  }

  state.fuse = new Fuse(state.records, {
    includeScore: true,
    threshold: 0.34,
    minMatchCharLength: 2,
    ignoreLocation: true,
    keys: [
      { name: "title", weight: 0.42 },
      { name: "description", weight: 0.22 },
      { name: "searchText", weight: 0.18 },
      { name: "subjectAreas", weight: 0.06 },
      { name: "dciTags", weight: 0.05 },
      { name: "crossCuttingConcepts", weight: 0.04 },
      { name: "practices", weight: 0.03 }
    ]
  });
}

function clearSearchInput() {
  if (state.searchDebounceId) {
    window.clearTimeout(state.searchDebounceId);
    state.searchDebounceId = null;
  }

  state.search = "";
  if (elements.searchInput) {
    elements.searchInput.value = "";
    elements.searchInput.focus();
  }

  updateSearchClearButtonVisibility("");
  applyFilters();
}

function updateSearchClearButtonVisibility(value = "") {
  if (!elements.resetButton) {
    return;
  }

  const hasValue = String(value).trim().length > 0;
  elements.resetButton.classList.toggle("is-visible", hasValue);
}

function resetFilters() {
  if (state.searchDebounceId) {
    window.clearTimeout(state.searchDebounceId);
    state.searchDebounceId = null;
  }

  state.search = "";
  state.quickTag = "";
  state.sort = "relevance";
  state.pageSize = 24;
  state.officialOnly = false;
  Object.values(state.filters).forEach((set) => set.clear());

  elements.searchInput.value = "";
  updateSearchClearButtonVisibility("");
  elements.resultsPageSize.value = "24";
  elements.sortSelect.value = "relevance";
  elements.officialOnly.checked = false;

  renderFilters();
  applyFilters();
}

function resetVisibleResults() {
  state.visibleCount = state.pageSize;
}

function renderHeroStats() {
  const stats = [
    ["Unified records", formatNumber(state.data.summary.totalRecords)],
    ["Contextus examples", formatNumber(state.data.summary.contextusRecords)],
    ["Concord materials", formatNumber(state.data.summary.concordRecords)]
  ];

  elements.heroStats.innerHTML = stats.map(([label, value]) => `
    <section class="stat-tile">
      <span class="stat-label">${escapeHtml(label)}</span>
      <strong class="stat-value">${escapeHtml(value)}</strong>
    </section>
  `).join("");
}

function renderFilters() {
  const currentlyOpenKeys = new Set(
    Array.from(elements.filterGroups?.querySelectorAll("details.filter-group[open][data-filter-key]") || [])
      .map((el) => el.getAttribute("data-filter-key"))
      .filter(Boolean)
  );

  const fragments = filterConfig.map(({ key, label }) => {
    const counts = state.facetCountsByKey.get(key) || getFacetCounts(key);
    const selectedValues = state.filters[key];
    const maxOptions = getFacetDisplayLimit(key);
    const options = getSortedFacetEntries(key, counts)
      .slice(0, maxOptions)
      .map(([value, count]) => {
        const displayValue = String(value);
        const optionLabel = getFilterOptionLabel(key, displayValue);
        const subOptionClass = isFilterSubOption(key, displayValue) ? " filter-option-suboption" : "";
        const checked = selectedValues.has(displayValue) ? "checked" : "";

        return `
          <div class="filter-option${subOptionClass}">
            <label>
              <input type="checkbox" data-filter-key="${key}" data-filter-value="${escapeAttribute(displayValue)}" ${checked}>
              <span class="filter-option-label">${escapeHtml(optionLabel)}</span>
            </label>
            <span class="count-pill">${count}</span>
          </div>
        `;
      }).join("");

    const selectedCount = selectedValues.size;
    const isOpen = currentlyOpenKeys.has(key) || defaultExpandedFilters.has(key);

    return `
      <details class="filter-group" data-filter-key="${escapeAttribute(key)}" ${isOpen ? "open" : ""}>
        <summary class="filter-summary">
          <span class="filter-summary-label">${escapeHtml(label)}</span>
          <span class="filter-summary-meta">
            <span class="count-pill">${selectedCount || counts.size}</span>
          </span>
        </summary>
        <div class="filter-options">${options || `<p class="hint-text">No values</p>`}</div>
      </details>
    `;
  }).join("");

  elements.filterGroups.innerHTML = fragments;
}

function getFacetDisplayLimit(key) {
  if (key === "ngssPe") {
    return 500;
  }

  if (key === "dciTags") {
    return 200;
  }

  return 40;
}

function getFacetCounts(key) {
  const counts = new Map();

  for (const record of state.records) {
      const values = getRecordValuesForKey(record, key);
    for (const value of values) {
      counts.set(value, (counts.get(value) || 0) + 1);
    }
  }

  return counts;
}

function getSortedFacetEntries(key, counts) {
  const entries = [...counts.entries()];
  if (key === "subjectAreas") {
    return sortSubjectAreaFacetEntries(entries);
  }

  if (key === "dciTags") {
    return sortDciFacetEntries(entries);
  }

  if (key === "ngssPe") {
    return sortPerformanceExpectationFacetEntries(entries);
  }

  if (key === "gradeLevels") {
    return sortGradeLevelFacetEntries(entries);
  }

  if (key === "gradeBand") {
    return sortGradeBandFacetEntries(entries);
  }

  return entries.sort((left, right) => right[1] - left[1] || String(left[0]).localeCompare(String(right[0])));
}

function sortGradeLevelFacetEntries(entries) {
  return entries.sort((left, right) => {
    const leftValue = String(left[0]);
    const rightValue = String(right[0]);
    const leftRank = getGradeLevelRank(leftValue);
    const rightRank = getGradeLevelRank(rightValue);

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return right[1] - left[1] || leftValue.localeCompare(rightValue);
  });
}

function sortGradeBandFacetEntries(entries) {
  return entries.sort((left, right) => {
    const leftValue = String(left[0]);
    const rightValue = String(right[0]);
    const leftRank = getGradeBandRank(leftValue);
    const rightRank = getGradeBandRank(rightValue);

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return right[1] - left[1] || leftValue.localeCompare(rightValue);
  });
}

function getGradeLevelRank(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (/^pre\s*-?\s*k$/.test(normalized)) {
    return 0;
  }

  if (normalized === "k" || normalized === "kindergarten") {
    return 1;
  }

  if (normalized === "hs" || normalized === "high school") {
    return 100;
  }

  const grade = Number.parseInt(normalized, 10);
  if (Number.isFinite(grade) && grade >= 1 && grade <= 12) {
    return 1 + grade;
  }

  return 1000;
}

function getGradeBandRank(value) {
  const normalized = String(value || "").trim().toLowerCase();
  const compact = normalized.replace(/\s+/g, "");

  if (compact === "pre-k" || compact === "prek") {
    return 0;
  }

  if (compact === "k-2" || compact === "k2") {
    return 1;
  }

  if (compact === "3-5" || compact === "35") {
    return 2;
  }

  if (compact === "6-8" || compact === "68") {
    return 3;
  }

  if (compact === "9-12" || compact === "912") {
    return 4;
  }

  if (compact === "elementary") {
    return 5;
  }

  if (compact === "middle") {
    return 6;
  }

  if (compact === "high" || compact === "highschool" || compact === "hs") {
    return 7;
  }

  const rangeMatch = compact.match(/^(k|\d{1,2})-(\d{1,2})$/);
  if (rangeMatch) {
    const start = rangeMatch[1] === "k" ? 0 : Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);
    if (Number.isFinite(start) && Number.isFinite(end)) {
      return 10 + start + (end / 100);
    }
  }

  return 1000;
}

function sortSubjectAreaFacetEntries(entries) {
  const parentRank = new Map(SUBJECT_AREA_PARENT_ORDER.map((name, index) => [name, index]));
  const defaultRank = SUBJECT_AREA_PARENT_ORDER.length + 1;

  return entries.sort((left, right) => {
    const leftValue = String(left[0]);
    const rightValue = String(right[0]);
    const leftParent = SUBJECT_AREA_PARENT[leftValue] || leftValue;
    const rightParent = SUBJECT_AREA_PARENT[rightValue] || rightValue;
    const leftParentRank = parentRank.has(leftParent) ? parentRank.get(leftParent) : defaultRank;
    const rightParentRank = parentRank.has(rightParent) ? parentRank.get(rightParent) : defaultRank;

    if (leftParentRank !== rightParentRank) {
      return leftParentRank - rightParentRank;
    }

    if (leftParent !== rightParent) {
      return leftParent.localeCompare(rightParent);
    }

    const leftIsChild = Boolean(SUBJECT_AREA_PARENT[leftValue]);
    const rightIsChild = Boolean(SUBJECT_AREA_PARENT[rightValue]);
    if (leftIsChild !== rightIsChild) {
      return leftIsChild ? 1 : -1;
    }

    if (leftIsChild && rightIsChild) {
      const leftChildOrder = SUBJECT_AREA_CHILD_ORDER[leftValue] || 99;
      const rightChildOrder = SUBJECT_AREA_CHILD_ORDER[rightValue] || 99;
      if (leftChildOrder !== rightChildOrder) {
        return leftChildOrder - rightChildOrder;
      }
    }

    return right[1] - left[1] || leftValue.localeCompare(rightValue);
  });
}

function isFilterSubOption(key, value) {
  return key === "subjectAreas" && Boolean(SUBJECT_AREA_PARENT[value]);
}

function getFilterOptionLabel(key, value) {
  if (isFilterSubOption(key, value)) {
    return `- ${value}`;
  }

  return value;
}

function handleFilterToggle(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") {
    return;
  }

  const key = target.dataset.filterKey;
  const value = target.dataset.filterValue;
  if (!key || !value || !state.filters[key]) {
    return;
  }

  const targetSet = state.filters[key];

  if (target.checked) {
    targetSet.add(value);
  }
  else {
    targetSet.delete(value);
  }

  applyFilters();
}

function applyFilters() {
  const tokens = state.search.split(/\s+/).filter(Boolean);
  const baseRecords = state.records.filter((record) => matchesStructuredFilters(record));
  state.fuzzyScores.clear();

  if (tokens.length) {
    state.filteredRecords = runSearch(baseRecords);
  }
  else {
    state.filteredRecords = baseRecords;
  }

  sortRecords(state.filteredRecords, tokens);

  if (state.selectedId && !state.filteredRecords.some((record) => record.id === state.selectedId)) {
    state.selectedId = null;
  }

  resetVisibleResults();
  renderFilters();
  renderActiveFilters();
  renderResults(tokens);
  renderDetail();
  syncPanelButtons();
}

function matchesStructuredFilters(record) {
  if (state.officialOnly && record.isOfficial !== true) {
    return false;
  }

  const recordFilterSets = record?._filterValueSets;
  for (const { key } of filterConfig) {
    const selected = state.filters[key];
    if (!selected.size) {
      continue;
    }

    const recordValues = recordFilterSets?.[key] || new Set(getRecordValuesForKey(record, key));
    const intersects = [...selected].some((value) => recordValues.has(value));
    if (!intersects) {
      return false;
    }
  }

  if (state.quickTag) {
    const pool = record?._quickTagPool || [];

    if (!pool.some((item) => item === state.quickTag)) {
      return false;
    }
  }

  return true;
}

function runSearch(baseRecords) {
  if (!state.fuse) {
    return baseRecords.filter((record) => String(record.searchText || "").includes(state.search));
  }

  const baseIdSet = new Set(baseRecords.map((record) => record.id));
  const results = state.fuse.search(state.search, { limit: Math.max(baseRecords.length, 1) });
  const fuzzyRecords = [];

  for (const result of results) {
    if (!baseIdSet.has(result.item.id)) {
      continue;
    }

    fuzzyRecords.push(result.item);
    state.fuzzyScores.set(result.item.id, result.score ?? 1);
  }

  return fuzzyRecords;
}

function sortRecords(records, tokens) {
  if (state.sort === "title") {
    records.sort((left, right) => left.title.localeCompare(right.title));
    return;
  }

  if (state.sort === "grade") {
    records.sort((left, right) => firstGradeValue(left) - firstGradeValue(right) || left.title.localeCompare(right.title));
    return;
  }

  if (state.sort === "dataset") {
    records.sort((left, right) => left.dataset.localeCompare(right.dataset) || left.title.localeCompare(right.title));
    return;
  }

  if (state.search && state.fuzzyScores.size) {
    records.sort((left, right) => {
      const leftScore = state.fuzzyScores.get(left.id) ?? 1;
      const rightScore = state.fuzzyScores.get(right.id) ?? 1;
      return leftScore - rightScore || left.datasetRank - right.datasetRank || left.title.localeCompare(right.title);
    });
    return;
  }

  records.sort((left, right) => computeRelevance(right, tokens) - computeRelevance(left, tokens) || left.datasetRank - right.datasetRank || left.title.localeCompare(right.title));
}

function computeRelevance(record, tokens) {
  if (!tokens.length) {
    return 0;
  }

  let score = 0;
  const title = toPlainText(record.title).toLowerCase();
  const description = toPlainText(record.description).toLowerCase();

  for (const token of tokens) {
    if (title.includes(token)) {
      score += 5;
    }
    if (description.includes(token)) {
      score += 3;
    }
    if (String(record.searchText || "").includes(token)) {
      score += 1;
    }
  }

  return score;
}

function renderResults(tokens = []) {
  const total = state.filteredRecords.length;
  const queryText = state.search ? ` for “${escapeHtml(state.search)}”` : "";
  const visibleTotal = Math.min(state.visibleCount, total);
  elements.resultsSummary.innerHTML = `${formatNumber(total)} matches${queryText} <span class="results-summary-detail">Showing ${formatNumber(visibleTotal)}</span>`;

  if (!total) {
    elements.resultsList.innerHTML = `<div class="empty-state"><h3>No matching assessments</h3><p>Try removing one or two filters, or broaden the search terms.</p></div>`;
    elements.resultsPagination.innerHTML = "";
    return;
  }

  const fragment = document.createDocumentFragment();
  const visibleRecords = state.filteredRecords.slice(0, visibleTotal);

  if (state.view === "list") {
    const listHead = document.createElement("div");
    listHead.className = "list-view-head";
    listHead.innerHTML = `
      <span>Dataset</span>
      <span>Title & Scenario</span>
      <span>Source & Grade</span>
      <span>NGSS Tags</span>
    `;
    fragment.appendChild(listHead);
  }

  for (const record of visibleRecords) {
    const node = elements.resultCardTemplate.content.firstElementChild.cloneNode(true);
    const image = node.querySelector(".result-image");
    const badge = node.querySelector(".dataset-badge");
    const cardTitle = node.querySelector(".result-title");
    const description = node.querySelector(".result-description");
    const meta = node.querySelector(".result-meta");
    const tags = node.querySelector(".result-tags");
    const links = node.querySelector(".result-links");

    node.dataset.recordId = record.id;
    node.classList.toggle("active", record.id === state.selectedId);

    badge.textContent = record.dataset;
    badge.classList.add(getDatasetClass(record.dataset));
    const recordIdText = record.collectionId ? `Collection ${record.collectionId}` : String(record.id || "");
    const recordIdNode = node.querySelector(".record-id");
    recordIdNode.textContent = recordIdText;
    recordIdNode.title = recordIdText;

    if (image) {
      image.onerror = null;

      if (record.imageUrl) {
        image.src = record.imageUrl;
        image.alt = `${toPlainText(record.title) || "Assessment"} image`;
        image.onerror = () => {
          image.onerror = null;
          image.src = getPlaceholderImage(record);
          image.alt = `${toPlainText(record.title) || "Assessment"} placeholder image`;
        };
      }
      else {
        image.src = getPlaceholderImage(record);
        image.alt = `${toPlainText(record.title) || "Assessment"} placeholder image`;
      }
    }

    cardTitle.textContent = toPlainText(record.title) || "Untitled record";
    description.innerHTML = highlightSnippet(getBestDescription(record), tokens);

    const metaValues = [
      toPlainText(record.source),
      toPlainText(record.gradeBand),
      getDisplayValues(record.gradeLevels, "gradeLevels").slice(0, 2).join(", ")
    ].filter(Boolean);

    const alsoDatasetValues = getDisplayValues(record.alsoInDatasets)
      .filter((datasetName) => datasetName && datasetName !== record.dataset)
      .map((datasetName) => `Also in ${datasetName}`);

    const annotationValues = record.isAnnotated === true
      || getDisplayValues(record.notableFeatures).some((feature) => normalizeLookupKey(feature) === "annotated")
      ? ["Annotated"]
      : [];

    const relationshipValues = [];
    if (record.hasAnnotatedCounterpart === true) {
      relationshipValues.push("Annotated in TAP");
    }
    if (record.isAnnotated === true && record.hasMainCounterpart === true) {
      relationshipValues.push("Main task also available");
    }

    meta.innerHTML = `${metaValues.map((value) => `<button type="button" class="meta-chip" data-chip-type="meta" data-chip-value="${escapeAttribute(value)}">${escapeHtml(value)}</button>`).join("")}${annotationValues.map((value) => `<span class="meta-chip meta-chip-secondary meta-chip-annotated">${escapeHtml(value)}</span>`).join("")}${relationshipValues.map((value) => `<span class="meta-chip meta-chip-secondary meta-chip-relationship">${escapeHtml(value)}</span>`).join("")}${alsoDatasetValues.map((value) => `<span class="meta-chip meta-chip-secondary">${escapeHtml(value)}</span>`).join("")}`;

    const tagValues = [
      ...getDisplayValues(record.dciTags),
      ...getDisplayValues(record.crossCuttingConcepts),
      ...getDisplayValues(record.practices),
      ...getDisplayValues(record.stse),
      ...getDisplayValues(record.natureOfScience),
      ...getDisplayValues(record.ngssPe)
    ].slice(0, 6);

    tags.innerHTML = tagValues.map((value) => renderTagChip(value, true)).join("");

    const viewUrl = getPreferredViewUrl(record);
    links.innerHTML = viewUrl
      ? `<a href="${escapeAttribute(viewUrl)}" target="_blank" rel="noreferrer" class="link-button" title="View Source">View Source &#8599;</a>`
      : "";

    links.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.stopPropagation();
      });
    });

    meta.querySelectorAll("[data-chip-type='meta']").forEach((chip) => {
      chip.addEventListener("click", (event) => {
        event.stopPropagation();
        const value = chip.dataset.chipValue;
        if (!value) {
          return;
        }

        if (value === record.source) {
          state.filters.source.add(value);
        }
        else if (value === record.gradeBand) {
          state.filters.gradeBand.add(value);
        }
        else {
          state.filters.gradeLevels.add(value);
        }

        applyFilters();
      });
    });

    tags.querySelectorAll("[data-chip-type='ngss']").forEach((chip) => {
      chip.addEventListener("click", (event) => {
        event.stopPropagation();
        const value = chip.dataset.chipValue;
        if (!value) {
          return;
        }

        state.quickTag = value;
        applyFilters();
      });
    });

    node.addEventListener("click", () => {
      state.selectedId = record.id;
      renderResults(tokens);
      renderDetail();
      openPanel("inspector");
    });

    fragment.appendChild(node);
  }

  elements.resultsList.innerHTML = "";
  elements.resultsList.appendChild(fragment);

  const remaining = total - visibleTotal;
  if (remaining > 0) {
    const nextCount = Math.min(state.pageSize, remaining);
    elements.resultsPagination.innerHTML = `
      <div class="results-pagination-card">
        <p class="results-pagination-text">Showing ${formatNumber(visibleTotal)} of ${formatNumber(total)} results.</p>
        <button type="button" id="see-more-button" class="button-secondary">See more (${formatNumber(nextCount)})</button>
      </div>
    `;

    elements.resultsPagination.querySelector("#see-more-button")?.addEventListener("click", () => {
      state.visibleCount = Math.min(state.visibleCount + state.pageSize, total);
      renderResults(tokens);
    });
    return;
  }

  elements.resultsPagination.innerHTML = `
    <div class="results-pagination-card results-pagination-card-complete">
      <p class="results-pagination-text">Showing all ${formatNumber(total)} results.</p>
    </div>
  `;
}

function renderDetail() {
  const record = state.filteredRecords.find((entry) => entry.id === state.selectedId) || null;

  if (!record) {
    elements.detailEmpty.classList.remove("hidden");
    elements.detailContent.classList.add("hidden");
    return;
  }

  elements.detailEmpty.classList.add("hidden");
  elements.detailContent.classList.remove("hidden");
  elements.detailDataset.textContent = `${record.dataset} record`;
  elements.detailTitle.textContent = toPlainText(record.title) || "Untitled record";
  elements.detailDescription.textContent = getBestDescription(record);

  const detailLinks = getInspectorLinks(record);
  elements.detailLinks.innerHTML = detailLinks.length
    ? detailLinks.map(({ label, url }) => `<a href="${escapeAttribute(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`).join("")
    : "";

  const alignmentSummary = buildStandardsAlignmentSummary(record);

  const overviewMetadata = [
    ["Record ID", toPlainText(record.id)],
    ["Source", toPlainText(record.source)],
    ["Dataset", toPlainText(record.dataset)],
    ["Also In Datasets", getDisplayValues(record.alsoInDatasets)],
    ["Related Datasets", getDisplayValues(record.relatedDatasets)],
    ["Annotated Counterpart", record.hasAnnotatedCounterpart === true ? "Yes" : ""],
    ["Annotated", formatBoolean(record.isAnnotated)],
    ["Type", toPlainText(record.type)],
    ["Material Type", toPlainText(record.materialType)],
    ["Scope", toPlainText(record.scope)],
    ["Collection", toPlainText(record.collectionName)],
    ["Project", getDisplayValues(record.projectNames)],
    ["Official", formatBoolean(record.isOfficial)],
    ["Publication", toPlainText(record.publicationStatus)],
    ["Created", toPlainText(record.createdAt)]
  ];

  const coverageMetadata = [
    ["Domain", toPlainText(record.domain)],
    ["Subject Areas", getDisplayValues(record.subjectAreas)],
    ["Grade Band", toPlainText(record.gradeBand)],
    ["Grade Levels", getDisplayValues(record.gradeLevels, "gradeLevels")],
    ["Keywords", getDisplayValues(record.keywords)],
    ["Notable Features", getDisplayValues(record.notableFeatures)],
    ["Additional Aspects", getDisplayValues(record.additionalAspects)]
  ];

  const standardsMetadata = [
    ["Alignment Snapshot", alignmentSummary.snapshot],
    ["NGSS PE", getDisplayValues(record.ngssPe)],
    ["DCI", getDisplayValues(record.dciTags)],
    ["Cross Cutting Concepts", getDisplayValues(record.crossCuttingConcepts)],
    ["Practices", getDisplayValues(record.practices)],
    ["STSE", getDisplayValues(record.stse)],
    ["Nature of Science", getDisplayValues(record.natureOfScience)],
    ["Dimensions Tagged", alignmentSummary.dimensionsTagged],
    ["Standards Terms", alignmentSummary.totalTerms]
  ];

  const sourceHighlights = getSourceHighlights(record);

  const sections = [
    renderMetadataSection("Record Overview", overviewMetadata),
    renderMetadataSection("Coverage", coverageMetadata),
    renderMetadataSection("Standards Alignment", standardsMetadata),
    renderMetadataSection("Source Highlights", sourceHighlights)
  ].filter(Boolean);

  elements.detailMetadata.innerHTML = sections.join("");

  elements.detailRaw.textContent = JSON.stringify(record.raw, null, 2);
}

function renderActiveFilters() {
  const activePills = [];

  for (const { key, label } of filterConfig) {
    for (const value of state.filters[key]) {
      activePills.push({ key, label, value });
    }
  }

  if (state.search) {
    activePills.push({ key: "search", label: "Search", value: state.search });
  }

  if (state.quickTag) {
    activePills.push({ key: "quickTag", label: "NGSS Tag", value: state.quickTag });
  }

  elements.activeFilterCount.textContent = String(activePills.length);
  elements.activeFilters.innerHTML = activePills.length
    ? activePills.map((pill) => `
      <span class="filter-pill">
        ${escapeHtml(pill.label)}: ${escapeHtml(pill.value)}
        <button type="button" data-remove-key="${pill.key}" data-remove-value="${escapeAttribute(pill.value)}" aria-label="Remove ${escapeAttribute(pill.value)}">×</button>
      </span>
    `).join("")
    : `<p class="hint-text">No filters selected.</p>`;

  elements.activeFilters.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => removeActiveFilter(button.dataset.removeKey, button.dataset.removeValue));
  });
}

function removeActiveFilter(key, value) {
  if (key === "search") {
    state.search = "";
    elements.searchInput.value = "";
  }
  else if (key === "quickTag") {
    state.quickTag = "";
  }
  else {
    state.filters[key].delete(value);
  }

  applyFilters();
}

function closeDetailPanel() {
  state.selectedId = null;
  renderDetail();
  renderResults(state.search.split(/\s+/).filter(Boolean));
  closePanels();
}

function changeView(viewName) {
  state.view = viewName;
  elements.resultsList.classList.toggle("list-view", viewName === "list");
  elements.gridViewButton.classList.toggle("active", viewName === "grid");
  elements.listViewButton.classList.toggle("active", viewName === "list");
  renderResults(state.search.split(/\s+/).filter(Boolean));
}

function isMobileView() {
  return window.matchMedia("(max-width: 767px)").matches;
}

function openMobilePanel(panelName) {
  if (!isMobileView()) {
    openDesktopPanel(panelName);
    return;
  }

  if (panelName === "filters") {
    document.body.classList.add("mobile-filters-open");
    document.body.classList.remove("mobile-detail-open");
  }

  if (panelName === "inspector") {
    document.body.classList.add("mobile-detail-open");
    document.body.classList.remove("mobile-filters-open");
  }
}

function closeMobilePanels() {
  document.body.classList.remove("mobile-filters-open", "mobile-detail-open");
}

function openDesktopPanel(panelName) {
  if (isMobileView()) {
    return;
  }

  if (panelName === "filters") {
    document.body.classList.add("desktop-filters-open");
    document.body.classList.remove("desktop-detail-open");
  }

  if (panelName === "inspector") {
    document.body.classList.add("desktop-detail-open");
    document.body.classList.remove("desktop-filters-open");
  }
}

function closeDesktopPanels() {
  document.body.classList.remove("desktop-filters-open", "desktop-detail-open");
}

function openPanel(panelName) {
  if (isMobileView()) {
    openMobilePanel(panelName);
  }
  else {
    openDesktopPanel(panelName);
  }

  syncPanelButtons();
}

function closePanels() {
  closeMobilePanels();
  closeDesktopPanels();
  syncPanelButtons();
}

function togglePanel(panelName) {
  if (isMobileView()) {
    toggleMobilePanel(panelName);
    syncPanelButtons();
    return;
  }

  const className = panelName === "filters" ? "desktop-filters-open" : "desktop-detail-open";
  if (document.body.classList.contains(className)) {
    closeDesktopPanels();
  }
  else {
    openDesktopPanel(panelName);
  }

  syncPanelButtons();
}

function toggleMobilePanel(panelName) {
  if (!isMobileView()) {
    togglePanel(panelName);
    return;
  }

  if (panelName === "filters") {
    if (document.body.classList.contains("mobile-filters-open")) {
      closeMobilePanels();
    }
    else {
      openMobilePanel("filters");
    }
    return;
  }

  if (!state.selectedId && state.filteredRecords.length) {
    state.selectedId = state.filteredRecords[0].id;
    renderResults(state.search.split(/\s+/).filter(Boolean));
    renderDetail();
  }

  if (document.body.classList.contains("mobile-detail-open")) {
    closeMobilePanels();
  }
  else {
    openMobilePanel("inspector");
  }

  syncPanelButtons();
}

function syncPanelButtons() {
  const filtersOpen = document.body.classList.contains("desktop-filters-open") || document.body.classList.contains("mobile-filters-open");
  const inspectorOpen = document.body.classList.contains("desktop-detail-open") || document.body.classList.contains("mobile-detail-open");

  if (elements.filtersToggleButton) {
    elements.filtersToggleButton.textContent = filtersOpen ? "Hide Filters" : "Filters";
  }

  if (elements.inspectorToggleButton) {
    elements.inspectorToggleButton.textContent = inspectorOpen ? "Hide Inspector" : "Inspector";
  }
}

function getDisplayValues(value, key = "") {
  const keyName = String(key || "");

  if (keyName === "gradeLevels") {
    return normalizeGradeLevelValues(value);
  }

  return normalizeToArray(value)
    .map((entry) => normalizeDisplayValue(toPlainText(entry), keyName))
    .filter(Boolean);
}

function getRecordValuesForKey(record, key) {
  const cached = record?._filterValuesByKey?.[key];
  if (cached) {
    return cached;
  }

  if (key === "dataset") {
    const values = [
      toPlainText(record?.dataset),
      ...normalizeToArray(record?.alsoInDatasets).map((entry) => toPlainText(entry))
    ].filter(Boolean);

    return [...new Set(values)];
  }

  if (key === "practices") {
    return normalizeToArray(record?.[key])
      .map((value) => normalizePracticeValue(toPlainText(value)))
      .filter(Boolean);
  }

  if (key === "crossCuttingConcepts") {
    return normalizeToArray(record?.[key])
      .map((value) => normalizeCrossCuttingConceptValue(toPlainText(value)))
      .filter(Boolean);
  }

  if (key === "ngssPe") {
    return normalizeToArray(record?.[key])
      .map((value) => normalizePerformanceExpectationValue(toPlainText(value)))
      .filter(Boolean);
  }

  if (key === "dciTags") {
    return normalizeToArray(record?.[key])
      .map((value) => normalizeDciValue(toPlainText(value)))
      .filter(Boolean);
  }

  return getDisplayValues(record?.[key], key);
}

function normalizePracticeValue(value) {
  const text = toPlainText(value).trim();
  if (!text) {
    return "";
  }

  const lower = text.toLowerCase();
  const alias = STANDARD_ALIASES[lower] || lower;
  return PRACTICE_CANONICAL[alias] || PRACTICE_CANONICAL[lower] || text;
}

function normalizeCrossCuttingConceptValue(value) {
  const text = toPlainText(value).trim();
  if (!text) {
    return "";
  }

  const lower = text.toLowerCase();
  if (lower === "*n/a" || lower === "multiple possible" || lower === "influences on society and natural world") {
    return "";
  }

  return CROSS_CUTTING_CANONICAL[lower] || text;
}

function normalizePerformanceExpectationValue(value) {
  const text = toPlainText(value).trim();
  if (!text) {
    return "";
  }

  const lower = text.toLowerCase();
  if (lower === "???" || lower === "*not grade level appropriate") {
    return "";
  }

  const compact = text
    .replace(/[.\s]+$/g, "")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^([A-Z]{1,4})-(\d+)-([A-Z]{1,4})-(\d+)$/i, "$1-$3$2-$4");

  if (/^(k|[0-9]{1,2}|hs|ms|3-5|6-8|9-12)-/i.test(compact)) {
    return compact.toUpperCase();
  }

  return compact;
}

function normalizeDciValue(value) {
  const text = toPlainText(value).trim();
  if (!text) {
    return "";
  }

  return text.replace(/\s+/g, " ");
}

function normalizeDisplayValue(value, key = "") {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }

  if (key === "subjectAreas") {
    const subjectKey = normalized.toLowerCase();
    if (SUBJECT_AREA_CANONICAL[subjectKey]) {
      return SUBJECT_AREA_CANONICAL[subjectKey];
    }
  }

  return normalized;
}

function normalizeGradeLevelValues(value) {
  const bucket = new Set();
  const addRange = (start, end) => {
    const safeStart = Math.max(1, Number(start));
    const safeEnd = Math.min(12, Number(end));
    if (!Number.isFinite(safeStart) || !Number.isFinite(safeEnd) || safeStart > safeEnd) {
      return;
    }

    for (let grade = safeStart; grade <= safeEnd; grade += 1) {
      bucket.add(String(grade));
    }
  };

  for (const rawEntry of normalizeToArray(value)) {
    const raw = toPlainText(rawEntry).trim();
    if (!raw) {
      continue;
    }

    const lower = raw.toLowerCase();

    if (/^pre\s*-?\s*k/.test(lower)) {
      bucket.add("Pre-K");
      const preKRangeMatch = lower.match(/^pre\s*-?\s*k\s*-\s*(\d{1,2})$/);
      if (preKRangeMatch) {
        bucket.add("K");
        addRange(1, Number(preKRangeMatch[1]));
      }
      continue;
    }

    if (/^(k|kindergarten)$/.test(lower)) {
      bucket.add("K");
      continue;
    }

    if (/^(hs|high school)$/.test(lower)) {
      bucket.add("HS");
      continue;
    }

    const rangeMatch = lower.match(/^(\d{1,2})\s*-\s*(\d{1,2})$/);
    if (rangeMatch) {
      addRange(Number(rangeMatch[1]), Number(rangeMatch[2]));
      continue;
    }

    const ordinalMatch = lower.match(/^(\d{1,2})(st|nd|rd|th)$/);
    if (ordinalMatch) {
      const gradeNumber = Number(ordinalMatch[1]);
      if (gradeNumber >= 1 && gradeNumber <= 12) {
        bucket.add(String(gradeNumber));
      }
      continue;
    }

    const numberMatch = lower.match(/^(\d{1,2})$/);
    if (numberMatch) {
      const gradeNumber = Number(numberMatch[1]);
      if (gradeNumber >= 1 && gradeNumber <= 12) {
        bucket.add(String(gradeNumber));
      }
      continue;
    }
  }

  const order = ["Pre-K", "K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "HS"];
  return order.filter((entry) => bucket.has(entry));
}

function normalizeToArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === null || value === undefined || value === "") {
    return [];
  }
  return [value];
}

function toPlainText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    return "";
  }

  return decodeHtmlEntities(String(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim());
}

function decodeHtmlEntities(text) {
  if (!text || !text.includes("&")) {
    return text;
  }

  const decoder = document.createElement("textarea");
  decoder.innerHTML = text;
  return decoder.value;
}

function dedupeById(records) {
  const seen = new Set();
  const unique = [];
  let duplicateCount = 0;

  for (const record of records) {
    const id = String(record?.id || "").trim();
    if (!id) {
      unique.push(record);
      continue;
    }

    if (seen.has(id)) {
      duplicateCount += 1;
      continue;
    }

    seen.add(id);
    unique.push(record);
  }

  if (duplicateCount > 0) {
    console.warn(`Skipped ${duplicateCount} duplicate records by id.`);
  }

  return unique;
}

function mergeOverlappingRecords(records) {
  const titleBuckets = new Map();
  const merged = [];
  let mergedCount = 0;

  for (const record of records) {
    const titleKey = normalizeLookupKey(record?.title);
    if (!titleKey) {
      merged.push(record);
      continue;
    }

    const candidateIndexes = titleBuckets.get(titleKey) || [];
    let mergedIntoIndex = -1;

    for (const index of candidateIndexes) {
      const existing = merged[index];
      if (!shouldMergeOverlapRecords(existing, record)) {
        continue;
      }

      merged[index] = combineOverlappingRecords(existing, record);
      mergedIntoIndex = index;
      mergedCount += 1;
      break;
    }

    if (mergedIntoIndex !== -1) {
      continue;
    }

    const newIndex = merged.push(record) - 1;
    candidateIndexes.push(newIndex);
    titleBuckets.set(titleKey, candidateIndexes);
  }

  if (mergedCount > 0) {
    console.warn(`Merged ${mergedCount} overlapping records across datasets.`);
  }

  return merged;
}

function shouldMergeOverlapRecords(left, right) {
  const leftTitle = normalizeLookupKey(left?.title);
  const rightTitle = normalizeLookupKey(right?.title);
  if (!leftTitle || !rightTitle || leftTitle !== rightTitle) {
    return false;
  }

  const leftAnnotated = left?.isAnnotated === true;
  const rightAnnotated = right?.isAnnotated === true;
  // Keep TAP/annotated tasks distinct from non-annotated tasks, even with matching titles.
  if (leftAnnotated !== rightAnnotated) {
    return false;
  }

  const leftDataset = toPlainText(left?.dataset);
  const rightDataset = toPlainText(right?.dataset);
  const crossDataset = leftDataset && rightDataset && leftDataset !== rightDataset;

  // If either side is Atlas and titles match, treat it as an overlap.
  if (crossDataset && (leftDataset === "NGSS Atlas" || rightDataset === "NGSS Atlas")) {
    return true;
  }

  const leftPe = new Set(getDisplayValues(left?.ngssPe).map((value) => normalizeLookupKey(value)).filter(Boolean));
  const rightPe = new Set(getDisplayValues(right?.ngssPe).map((value) => normalizeLookupKey(value)).filter(Boolean));
  if (leftPe.size && rightPe.size) {
    for (const pe of leftPe) {
      if (rightPe.has(pe)) {
        return true;
      }
    }
    return false;
  }

  const leftDomain = normalizeLookupKey(left?.domain);
  const rightDomain = normalizeLookupKey(right?.domain);
  const leftBand = normalizeLookupKey(left?.gradeBand);
  const rightBand = normalizeLookupKey(right?.gradeBand);

  return leftDomain && rightDomain && leftBand && rightBand && leftDomain === rightDomain && leftBand === rightBand;
}

function combineOverlappingRecords(left, right) {
  const leftScore = scoreRecordDetail(left);
  const rightScore = scoreRecordDetail(right);
  const leftDataset = toPlainText(left?.dataset);
  const rightDataset = toPlainText(right?.dataset);

  let preferred = rightScore > leftScore ? right : left;
  if (leftDataset === "NGSS Atlas" && rightDataset !== "NGSS Atlas") {
    preferred = left;
  }
  else if (rightDataset === "NGSS Atlas" && leftDataset !== "NGSS Atlas") {
    preferred = right;
  }

  const alternate = preferred === left ? right : left;

  const merged = { ...preferred };

  const combinedDatasets = [
    preferred.dataset,
    ...normalizeToArray(preferred.alsoInDatasets),
    alternate.dataset,
    ...normalizeToArray(alternate.alsoInDatasets)
  ].map((value) => toPlainText(value)).filter(Boolean);

  merged.alsoInDatasets = [...new Set(combinedDatasets.filter((value) => value !== preferred.dataset))];

  const listFields = [
    "gradeLevels",
    "projectNames",
    "keywords",
    "stse",
    "natureOfScience",
    "notableFeatures",
    "dciTags",
    "crossCuttingConcepts",
    "practices",
    "ngssPe",
    "subjectAreas",
    "additionalAspects"
  ];

  for (const field of listFields) {
    const useCanonicalFilterValues = field === "practices"
      || field === "dciTags"
      || field === "crossCuttingConcepts"
      || field === "ngssPe";
    const preferredValues = useCanonicalFilterValues
      ? getRecordValuesForKey(preferred, field)
      : getDisplayValues(preferred[field], field);
    const alternateValues = useCanonicalFilterValues
      ? getRecordValuesForKey(alternate, field)
      : getDisplayValues(alternate[field], field);
    const mergedValues = [
      ...preferredValues,
      ...alternateValues
    ];

    merged[field] = [...new Set(mergedValues.filter(Boolean))];
  }

  merged.links = mergeLinksPreservingConflicts(preferred.links, alternate.links, preferred.dataset, alternate.dataset);

  merged.searchText = [preferred.searchText, alternate.searchText]
    .map((value) => toPlainText(value))
    .filter(Boolean)
    .join(" ");

  if (!toPlainText(merged.description)) {
    merged.description = toPlainText(alternate.description);
  }

  if (!toPlainText(merged.imageUrl)) {
    merged.imageUrl = toPlainText(alternate.imageUrl);
  }

  if ((!merged.taskPageEnrichment || typeof merged.taskPageEnrichment !== "object") && alternate.taskPageEnrichment) {
    merged.taskPageEnrichment = alternate.taskPageEnrichment;
  }

  if ((!merged.raw || typeof merged.raw !== "object") && alternate.raw) {
    merged.raw = alternate.raw;
  }

  return merged;
}

function scoreRecordDetail(record) {
  let score = 0;

  if (record?.taskPageEnrichment?.standardsAlignment) {
    score += 120;
  }

  score += getDisplayValues(record?.dciTags).length * 3;
  score += getDisplayValues(record?.crossCuttingConcepts).length * 3;
  score += getDisplayValues(record?.practices).length * 3;
  score += getDisplayValues(record?.ngssPe).length * 2;
  score += getDisplayValues(record?.additionalAspects).length;

  const descriptionLength = toPlainText(record?.description).length;
  if (descriptionLength > 0) {
    score += Math.min(20, Math.floor(descriptionLength / 40));
  }

  score += Object.keys(record?.links || {}).length;

  const datasetPriority = {
    "NGSS Atlas": 3,
    Contextus: 2,
    Concord: 1
  };

  score += datasetPriority[toPlainText(record?.dataset)] || 0;

  return score;
}

function getBestDescription(record) {
  const direct = toPlainText(record?.description);
  if (direct) {
    return direct;
  }

  const summary = [
    toPlainText(record?.type),
    toPlainText(record?.domain),
    toPlainText(record?.gradeBand)
  ].filter(Boolean).join(" | ");

  if (summary) {
    return `Description not provided by source data. ${summary}.`;
  }

  return "Description not provided by source data.";
}

function formatMetadataValue(value, label = "") {
  if (Array.isArray(value)) {
    return value.map((item) => renderTagChip(item)).join(" ");
  }

  if (isStandardsLabel(label)) {
    return renderStandardText(String(value), "meta-standard", true);
  }

  return escapeHtml(String(value));
}

function renderMetadataSection(title, rows) {
  const visibleRows = rows.filter(([, value]) => Array.isArray(value) ? value.length : value);
  if (!visibleRows.length) {
    return "";
  }

  const content = visibleRows.map(([label, value]) => `
    <div class="metadata-row">
      <div class="meta-label">${escapeHtml(label)}</div>
      <div class="meta-value">${formatMetadataValue(value, label)}</div>
    </div>
  `).join("");

  return `
    <section class="detail-metadata-section">
      <h3 class="detail-metadata-title">${escapeHtml(title)}</h3>
      ${content}
    </section>
  `;
}

function buildStandardsAlignmentSummary(record) {
  const dciCount = getDisplayValues(record.dciTags).length;

  const cccCount = getDisplayValues(record.crossCuttingConcepts).length;
  const sepCount = getDisplayValues(record.practices).length;
  const peCount = getDisplayValues(record.ngssPe).length;
  const stseCount = getDisplayValues(record.stse).length;
  const nosCount = getDisplayValues(record.natureOfScience).length;

  const threeDimensionalCount = [dciCount, cccCount, sepCount].filter((count) => count > 0).length;
  const dimensionsTagged = [dciCount, cccCount, sepCount, peCount, stseCount, nosCount].filter((count) => count > 0).length;
  const totalTerms = dciCount + cccCount + sepCount + peCount + stseCount + nosCount;

  const snapshot = threeDimensionalCount === 3
    ? "Full 3D alignment (DCI + CCC + SEP)"

    : threeDimensionalCount === 0
      ? "No 3D dimensions tagged"
      : `Partial 3D alignment (${threeDimensionalCount}/3 dimensions tagged)`;

  return {
    snapshot,
    dimensionsTagged: `${dimensionsTagged} of 6 standard dimensions`,
    totalTerms: String(totalTerms)
  };
}

function getSourceHighlights(record) {
  const raw = record?.raw && typeof record.raw === "object" ? record.raw : null;
  if (!raw) {
    return [];
  }

  const toList = (value) => {
    if (Array.isArray(value)) {
      return value.map((entry) => toPlainText(entry)).filter(Boolean);
    }

    const plain = toPlainText(value);
    return plain ? [plain] : [];
  };

  const sourceRows = [
    ["Raw UUID", toPlainText(raw.uuid)],
    ["Raw Task ID", toPlainText(raw.task_id)],
    ["Raw Material Type", toPlainText(raw.material_type)],
    ["Raw Created", toPlainText(raw.created_at || raw.created)],
    ["Raw Updated", toPlainText(raw.changed)],
    ["Raw Grade Level", toPlainText(raw.card_grade_level)],
    ["Raw Subjects", toList(raw.subject_areas)],
    ["Raw Projects", toList(raw.projects)],
    ["Raw Keywords", toList(raw.keywords)],
    ["Raw Activities", toList(raw.activities)],
    ["Raw Standards", toList(raw.standard_statements)]
  ];

  return sourceRows.filter(([, value]) => Array.isArray(value) ? value.length : value);
}

function formatBoolean(value) {
  if (value === true) {
    return "Yes";
  }
  if (value === false) {
    return "No";
  }
  return "";
}

function isStandardsLabel(label) {
  const normalized = normalizeLookupKey(label);
  return normalized === "ngss pe"
    || normalized === "dci"
    || normalized === "cross cutting concepts"
    || normalized === "practices"
    || normalized === "stse"
    || normalized === "nature of science"
    || normalized === "alignment snapshot";
}

function firstGradeValue(record) {
  const numeric = getDisplayValues(record.gradeLevels, "gradeLevels")
    .map((grade) => Number.parseInt(grade.replace(/[^0-9]/g, ""), 10))
    .filter((value) => Number.isFinite(value));

  return numeric.length ? Math.min(...numeric) : Number.MAX_SAFE_INTEGER;
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(value);
}

function prettyLabel(value) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function getPreferredViewUrl(record) {
  const linkEntries = Object.entries(record?.links || {})
    .filter(([, url]) => toPlainText(url));

  if (!linkEntries.length) {
    return "";
  }

  const priorities = [
    "browse",
    "view",
    "task",
    "details",
    "link"
  ];

  for (const priority of priorities) {
    const match = linkEntries.find(([label]) => normalizeLookupKey(label).includes(priority));
    if (match) {
      return toPlainText(match[1]);
    }
  }

  return toPlainText(linkEntries[0][1]);
}

function getInspectorLinks(record) {
  const links = record?.links && typeof record.links === "object" ? record.links : {};
  const entries = Object.entries(links)
    .map(([label, url]) => {
      const rawLabel = String(label || "View").replace(/_/g, " ");
      const normalizedLabel = normalizeLookupKey(rawLabel);
      const displayLabel = normalizedLabel === "browse" || normalizedLabel === "view"
        ? "View Source"
        : prettyLabel(rawLabel);

      return {
        label: displayLabel,
        url: toPlainText(url)
      };
    })
    .filter((entry) => entry.url);

  const seenUrls = new Set();
  const unique = [];
  for (const entry of entries) {
    if (seenUrls.has(entry.url)) {
      continue;
    }
    seenUrls.add(entry.url);
    unique.push(entry);
  }

  return unique;
}

function mergeLinksPreservingConflicts(primaryLinks, secondaryLinks, primaryDataset = "", secondaryDataset = "") {
  const merged = {};
  const pushLinks = (links, datasetName) => {
    const safeDataset = normalizeLookupKey(datasetName).replace(/\s+/g, "_") || "source";
    for (const [rawKey, rawUrl] of Object.entries(links || {})) {
      const key = String(rawKey || "view").trim() || "view";
      const url = toPlainText(rawUrl);
      if (!url) {
        continue;
      }

      if (!merged[key]) {
        merged[key] = url;
        continue;
      }

      if (merged[key] === url) {
        continue;
      }

      let indexed = 2;
      let nextKey = `${safeDataset}_${key}`;
      while (merged[nextKey] && merged[nextKey] !== url) {
        nextKey = `${safeDataset}_${key}_${indexed}`;
        indexed += 1;
      }
      merged[nextKey] = url;
    }
  };

  pushLinks(primaryLinks, primaryDataset);
  pushLinks(secondaryLinks, secondaryDataset);

  return merged;
}

function renderTagChip(value, clickable = false) {
  const standardAttributes = getStandardAttributes(value, !clickable);
  if (clickable) {
    return `<button type="button" class="tag ${getAccentClass(value)}" data-chip-type="ngss" data-chip-value="${escapeAttribute(value)}"${standardAttributes}>${escapeHtml(value)}</button>`;
  }
  return `<span class="tag ${getAccentClass(value)}"${standardAttributes}>${escapeHtml(value)}</span>`;
}

function getAccentClass(value) {
  const lowerValue = String(value).toLowerCase();

  if (/(physics|earth|space|atlas|cloud|wave)/.test(lowerValue)) {
    return "tag-blue";
  }
  if (/(engineering|design|technology|search|matter)/.test(lowerValue)) {
    return "tag-orange";
  }
  if (/(life|biology|ecosystem|environment|energy)/.test(lowerValue)) {
    return "tag-green";
  }
  return "tag-purple";
}

function getDatasetClass(dataset) {
  return `dataset-${String(dataset).toLowerCase().replace(/\s+/g, "-")}`;
}

function renderStandardText(value, className = "", focusable = false) {
  return `<span class="${className}"${getStandardAttributes(value, focusable)}>${escapeHtml(value)}</span>`;
}

function getStandardAttributes(value, focusable = false) {
  const info = getStandardInfo(value);
  if (!info) {
    return "";
  }

  const tabindex = focusable ? " tabindex=\"0\"" : "";
  const tooltipText = getStandardTooltipText(info);
  return ` data-standard-value="${escapeAttribute(value)}" aria-label="${escapeAttribute(tooltipText)}"${tabindex}`;
}

function getStandardTooltipText(info) {
  const lines = [
    info.type,
    info.title,
    info.subtitle,
    info.summary,
    ...(info.bullets || []).slice(0, 2)
  ].filter(Boolean);

  return lines.join("\n");
}

function getStandardInfo(value, record = null) {
  if (!value) {
    return null;
  }

  const atlasInfo = getAtlasStandardInfo(value, record);
  if (atlasInfo) {
    return atlasInfo;
  }

  if (!state.standardsLookup?.size) {
    return null;
  }

  const normalized = normalizeLookupKey(value);
  const alias = STANDARD_ALIASES[normalized] || normalized;

  const cacheKey = alias || normalized;
  if (cacheKey && state.standardInfoCache.has(cacheKey)) {
    return state.standardInfoCache.get(cacheKey);
  }
  
  // Try exact matches first (alias, then normalized)
  let result = state.standardsLookup.get(alias) || state.standardsLookup.get(normalized);
  if (result) {
    if (cacheKey) {
      state.standardInfoCache.set(cacheKey, result);
    }
    return result;
  }

  // Fuzzy match fallback: find best match by scoring all entries
  const candidates = state.standardsFuzzyCandidates
    .map((candidate) => {
      // Score based on similarity of normalized keys and original value
      const matches = value.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const keyWords = candidate.keyWords;
      const matchCount = matches.filter(m => keyWords.some(k => k.includes(m) || m.includes(k))).length;
      const similarity = matchCount / Math.max(matches.length, keyWords.length, 1);
      
      return {
        score: similarity,
        key: candidate.key,
        data: candidate.data
      };
    })
    .filter(c => c.score > 0.4) // Only candidates with >40% similarity
    .sort((a, b) => b.score - a.score);

  const fuzzyResult = candidates.length > 0 ? candidates[0].data : null;
  if (cacheKey && fuzzyResult) {
    state.standardInfoCache.set(cacheKey, fuzzyResult);
  }
  return fuzzyResult;
}

function getAtlasStandardInfo(value, record) {
  if (!record || record.dataset !== "NGSS Atlas") {
    return null;
  }

  const alignment = record.taskPageEnrichment?.standardsAlignment;
  if (!alignment || typeof alignment !== "object") {
    return null;
  }

  const groups = [
    {
      type: "Science and Engineering Practice",
      entries: alignment.scienceAndEngineeringPractices
    },
    {
      type: "Disciplinary Core Idea",
      entries: alignment.disciplinaryCoreIdeas
    },
    {
      type: "Crosscutting Concept",
      entries: alignment.crosscuttingConcepts
    },
    {
      type: "Performance Expectation",
      entries: alignment.performanceExpectations
    }
  ];

  const targetKey = normalizeLookupKey(value);
  if (!targetKey) {
    return null;
  }

  for (const group of groups) {
    for (const entry of normalizeToArray(group.entries)) {
      const title = toPlainText(entry?.title);
      if (!title) {
        continue;
      }

      const titleKey = normalizeLookupKey(title);
      if (titleKey !== targetKey) {
        continue;
      }

      const bulletValues = normalizeToArray(entry?.values)
        .map((item) => toPlainText(item))
        .filter(Boolean)
        .slice(0, 6);

      const fullText = toPlainText(entry?.fullText);
      const gradeBand = toPlainText(record.gradeBand || record.taskPageEnrichment?.metadata?.grade);
      const subtitleParts = [
        gradeBand ? `${gradeBand} band` : "",
        toPlainText(entry?.buttonText)
      ].filter(Boolean);

      return {
        type: `${group.type} • NGSS Atlas`,
        title,
        subtitle: subtitleParts.join(" • "),
        summary: fullText || (bulletValues.length ? "Included Elements" : ""),
        bullets: bulletValues
      };
    }
  }

  return null;
}

function resolveRecordForStandardTrigger(trigger) {
  if (!(trigger instanceof Element)) {
    return null;
  }

  const card = trigger.closest(".result-card");
  const cardId = card?.dataset?.recordId;
  if (cardId) {
    const record = state.recordById.get(String(cardId));
    if (record) {
      return record;
    }
  }

  if (trigger.closest("#detail-content") && state.selectedId) {
    return state.recordById.get(String(state.selectedId)) || null;
  }

  return null;
}

async function loadNgssReferenceData(options = {}) {
  const { bypassCache = false } = options;
  const sources = [
    "./JSON/ngssK5.json",
    "./JSON/ngss68.json",
    "./JSON/ngss912.json",
    "./JSON/ngss3DElements.json"
  ];

  if (!bypassCache) {
    const cachedPayloads = await getCachedJson(CACHE_KEYS.ngssReference, { maxAgeMs: CACHE_SETTINGS.maxAgeMs });
    if (Array.isArray(cachedPayloads) && cachedPayloads.length === 4) {
      return buildNgssLookup(cachedPayloads[0], cachedPayloads[1], cachedPayloads[2], cachedPayloads[3]);
    }
  }

  try {
    const payloads = await Promise.all(sources.map(async (source) => {
      const response = await fetch(source);
      return response.ok ? response.json() : null;
    }));

    if (payloads.some((payload) => payload !== null)) {
      void setCachedJson(CACHE_KEYS.ngssReference, payloads);
    }

    return buildNgssLookup(payloads[0], payloads[1], payloads[2], payloads[3]);
  }
  catch (error) {
    console.warn("NGSS reference data failed to load.", error);

    const stalePayloads = await getCachedJson(CACHE_KEYS.ngssReference, { allowStale: true });
    if (Array.isArray(stalePayloads) && stalePayloads.length === 4) {
      return buildNgssLookup(stalePayloads[0], stalePayloads[1], stalePayloads[2], stalePayloads[3]);
    }

    return new Map();
  }
}

function buildNgssLookup(k5, ms, hs, elementsData) {
  const lookup = new Map();
  const cccDefinitions = new Map(); // Store canonical CCC entries
  const sepDefinitions = new Map(); // Store canonical SEP entries
  const dciDefinitions = new Map(); // Store canonical DCI entries

  [k5, ms, hs].filter(Boolean).forEach((collection) => {
    for (const grade of collection) {
      for (const topic of grade.topics || []) {
        for (const pe of topic.performanceExpectations || []) {
          addLookupEntry(lookup, pe.id, {
            type: "Performance Expectation",
            title: pe.id,
            subtitle: `${grade.gradeLabel} • ${topic.topicTitle}`,
            summary: pe.description,
            bullets: [
              pe.details?.clarificationStatement,
              pe.details?.assessmentBoundary
            ].filter(Boolean)
          });

          for (const dci of pe.details?.dci || []) {
            const shortId = String(dci.id || "").split(":")[0].replace(/\s*\(secondary\)/i, "").trim();
            const dciKey = normalizeLookupKey(dci.id);
            
            // Store DCI definition only once with most complete info
            if (!dciDefinitions.has(dciKey)) {
              dciDefinitions.set(dciKey, {
                id: dci.id,
                shortId: shortId,
                text: dci.text || []
              });
            }
            
            addLookupEntry(lookup, dci.id, {
              type: "Disciplinary Core Idea",
              title: shortId || dci.id,
              subtitle: dci.id,
              summary: dci.text?.[0] || topic.topicTitle,
              bullets: (dci.text || []).slice(1, 4)
            });
            
            if (shortId) {
              addLookupEntry(lookup, shortId, {
                type: "Disciplinary Core Idea",
                title: shortId,
                subtitle: dci.id,
                summary: dci.text?.[0] || topic.topicTitle,
                bullets: (dci.text || []).slice(1, 4)
              });
            }
          }

          for (const sep of pe.details?.sep || []) {
            const sepKey = normalizeLookupKey(sep.id);
            
            // Store SEP definition only once with most complete info
            if (!sepDefinitions.has(sepKey)) {
              sepDefinitions.set(sepKey, {
                id: sep.id,
                text: sep.text || []
              });
            }
            
            addLookupEntry(lookup, sep.id, {
              type: "Science and Engineering Practice",
              title: sep.id,
              subtitle: "",
              summary: sep.text?.[0] || "",
              bullets: (sep.text || []).slice(1, 4)
            });
          }

          for (const ccc of pe.details?.ccc || []) {
            const cccKey = normalizeLookupKey(ccc.id);
            
            // Store CCC definition only once with most complete info
            if (!cccDefinitions.has(cccKey)) {
              cccDefinitions.set(cccKey, {
                id: ccc.id,
                text: ccc.text || []
              });
            }
            
            addLookupEntry(lookup, ccc.id, {
              type: "Crosscutting Concept",
              title: ccc.id,
              subtitle: "",
              summary: ccc.text?.[0] || "",
              bullets: (ccc.text || []).slice(1, 4)
            });
          }
        }
      }
    }
  });

  for (const dimension of elementsData || []) {
    for (const element of dimension.elements || []) {
      const label = String(element.name || "").includes(":") ? String(element.name).split(":").slice(1).join(":").trim() : String(element.name || "").trim();
      const bullets = Object.entries(element.progressions || {}).map(([band, progressions]) => {
        const first = Array.isArray(progressions) && progressions.length ? progressions[0].text : "";
        return first ? `${prettyLabel(band)}: ${first}` : "";
      }).filter(Boolean).slice(0, 4);

      addLookupEntry(lookup, label, {
        type: dimension.dimension,
        title: label,
        subtitle: dimension.short_name,
        summary: bullets[0] || dimension.dimension,
        bullets: bullets.slice(1)
      });
      addLookupEntry(lookup, element.name, {
        type: dimension.dimension,
        title: label,
        subtitle: dimension.short_name,
        summary: bullets[0] || dimension.dimension,
        bullets: bullets.slice(1)
      });
    }
  }

  return lookup;
}

function addLookupEntry(lookup, key, entry) {
  const normalized = normalizeLookupKey(key);
  if (!normalized) {
    return;
  }

  const existing = lookup.get(normalized);
  if (!existing) {
    lookup.set(normalized, entry);
    return;
  }

  existing.summary = existing.summary || entry.summary;
  existing.subtitle = existing.subtitle || entry.subtitle;
  existing.bullets = [...new Set([...(existing.bullets || []), ...(entry.bullets || [])])].slice(0, 4);
}

function normalizeLookupKey(value) {
  return toPlainText(value)
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[:.\-\/]/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function handleStandardTooltipTrigger(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  if (Date.now() < (state.tooltipLockUntilTs || 0)) {
    return;
  }

  const trigger = event.target.closest("[data-standard-value]");
  if (!trigger) {
    return;
  }

  clearTooltipHideTimer();

  const showDelay = event.type === "focusin"
    ? TOOLTIP_DELAY_MS.showFocus
    : TOOLTIP_DELAY_MS.showHover;

  clearTooltipShowTimer();
  state.tooltipShowTimerId = window.setTimeout(() => {
    state.tooltipShowTimerId = null;
    showStandardTooltip(trigger);
  }, showDelay);
}

function showStandardTooltip(trigger) {
  if (!(trigger instanceof Element)) {
    return;
  }

  const standardValue = toPlainText(trigger.dataset.standardValue);
  if (!standardValue) {
    return;
  }

  const contextRecord = resolveRecordForStandardTrigger(trigger);
  const info = getStandardInfo(standardValue, contextRecord);
  if (!info || !elements.standardsTooltip) {
    return;
  }

  elements.standardsTooltip.dataset.tooltipStandardValue = standardValue;
  elements.standardsTooltip.innerHTML = renderStandardsTooltip(info, standardValue);
  elements.standardsTooltip.classList.remove("hidden");
  elements.standardsTooltip.setAttribute("aria-hidden", "false");
  positionStandardTooltip(trigger);
}

function handleStandardsTooltipAction(event) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const button = target.closest("[data-tooltip-action='see-similar']");
  if (!button) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const value = toPlainText(elements.standardsTooltip?.dataset?.tooltipStandardValue);
  if (!value) {
    return;
  }

  applySimilarMetadataFilter(value);
  hideStandardTooltip();
}

function applySimilarMetadataFilter(value) {
  const normalizedValue = toPlainText(value);
  if (!normalizedValue) {
    return;
  }

  const hasQuickTagMatch = state.records.some((record) => {
    const pool = record?._quickTagPool || [];
    return pool.includes(normalizedValue);
  });

  if (hasQuickTagMatch) {
    state.quickTag = normalizedValue;
    applyFilters();
    return;
  }

  state.search = normalizedValue.toLowerCase();
  if (elements.searchInput) {
    elements.searchInput.value = normalizedValue;
  }
  applyFilters();
}

function handleStandardTooltipExit(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  if (event.type === "focusout" && elements.standardsTooltip?.matches(":hover")) {
    return;
  }

  const trigger = event.target.closest("[data-standard-value]");
  if (!trigger) {
    return;
  }

  const related = event.relatedTarget;
  if (related instanceof Element && (related.closest("[data-standard-value]") === trigger || related.closest("#standards-tooltip"))) {
    return;
  }

  clearTooltipShowTimer();
  const hideDelay = event.type === "focusout"
    ? TOOLTIP_DELAY_MS.hideFocus
    : TOOLTIP_DELAY_MS.hideHover;
  queueHideStandardTooltip(hideDelay);
}

function handleStandardTooltipLeaveTooltip(event) {
  // When mouse leaves the tooltip popup itself, check if it's leaving to a non-trigger element
  const related = event.relatedTarget;
  if (related instanceof Element && related.closest("[data-standard-value]")) {
    // Still over a pill, keep tooltip visible
    return;
  }

  state.tooltipLockUntilTs = Date.now() + TOOLTIP_LOCK_MS.onLeave;
  
  // Left the tooltip and not hovering a pill, hide it
  queueHideStandardTooltip(TOOLTIP_DELAY_MS.hideHover);
}

function handleStandardTooltipEnterTooltip() {
  state.tooltipLockUntilTs = Date.now() + TOOLTIP_LOCK_MS.onEnter;
  clearTooltipHideTimer();
}

function hideStandardTooltip() {
  clearTooltipShowTimer();
  clearTooltipHideTimer();

  if (!elements.standardsTooltip) {
    return;
  }

  elements.standardsTooltip.classList.add("hidden");
  elements.standardsTooltip.setAttribute("aria-hidden", "true");
  delete elements.standardsTooltip.dataset.tooltipStandardValue;
}

function queueHideStandardTooltip(delayMs) {
  clearTooltipHideTimer();
  state.tooltipHideTimerId = window.setTimeout(() => {
    state.tooltipHideTimerId = null;

    const tooltip = elements.standardsTooltip;
    if (tooltip) {
      const tooltipHasHover = tooltip.matches(":hover");
      const tooltipHasFocus = tooltip.contains(document.activeElement);
      if (tooltipHasHover || tooltipHasFocus) {
        return;
      }
    }

    hideStandardTooltip();
  }, delayMs);
}

function clearTooltipShowTimer() {
  if (!state.tooltipShowTimerId) {
    return;
  }

  window.clearTimeout(state.tooltipShowTimerId);
  state.tooltipShowTimerId = null;
}

function clearTooltipHideTimer() {
  if (!state.tooltipHideTimerId) {
    return;
  }

  window.clearTimeout(state.tooltipHideTimerId);
  state.tooltipHideTimerId = null;
}

function positionStandardTooltip(trigger) {
  if (!elements.standardsTooltip) {
    return;
  }

  const rect = trigger.getBoundingClientRect();
  const tooltip = elements.standardsTooltip;
  const margin = 12;
  const top = Math.min(window.innerHeight - tooltip.offsetHeight - margin, rect.bottom + margin);
  const left = Math.min(window.innerWidth - tooltip.offsetWidth - margin, Math.max(margin, rect.left));
  tooltip.style.top = `${Math.max(margin, top)}px`;
  tooltip.style.left = `${left}px`;
}

function renderStandardsTooltip(info, standardValue = "") {
  const bullets = (info.bullets || []).length
    ? `<ul>${info.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>`
    : "";

  const action = standardValue
    ? `<div class="standards-tooltip-actions"><button type="button" class="standards-tooltip-action" data-tooltip-action="see-similar" aria-label="See similar tasks for ${escapeAttribute(standardValue)}">See Similar</button></div>`
    : "";

  return `
    <div class="standards-tooltip-type">${escapeHtml(info.type || "NGSS Reference")}</div>
    <div class="standards-tooltip-title">${escapeHtml(info.title || "")}</div>
    ${info.subtitle ? `<div class="standards-tooltip-subtitle">${escapeHtml(info.subtitle)}</div>` : ""}
    ${info.summary ? `<p class="standards-tooltip-summary">${escapeHtml(info.summary)}</p>` : ""}
    ${bullets}
    ${action}
  `;
}

function getPlaceholderImage(record) {
  const dataset = toPlainText(record?.dataset) || "Assessment Record";
  const svg = PLACEHOLDER_IMAGE_TEMPLATE.replace("__DATASET__", escapeHtml(dataset));
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function highlightSnippet(text, tokens) {
  const safeText = escapeHtml(text);
  if (!tokens.length) {
    return safeText;
  }

  const pattern = new RegExp(`(${tokens.map(escapeRegex).join("|")})`, "ig");
  return safeText.replace(pattern, "<mark>$1</mark>");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function annotateCrossDatasetConnections(records) {
  const titleMap = new Map();

  const getTitleKeys = (record) => {
    const title = toPlainText(record?.title);
    if (!title) {
      return [];
    }

    const keys = new Set();
    keys.add(normalizeLookupKey(title));
    keys.add(normalizeLookupKey(title.replace(/\s*\([^)]*\)\s*$/g, " ")));
    return [...keys].filter(Boolean);
  };

  for (const record of records) {
    for (const key of getTitleKeys(record)) {
      if (!titleMap.has(key)) {
        titleMap.set(key, []);
      }
      titleMap.get(key).push(record);
    }
  }

  for (const record of records) {
    const related = new Set();
    let hasAnnotatedCounterpart = false;
    let hasMainCounterpart = false;

    const titleKeys = getTitleKeys(record);
    const candidates = new Set();
    for (const key of titleKeys) {
      for (const entry of titleMap.get(key) || []) {
        candidates.add(entry);
      }
    }

    for (const candidate of candidates) {
      if (candidate === record) {
        continue;
      }

      const candidateDataset = toPlainText(candidate.dataset);
      if (candidateDataset && candidateDataset !== toPlainText(record.dataset)) {
        related.add(candidateDataset);
      }

      if (candidate.isAnnotated === true && record.isAnnotated !== true) {
        hasAnnotatedCounterpart = true;
      }
      if (record.isAnnotated === true && candidate.isAnnotated !== true) {
        hasMainCounterpart = true;
      }
    }

    record.relatedDatasets = [...related];
    record.hasAnnotatedCounterpart = hasAnnotatedCounterpart;
    record.hasMainCounterpart = hasMainCounterpart;
  }

  return records;
}

function prepareRuntimeCaches() {
  state.recordById = new Map();
  state.facetCountsByKey = new Map();
  state.standardInfoCache = new Map();

  for (const record of state.records) {
    state.recordById.set(String(record.id), record);

    const filterValuesByKey = {};
    const filterValueSets = {};
    for (const { key } of filterConfig) {
      const values = getRecordValuesForKey(record, key);

      filterValuesByKey[key] = values;
      filterValueSets[key] = new Set(values);
    }

    record._filterValuesByKey = filterValuesByKey;
    record._filterValueSets = filterValueSets;
    record._quickTagPool = [
      ...getRecordValuesForKey(record, "dciTags"),
      ...getRecordValuesForKey(record, "crossCuttingConcepts"),
      ...getRecordValuesForKey(record, "practices"),
      ...getDisplayValues(record.stse),
      ...getDisplayValues(record.natureOfScience),
      ...getRecordValuesForKey(record, "ngssPe")
    ];
  }

  for (const { key } of filterConfig) {
    state.facetCountsByKey.set(key, getFacetCounts(key));
  }

  state.standardsFuzzyCandidates = Array.from(state.standardsLookup.entries()).map(([key, data]) => {
    const keyNorm = normalizeLookupKey(key);
    return {
      key,
      data,
      keyWords: keyNorm.split(/\s+/).filter((word) => word.length > 2)
    };
  });
}

function sortDciFacetEntries(entries) {
  const domainOrder = { PS: 1, LS: 2, ESS: 3, ETS: 4 };

  return entries.sort((left, right) => {
    const leftInfo = parseDciForSort(String(left[0]));
    const rightInfo = parseDciForSort(String(right[0]));

    const leftDomainRank = domainOrder[leftInfo.domain] || 99;
    const rightDomainRank = domainOrder[rightInfo.domain] || 99;
    if (leftDomainRank !== rightDomainRank) {
      return leftDomainRank - rightDomainRank;
    }

    if (leftInfo.coreNumber !== rightInfo.coreNumber) {
      return leftInfo.coreNumber - rightInfo.coreNumber;
    }

    if (leftInfo.subcode !== rightInfo.subcode) {
      return leftInfo.subcode.localeCompare(rightInfo.subcode);
    }

    return right[1] - left[1] || String(left[0]).localeCompare(String(right[0]));
  });
}

function parseDciForSort(value) {
  const text = String(value || "").trim();
  const match = text.match(/^([A-Z]{2,4})(\d+)(?:\.([A-Z]))?/i);
  if (!match) {
    return {
      domain: "",
      coreNumber: 999,
      subcode: "",
      raw: text
    };
  }

  return {
    domain: match[1].toUpperCase(),
    coreNumber: Number.parseInt(match[2], 10) || 999,
    subcode: (match[3] || "").toUpperCase(),
    raw: text
  };
}

function sortPerformanceExpectationFacetEntries(entries) {
  return entries.sort((left, right) => {
    const leftInfo = parsePerformanceExpectationForSort(String(left[0]));
    const rightInfo = parsePerformanceExpectationForSort(String(right[0]));

    if (leftInfo.gradeRank !== rightInfo.gradeRank) {
      return leftInfo.gradeRank - rightInfo.gradeRank;
    }

    if (leftInfo.domain !== rightInfo.domain) {
      return leftInfo.domain.localeCompare(rightInfo.domain);
    }

    if (leftInfo.coreNumber !== rightInfo.coreNumber) {
      return leftInfo.coreNumber - rightInfo.coreNumber;
    }

    if (leftInfo.expectationNumber !== rightInfo.expectationNumber) {
      return leftInfo.expectationNumber - rightInfo.expectationNumber;
    }

    return right[1] - left[1] || String(left[0]).localeCompare(String(right[0]));
  });
}

function parsePerformanceExpectationForSort(value) {
  const text = String(value || "").trim().toUpperCase();
  const normalized = text.replace(/^([A-Z]{1,4})-(\d+)-([A-Z]{1,4})-(\d+)$/, "$1-$3$2-$4");
  const match = normalized.match(/^((?:PRE-K|PREK|K|MS|HS|\d{1,2}(?:-\d{1,2})?))-(?:([A-Z]{2,4})(\d+))(?:-(\d+))?/);

  const gradePart = match?.[1] || "";
  const domainLetters = match?.[2] || "";
  const domainNumber = match?.[3] || "";
  const expectationPart = match?.[4] || "";
  const domainPart = `${domainLetters}${domainNumber}`;

  return {
    gradeRank: getPeGradeRank(gradePart),
    domain: domainPart,
    coreNumber: Number.parseInt(domainNumber, 10) || getLeadingNumber(domainPart),
    expectationNumber: getLeadingNumber(expectationPart)
  };
}

function getPeGradeRank(gradePart) {
  const normalized = String(gradePart || "").trim().toUpperCase();
  if (normalized === "PRE-K" || normalized === "PREK") {
    return 0;
  }
  if (normalized === "K") {
    return 1;
  }
  if (/^\d+$/.test(normalized)) {
    return 1 + Number.parseInt(normalized, 10);
  }
  if (/^(\d+)-(\d+)$/.test(normalized)) {
    const match = normalized.match(/^(\d+)-(\d+)$/);
    return 50 + Number.parseInt(match[1], 10);
  }
  if (normalized === "MS") {
    return 80;
  }
  if (normalized === "HS") {
    return 90;
  }
  return 999;
}

function getLeadingNumber(value) {
  const match = String(value || "").match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 999;
}
