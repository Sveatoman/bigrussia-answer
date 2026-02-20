# 🚀 Руководство по развертыванию BigRussiaAnswer

Это руководство поможет вам развернуть BigRussiaAnswer на различных платформах.

## 📋 Содержание

1. [Подготовка к развертыванию](#подготовка)
2. [Heroku](#heroku)
3. [VPS (Ubuntu/Debian)](#vps)
4. [Docker](#docker)
5. [Vercel](#vercel)
6. [Railway](#railway)
7. [Настройка домена и SSL](#ssl)
8. [Мониторинг и логи](#мониторинг)

---

## 🔧 Подготовка

### Перед развертыванием убедитесь:

1. ✅ Все зависимости установлены
2. ✅ `.env` файл настроен
3. ✅ Проект протестирован локально
4. ✅ База данных работает корректно
5. ✅ Изменен пароль администратора

### Чек-лист безопасности:

- [ ] Изменен `SESSION_SECRET` на случайную строку
- [ ] Изменен пароль администратора
- [ ] Настроены переменные окружения
- [ ] Проверены права доступа к файлам
- [ ] Настроен HTTPS

---

## 🟣 Heroku

### Шаг 1: Установка Heroku CLI

```bash
# macOS
brew tap heroku/brew && brew install heroku

# Ubuntu/Debian
curl https://cli-assets.heroku.com/install.sh | sh

# Windows
# Скачайте установщик с https://devcenter.heroku.com/articles/heroku-cli
```

### Шаг 2: Вход в Heroku

```bash
heroku login
```

### Шаг 3: Создание приложения

```bash
# Создайте новое приложение
heroku create bigrussia-answer

# Или используйте существующее
heroku git:remote -a bigrussia-answer
```

### Шаг 4: Настройка переменных окружения

```bash
heroku config:set SESSION_SECRET=$(openssl rand -base64 32)
heroku config:set ADMIN_EMAIL=admin@bigrussia.ru
heroku config:set ADMIN_PASSWORD=your-secure-password-here
heroku config:set INSTRUCTIONS_URL=https://your-instructions.com
heroku config:set ACCOUNT_INSTRUCTIONS_URL=https://your-account-instructions.com
```

### Шаг 5: Создание Procfile

Создайте файл `Procfile` в корне проекта:

```
web: node server/server.js
```

### Шаг 6: Деплой

```bash
git add .
git commit -m "Prepare for Heroku deployment"
git push heroku main
```

### Шаг 7: Открытие приложения

```bash
heroku open
```

### Логи Heroku

```bash
# Просмотр логов
heroku logs --tail

# Перезапуск
heroku restart
```

---

## 🖥️ VPS (Ubuntu/Debian)

### Шаг 1: Подключение к серверу

```bash
ssh root@your-server-ip
```

### Шаг 2: Обновление системы

```bash
apt update && apt upgrade -y
```

### Шаг 3: Установка Node.js

```bash
# Установка Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Проверка установки
node --version
npm --version
```

### Шаг 4: Установка Git

```bash
apt-get install -y git
```

### Шаг 5: Клонирование проекта

```bash
cd /var/www
git clone https://github.com/yourusername/bigrussia-answer.git
cd bigrussia-answer
```

### Шаг 6: Установка зависимостей

```bash
npm install --production
```

### Шаг 7: Настройка .env

```bash
cp .env.example .env
nano .env
```

Заполните все переменные:

```env
PORT=3000
SESSION_SECRET=your-very-long-random-secret-key
ADMIN_EMAIL=admin@bigrussia.ru
ADMIN_PASSWORD=your-secure-password
INSTRUCTIONS_URL=https://your-url.com
ACCOUNT_INSTRUCTIONS_URL=https://your-url.com
```

### Шаг 8: Установка PM2

```bash
npm install -g pm2
```

### Шаг 9: Запуск приложения

```bash
pm2 start server/server.js --name bigrussia
pm2 save
pm2 startup
```

Скопируйте и выполните команду, которую выдаст `pm2 startup`.

### Шаг 10: Настройка Nginx

```bash
apt-get install -y nginx
```

Создайте конфигурацию:

```bash
nano /etc/nginx/sites-available/bigrussia
```

Вставьте:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Увеличение лимита для загрузки файлов
    client_max_body_size 10M;
}
```

Активируйте конфигурацию:

```bash
ln -s /etc/nginx/sites-available/bigrussia /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Шаг 11: Настройка SSL (Let's Encrypt)

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Управление PM2

```bash
# Просмотр статуса
pm2 status

# Просмотр логов
pm2 logs bigrussia

# Перезапуск
pm2 restart bigrussia

# Остановка
pm2 stop bigrussia

# Удаление
pm2 delete bigrussia
```

---

## 🐳 Docker

### Создание Dockerfile

Создайте `Dockerfile` в корне проекта:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "server/server.js"]
```

### Создание docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - SESSION_SECRET=${SESSION_SECRET}
      - ADMIN_EMAIL=${ADMIN_EMAIL}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - INSTRUCTIONS_URL=${INSTRUCTIONS_URL}
      - ACCOUNT_INSTRUCTIONS_URL=${ACCOUNT_INSTRUCTIONS_URL}
    volumes:
      - ./uploads:/app/uploads
      - ./database.db:/app/database.db
    restart: unless-stopped
```

### Создание .dockerignore

```
node_modules
.env
*.db
.git
.gitignore
README.md
```

### Запуск

```bash
# Сборка
docker-compose build

# Запуск
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down
```

---

## ▲ Vercel

⚠️ **Примечание:** Vercel лучше подходит для статических сайтов. Для полноценного Node.js приложения рекомендуется использовать Heroku или VPS.

### Шаг 1: Установка Vercel CLI

```bash
npm install -g vercel
```

### Шаг 2: Создание vercel.json

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server/server.js"
    }
  ],
  "env": {
    "SESSION_SECRET": "@session-secret",
    "ADMIN_EMAIL": "@admin-email",
    "ADMIN_PASSWORD": "@admin-password"
  }
}
```

### Шаг 3: Деплой

```bash
vercel
```

---

## 🚂 Railway

### Шаг 1: Создание аккаунта

Зарегистрируйтесь на [railway.app](https://railway.app)

### Шаг 2: Создание проекта

1. Нажмите "New Project"
2. Выберите "Deploy from GitHub repo"
3. Выберите ваш репозиторий

### Шаг 3: Настройка переменных

В разделе "Variables" добавьте:

```
SESSION_SECRET=your-secret-key
ADMIN_EMAIL=admin@bigrussia.ru
ADMIN_PASSWORD=your-password
INSTRUCTIONS_URL=https://your-url.com
ACCOUNT_INSTRUCTIONS_URL=https://your-url.com
```

### Шаг 4: Деплой

Railway автоматически задеплоит ваше приложение.

---

## 🌐 Настройка домена и SSL

### Cloudflare (рекомендуется)

1. Добавьте ваш домен в Cloudflare
2. Измените NS записи у регистратора
3. Добавьте A-запись:
   - Type: A
   - Name: @
   - Content: your-server-ip
   - Proxy status: Proxied (оранжевое облако)

4. SSL/TLS настройки:
   - Encryption mode: Full (strict)
   - Always Use HTTPS: On
   - Automatic HTTPS Rewrites: On

### Let's Encrypt (для VPS)

```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Автообновление:

```bash
certbot renew --dry-run
```

---

## 📊 Мониторинг и логи

### PM2 Monitoring

```bash
# Установка PM2 Plus
pm2 install pm2-logrotate

# Настройка ротации логов
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Логи Nginx

```bash
# Access logs
tail -f /var/log/nginx/access.log

# Error logs
tail -f /var/log/nginx/error.log
```

### Мониторинг ресурсов

```bash
# Использование CPU и памяти
pm2 monit

# Системные ресурсы
htop
```

---

## 🔄 Обновление приложения

### На VPS с PM2

```bash
cd /var/www/bigrussia-answer
git pull origin main
npm install --production
pm2 restart bigrussia
```

### На Heroku

```bash
git push heroku main
```

### С Docker

```bash
docker-compose down
git pull origin main
docker-compose build
docker-compose up -d
```

---

## 🆘 Troubleshooting

### Проблема: Приложение не запускается

```bash
# Проверьте логи
pm2 logs bigrussia

# Проверьте порт
netstat -tulpn | grep 3000

# Проверьте переменные окружения
pm2 env 0
```

### Проблема: База данных не создается

```bash
# Проверьте права доступа
chmod 755 /var/www/bigrussia-answer
chmod 644 /var/www/bigrussia-answer/database.db

# Пересоздайте базу
npm run reset-db
```

### Проблема: Файлы не загружаются

```bash
# Проверьте папку uploads
mkdir -p uploads
chmod 755 uploads

# Проверьте лимит Nginx
nano /etc/nginx/sites-available/bigrussia
# Добавьте: client_max_body_size 10M;
```

---

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте [FIXES.md](FIXES.md)
2. Посмотрите логи приложения
3. Создайте issue на GitHub

---

**Успешного развертывания! 🚀**
