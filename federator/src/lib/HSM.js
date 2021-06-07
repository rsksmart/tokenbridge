const net = require('net');
const utils = require('./utils');

const payloadBuilder =
    (
        command,
        keyId,
        txnHash
    ) => `{"command":"${command}","keyId":"${keyId}","message":{"hash":"${txnHash}"},"version":2}`;

module.exports = class HSM {
    constructor({
        host = '127.0.0.1',
        port = 6000,
    }) {
        this.host = host;
        this.port = port;
        this.client = null;
    }

    async receive() {
        return new Promise((resolve, reject) => {
            this.client.on('data', (data) => {
                resolve(data.toString());
                this.client.end();
            })

            this.client.on('end', () => {
                resolve(`connection to ${this.host}:${this.port} closed`)
            })

            this.client.on('error', (err) => {
                reject(`Error: ${err.message}`)
            })
        })
    }

    send(msgToSign = '') {
        const payload = utils.hsmPayloadBuilder(`sign`, `m/44'/137'/0'/0/0`, msgToSign);
        return this.client.write(`${payload}\n`);
    }

    async connectSendAndReceive(msgToSign) {
        try {
            this.client = net.connect(this.port, this.host);
            this.send(msgToSign);
            return this.receive();
        } catch(err) {
            console.log(`HSM (connectSendAndReceive)`, err);
        }
    }
}