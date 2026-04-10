const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

(async () => {
  const db = new sqlite3.Database('./prisma/dev.db');
  const hash = await bcrypt.hash('Password88!!', 10);
  console.log('New hash:', hash);
  db.run("UPDATE User SET password = ? WHERE email = ?", [hash, 'charlie@onyxdigital.io'], function(err) {
    if (err) {
      console.error(err);
    } else {
      console.log('Updated');
    }
    db.close();
  });
})();