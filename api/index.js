import serverless from 'serverless-http';
import app from '../server/server.js';

export const config = {
  api: {
    bodyParser: true,
  },
};

export default serverless(app);