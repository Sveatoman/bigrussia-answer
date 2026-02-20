// Script to reset database
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');

console.log('🗑️  Удаление старой базы данных...');

if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('✓ База данных удалена');
} else {
  console.log('ℹ️  База данных не найдена');
}

console.log('\n📝 Для создания новой базы данных запустите:');
console.log('   npm start');
console.log('\n⚠️  Внимание: Все данные будут потеряны!');
