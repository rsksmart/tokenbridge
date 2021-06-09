const net = require('net');

function hsmPayloadBuilder(command, keyId, txnHash) {
    return `{"command":"${command}","keyId":"${keyId}","message":{"hash":"${txnHash}"},"version":2}`;
}

module.exports = class HSM {
    constructor({
        host = '127.0.0.1',
        port = 6000,
    }, logger) {
        this.host = host;
        this.port = port;
        this.logger = logger;
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
        const payload = hsmPayloadBuilder(`sign`, `m/44'/60'/0'/0/0`, msgToSign);
        return this.client.write(`${payload}\n`);
    }

    async connectSendAndReceive(msgToSign) {
        try {
            this.client = net.connect(this.port, this.host);
            this.send(msgToSign);
            return this.receive();
        } catch(err) {
            this.logger.error(`HSM (connectSendAndReceive)`, err);
            throw err;
        }
    }
}