const express = require('express');
const config = require('../../config/config.js');

module.exports = function() {
  let app;
  let router;
  let logger;
  const port = config.endpointsPort || 5000;

  function logCall(req, res, next) {
    logger.info(req.originalUrl);
    next();
  }

  function init(_logger) {
    app = express();
    router = express.Router();
    logger = _logger;

    router.use(logCall);
    router.get('/isAlive', async (req, res) => {
      try {
        res.status(200).json({
          status: 'ok'
        });
      } catch(err) {
        logger.error('isAlive/ endpoint failed')
      }
    });

    app.use('/', router);

    app.listen(port, () => {
      logger.info(`listening on http://localhost:${port}/`);
    })
  }

  return {
    init
  }

}();