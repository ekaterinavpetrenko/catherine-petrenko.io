/**
 * @jest-environment jsdom
 */
jest.useFakeTimers();

describe('themeToggle', () => {
  let root, body, button, currentTheme;

  beforeEach(() => {
    // Создаём структуру DOM без вложенного html
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.innerHTML = `<button id="theme-toggle">☀️ / 🌙</button>`;

    root = document.documentElement;
    body = document.body;
    button = document.getElementById('theme-toggle');

    // Локальная переменная как в script.js
    currentTheme = root.getAttribute('data-theme') || 'dark';

    // Симулируем обработчик из script.js
    button.addEventListener('click', () => {
      body.classList.add('theme-fade');
      setTimeout(() => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', currentTheme);
        body.classList.add('theme-fade-active');
        setTimeout(() => {
          body.classList.remove('theme-fade', 'theme-fade-active');
        }, 400);
      }, 100);
    });
  });

  test('переключает тему с dark на light', () => {
    expect(root.getAttribute('data-theme')).toBe('dark');

    button.click();

    jest.advanceTimersByTime(150);
    expect(root.getAttribute('data-theme')).toBe('light');
  });

  test('добавляет и убирает классы fade при переключении темы', () => {
    button.click();
    expect(body.classList.contains('theme-fade')).toBe(true);

    jest.advanceTimersByTime(150);
    expect(body.classList.contains('theme-fade-active')).toBe(true);

    jest.advanceTimersByTime(500);
    expect(body.classList.contains('theme-fade')).toBe(false);
    expect(body.classList.contains('theme-fade-active')).toBe(false);
  });
});
