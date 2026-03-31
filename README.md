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

### Публикация через Actions

1. На GitHub: **Settings → Pages → Build and deployment**.
2. В поле **Source** выберите **GitHub Actions** (не «Deploy from a branch»).
3. После пуша в `main` запускается workflow **Deploy to GitHub Pages**; сайт будет по адресу вида  
   `https://<user>.github.io/<имя-репозитория>/`.

Сборка подставляет корень приложения автоматически из переменной `GITHUB_REPOSITORY` (см. `vite.config.ts`).

Ручной запуск: вкладка **Actions → Deploy to GitHub Pages → Run workflow**.
