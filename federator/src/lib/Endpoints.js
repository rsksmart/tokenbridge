const express = require('express');
const router = express.Router();
const log4js = require('log4js');
const logger = log4js.getLogger('Federators');

const logCall = function(req, res, next) {
    logger.info('isAlive/');
    next();
}

router.use(logCall);

router.get('/isAlive', async (req, res) => {
    try {
      res.status(200).json({
        status: 'ok'
      });
    } catch(err) {
      logger.error('isAlive/ endpoint failed')
    }
})

module.exports = router;