#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const dbPath = path.join(__dirname, 'database.db');

console.log('🔄 Сброс базы данных YanFarm...\n');

// Delete existing database
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('✓ Старая база данных удалена');
}

// Create new database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Ошибка создания базы данных:', err);
    process.exit(1);
  }
  console.log('✓ Новая база данных создана\n');
});

// Initialize tables
db.serialize(() => {
  console.log('Создание таблиц...\n');

  // Users table with referral fields
  db.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    balance REAL DEFAULT 0,
    level TEXT DEFAULT 'Стандарт',
    tasks_completed INTEGER DEFAULT 0,
    total_earned REAL DEFAULT 0,
    referral_code TEXT UNIQUE,
    referred_by INTEGER,
    referral_earnings REAL DEFAULT 0,
    referrals_count INTEGER DEFAULT 0,
    last_ip TEXT,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) console.error('Ошибка создания таблицы users:', err);
    else console.log('✓ Таблица users создана');
  });

  // Tasks table with referral_reward
  db.run(`CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    reward REAL NOT NULL,
    referral_reward REAL DEFAULT 0,
    time_estimate TEXT NOT NULL,
    total_slots INTEGER NOT NULL,
    remaining_slots INTEGER NOT NULL,
    instructions TEXT,
    status TEXT DEFAULT 'active',
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )`, (err) => {
    if (err) console.error('Ошибка создания таблицы tasks:', err);
    else console.log('✓ Таблица tasks создана');
  });

  // Submissions table
  db.run(`CREATE TABLE submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    work_account_id INTEGER,
    proof_text TEXT,
    proof_image TEXT,
    status TEXT DEFAULT 'pending',
    admin_comment TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (work_account_id) REFERENCES work_accounts(id)
  )`, (err) => {
    if (err) console.error('Ошибка создания таблицы submissions:', err);
    else console.log('✓ Таблица submissions создана');
  });

  // Withdrawals table
  db.run(`CREATE TABLE withdrawals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    method TEXT NOT NULL,
    details TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`, (err) => {
    if (err) console.error('Ошибка создания таблицы withdrawals:', err);
    else console.log('✓ Таблица withdrawals создана');
  });

  // Work accounts table
  db.run(`CREATE TABLE work_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    platform TEXT NOT NULL,
    account_name TEXT NOT NULL,
    account_link TEXT NOT NULL,
    screenshot TEXT,
    proof_text TEXT,
    status TEXT DEFAULT 'pending',
    admin_comment TEXT,
    last_used_at DATETIME,
    cooldown_until DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`, (err) => {
    if (err) console.error('Ошибка создания таблицы work_accounts:', err);
    else console.log('✓ Таблица work_accounts создана');
  });

  // Create admin user
  setTimeout(() => {
    console.log('\nСоздание администратора...');
    
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@bigrussia.ru';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminReferralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    
    bcrypt.hash(adminPassword, 10, (err, hash) => {
      if (err) {
        console.error('Ошибка хеширования пароля:', err);
        db.close();
        return;
      }
      
      db.run(
        'INSERT INTO users (email, password, name, role, balance, referral_code) VALUES (?, ?, ?, ?, ?, ?)',
        [adminEmail, hash, 'Администратор', 'admin', 0, adminReferralCode],
        (err) => {
          if (err) {
            console.error('Ошибка создания админа:', err);
          } else {
            console.log('✓ Администратор создан');
            console.log(`  Email: ${adminEmail}`);
            console.log(`  Пароль: ${adminPassword}`);
            console.log(`  Реферальный код: ${adminReferralCode}`);
          }
          
          // Create sample tasks
          console.log('\nСоздание тестовых заданий...');
          
          const sampleTasks = [
            ['Оставить отзыв на Яндекс.Картах', 'Напишите честный отзыв о кафе или магазине', 25, 2.5, '10–15 минут', 50, 50, 'Перейдите по ссылке, найдите заведение, оставьте отзыв минимум 100 символов, прикрепите скриншот'],
            ['Оставить отзыв на Google Maps', 'Напишите отзыв о заведении в Google Maps', 30, 3, '10–15 минут', 40, 40, 'Найдите заведение в Google Maps, оставьте отзыв с оценкой, прикрепите скриншот'],
            ['Оценить товар на Wildberries', 'Купите товар и оставьте честный отзыв с фото', 120, 12, '30–40 минут', 30, 30, 'Закажите товар, получите, оставьте отзыв с фото, прикрепите скриншот'],
            ['Оставить отзыв на Ozon', 'Напишите отзыв о купленном товаре', 45, 4.5, '10–15 минут', 40, 40, 'Зайдите в свои заказы, выберите товар, напишите отзыв минимум 150 символов'],
            ['Отзыв на 2ГИС', 'Оставьте отзыв о компании в 2ГИС', 20, 2, '5–10 минут', 60, 60, 'Найдите компанию в 2ГИС, напишите отзыв, прикрепите скриншот']
          ];

          let completed = 0;
          sampleTasks.forEach(task => {
            db.run(
              'INSERT INTO tasks (title, description, reward, referral_reward, time_estimate, total_slots, remaining_slots, instructions, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [...task, 'active'],
              (err) => {
                if (err) {
                  console.error('Ошибка создания задания:', err);
                } else {
                  completed++;
                  if (completed === sampleTasks.length) {
                    console.log(`✓ Создано ${completed} тестовых заданий`);
                    console.log('\n✅ Сброс базы данных завершён!\n');
                    console.log('📝 Теперь перезапустите сервер:\n');
                    console.log('   Локально: npm start');
                    console.log('   На VPS: pm2 restart yanfarm\n');
                    db.close();
                  }
                }
              }
            );
          });
        }
      );
    });
  }, 1000);
});
