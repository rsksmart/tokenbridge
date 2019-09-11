const expect = require('chai').expect;
const { exec } = require('child_process');
const { scheduler } = require('../src/mmrSync');
const config = require('../config.js');

describe('mmrSync process tests', () => {
    it ('starts the process successfully', async () => {
        const mmrSyncProcess = await exec('npm run mmrsync');

        expect(mmrSyncProcess).to.exist;
        expect(mmrSyncProcess.pid).to.not.be.null;

        mmrSyncProcess.kill();
    });

    it (`schedules a call to RskMMR module every ${config.mmrSyncInterval} minutes`, (done) => {
        expect(scheduler).to.exist;
        expect(scheduler.pollingInterval).to.eq(config.mmrSyncInterval * 1000 * 60);
        expect(scheduler.running).to.eq(true);
        done();

        process.exit(0);
    });
})
