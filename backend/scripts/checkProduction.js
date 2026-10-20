import 'dotenv/config';
import { validateProductionConfig } from '../src/lib/productionConfig.js';

try {
  if (process.env.NODE_ENV !== 'production') throw new Error('Set NODE_ENV=production for this check.');
  validateProductionConfig();
  console.log('Production configuration passed. Database connectivity and public HTTPS still need deployment checks.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
