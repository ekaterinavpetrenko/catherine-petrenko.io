/**
 * @jest-environment jsdom
 */
jest.useFakeTimers();
require('@testing-library/jest-dom');

describe('кнопки языков — активное состояние и повторный клик', () => {
  beforeEach(() => {
    // 🧩  Подготавливаем DOM, как на реальной странице
    document.body.innerHTML = `
      <header class="top-bar">
        <div class="controls">
          <div class="language-selector">
            <button class="lang-btn active" data-lang="en">EN</button>
            <button class="lang-btn" data-lang="es">ES</button>
            <button class="lang-btn" data-lang="ru">RU</button>
          </div>
          <button id="theme-toggle">☀️ / 🌙</button>
        </div>
      </header>
      <main id="content" class="fade"></main>
    `;

    // 💡 Мокаем fetch — имитируем успешный ответ JSON (важно: ok: true)
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            name: "Catherine Petrenko",
            subtitle: "System-thinking PM",
            skillsTitle: "Skills",
            skills: ["Leadership", "System Thinking"],
            aboutTitle: "About",
            aboutText: ["Paragraph 1", "Paragraph 2"]
          })
      })
    );

    // 🧠 Подключаем реальный скрипт (он сам навесит слушатель DOMContentLoaded)
    jest.isolateModules(() => {
      require('../script.js');
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  // 🔧 Вспомогательная функция: флшим microtasks (промисы)
  const flush = () => Promise.resolve();

  // --- Проверяем переключение активной кнопки языка ---
  test('после смены языка активной становится соответствующая кнопка, прежняя снимается', async () => {
    // 1️⃣ Инициализация
    document.dispatchEvent(new Event("DOMContentLoaded"));

    // 2️⃣ Клик по кнопке ES
    const enButton = document.querySelector('.lang-btn[data-lang="en"]');
    const esButton = document.querySelector('.lang-btn[data-lang="es"]');
    esButton.click();

    // 3️⃣ Ждём завершения промисов (fetch/json)
    await flush();
    await flush();

    // 4️⃣ Прокрутка отложенной вставки (200 мс в loadLang)
    jest.advanceTimersByTime(200);

    // 5️⃣ Проверяем классы
    expect(esButton.classList.contains('active')).toBe(true);
    expect(enButton.classList.contains('active')).toBe(false);
  });

  // --- Повторный клик по активному языку не инициирует новый fetch ---
  test('повторный клик по уже активному языку не инициирует новый fetch и не меняет состояние', async () => {
    // 1️⃣ Инициализация
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await flush(); // автозагрузка EN
    jest.advanceTimersByTime(200);

    // 2️⃣ Снимем текущее состояние
    const enButton = document.querySelector('.lang-btn[data-lang="en"]');
    const esButton = document.querySelector('.lang-btn[data-lang="es"]');
    const ruButton = document.querySelector('.lang-btn[data-lang="ru"]');
    const beforeCalls = global.fetch.mock.calls.length;
    const beforeActive = {
      en: enButton.classList.contains('active'),
      es: esButton.classList.contains('active'),
      ru: ruButton.classList.contains('active'),
    };

    // 3️⃣ Кликаем по уже активной EN
    enButton.click();

    // 4️⃣ Ждём и двигаем таймеры (на случай анимаций)
    await flush();
    jest.advanceTimersByTime(200);

    // 5️⃣ Убеждаемся, что новых запросов не прибавилось
    expect(global.fetch).toHaveBeenCalledTimes(beforeCalls);

    // 6️⃣ И что активные классы не изменились
    expect(enButton.classList.contains('active')).toBe(beforeActive.en);
    expect(esButton.classList.contains('active')).toBe(beforeActive.es);
    expect(ruButton.classList.contains('active')).toBe(beforeActive.ru);
  });
});


