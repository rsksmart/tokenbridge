const expect = require('chai').expect;
const { exec } = require('child_process');
const config = require('../config.js');

describe('main federator process tests', () => {
    it ('starts the process successfully', async () => {
        const mainProcess = await exec('npm run start');

        expect(mainProcess).to.exist;
        expect(mainProcess.pid).to.not.be.null;

        mainProcess.kill();
    });

    it(`schedules a call to Federator module every ${config.runEvery} minutes`, (done) => {
        const { scheduler } = require('../src/main');
        expect(scheduler).to.exist;
        expect(scheduler.pollingInterval).to.eq(config.runEvery * 1000 * 60);
        expect(scheduler.running).to.eq(true);
        done();

        process.exit(0);
    });
})
