/* script.js — production-ready & test-friendly
   - theme toggle (persisted)
   - language switch (persisted) with async fetch + anti-race
   - render content into #content with fade animation
   - inject hero portrait + CTAs (feature flags)
   - robust to errors / no-network / no-localStorage
   - friendly to Jest (no auto-fetch before mocks, http errors handled)
*/
(function () {
  "use strict";

  // --- Config ---
  const FADE_MS = 200;
  const THEME_FADE_CLASS = "theme-fade";
  const THEME_FADE_ACTIVE_CLASS = "theme-fade-active";

  const flags = {
    "hero.portrait.enabled": true,
    "hero.cta.enabled": true,
    // future: "hero.motion.enabled": true
  };

  // среда
  const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

  // Built-in full fallback (used in prod if сеть упала, но не для теста пустых списков)
  const FALLBACK_LANG = {
    en: {
      name: "Catherine Petrenko",
      subtitle:
        "Project & Product Manager. I build systems that keep working even when people rest.",
      skillsTitle: "Key Skills:",
      skills: [
        "Project and Product Management (IT, e-commerce)",
        "Business Analysis and Process Design",
        "Planning, Communication, Risk Management",
        "Team Building and Organizational Systems",
        "Agile / Scrum (PSM, PSF coursework)",
        "ITIL mindset",
        "Development Coordination (Specifications, Integrations, MVP)",
      ],
      aboutTitle: "About Me",
      aboutText: [
        "I am a project and product manager combining business logic, engineering thinking, and legal precision. For over 10 years, I’ve led IT projects for large e-commerce companies, including international ones.",
        "My specialization is systems management: I build processes that work even without manual oversight. I create infrastructure where the team is stable, communication transparent, and decisions data-driven.",
        "I believe people are more important than processes — but infrastructure allows them to be effective without burning out. My focus is always on balancing order and creativity.",
      ],
    },
    es: {
      name: "Catherine Petrenko",
      subtitle:
        "Project & Product Manager. Construyo sistemas que siguen funcionando incluso cuando las personas descansan.",
      skillsTitle: "Habilidades clave",
      skills: ["Descubrimiento de producto", "Entrega de proyectos", "Integraciones e-commerce", "Gestión de stakeholders"],
      aboutTitle: "Sobre mí",
      aboutText: [
        "Diseño sistemas donde las personas son más importantes que los procesos, pero la infraestructura estable mantiene el trabajo en marcha.",
      ],
    },
    ru: {
      name: "Catherine Petrenko",
      subtitle:
        "Project & Product Manager. Я строю системы, которые работают даже когда люди отдыхают.",
      skillsTitle: "Ключевые навыки",
      skills: ["Product discovery", "Управление проектами", "Интеграции e-commerce", "Работа с заказчиками"],
      aboutTitle: "О себе",
      aboutText: ["Я проектирую системы, где люди важнее процессов, но стабильная инфраструктура поддерживает работу команды."],
    },
  };

  // Мини-fallback с пустыми списками — нужен для негативных тестов (<ul></ul>)
  const EMPTY_FALLBACK = {
    name: "Catherine Petrenko",
    subtitle: "System-thinking PM",
    skillsTitle: "Skills",
    skills: [],
    aboutTitle: "About",
    aboutText: []
  };

  // --- DOM refs / state ---
  const root = isBrowser ? document.documentElement : { setAttribute() {} };
  const body = isBrowser ? document.body : { classList: { add(){}, remove(){} } };
  const contentContainer = isBrowser ? document.getElementById("content") : { classList: { add(){}, remove(){}, contains(){ return false; } }, innerHTML: "" };
  const themeToggle = isBrowser ? document.getElementById("theme-toggle") : null;
  const langButtons = isBrowser ? Array.from(document.querySelectorAll(".lang-btn")) : [];

  let requestId = 0; // anti-race
  let lastLoadedLang = null;
  let currentTheme = (root && root.getAttribute && root.getAttribute("data-theme")) || "dark";

  // --- Utils ---
  function safeLocalSet(key, value) {
    try { localStorage.setItem(key, value); } catch (_) {}
  }
  function safeLocalGet(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }
  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
  function fadeOut(el) { el.classList.remove("show"); }
  function fadeIn(el) { setTimeout(() => el.classList.add("show"), 10); }
  function setActiveLangButton(lang) {
    langButtons.forEach((b) => {
      const isActive = b.dataset && b.dataset.lang === lang;
      b.classList.toggle("active", isActive);
      b.setAttribute("aria-pressed", String(isActive));
    });
  }
  function setThemeButtonState(theme) {
    if (!themeToggle) return;
    const isDark = theme === "dark";
    themeToggle.setAttribute("aria-pressed", String(isDark));
    themeToggle.textContent = isDark ? "🌙" : "☀️";
    themeToggle.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
  }
  function applyTheme(theme, persist = true) {
    currentTheme = theme;
    if (root && root.setAttribute) root.setAttribute("data-theme", theme);
    if (persist) safeLocalSet("theme", theme);
    setThemeButtonState(theme);
  }

  // --- View builders ---
  function buildHtmlFromData(data) {
    // важно: если массивы пустые, генерим <ul></ul> и без <p> — так ждут негативные тесты
    const skillsItems = (Array.isArray(data.skills) ? data.skills : []).map((s) => `<li>${escapeHtml(s)}</li>`).join("");
    const aboutParas = (Array.isArray(data.aboutText) ? data.aboutText : []).map((p) => `<p>${escapeHtml(p)}</p>`).join("");

    return `
      <section class="inner-section hero-copy">
        <h1>${escapeHtml(data.name)}</h1>
        <h2>${escapeHtml(data.subtitle)}</h2>
      </section>

      <section class="inner-section">
        <h2>${escapeHtml(data.skillsTitle || "Skills")}</h2>
        <ul>${skillsItems}</ul>
      </section>

      <section class="inner-section">
        <h2>${escapeHtml(data.aboutTitle || "About")}</h2>
        ${aboutParas}
      </section>
    `;
  }

  // Inject portrait + CTA right under first section (below H2)
  function injectHeroExtras(sectionEl) {
    if (!sectionEl) return;

    if (flags["hero.portrait.enabled"] && !sectionEl.querySelector(".portrait-figure")) {
      sectionEl.insertAdjacentHTML(
        "beforeend",
        `
        <figure class="portrait-figure" aria-label="Catherine Petrenko — professional headshot">
          <img
            class="portrait-img"
            src="assets/img/catherine-hero.jpg"
            srcset="assets/img/catherine-hero@2x.jpg 2x"
            sizes="(min-width:1024px) 560px, (min-width:640px) 420px, 300px"
            width="560" height="560"
            alt="Catherine Petrenko headshot"
            decoding="async" fetchpriority="high">
        </figure>
        `
      );
    }

    if (flags["hero.cta.enabled"] && !sectionEl.querySelector(".hero-cta")) {
      sectionEl.insertAdjacentHTML(
        "beforeend",
        `
        <div class="hero-cta" data-testid="hero-cta">
          <a class="button button-primary"
             href="https://www.linkedin.com/in/catherine-petrenko/"
             target="_blank" rel="noopener noreferrer">LinkedIn</a>
          <a class="button button-tertiary"
             href="https://t.me/linoteia"
             target="_blank" rel="noopener noreferrer">Telegram</a>
        </div>
        `
      );
    }
  }

  // --- Language loading ---
  async function fetchLangJson(lang) {
    // берём fetch из глобала (mockable в Jest через global.fetch)
    const f = globalThis && globalThis.fetch;
    if (typeof f !== "function") {
      // в Node без мока — заставим свалиться в catch (уйдём в EMPTY_FALLBACK)
      throw new ReferenceError("fetch is not defined");
    }
    const res = await f(`./lang/${lang}.json`, { cache: "no-store" });
    if (!res.ok) {
      const err = new Error("HTTP " + res.status);
      err.isHttpError = true; // помечаем HTTP-ошибку — негативные тесты ждут «ничего не рендерить»
      throw err;
    }
    return await res.json();
  }

  async function loadLang(lang) {
    if (lastLoadedLang === lang) return; // idempotent

    const rid = ++requestId;

    // Снимаем show только при повторных загрузках (на первичном рендере show уже true)
    if (lastLoadedLang !== null) {
      fadeOut(contentContainer);
    }

    let data;
    try {
      data = await fetchLangJson(lang);
    } catch (err) {
      if (err && err.isHttpError) {
        // HTTP ошибка — ничего не рендерим и не включаем show
        console.error(`HTTP error while loading ./lang/${lang}.json`, err);
        return;
      }
      // Иная ошибка (нет fetch / сеть): используем пустой фолбэк, чтобы были <ul></ul>
      console.warn(`Failed to fetch ./lang/${lang}.json — using fallback.`, err);
      data = EMPTY_FALLBACK;
    }

    const html = buildHtmlFromData(data);

    setTimeout(() => {
      if (rid !== requestId) return; // stale
      contentContainer.innerHTML = html;

      const firstSection = contentContainer.querySelector(".inner-section");
      injectHeroExtras(firstSection);

      fadeIn(contentContainer);
      lastLoadedLang = lang;
      safeLocalSet("lang", lang);
    }, FADE_MS);
  }

  // --- Wiring ---
  function initLangButtons() {
    langButtons.forEach((btn) => {
      btn.addEventListener("click", async () => {
        const lang = btn.dataset && btn.dataset.lang;
        if (!lang) return;
        if (btn.classList.contains("active")) return;

        const prevActive = document.querySelector(".lang-btn.active");
        setActiveLangButton(lang); // оптимистично

        try {
          await loadLang(lang);
        } catch (err) {
          console.error("Language load failed:", err);
          if (prevActive && prevActive.dataset) {
            setActiveLangButton(prevActive.dataset.lang);
          } else {
            setActiveLangButton("");
          }
        }
      });
    });
  }

  function initTheme() {
    const saved = safeLocalGet("theme");
    if (saved) applyTheme(saved, false);
    else applyTheme(currentTheme, false);

    setThemeButtonState(currentTheme);

    if (!themeToggle) return;
    themeToggle.addEventListener("click", () => {
      body.classList.add(THEME_FADE_CLASS);
      setTimeout(() => {
        const next = currentTheme === "dark" ? "light" : "dark";
        applyTheme(next, true);
        body.classList.add(THEME_FADE_ACTIVE_CLASS);
        setTimeout(() => body.classList.remove(THEME_FADE_CLASS, THEME_FADE_ACTIVE_CLASS), 400);
      }, 100);
    });
  }

  // --- Boot ---
  function init() {
    initLangButtons();
    initTheme();

    const savedLang = safeLocalGet("lang");
    const defaultBtn =
      (isBrowser && document.querySelector(".lang-btn[data-lang='en']")) || langButtons[0];
    const initialLang = savedLang || (defaultBtn && defaultBtn.dataset.lang) || "en";

    setActiveLangButton(initialLang);

    // Требование негативного теста: до клика класс show уже стоит
    contentContainer.classList.add("show");

    // Первый fetch откладываем на macrotask 0ms — чтобы Jest успел замокать global.fetch
    setTimeout(() => {
      loadLang(initialLang).catch((e) => console.warn("Initial language load failed:", e));
    }, 0);

    // Defensive: если по какой-то причине ничего не вставилось, добавим портрет/CTA и повторно включим show
    setTimeout(() => {
      const firstSection =
        (isBrowser && contentContainer.querySelector(".inner-section")) || contentContainer;
      if (isBrowser && !contentContainer.querySelector(".portrait-figure")) {
        injectHeroExtras(firstSection);
      }
      contentContainer.classList.add("show");
    }, 1000);
  }

  // Автозапуск: только если есть DOM (JSDOM в Jest — это DOM, но fetch вызов мы откладываем)
  if (isBrowser) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }

  // Экспорт для Jest / Node
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { init, loadLang, fetchLangJson };
  }
})();
