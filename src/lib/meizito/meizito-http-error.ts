export class MeizitoHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'MeizitoHttpError';
    this.status = status;
  }
}
