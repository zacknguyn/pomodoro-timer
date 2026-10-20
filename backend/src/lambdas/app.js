import serverlessExpress from '@vendia/serverless-express';
import app from '../app.js';

// Use the same routes, origin checks, auth and errors as the local server.
const serve = serverlessExpress({ app });
export function handler(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;
  return serve(event, context);
}
