const { createApp } = require('./app');

const PORT = 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`PakWheels MVP running at http://localhost:${PORT}`);
});
