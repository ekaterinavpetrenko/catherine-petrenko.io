// script.js
const langButtons = document.querySelectorAll(".language-switcher button");
const langBlocks = document.querySelectorAll(".lang");
const themeToggle = document.getElementById("themeToggle");
const body = document.body;

// Языковое переключение
langButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const langId = btn.getAttribute("data-lang");

    // Меняем активный блок
    langBlocks.forEach(block => {
      if (block.id === langId) {
        block.classList.add("active");
      } else {
        block.classList.remove("active");
      }
    });

    // Меняем активную кнопку
    langButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

// Переключение темы
themeToggle.addEventListener("click", () => {
  body.classList.toggle("dark-theme");
  body.classList.toggle("light-theme");
});
