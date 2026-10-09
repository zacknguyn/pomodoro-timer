import 'dotenv/config';
import app from './src/app.js';

const port = process.env.PORT || 3000;
const host = process.env.HOST || '127.0.0.1';

app.listen(port, host, () => {
  console.log(`Backend listening at http://${host}:${port}`);
});
