import express from 'express';

export class Endpoint {
  app: express.Express;
  router: express.Router;
  logger: any;
  port: number;

  constructor(_logger, port: number) {
    this.logger = _logger;
    this.port = port;
    this.logger.upsertContext('service', this.constructor.name);
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
