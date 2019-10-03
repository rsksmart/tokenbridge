const DEFAULT_POLLING_INTERVAL_MS = 1000*60*60; //Default once an hour

module.exports = class Scheduler {
    constructor(pollingInterval, logger, service) {
        this.logger = logger;
        this.pollingTimeout = null;
        this.pollingInterval = pollingInterval != null ? pollingInterval : DEFAULT_POLLING_INTERVAL_MS;
        this.running = false;
        this.service = service;
    }

    async start() {
        this.logger.info(`start scheduler service polling every ${this.pollingInterval}(ms)`);
        if (this.running)
            throw new Error('scheduler service already started');
        this.running = true;
        await this.poll();                  
    }

    async poll() {
        this.logger.info('scheduler triggered poll');
        if (this.running) {
            this.pollingTimeout = null;
            await this.service.run();
            this.logger.info("scheduler poll run succesful, trigger next poll in ", this.pollingInterval);
            // Trigger next poll
            this.pollingTimeout = setTimeout(() => this.poll(), this.pollingInterval); 
        } else {
            this.logger.warn("can't poll, scheduler service already stopped");
        }
    }

    async stop() {
        this.logger.info('stop scheduler service');
        if (this.running) {
            if (this.pollingTimeout != null) {
                clearTimeout(this.pollingTimeout);
                this.pollingTimeout = null;
            }
        } else {
            this.logger.warn("can't stop scheduler service already stoped");
        }
    }
}