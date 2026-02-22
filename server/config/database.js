const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '../../database.db'), (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('✓ Connected to SQLite database');
  }
});

// Initialize database tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
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
  )`);

  // Tasks table
  db.run(`CREATE TABLE IF NOT EXISTS tasks (
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
  )`);

  // Task submissions table
  db.run(`CREATE TABLE IF NOT EXISTS submissions (
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
  )`);

  // Withdrawals table
  db.run(`CREATE TABLE IF NOT EXISTS withdrawals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    method TEXT NOT NULL,
    details TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  // Work accounts table (farm accounts)
  db.run(`CREATE TABLE IF NOT EXISTS work_accounts (
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
  )`);

  // Create default admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@bidrussia.ru';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const crypto = require('crypto');
  
  db.get('SELECT id FROM users WHERE role = ?', ['admin'], (err, row) => {
    if (!row) {
      const adminReferralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
      bcrypt.hash(adminPassword, 10, (err, hash) => {
        db.run(
          'INSERT INTO users (email, password, name, role, balance, referral_code) VALUES (?, ?, ?, ?, ?, ?)',
          [adminEmail, hash, 'Администратор', 'admin', 0, adminReferralCode],
          (err) => {
            if (!err) console.log('✓ Admin user created');
          }
        );
      });
    }
  });

  // Insert sample tasks (only reviews)
  db.get('SELECT COUNT(*) as count FROM tasks', (err, row) => {
    if (row.count === 0) {
      const sampleTasks = [
        ['Оставить отзыв на Яндекс.Картах', 'Напишите честный отзыв о кафе или магазине', 25, '10–15 минут', 50, 50, 'Перейдите по ссылке, найдите заведение, оставьте отзыв минимум 100 символов, прикрепите скриншот'],
        ['Оставить отзыв на Google Maps', 'Напишите отзыв о заведении в Google Maps', 30, '10–15 минут', 40, 40, 'Найдите заведение в Google Maps, оставьте отзыв с оценкой, прикрепите скриншот'],
        ['Оценить товар на Wildberries', 'Купите товар и оставьте честный отзыв с фото', 120, '30–40 минут', 30, 30, 'Закажите товар, получите, оставьте отзыв с фото, прикрепите скриншот'],
        ['Оставить отзыв на Ozon', 'Напишите отзыв о купленном товаре', 45, '10–15 минут', 40, 40, 'Зайдите в свои заказы, выберите товар, напишите отзыв минимум 150 символов'],
        ['Отзыв на 2ГИС', 'Оставьте отзыв о компании в 2ГИС', 20, '5–10 минут', 60, 60, 'Найдите компанию в 2ГИС, напишите отзыв, прикрепите скриншот']
      ];

      sampleTasks.forEach(task => {
        db.run(
          'INSERT INTO tasks (title, description, reward, time_estimate, total_slots, remaining_slots, instructions, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [...task, 'active']
        );
      });
      console.log('✓ Sample review tasks created');
    }
  });
});

module.exports = db;
