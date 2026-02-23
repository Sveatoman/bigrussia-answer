require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const db = require('./config/database');
const { requireAuth, requireAdmin, getClientIp } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'bidrussia-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Routes
app.get('/', (req, res) => {
  // Check for auto-login by IP
  if (!req.session.userId) {
    const clientIp = getClientIp(req);
    
    db.get('SELECT * FROM users WHERE last_ip = ? AND role = "user"', [clientIp], (err, user) => {
      if (user) {
        // Auto-login
        req.session.userId = user.id;
        req.session.email = user.email;
        req.session.name = user.name;
        req.session.role = user.role;
        
        // Update last login
        db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
      }
      
      res.render('index', { 
        user: req.session.userId ? req.session : null,
        process: { 
          env: { 
            INSTRUCTIONS_URL: process.env.INSTRUCTIONS_URL,
            SUPPORT_TELEGRAM: process.env.SUPPORT_TELEGRAM
          } 
        }
      });
    });
  } else {
    res.render('index', { 
      user: req.session.userId ? req.session : null,
      process: { 
        env: { 
          INSTRUCTIONS_URL: process.env.INSTRUCTIONS_URL,
          SUPPORT_TELEGRAM: process.env.SUPPORT_TELEGRAM
        } 
      }
    });
  }
});

app.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  
  // Check for auto-login by IP
  const clientIp = getClientIp(req);
  
  db.get('SELECT * FROM users WHERE last_ip = ?', [clientIp], (err, user) => {
    if (user) {
      // Auto-login
      req.session.userId = user.id;
      req.session.email = user.email;
      req.session.name = user.name;
      req.session.role = user.role;
      
      // Update last login
      db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
      
      if (user.role === 'admin') {
        return res.redirect('/admin');
      } else {
        return res.redirect('/dashboard');
      }
    }
    
    res.render('login');
  });
});

app.get('/register', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  res.render('register', {
    process: { env: { INSTRUCTIONS_URL: process.env.INSTRUCTIONS_URL } }
  });
});

app.post('/register', async (req, res) => {
  const { email, password, name, ref } = req.body;
  const clientIp = getClientIp(req);
  const crypto = require('crypto');
  const referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
  
  try {
    const hash = await bcrypt.hash(password, 10);
    
    // Check if referral code exists
    let referrerId = null;
    if (ref) {
      const referrer = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM users WHERE referral_code = ?', [ref], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      if (referrer) referrerId = referrer.id;
    }
    
    db.run(
      'INSERT INTO users (email, password, name, last_ip, last_login, referral_code, referred_by) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)',
      [email, hash, name, clientIp, referralCode, referrerId],
      function(err) {
        if (err) {
          return res.status(400).json({ error: 'Email уже используется' });
        }
        
        // Update referrer's count
        if (referrerId) {
          db.run('UPDATE users SET referrals_count = referrals_count + 1 WHERE id = ?', [referrerId]);
        }
        
        req.session.userId = this.lastID;
        req.session.email = email;
        req.session.name = name;
        req.session.role = 'user';
        res.json({ success: true });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Ошибка регистрации' });
  }
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const clientIp = getClientIp(req);
  
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: 'Неверный email или пароль' });
    }
    
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ error: 'Неверный email или пароль' });
    }
    
    // Update IP and last login
    db.run(
      'UPDATE users SET last_ip = ?, last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [clientIp, user.id]
    );
    
    req.session.userId = user.id;
    req.session.email = user.email;
    req.session.name = user.name;
    req.session.role = user.role;
    res.json({ success: true, role: user.role });
  });
});

app.get('/logout', (req, res) => {
  const userId = req.session.userId;
  
  // Очищаем IP при выходе, чтобы отключить автовход
  if (userId) {
    db.run('UPDATE users SET last_ip = NULL WHERE id = ?', [userId], (err) => {
      if (err) console.error('Error clearing IP:', err);
    });
  }
  
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/');
  });
});

app.get('/dashboard', requireAuth, (req, res) => {
  db.get('SELECT * FROM users WHERE id = ?', [req.session.userId], (err, user) => {
    if (err || !user) return res.redirect('/login');
    
    // Get today's earnings
    const today = new Date().toISOString().split('T')[0];
    db.get(
      `SELECT SUM(t.reward) as today_earned FROM submissions s 
       JOIN tasks t ON s.task_id = t.id 
       WHERE s.user_id = ? AND s.status = 'approved' AND DATE(s.reviewed_at) = ?`,
      [req.session.userId, today],
      (err, todayData) => {
        res.render('dashboard', { 
          user: { ...user, today_earned: todayData?.today_earned || 0 },
          session: req.session,
          process: { 
            env: { 
              ACCOUNT_INSTRUCTIONS_URL: process.env.ACCOUNT_INSTRUCTIONS_URL,
              SUPPORT_TELEGRAM: process.env.SUPPORT_TELEGRAM
            } 
          }
        });
      }
    );
  });
});

app.get('/api/tasks', (req, res) => {
  let query = 'SELECT * FROM tasks WHERE status = "active" AND remaining_slots > 0';
  
  query += ' ORDER BY created_at DESC';
  
  db.all(query, [], (err, tasks) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(tasks);
  });
});

app.post('/api/tasks/:id/take', requireAuth, (req, res) => {
  const taskId = req.params.id;
  const { work_account_id } = req.body;
  
  if (!work_account_id) {
    return res.status(400).json({ error: 'Выберите рабочий аккаунт' });
  }
  
  // Check if work account exists, belongs to user, is approved, and not in cooldown
  db.get(
    `SELECT * FROM work_accounts 
     WHERE id = ? AND user_id = ? AND status = 'approved'`,
    [work_account_id, req.session.userId],
    (err, account) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!account) {
        return res.status(400).json({ error: 'Аккаунт не найден или не одобрен' });
      }
      
      // Check cooldown
      if (account.cooldown_until) {
        const cooldownEnd = new Date(account.cooldown_until);
        const now = new Date();
        
        if (cooldownEnd > now) {
          const hoursLeft = Math.ceil((cooldownEnd - now) / (1000 * 60 * 60));
          return res.status(400).json({ 
            error: `Аккаунт "${account.account_name}" в кулдауне. Осталось: ${hoursLeft} ч.` 
          });
        }
      }
      
      // Check if user already has taken/pending/approved submission for this task
      db.get(
        'SELECT * FROM submissions WHERE task_id = ? AND user_id = ? AND status IN ("taken", "pending", "approved")',
        [taskId, req.session.userId],
        (err, existing) => {
          if (existing) {
            return res.status(400).json({ error: 'Вы уже взяли это задание' });
          }
          
          // Create submission with work account and status 'taken'
          db.run(
            'INSERT INTO submissions (task_id, user_id, work_account_id, status) VALUES (?, ?, ?, ?)',
            [taskId, req.session.userId, work_account_id, 'taken'],
            function(err) {
              if (err) return res.status(500).json({ error: err.message });
              
              // Update task slots
              db.run('UPDATE tasks SET remaining_slots = remaining_slots - 1 WHERE id = ?', [taskId]);
              
              // Set cooldown: random between 36-48 hours
              const cooldownHours = 36 + Math.random() * 12; // 36-48 hours
              const cooldownMs = cooldownHours * 60 * 60 * 1000;
              const cooldownUntil = new Date(Date.now() + cooldownMs);
              
              db.run(
                'UPDATE work_accounts SET last_used_at = CURRENT_TIMESTAMP, cooldown_until = ? WHERE id = ?',
                [cooldownUntil.toISOString(), work_account_id],
                (err) => {
                  if (err) console.error('Error setting cooldown:', err);
                }
              );
              
              res.json({ 
                success: true, 
                submissionId: this.lastID,
                cooldownHours: Math.round(cooldownHours)
              });
            }
          );
        }
      );
    }
  );
});

app.get('/api/my-tasks', requireAuth, (req, res) => {
  db.all(
    `SELECT s.*, t.title, t.description, t.reward, t.category, t.instructions 
     FROM submissions s 
     JOIN tasks t ON s.task_id = t.id 
     WHERE s.user_id = ? 
     ORDER BY s.submitted_at DESC`,
    [req.session.userId],
    (err, tasks) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(tasks);
    }
  );
});

app.post('/api/submissions/:id/submit', requireAuth, upload.array('proof_images', 5), (req, res) => {
  const submissionId = req.params.id;
  const { proof_text } = req.body;
  const proof_images = req.files ? JSON.stringify(req.files.map(f => f.filename)) : '[]';
  
  db.run(
    `UPDATE submissions 
     SET proof_text = ?, proof_image = ?, status = "pending", submitted_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ? AND status IN ("taken", "rejected")`,
    [proof_text, proof_images, submissionId, req.session.userId],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });

      if (this.changes === 0) {
        return res.status(400).json({ error: 'Отчет можно отправить только для взятых или отклоненных заданий' });
      }

      res.json({ success: true });
    }
  );
});

// Admin routes
app.get('/admin', requireAdmin, (req, res) => {
  res.render('admin/dashboard', { session: req.session });
});

app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const stats = {};
  
  db.get('SELECT COUNT(*) as count FROM users WHERE role = "user"', (err, row) => {
    if (err) {
      console.error('Error getting users count:', err);
      stats.activeUsers = 0;
    } else {
      stats.activeUsers = row ? row.count : 0;
    }
    
    db.get('SELECT COUNT(*) as count FROM tasks WHERE status = "active"', (err, row) => {
      if (err) {
        console.error('Error getting tasks count:', err);
        stats.activeTasks = 0;
      } else {
        stats.activeTasks = row ? row.count : 0;
      }
      
      const today = new Date().toISOString().split('T')[0];
      db.get(
        'SELECT SUM(t.reward) as total FROM submissions s JOIN tasks t ON s.task_id = t.id WHERE s.status = "approved" AND DATE(s.reviewed_at) = ?',
        [today],
        (err, row) => {
          if (err) {
            console.error('Error getting payouts:', err);
            stats.todayPayouts = 0;
          } else {
            stats.todayPayouts = row && row.total ? row.total : 0;
          }
          
          db.get('SELECT COUNT(*) as count FROM submissions WHERE status = "pending"', (err, row) => {
            if (err) {
              console.error('Error getting pending submissions:', err);
              stats.pendingSubmissions = 0;
            } else {
              stats.pendingSubmissions = row ? row.count : 0;
            }
            res.json(stats);
          });
        }
      );
    });
  });
});

app.get('/api/admin/submissions', requireAdmin, (req, res) => {
  db.all(
    `SELECT s.*, t.title as task_title, t.reward, u.name as user_name, u.email as user_email
     FROM submissions s
     JOIN tasks t ON s.task_id = t.id
     JOIN users u ON s.user_id = u.id
     WHERE s.status = 'pending'
     ORDER BY s.submitted_at DESC`,
    (err, submissions) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(submissions);
    }
  );
});

app.post('/api/admin/submissions/:id/approve', requireAdmin, (req, res) => {
  const submissionId = req.params.id;
  
  console.log('Approving submission:', submissionId);
  
  db.get('SELECT s.*, t.reward, t.referral_reward FROM submissions s JOIN tasks t ON s.task_id = t.id WHERE s.id = ?', [submissionId], (err, submission) => {
    if (err) {
      console.error('Error fetching submission:', err);
      return res.status(500).json({ error: err.message });
    }
    if (!submission) {
      console.error('Submission not found:', submissionId);
      return res.status(404).json({ error: 'Не найдено' });
    }
    
    console.log('Found submission:', submission);
    
    db.run(
      'UPDATE submissions SET status = "approved", reviewed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [submissionId],
      (err) => {
        if (err) {
          console.error('Error updating submission:', err);
          return res.status(500).json({ error: err.message });
        }
        
        console.log('Updating user balance for user:', submission.user_id);
        
        db.run(
          'UPDATE users SET balance = balance + ?, tasks_completed = tasks_completed + 1, total_earned = total_earned + ? WHERE id = ?',
          [submission.reward, submission.reward, submission.user_id],
          (err) => {
            if (err) {
              console.error('Error updating user balance:', err);
              return res.status(500).json({ error: err.message });
            }
            console.log('Submission approved successfully');
            
            // Check if user has a referrer and pay referral bonus
            db.get('SELECT referred_by FROM users WHERE id = ?', [submission.user_id], (err, user) => {
              if (err) {
                console.error('Error checking referrer:', err);
                return res.json({ success: true });
              }
              
              if (user && user.referred_by && submission.referral_reward > 0) {
                console.log('Paying referral bonus to user:', user.referred_by, 'amount:', submission.referral_reward);
                
                db.run(
                  'UPDATE users SET balance = balance + ?, referral_earnings = referral_earnings + ? WHERE id = ?',
                  [submission.referral_reward, submission.referral_reward, user.referred_by],
                  (err) => {
                    if (err) {
                      console.error('Error paying referral bonus:', err);
                    } else {
                      console.log('Referral bonus paid successfully');
                    }
                    res.json({ success: true });
                  }
                );
              } else {
                res.json({ success: true });
              }
            });
          }
        );
      }
    );
  });
});

app.post('/api/admin/submissions/:id/reject', requireAdmin, (req, res) => {
  const submissionId = req.params.id;
  const { comment } = req.body;
  
  console.log('Rejecting submission:', submissionId, 'with comment:', comment);
  
  db.run(
    'UPDATE submissions SET status = "rejected", admin_comment = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?',
    [comment, submissionId],
    (err) => {
      if (err) {
        console.error('Error rejecting submission:', err);
        return res.status(500).json({ error: err.message });
      }
      
      console.log('Returning slot back to task');
      
      // Return slot back to task
      db.run(
        'UPDATE tasks SET remaining_slots = remaining_slots + 1 WHERE id = (SELECT task_id FROM submissions WHERE id = ?)',
        [submissionId],
        (err) => {
          if (err) {
            console.error('Error returning slot:', err);
          }
        }
      );
      
      console.log('Submission rejected successfully');
      res.json({ success: true });
    }
  );
});

app.post('/api/admin/tasks', requireAdmin, (req, res) => {
  const { title, description, reward, time_estimate, total_slots, instructions, referral_reward } = req.body;
  
  db.run(
    'INSERT INTO tasks (title, description, reward, time_estimate, total_slots, remaining_slots, instructions, referral_reward, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [title, description, reward, time_estimate, total_slots, total_slots, instructions, referral_reward || 0, req.session.userId],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, taskId: this.lastID });
    }
  );
});

app.get('/api/admin/tasks', requireAdmin, (req, res) => {
  db.all('SELECT * FROM tasks ORDER BY created_at DESC', (err, tasks) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(tasks);
  });
});

app.put('/api/admin/tasks/:id', requireAdmin, (req, res) => {
  const taskId = req.params.id;
  const { title, description, reward, time_estimate, total_slots, instructions, status, referral_reward } = req.body;
  
  console.log('Updating task:', taskId, req.body);
  
  db.run(
    'UPDATE tasks SET title = ?, description = ?, reward = ?, time_estimate = ?, total_slots = ?, instructions = ?, status = ?, referral_reward = ? WHERE id = ?',
    [title, description, reward, time_estimate, total_slots, instructions, status, referral_reward || 0, taskId],
    function(err) {
      if (err) {
        console.error('Error updating task:', err);
        return res.status(500).json({ error: err.message });
      }
      console.log('Task updated successfully');
      res.json({ success: true });
    }
  );
});

app.delete('/api/admin/tasks/:id', requireAdmin, (req, res) => {
  const taskId = req.params.id;
  
  console.log('Deleting task:', taskId);
  
  // Check if task has submissions
  db.get('SELECT COUNT(*) as count FROM submissions WHERE task_id = ?', [taskId], (err, row) => {
    if (err) {
      console.error('Error checking submissions:', err);
      return res.status(500).json({ error: err.message });
    }
    
    console.log('Task has', row.count, 'submissions');
    
    if (row.count > 0) {
      return res.status(400).json({ error: 'Нельзя удалить задание с выполнениями. Деактивируйте его.' });
    }
    
    db.run('DELETE FROM tasks WHERE id = ?', [taskId], function(err) {
      if (err) {
        console.error('Error deleting task:', err);
        return res.status(500).json({ error: err.message });
      }
      console.log('Task deleted successfully');
      res.json({ success: true });
    });
  });
});

app.get('/api/admin/task/:id', requireAdmin, (req, res) => {
  const taskId = req.params.id;
  
  db.get('SELECT * FROM tasks WHERE id = ?', [taskId], (err, task) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!task) return res.status(404).json({ error: 'Задание не найдено' });
    res.json(task);
  });
});

// User moderation routes
app.get('/api/admin/users', requireAdmin, (req, res) => {
  db.all(
    'SELECT id, name, email, account_status, balance, tasks_completed, created_at FROM users WHERE role = "user" ORDER BY created_at DESC',
    (err, users) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(users);
    }
  );
});

app.post('/api/admin/users/:id/approve', requireAdmin, (req, res) => {
  const userId = req.params.id;
  
  db.run(
    'UPDATE users SET account_status = "approved" WHERE id = ?',
    [userId],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.post('/api/admin/users/:id/reject', requireAdmin, (req, res) => {
  const userId = req.params.id;
  
  db.run(
    'UPDATE users SET account_status = "rejected" WHERE id = ?',
    [userId],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  const userId = req.params.id;
  
  // Check if user has submissions or withdrawals
  db.get('SELECT COUNT(*) as count FROM submissions WHERE user_id = ?', [userId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (row.count > 0) {
      return res.status(400).json({ error: 'Нельзя удалить пользователя с выполненными заданиями' });
    }
    
    db.run('DELETE FROM users WHERE id = ? AND role = "user"', [userId], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });
});

// Withdrawal requests
app.post('/api/withdrawals', requireAuth, (req, res) => {
  const { amount, method, details } = req.body;
  const userId = req.session.userId;
  
  // Check balance
  db.get('SELECT balance FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (user.balance < amount) {
      return res.status(400).json({ error: 'Недостаточно средств' });
    }
    
    if (amount < 50) {
      return res.status(400).json({ error: 'Минимальная сумма вывода 50 ₽' });
    }
    
    db.run(
      'INSERT INTO withdrawals (user_id, amount, method, details) VALUES (?, ?, ?, ?)',
      [userId, amount, method, details],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        // Deduct from balance
        db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, userId], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true, withdrawalId: this.lastID });
        });
      }
    );
  });
});

app.get('/api/my-withdrawals', requireAuth, (req, res) => {
  db.all(
    'SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC',
    [req.session.userId],
    (err, withdrawals) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(withdrawals);
    }
  );
});

app.get('/api/admin/withdrawals', requireAdmin, (req, res) => {
  db.all(
    `SELECT w.*, u.name as user_name, u.email as user_email
     FROM withdrawals w
     JOIN users u ON w.user_id = u.id
     ORDER BY w.created_at DESC`,
    (err, withdrawals) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(withdrawals);
    }
  );
});

app.post('/api/admin/withdrawals/:id/approve', requireAdmin, (req, res) => {
  const withdrawalId = req.params.id;
  
  db.run(
    'UPDATE withdrawals SET status = "approved", processed_at = CURRENT_TIMESTAMP WHERE id = ?',
    [withdrawalId],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.post('/api/admin/withdrawals/:id/reject', requireAdmin, (req, res) => {
  const withdrawalId = req.params.id;
  
  db.get('SELECT user_id, amount FROM withdrawals WHERE id = ?', [withdrawalId], (err, withdrawal) => {
    if (err || !withdrawal) return res.status(404).json({ error: 'Не найдено' });
    
    db.run(
      'UPDATE withdrawals SET status = "rejected", processed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [withdrawalId],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Return money to balance
        db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [withdrawal.amount, withdrawal.user_id], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true });
        });
      }
    );
  });
});

// Work accounts (farm accounts) routes
app.get('/api/my-work-accounts', requireAuth, (req, res) => {
  db.all(
    'SELECT * FROM work_accounts WHERE user_id = ? ORDER BY created_at DESC',
    [req.session.userId],
    (err, accounts) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(accounts);
    }
  );
});

app.post('/api/work-accounts', requireAuth, upload.single('screenshot'), (req, res) => {
  const { platform, account_name, account_link, proof_text } = req.body;
  const screenshot = req.file ? req.file.filename : null;
  const userId = req.session.userId;
  
  if (!platform || !account_name || !account_link) {
    return res.status(400).json({ error: 'Заполните все обязательные поля' });
  }
  
  db.run(
    'INSERT INTO work_accounts (user_id, platform, account_name, account_link, screenshot, proof_text) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, platform, account_name, account_link, screenshot, proof_text],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, accountId: this.lastID });
    }
  );
});

app.delete('/api/work-accounts/:id', requireAuth, (req, res) => {
  const accountId = req.params.id;
  
  db.run(
    'DELETE FROM work_accounts WHERE id = ? AND user_id = ?',
    [accountId, req.session.userId],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// Admin work accounts routes
app.get('/api/admin/work-accounts', requireAdmin, (req, res) => {
  const status = req.query.status || 'pending';
  
  db.all(
    `SELECT wa.*, u.name as user_name, u.email as user_email
     FROM work_accounts wa
     JOIN users u ON wa.user_id = u.id
     WHERE wa.status = ?
     ORDER BY wa.created_at DESC`,
    [status],
    (err, accounts) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(accounts);
    }
  );
});

app.post('/api/admin/work-accounts/:id/approve', requireAdmin, (req, res) => {
  const accountId = req.params.id;
  
  db.run(
    'UPDATE work_accounts SET status = "approved", reviewed_at = CURRENT_TIMESTAMP WHERE id = ?',
    [accountId],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.post('/api/admin/work-accounts/:id/reject', requireAdmin, (req, res) => {
  const accountId = req.params.id;
  const { comment } = req.body;
  
  db.run(
    'UPDATE work_accounts SET status = "rejected", admin_comment = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?',
    [comment, accountId],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.get('/api/approved-accounts-count', requireAuth, (req, res) => {
  db.get(
    'SELECT COUNT(*) as count FROM work_accounts WHERE user_id = ? AND status = "approved"',
    [req.session.userId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ count: row ? row.count : 0 });
    }
  );
});

app.get('/api/available-work-accounts', requireAuth, (req, res) => {
  const now = new Date().toISOString();
  
  db.all(
    `SELECT id, platform, account_name, cooldown_until, last_used_at
     FROM work_accounts 
     WHERE user_id = ? AND status = 'approved'
     ORDER BY 
       CASE 
         WHEN cooldown_until IS NULL OR cooldown_until < ? THEN 0
         ELSE 1
       END,
       cooldown_until ASC`,
    [req.session.userId, now],
    (err, accounts) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Add cooldown info
      const accountsWithCooldown = accounts.map(acc => {
        const cooldownEnd = acc.cooldown_until ? new Date(acc.cooldown_until) : null;
        const nowDate = new Date();
        
        return {
          ...acc,
          isAvailable: !cooldownEnd || cooldownEnd <= nowDate,
          cooldownHoursLeft: cooldownEnd && cooldownEnd > nowDate 
            ? Math.ceil((cooldownEnd - nowDate) / (1000 * 60 * 60))
            : 0
        };
      });
      
      res.json(accountsWithCooldown);
    }
  );
});

// Partners/Referral routes
app.get('/partners', (req, res) => {
  if (req.session.userId) {
    db.get('SELECT * FROM users WHERE id = ?', [req.session.userId], (err, user) => {
      if (err || !user) return res.redirect('/login');
      
      const referralLink = `${req.protocol}://${req.get('host')}/register?ref=${user.referral_code}`;
      
      res.render('partners', {
        user: user,
        referralLink: referralLink
      });
    });
  } else {
    res.render('partners', {
      user: null,
      referralLink: null
    });
  }
});

app.get('/api/my-referrals', requireAuth, (req, res) => {
  db.all(
    'SELECT id, name, email, tasks_completed, created_at FROM users WHERE referred_by = ? ORDER BY created_at DESC',
    [req.session.userId],
    (err, referrals) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(referrals);
    }
  );
});

app.listen(PORT, () => {
  console.log(`\n🚀 YanFarm server running on http://localhost:${PORT}`);
  console.log(`📊 Admin panel: http://localhost:${PORT}/admin`);
  console.log(`🔐 Default admin: ${process.env.ADMIN_EMAIL || 'admin@yanfarm.pro'} / ${process.env.ADMIN_PASSWORD || 'admin123'}\n`);
});
