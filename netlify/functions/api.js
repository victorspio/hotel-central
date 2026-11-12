const serverless = require('serverless-http');

let app;
let handler;

function getHandler() {
  if (!handler) {
    try {
      app = require('../../backend/src/server');
      handler = serverless(app);
    } catch (err) {
      console.error('[CRITICAL] Erro fatal ao carregar app Express na Netlify Function:', err);
      throw err;
    }
  }
  return handler;
}

module.exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    const h = getHandler();
    return await h(event, context);
  } catch (err) {
    console.error('[NETLIFY_HANDLER_ERROR]', err);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Erro na função do servidor',
        message: err.message,
        details: err.stack,
      }),
    };
  }
};
