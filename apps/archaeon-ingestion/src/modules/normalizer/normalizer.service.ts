import { Injectable, Logger } from '@nestjs/common';
import { CommitsParserService } from './commits-parser.service';
import { PullRequestParserService } from './pull-request-parser.service';
import { FileParserService } from './file-parser.service';
import { AdrParserService } from './adr-parser.service';
import {
  RawRepositoryData,
  NormalizedRepositoryData,
} from '../../shared/types';

@Injectable()
export class NormalizerService {
  private readonly logger = new Logger(NormalizerService.name);

  constructor(
    private readonly commitsParser: CommitsParserService,
    private readonly prParser: PullRequestParserService,
    private readonly fileParser: FileParserService,
    private readonly adrParser: AdrParserService,
  ) {}

  /**
   * Transforms raw GitHub payloads into a normalized internal data structure.
   */
  public normalize(raw: RawRepositoryData): NormalizedRepositoryData {
    this.logger.log(`Starting normalization for job ${raw.jobId}`);

    const commits = this.commitsParser.parse(raw.commits || []);
    const pullRequests = this.prParser.parse(raw.pullRequests || []);
    const files = this.fileParser.parse(raw.fileManifest || []);

    const adrCandidates = this.adrParser.parse(commits, pullRequests, files);

    this.logger.log(`Completed normalization for job ${raw.jobId}`);
    return {
      jobId: raw.jobId,
      commits,
      pullRequests,
      files,
      adrCandidates,
    };
  }
}
