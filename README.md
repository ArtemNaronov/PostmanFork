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

Workflow кладёт сборку в ветку **`gh-pages`** — без режима «GitHub Actions» в настройках Pages (он как раз и давал 404 у `deploy-pages`).

1. **Settings → Pages → Build and deployment**.
2. **Source**: **Deploy from a branch** (не «GitHub Actions»).
3. **Branch**: **`gh-pages`**, папка **`/ (root)`**. Сохраните.
4. После пуша в **`main`** (или ручного запуска workflow) подождите зелёный job; сайт:  
   `https://<user>.github.io/<имя-репозитория>/`.

Корень приложения для Vite задаётся через `GITHUB_REPOSITORY` при сборке (см. `vite.config.ts`).

Ручной запуск: **Actions → Deploy to GitHub Pages → Run workflow**.

### Где открыть сайт и что значит интерфейс GitHub

**Прямая ссылка** (подставь свой логин и имя репозитория):

`https://<логин>.github.io/<репозиторий>/`  
Пример: `https://artemnaronov.github.io/PostamnFork/`

Точный URL также бывает в **Settings → Pages** вверху («Your site is published at…»), после того как источник Pages настроен.

**Вкладка Code** по умолчанию показывает ветку **main** — «последний коммит» это последний коммит **в main**. Ветка **gh-pages** создаётся отдельно workflow’ом: открой выпадающий список веток (сверху слева, `main ▼`) и выбери **gh-pages**, чтобы увидеть коммиты деплоя.

**Actions** в списке слева показывает **все** запуски: старый с ошибкой остаётся в истории — это нормально. Смотри **самый верхний** запуск или фильтр по зелёной галке.

**Settings → Pages** до первой настройки может показывать «пустой» мастер. Сделай так:

1. **Source** (источник): **Deploy from a branch** — не GitHub Pages «с нуля» из шаблонов.
2. **Branch**: выбери **gh-pages** и папку **/ (root)** → **Save**.  
   Если **gh-pages** нет в списке — workflow ещё не создал ветку: открой последний успешный job и проверь шаг **Deploy to gh-pages**; после успешного пуша ветка появится через минуту (обнови страницу настроек).

Репозиторий для бесплатного Pages должен быть **public** (или платный GitHub с Pages для private).
