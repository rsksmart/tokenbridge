export class CustomError extends Error {
  constructor(message: string, err: Error) {
    super(message);
    this.stack += '\n Internal ' + err.stack;
  }
}
