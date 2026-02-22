const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const db = new sqlite3.Database(path.join(__dirname, 'database.db'));

console.log('🔄 Starting referral system migration...\n');

db.serialize(() => {
  // Add referral fields to users table
  db.run(`ALTER TABLE users ADD COLUMN referral_code TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding referral_code:', err.message);
    } else if (!err) {
      console.log('✓ Added referral_code column');
    }
  });

  db.run(`ALTER TABLE users ADD COLUMN referred_by INTEGER`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding referred_by:', err.message);
    } else if (!err) {
      console.log('✓ Added referred_by column');
    }
  });

  db.run(`ALTER TABLE users ADD COLUMN referral_earnings REAL DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding referral_earnings:', err.message);
    } else if (!err) {
      console.log('✓ Added referral_earnings column');
    }
  });

  db.run(`ALTER TABLE users ADD COLUMN referrals_count INTEGER DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding referrals_count:', err.message);
    } else if (!err) {
      console.log('✓ Added referrals_count column');
    }
  });

  // Add referral_reward to tasks table
  db.run(`ALTER TABLE tasks ADD COLUMN referral_reward REAL DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding referral_reward:', err.message);
    } else if (!err) {
      console.log('✓ Added referral_reward column to tasks');
    }
  });

  // Create unique index for referral_code
  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_code ON users(referral_code)`, (err) => {
    if (err) {
      console.error('Error creating index:', err.message);
    } else {
      console.log('✓ Created unique index for referral_code');
    }
  });

  // Generate referral codes for existing users
  setTimeout(() => {
    db.all('SELECT id, referral_code FROM users', (err, users) => {
      if (err) {
        console.error('Error fetching users:', err);
        db.close();
        return;
      }

      let updated = 0;
      users.forEach(user => {
        if (!user.referral_code) {
          const referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
          db.run('UPDATE users SET referral_code = ? WHERE id = ?', [referralCode, user.id], (err) => {
            if (err) {
              console.error(`Error updating user ${user.id}:`, err.message);
            } else {
              console.log(`✓ Generated referral code for user ${user.id}: ${referralCode}`);
              updated++;
            }
          });
        }
      });

      setTimeout(() => {
        console.log(`\n✅ Referral system migration completed! Updated ${updated} users.`);
        console.log('You can now restart the server.\n');
        db.close();
      }, 1000);
    });
  }, 500);
});
