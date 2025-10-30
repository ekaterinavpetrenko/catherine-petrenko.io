/**
 * @jest-environment jsdom
 */
jest.useFakeTimers();
require('@testing-library/jest-dom');

describe('loadLang / theme — стрессовые кейсы', () => {
  const langs = ['en', 'es', 'ru'];
  const btn = (code) => document.querySelector(`.lang-btn[data-lang="${code}"]`);
  const flush = () => Promise.resolve();

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

    // 🧠 Подключаем реальный скрипт (он сам навесит слушатель DOMContentLoaded)
    jest.isolateModules(() => {
      require('../script.js');
    });

    // 💡 Базовый мок fetch — успешный ответ JSON
    global.fetch = jest.fn((path) =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            // Дадим заголовку говорить, какой язык прилетел, чтобы было видно в DOM
            name:
              (path.includes('/en.json') && 'EN') ||
              (path.includes('/es.json') && 'ES') ||
              (path.includes('/ru.json') && 'RU'),
            subtitle: 'System-thinking PM',
            skillsTitle: 'Skills',
            skills: ['Leadership', 'System Thinking'],
            aboutTitle: 'About',
            aboutText: ['Paragraph 1', 'Paragraph 2'],
          }),
      })
    );
  });

  // --- Матрица быстрых переключений X→Y для всех пар (X ≠ Y) ---
  const pairs = [];
  for (const from of langs) for (const to of langs) if (from !== to) pairs.push([from, to]);

  test.each(pairs)(
    'быстрая смена %s → %s активирует нужную кнопку и дергает оба JSON',
    async (from, to) => {
      // 1) Автозагрузка EN
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await flush();
      jest.advanceTimersByTime(200);

      // 2) Если стартовый язык теста не EN — сначала кликаем его (делаем активным "from")
      if (from !== 'en') {
        btn(from).click();
        await flush();
        await flush();
        jest.advanceTimersByTime(200);
        expect(btn(from)).toHaveClass('active');
      }

      // 3) Мгновенно кликаем конечный язык "to"
      btn(to).click();

      // 4) Дадим выполниться промисам и анимациям
      await flush();
      await flush();
      jest.advanceTimersByTime(200);

      // 5) Итог: активна кнопка "to"
      expect(btn(to)).toHaveClass('active');
      langs.filter(l => l !== to).forEach(l => expect(btn(l)).not.toHaveClass('active'));

      // 6) Проверяем, что оба языка были запрошены
      const calls = global.fetch.mock.calls.map((c) => c[0]);
      expect(calls).toContain(`./lang/${to}.json`);
      // Если from === 'en', то первый запрос — автозагрузка, а второй — на to.
      // Для from !== 'en' — будет запрос на from и на to.
      if (from !== 'en') {
        expect(calls).toContain(`./lang/${from}.json`);
      } else {
        expect(calls).toContain('./lang/en.json');
      }
    }
  );

  // --- Оставляем точечный тест гонки ES→RU с контролируемыми промисами ---
  test('гонка ES→RU: применяется только последний ответ (RU), запоздалый ES игнорируется', async () => {
    // Стартуем
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await flush(); // автозагрузка EN
    // Дальше нам нужно два управляемых запроса: ES и RU
    let resolveES, resolveRU;

    // Настраиваем два следующих вызова fetch: сначала для ES, потом для RU.
    global.fetch
      .mockImplementationOnce(
        () =>
          new Promise((res) => {
            resolveES = () =>
              res({
                ok: true,
                json: () =>
                  Promise.resolve({
                    name: 'ES',
                    subtitle: 'ES',
                    skillsTitle: 'S',
                    skills: [],
                    aboutTitle: 'A',
                    aboutText: [],
                  }),
              });
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((res) => {
            resolveRU = () =>
              res({
                ok: true,
                json: () =>
                  Promise.resolve({
                    name: 'RU',
                    subtitle: 'RU',
                    skillsTitle: 'S',
                    skills: [],
                    aboutTitle: 'A',
                    aboutText: [],
                  }),
              });
          })
      );

    const esBtn = btn('es');
    const ruBtn = btn('ru');

    // Быстро кликаем ES, а затем RU
    esBtn.click();
    ruBtn.click();

    // Завершаем RU раньше (он должен победить)
    resolveRU();
    await flush();
    jest.advanceTimersByTime(200);

    // Теперь завершаем запоздалый ES — он должен быть проигнорирован анти-гонкой
    resolveES();
    await flush();
    jest.advanceTimersByTime(200);

    const html = document.getElementById('content').innerHTML;
    expect(html).toContain('<h1>RU</h1>');
    expect(html).not.toContain('<h1>ES</h1>');
  });

  // --- Два быстрых клика по теме: финальная тема корректна, хвостов нет ---
  test('два быстрых клика по теме: итоговая тема возвращается, классы сняты', async () => {
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const root = document.documentElement;
    const body = document.body;
    const toggle = document.getElementById('theme-toggle');

    const start = root.getAttribute('data-theme') || 'dark';

    // Клик 1 → 100мс flip
    toggle.click();
    jest.advanceTimersByTime(100);

    // Клик 2 → ещё 100мс flip
    toggle.click();
    jest.advanceTimersByTime(100);

    // Дождёмся полного снятия классов после последнего клика
    jest.advanceTimersByTime(400);

    expect(body.classList.contains('theme-fade')).toBe(false);
    expect(body.classList.contains('theme-fade-active')).toBe(false);

    // Двойной клик вернул исходную тему
    const end = root.getAttribute('data-theme');
    expect(end).toBe(start);
  });
});

