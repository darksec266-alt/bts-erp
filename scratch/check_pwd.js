const bcrypt = require('bcryptjs');
const hash = '$2b$10$YsXEWxJqhMtguPgH61z5aO1uKGdML7HpGFe0NSpZt47fJ2KlF4h1O';
const candidates = [
  'admin', 'admin123', 'admin@123', 'Admin123', 'Admin@123', 'Admin123!',
  'password', 'password123', '123456', '12345678', 'bts', 'bts123', 'bts_password',
  'bts_dev_password', 'secret', 'changeme', 'superadmin', 'SuperAdmin123!'
];
for (const p of candidates) {
  if (bcrypt.compareSync(p, hash)) {
    console.log('MATCH FOUND:', p);
    process.exit(0);
  }
}
console.log('No match found');
