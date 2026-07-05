export class OpenAiTimeoutError extends Error {
  constructor(message: string = 'OpenAI API request timed out') {
    super(message);
    this.name = 'OpenAiTimeoutError';
  }
}
