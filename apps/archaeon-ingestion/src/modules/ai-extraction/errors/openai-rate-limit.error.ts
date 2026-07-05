export class OpenAiRateLimitError extends Error {
  constructor(message: string = 'OpenAI API rate limit exceeded') {
    super(message);
    this.name = 'OpenAiRateLimitError';
  }
}
