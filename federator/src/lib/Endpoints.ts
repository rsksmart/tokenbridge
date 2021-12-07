import express from 'express';
import { Router, Express } from 'express-serve-static-core';
import { Config } from './config';

export class Endpoint {
  app: Express;
  router: Router;
  logger: any;
  port: number;

  constructor(_logger) {
    this.logger = _logger;
    this.port = Config.getInstance().endpointsPort;
  }

  logCall(req, res, next) {
    this.logger.info(req.originalUrl);
    next();
  }

  init() {
    this.app = express();
    this.router = express.Router();

    this.router.use(this.logCall);
    this.router.get('/isAlive', async (req, res) => {
      try {
        res.status(200).json({
          status: 'ok',
        });
      } catch (err) {
        this.logger.error('isAlive/ endpoint failed');
      }
    });

    this.app.use('/', this.router);

    this.app.listen(this.port, () => {
      this.logger.info(`listening on http://localhost:${this.port}/`);
    });
  }
}
