document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".lang-btn");
  const contentContainer = document.getElementById("content");
  const themeToggle = document.getElementById("theme-toggle");
  const root = document.documentElement;
  const body = document.body;

  let currentTheme = root.getAttribute("data-theme") || "dark";

  // --- Подгрузка языка ---
  async function loadLang(lang) {
    try {
      const res = await fetch(`./lang/${lang}.json`);
      const data = await res.json();

      const html = `
        <section class="inner-section">
          <h1>${data.name}</h1>
          <h2>${data.subtitle}</h2>
        </section>
        <section class="inner-section">
          <h2>${data.skillsTitle}</h2>
          <ul>${data.skills.map(s => `<li>${s}</li>`).join('')}</ul>
        </section>
        <section class="inner-section">
          <h2>${data.aboutTitle}</h2>
          ${data.aboutText.map(p => `<p>${p}</p>`).join('')}
        </section>
      `;

      // Плавное появление
      contentContainer.classList.remove("show");
      setTimeout(() => {
        contentContainer.innerHTML = html;
        contentContainer.classList.add("show");
      }, 200);

    } catch (err) {
      console.error(`Ошибка при загрузке языка ${lang}:`, err);
    }
  }

  // --- Переключение языков ---
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;

      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      loadLang(lang);
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
  loadLang("en");
});
