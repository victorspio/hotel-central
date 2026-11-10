const serverless = require('serverless-http');
const app = require('../../backend/src/server');

const handler = serverless(app);

module.exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  return await handler(event, context);
};

