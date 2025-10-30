document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".lang-btn");
  const contentContainer = document.getElementById("content");
  const themeToggle = document.getElementById("theme-toggle");
  const root = document.documentElement;
  const body = document.body;

  const FADE_MS = 200;

  let currentTheme = root.getAttribute("data-theme") || "dark";
  // ❄️ последний успешно применённый язык (для идемпотентности)
  let lastLoadedLang = null;
  // 🏷️ счётчик запросов (анти-гонка: применять только самый новый ответ)
  let requestId = 0;

  // --- Подгрузка языка ---
  async function loadLang(lang) {
    // ⛔️ уже применён этот язык — ничего не делаем
    if (lastLoadedLang === lang) return;

    // метка запроса для анти-гонки
    const rid = ++requestId;

    // мгновенно скрываем контент на время загрузки
    contentContainer.classList.remove("show");

    try {
      const res = await fetch(`./lang/${lang}.json`);
      // ✅ явная проверка статуса
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const html = `
        <section class="inner-section">
          <h1>${data.name}</h1>
          <h2>${data.subtitle}</h2>
        </section>
        <section class="inner-section">
          <h2>${data.skillsTitle}</h2>
          <ul>${(data.skills || []).map(s => `<li>${s}</li>`).join('')}</ul>
        </section>
        <section class="inner-section">
          <h2>${data.aboutTitle}</h2>
          ${(data.aboutText || []).map(p => `<p>${p}</p>`).join('')}
        </section>
      `;

      // Плавное появление
      setTimeout(() => {
        // 🧯 если это не самый свежий ответ — игнорируем
        if (rid !== requestId) return;
        contentContainer.innerHTML = html;
        contentContainer.classList.add("show");
        // фиксируем успешно применённый язык
        lastLoadedLang = lang;
      }, FADE_MS);
    } catch (err) {
      console.error(`Ошибка при загрузке языка ${lang}:`, err);
      // (не меняем lastLoadedLang и оставляем текущий активный язык как есть)
      throw err; // пробрасываем для возможного rollback в обработчике клика
    }
  }

  // --- Переключение языков ---
  buttons.forEach(btn => {
    btn.addEventListener("click", async () => {
      const lang = btn.dataset.lang;

      // ⛔️ уже активна — выходим без fetch/перерисовки
      if (btn.classList.contains("active")) return;

      // оптимистично активируем, но откатываем при неудаче
      const prevActive = document.querySelector(".lang-btn.active");
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      try {
        await loadLang(lang);
      } catch {
        // rollback UI: возвращаем прежнюю кнопку активной
        buttons.forEach(b => b.classList.remove("active"));
        if (prevActive) prevActive.classList.add("active");
      }
    });
  });

  // --- Переключение темы ---
  themeToggle.addEventListener("click", () => {
    body.classList.add("theme-fade");
    setTimeout(() => {
      currentTheme = currentTheme === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", currentTheme);
      body.classList.add("theme-fade-active");
      setTimeout(() => {
        body.classList.remove("theme-fade", "theme-fade-active");
      }, 400);
    }, 100);
  });

  // --- Автозагрузка английского ---
  document.querySelector('.lang-btn[data-lang="en"]').classList.add("active");
  // важно: чтобы тест HTTP-ошибки не ронялся на Unhandled Promise Rejection
  loadLang("en").catch(() => {});
});

