const bcrypt = require('bcrypt');

(async () => {
  const hash = '$2b$10$jdRVz6TEe3V68AeGyNO8OO3uVHN/C4B9cGPKIZmk1Hb6DviiHM3ke';
  const match = await bcrypt.compare('Password88!!', hash);
  console.log('Password matches:', match);
})();