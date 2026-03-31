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
