# BigRussiaAnswer

Современная платформа для выполнения микрозаданий в России. Темный футуристический интерфейс с glassmorphism эффектами.

![BigRussiaAnswer](https://img.shields.io/badge/version-1.2.0-blue)
![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

## 🚀 Возможности

### Для пользователей:
- ✅ Бесплатная регистрация без модерации
- 💼 Система рабочих аккаунтов (farm accounts) с модерацией
- ⏱️ Автоматический кулдаун аккаунтов (36-48 часов)
- 🔐 Автоматический вход по IP-адресу
- 📸 Загрузка до 5 скриншотов к отчету (drag & drop)
- 💰 Вывод средств через Lolz и криптовалюту
- 🔔 Красивые анимированные уведомления

### Для администраторов:
- 📊 Полная статистика платформы
- ✅ Модерация рабочих аккаунтов
- 📝 Управление заданиями (создание, редактирование, удаление)
- 👥 Управление пользователями
- 💸 Модерация выплат
- 🖼️ Просмотр множественных скриншотов в галерее

## 📋 Требования

- Node.js >= 14.0.0
- npm >= 6.0.0

## 🛠️ Установка

### Локальная установка

1. Клонируйте репозиторий:
```bash
git clone https://github.com/yourusername/bigrussia-answer.git
cd bigrussia-answer
```

2. Установите зависимости:
```bash
npm install
```

3. Создайте файл `.env` на основе `.env.example`:
```bash
cp .env.example .env
```

4. Отредактируйте `.env` файл:
```env
PORT=3000
SESSION_SECRET=your-secret-key-here
ADMIN_EMAIL=admin@bigrussia.ru
ADMIN_PASSWORD=admin123
INSTRUCTIONS_URL=https://your-instructions-url.com
ACCOUNT_INSTRUCTIONS_URL=https://your-account-instructions-url.com
```

5. Запустите сервер:
```bash
npm start
```

Сервер будет доступен по адресу: http://localhost:3000

### Первый запуск

При первом запуске автоматически:
- Создается база данных SQLite
- Создается администратор с данными из `.env`
- Добавляются примеры заданий

**Данные администратора по умолчанию:**
- Email: admin@bigrussia.ru
- Пароль: admin123

⚠️ **Обязательно измените пароль администратора после первого входа!**

## 📦 Скрипты

```bash
npm start          # Запуск сервера
npm run dev        # Запуск с автоперезагрузкой (nodemon)
npm run reset-db   # Сброс базы данных
```

## 🌐 Развертывание

### Heroku

1. Создайте приложение:
```bash
heroku create your-app-name
```

2. Установите переменные окружения:
```bash
heroku config:set SESSION_SECRET=your-secret-key
heroku config:set ADMIN_EMAIL=admin@bigrussia.ru
heroku config:set ADMIN_PASSWORD=your-secure-password
heroku config:set INSTRUCTIONS_URL=https://your-url.com
heroku config:set ACCOUNT_INSTRUCTIONS_URL=https://your-url.com
```

3. Деплой:
```bash
git push heroku main
```

### VPS (Ubuntu/Debian)

1. Установите Node.js и PM2:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

2. Клонируйте и настройте проект:
```bash
git clone https://github.com/yourusername/bigrussia-answer.git
cd bigrussia-answer
npm install
cp .env.example .env
nano .env  # Отредактируйте переменные
```

3. Запустите с PM2:
```bash
pm2 start server/server.js --name bigrussia
pm2 save
pm2 startup
```

4. Настройте Nginx (опционально):
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Подробнее см. [DEPLOYMENT.md](DEPLOYMENT.md)

## 📁 Структура проекта

```
bigrussia-answer/
├── server/
│   ├── config/
│   │   └── database.js       # Конфигурация БД
│   ├── middleware/
│   │   └── auth.js           # Middleware авторизации
│   └── server.js             # Главный файл сервера
├── views/
│   ├── admin/
│   │   └── dashboard.ejs     # Админ-панель
│   ├── dashboard.ejs         # Личный кабинет
│   ├── index.ejs             # Главная страница
│   ├── login.ejs             # Страница входа
│   └── register.ejs          # Страница регистрации
├── public/
│   ├── css/                  # Стили
│   └── js/                   # JavaScript
├── uploads/                  # Загруженные файлы
├── .env                      # Переменные окружения (не в git)
├── .env.example              # Пример переменных
├── package.json              # Зависимости
└── database.db               # База данных SQLite (не в git)
```

## 🎨 Технологии

- **Backend:** Node.js, Express.js
- **Database:** SQLite3
- **Template Engine:** EJS
- **Authentication:** express-session, bcryptjs
- **File Upload:** Multer
- **Styling:** Custom CSS с glassmorphism

## 🔧 Конфигурация

### Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `PORT` | Порт сервера | 3000 |
| `SESSION_SECRET` | Секретный ключ сессий | - |
| `ADMIN_EMAIL` | Email администратора | admin@bigrussia.ru |
| `ADMIN_PASSWORD` | Пароль администратора | admin123 |
| `INSTRUCTIONS_URL` | Ссылка на инструкции | - |
| `ACCOUNT_INSTRUCTIONS_URL` | Ссылка на инструкции по аккаунтам | - |

## 📖 Документация

- [Быстрый старт](QUICK_START.md)
- [Руководство по развертыванию](DEPLOYMENT.md)
- [Система кулдаунов](COOLDOWN_SYSTEM.md)
- [Рабочие аккаунты](FARM_ACCOUNTS_GUIDE.md)
- [Автоматический вход](AUTO_LOGIN_GUIDE.md)
- [Сброс базы данных](DATABASE_RESET.md)
- [История изменений](CHANGELOG.md)

## 🐛 Известные проблемы и решения

См. [FIXES.md](FIXES.md)

## 📝 Changelog

См. [CHANGELOG.md](CHANGELOG.md)

## 🤝 Вклад в проект

1. Fork проекта
2. Создайте ветку для новой функции (`git checkout -b feature/AmazingFeature`)
3. Commit изменения (`git commit -m 'Add some AmazingFeature'`)
4. Push в ветку (`git push origin feature/AmazingFeature`)
5. Откройте Pull Request

## 📄 Лицензия

MIT License - см. файл [LICENSE](LICENSE)

## 👨‍💻 Автор

BigRussiaAnswer Team

## 🔗 Ссылки

- [Документация](https://github.com/yourusername/bigrussia-answer/wiki)
- [Сообщить об ошибке](https://github.com/yourusername/bigrussia-answer/issues)
- [Запросить функцию](https://github.com/yourusername/bigrussia-answer/issues)

## ⚠️ Безопасность

- Всегда меняйте `SESSION_SECRET` в продакшене
- Используйте сильные пароли для администратора
- Регулярно обновляйте зависимости: `npm audit fix`
- Используйте HTTPS в продакшене
- Настройте firewall на VPS

## 📞 Поддержка

Если у вас возникли вопросы или проблемы:
1. Проверьте [документацию](https://github.com/yourusername/bigrussia-answer/wiki)
2. Посмотрите [известные проблемы](FIXES.md)
3. Создайте [issue](https://github.com/yourusername/bigrussia-answer/issues)

---

Made with ❤️ for Russian microtask marketplace
