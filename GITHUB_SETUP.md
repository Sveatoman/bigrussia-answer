# 📦 Загрузка проекта на GitHub

## Шаг 1: Создание репозитория на GitHub

1. Перейдите на [github.com](https://github.com)
2. Нажмите кнопку "+" в правом верхнем углу
3. Выберите "New repository"
4. Заполните данные:
   - **Repository name:** `bigrussia-answer`
   - **Description:** `Modern Russian microtask marketplace platform with dark futuristic UI`
   - **Visibility:** Public или Private (на ваш выбор)
   - ❌ НЕ добавляйте README, .gitignore или license (они уже есть в проекте)
5. Нажмите "Create repository"

## Шаг 2: Подключение локального репозитория

После создания репозитория GitHub покажет инструкции. Выполните следующие команды:

```bash
# Добавьте удаленный репозиторий (замените YOUR_USERNAME на ваш username)
git remote add origin https://github.com/YOUR_USERNAME/bigrussia-answer.git

# Переименуйте ветку в main (если нужно)
git branch -M main

# Загрузите код на GitHub
git push -u origin main
```

## Шаг 3: Проверка

Обновите страницу репозитория на GitHub - вы должны увидеть все файлы проекта.

## Шаг 4: Настройка репозитория (опционально)

### Добавление описания и тегов

1. Перейдите в настройки репозитория (Settings)
2. В разделе "About" добавьте:
   - **Description:** Modern Russian microtask marketplace platform
   - **Website:** (если есть)
   - **Topics:** `microtask`, `marketplace`, `nodejs`, `express`, `sqlite`, `russia`

### Настройка GitHub Pages (для документации)

1. Settings → Pages
2. Source: Deploy from a branch
3. Branch: main → /docs (если создадите папку docs)

### Защита главной ветки

1. Settings → Branches
2. Add rule
3. Branch name pattern: `main`
4. Включите:
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass before merging

## Шаг 5: Обновление README.md

Не забудьте обновить ссылки в README.md:

```bash
# Откройте README.md и замените
yourusername → YOUR_ACTUAL_USERNAME
```

Затем:

```bash
git add README.md
git commit -m "Update GitHub username in README"
git push
```

## 📝 Дальнейшая работа с Git

### Создание новой ветки для разработки

```bash
git checkout -b develop
```

### Коммит изменений

```bash
git add .
git commit -m "Описание изменений"
git push origin develop
```

### Создание Pull Request

1. Перейдите на GitHub
2. Нажмите "Compare & pull request"
3. Опишите изменения
4. Нажмите "Create pull request"

### Слияние с main

После проверки:
1. Нажмите "Merge pull request"
2. Подтвердите слияние
3. Удалите ветку (опционально)

## 🔄 Синхронизация с удаленным репозиторием

```bash
# Получить последние изменения
git pull origin main

# Отправить изменения
git push origin main
```

## 🏷️ Создание релиза

1. Перейдите в раздел "Releases"
2. Нажмите "Create a new release"
3. Заполните:
   - **Tag version:** v1.2.0
   - **Release title:** BigRussiaAnswer v1.2.0
   - **Description:** Опишите изменения
4. Нажмите "Publish release"

## 🔐 Настройка GitHub Secrets (для CI/CD)

Если планируете автоматический деплой:

1. Settings → Secrets and variables → Actions
2. Нажмите "New repository secret"
3. Добавьте секреты:
   - `SESSION_SECRET`
   - `ADMIN_PASSWORD`
   - `HEROKU_API_KEY` (если используете Heroku)

## 📊 GitHub Actions (опционально)

Создайте `.github/workflows/deploy.yml` для автоматического деплоя:

```yaml
name: Deploy to Heroku

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: akhileshns/heroku-deploy@v3.12.12
        with:
          heroku_api_key: ${{secrets.HEROKU_API_KEY}}
          heroku_app_name: "your-app-name"
          heroku_email: "your-email@example.com"
```

## ✅ Готово!

Ваш проект теперь на GitHub и готов к развертыванию! 🎉

Следующие шаги:
1. [Развертывание на Heroku](DEPLOYMENT.md#heroku)
2. [Развертывание на VPS](DEPLOYMENT.md#vps)
3. [Настройка домена](DEPLOYMENT.md#ssl)
