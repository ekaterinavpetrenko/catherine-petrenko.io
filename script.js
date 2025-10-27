// script.js v3.3 — full UX + SEO + JSON-driven
document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".lang-btn");
  const contentContainer = document.getElementById("content");
  const themeToggle = document.getElementById("theme-toggle");
  const root = document.documentElement;
  const body = document.body;

  // --- 🌓 Theme setup ---
  let currentTheme = localStorage.getItem("theme") || root.getAttribute("data-theme") || "dark";
  root.setAttribute("data-theme", currentTheme);

  themeToggle.addEventListener("click", () => {
    body.classList.add("theme-fade");
    setTimeout(() => {
      currentTheme = currentTheme === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", currentTheme);
      localStorage.setItem("theme", currentTheme);

      body.classList.add("theme-fade-active");
      setTimeout(() => body.classList.remove("theme-fade", "theme-fade-active"), 400);
    }, 100);
  });

  // --- 🌐 Language loading ---
  async function loadLang(lang) {
    try {
      const res = await fetch(`../lang/${lang}.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // --- 🔍 SEO update ---
      document.title = data.meta?.title || `${data.header?.h1} — Portfolio`;
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.name = "description";
        document.head.appendChild(metaDesc);
      }
      metaDesc.content = data.meta?.description || `${data.header?.h1} | ${data.header?.subtitle}`;

      // --- 🧱 Content render with per-section animation ---
      const sections = [];

      // Header
      sections.push(`
        <section class="inner-section fade-up">
          <h1>${data.header.h1}</h1>
          <h2>${data.header.subtitle}</h2>
        </section>
      `);

      // Skills
      if (data.sections.skills) {
        sections.push(`
          <section class="inner-section fade-up">
            <h2>${data.sections.skills.title}</h2>
            <ul>${data.sections.skills.items.map(s => `<li>${s}</li>`).join('')}</ul>
          </section>
        `);
      }

      // About
      if (data.sections.about) {
        sections.push(`
          <section class="inner-section fade-up">
            <h2>${data.sections.about.title}</h2>
            ${data.sections.about.paragraphs.map(p => `<p>${p}</p>`).join('')}
          </section>
        `);
      }

      // Reset content
      contentContainer.innerHTML = "";
      contentContainer.classList.remove("show");

      // Animate each section sequentially
      sections.forEach((html, idx) => {
        const temp = document.createElement("div");
        temp.innerHTML = html.trim();
        const sectionEl = temp.firstChild;
        sectionEl.style.opacity = 0;
        sectionEl.style.transform = "translateY(20px)";
        contentContainer.appendChild(sectionEl);

        setTimeout(() => {
          sectionEl.style.transition = "opacity 0.5s ease, transform 0.5s ease";
          sectionEl.style.opacity = 1;
          sectionEl.style.transform = "translateY(0)";
        }, idx * 150); // stagger by 150ms
      });

    } catch (err) {
      console.error(`Error loading language ${lang}:`, err);
      contentContainer.innerHTML = `<p style="color:red">Content unavailable.</p>`;
    }
  }

  // --- 🔄 Language switch ---
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      loadLang(lang);
    });
  });

  // --- 🚀 Initial load ---
  const defaultLang = "en";
  document.querySelector(`.lang-btn[data-lang="${defaultLang}"]`)?.classList.add("active");
  loadLang(defaultLang);
});

/* Fade-up for inner sections */
.inner-section.fade-up {
  opacity: 0;
  transform: translateY(20px);
}




