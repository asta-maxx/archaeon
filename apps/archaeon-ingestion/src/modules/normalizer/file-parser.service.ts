import { Injectable, Logger } from '@nestjs/common';
import { NormalizedFile } from '../../shared/types';
import * as path from 'path';

const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'TypeScript',
  '.js': 'JavaScript',
  '.json': 'JSON',
  '.md': 'Markdown',
  '.py': 'Python',
  '.java': 'Java',
  '.go': 'Go',
  '.rs': 'Rust',
  '.cpp': 'C++',
  '.c': 'C',
  '.cs': 'C#',
  '.html': 'HTML',
  '.css': 'CSS',
};

@Injectable()
export class FileParserService {
  private readonly logger = new Logger(FileParserService.name);

  /**
   * Parses raw file manifest data into NormalizedFile array.
   */
  public parse(rawFiles: any[]): NormalizedFile[] {
    if (!Array.isArray(rawFiles)) {
      this.logger.warn(
        'Expected rawFiles to be an array, returning empty list',
      );
      return [];
    }

    const normalized: NormalizedFile[] = [];

    for (const raw of rawFiles) {
      try {
        const parsed = this.parseSingle(raw);
        if (parsed) {
          normalized.push(parsed);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to parse file record: ${(error as Error).message}`,
        );
      }
    }

    return normalized;
  }

  private parseSingle(raw: any): NormalizedFile | null {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Raw file is not an object');
    }

    // GitHub trees return 'tree' for directories and 'blob' for files. We only care about blobs.
    if (raw.type !== 'blob') {
      return null;
    }

    const filePath = raw.path;
    if (typeof filePath !== 'string' || !filePath) {
      throw new Error('Missing or invalid file path');
    }

    const sizeBytes = typeof raw.size === 'number' ? raw.size : 0;
    const content = typeof raw.content === 'string' ? raw.content : undefined;

    const ext = path.extname(filePath).toLowerCase();
    const language = LANGUAGE_MAP[ext] || 'unknown';

    return {
      path: filePath,
      language,
      sizeBytes,
      content,
    };
  }
}
