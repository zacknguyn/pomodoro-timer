import 'dotenv/config';
import app from './src/app.js';
import authService from './src/services/authService.js';

const port = process.env.PORT || 3000;

app.listen(port, async () => {
  await authService.seedInitialAdmin();
  console.log(`Backend listening at http://localhost:${port}`);
});
