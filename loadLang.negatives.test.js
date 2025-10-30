/**
 * @jest-environment jsdom
 */
jest.useFakeTimers();
require('@testing-library/jest-dom');

describe('loadLang — негативные кейсы', () => {
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

    // 💡 Базовый мок fetch — УСПЕШНЫЙ ответ (важно: ok: true для проверки res.ok)
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

  // 🔧 Флшим microtasks (промисы)
  const flush = () => Promise.resolve();

  // --- A) show снимается сразу после клика и возвращается через 200 мс ---
  test('после клика show снимается сразу, и только через 200 мс появляется снова', async () => {
    document.dispatchEvent(new Event('DOMContentLoaded'));

    // Дождаться автозагрузки EN и появления show
    await flush();              // завершение fetch
    await flush();              // завершение res.json
    jest.advanceTimersByTime(200); // отрисовка с setTimeout(200)

    const content = document.getElementById('content');
    expect(content.classList.contains('show')).toBe(true);

    // Кликаем по ES → show должен уйти немедленно
    document.querySelector('.lang-btn[data-lang="es"]').click();
    expect(content.classList.contains('show')).toBe(false);

    // ДАЁМ ПОСТАВИТЬСЯ setTimeout(200): он ставится ПОСЛЕ fetch/json
    await flush();              // завершение fetch
    await flush();              // завершение res.json

    // До 200 мс show не должен вернуться
    jest.advanceTimersByTime(199);
    expect(content.classList.contains('show')).toBe(false);

    // После 200 мс — обратно
    jest.advanceTimersByTime(1);
    expect(content.classList.contains('show')).toBe(true);
  });

  // --- C) Пустые массивы в JSON не ломают разметку ---
  test('пустые skills/aboutText не ломают отрисовку', async () => {
    // Полностью переопределяем мок для ЭТОГО теста (чтобы гарантировать пустые списки)
    global.fetch.mockReset();
    global.fetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            name: "Catherine Petrenko",
            subtitle: "System-thinking PM",
            skillsTitle: "Skills",
            skills: [],              // ← пустой список
            aboutTitle: "About",
            aboutText: []            // ← пустой список
          })
      })
    );

    document.dispatchEvent(new Event('DOMContentLoaded'));

    // Ждём оба микроцикла и 200 мс отрисовки
    await flush();
    await flush();
    jest.advanceTimersByTime(200);

    const html = document.getElementById('content').innerHTML;
    expect(html).toContain('<h2>Skills</h2>');
    expect(html).toContain('<ul></ul>');
    expect(html).toContain('<h2>About</h2>');
  });

  // --- D) HTTP ошибка: ожидаем отсутствие show и контента ---
  test('HTTP ошибка (res.ok=false) не показывает контент и не включает show', async () => {
    // приглушаем ошибки в консоли только для этого теста
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Полностью переопределяем мок для ЭТОГО теста (чтобы гарантировать 404)
    global.fetch.mockReset();
    global.fetch.mockImplementation(() =>
      Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) })
    );

    document.dispatchEvent(new Event('DOMContentLoaded'));

    // Завершение fetch/json (ошибочного) — setTimeout не поставится, show не вернётся
    await flush();
    await flush();
    jest.advanceTimersByTime(200);

    const content = document.getElementById('content');
    expect(content.classList.contains('show')).toBe(false);
    expect(content.innerHTML).not.toContain('<h1>');

    // возвращаем поведение console.error
    spy.mockRestore();
  });
});
