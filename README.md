# Локальный HTTP-клиент (PostmanFork)

React + Vite + IndexedDB: коллекции запросов, базовый URL, пресеты заголовков, импорт Postman Collection v2.

## Разработка

```bash
npm install
npm run dev
```

## Сборка

```bash
npm run build
npm run preview
```

## Десктопное приложение (Electron)

Тот же интерфейс в отдельном окне (не вкладка браузера): IndexedDB, `fetch` и CORS ведут себя как в Chromium.

```bash
npm install
npm run electron:dev
```

Остановка: закрой окно приложения или `Ctrl+C` в терминале.

**Установщик Windows** (после сборки смотри папку `release/`):

```bash
npm run electron:pack
```

Скрипт `build:desktop` собирает фронт с относительными путями (`./`) под загрузку из `file://` в Electron. Обычный `npm run build` по-прежнему для веба и GitHub Pages.

Подпись установщика под Windows отключена (`signAndEditExecutable: false` в `package.json`), чтобы сборка шла без прав администратора и режима разработчика. Для распространения с подписью настройте свой сертификат и опции `electron-builder` отдельно.

**macOS (Intel и Apple Silicon)** — артефакты **`.dmg`** и **`.zip`** в той же папке `release/`:

```bash
npm run electron:pack:mac
```

Запускать нужно **на компьютере с macOS** (или в CI с раннером `macos-latest`). С Windows/Linux собрать `.app` для Mac **нельзя** — это ограничение Apple/Electron.

Без платной подписи Apple (**Developer ID**) при первом запуске macOS может писать, что разработчик неизвестен: **Системные настройки → Конфиденциальность и безопасность** → «Всё равно открыть», либо **ПКМ по приложению → Открыть**. Для распространения через интернет обычно нужны подпись и нотаризация (настраиваются в `electron-builder` при наличии сертификата).

## Репозиторий и GitHub Pages

Репозиторий уже инициализирован (`git init`), ветка **main**, файлы в индексе — осталось указать автора Git и сделать первый коммит:

```bash
git config user.name "Ваше имя"
git config user.email "your@email.com"
git commit -m "Initial commit"
git remote add origin https://github.com/ArtemNaronov/PostamnFork.git
git push -u origin main
```

Если репозиторий на GitHub ещё пустой, команда `git push -u origin main` создаст историю на сервере.

### Публикация через Actions (ветка `gh-pages`)

Сайт собирается workflow’ом и **пушится в ветку `gh-pages`**. Это **не** тот режим, когда в Pages выбрано **«GitHub Actions»** (там GitHub ждёт другой тип деплоя и показывает «настройте Jekyll / Static HTML» и пустой статус).

**Если у тебя в Pages стоит Source = «GitHub Actions»** — смени:

1. **Settings → Pages → Build and deployment**.
2. Открой список **Source** и выбери **Deploy from a branch** (не GitHub Actions).
3. **Branch**: **`gh-pages`**, папка **`/ (root)`** → **Save**.
4. Подожди 1–2 минуты: сверху появится строка вида *«Your site is live at …»*, и перестанет быть **404** по адресу `https://<user>.github.io/<repo>/`.

Если в списке веток **нет `gh-pages`**, сначала дождись успешного workflow на `main` (шаг *Deploy to gh-pages*), обнови страницу настроек.

Корень приложения для Vite задаётся через `GITHUB_REPOSITORY` при сборке (см. `vite.config.ts`). Ручной запуск workflow: **Actions → Deploy to GitHub Pages → Run workflow**.

### Где открыть сайт и что значит интерфейс GitHub

**Прямая ссылка** (подставь свой логин и имя репозитория):

`https://<логин>.github.io/<репозиторий>/`  
Пример: `https://artemnaronov.github.io/PostamnFork/`

Точный URL также бывает в **Settings → Pages** вверху («Your site is published at…»), после того как источник Pages настроен.

**Вкладка Code** по умолчанию показывает ветку **main** — «последний коммит» это последний коммит **в main**. Ветка **gh-pages** создаётся отдельно workflow’ом: открой выпадающий список веток (сверху слева, `main ▼`) и выбери **gh-pages**, чтобы увидеть коммиты деплоя.

**Actions** в списке слева показывает **все** запуски: старый с ошибкой остаётся в истории — это нормально. Смотри **самый верхний** запуск или фильтр по зелёной галке.

Репозиторий для бесплатного Pages должен быть **public** (или платный GitHub с Pages для private).
