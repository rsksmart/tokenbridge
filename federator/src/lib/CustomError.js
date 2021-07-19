module.exports = class CustomError extends Error {
    constructor(message, err) {
        super(message);
        this.stack += '\n Internal ' + err.stack;
    }
}
