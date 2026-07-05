import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { NormalizerService } from './normalizer.service';
import { CommitsParserService } from './commits-parser.service';
import { PullRequestParserService } from './pull-request-parser.service';
import { FileParserService } from './file-parser.service';
import { AdrParserService } from './adr-parser.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { RawRepositoryData } from '../../shared/types';

describe('NormalizerService', () => {
  let service: NormalizerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ ignoreEnvFile: true })],
      providers: [
        NormalizerService,
        CommitsParserService,
        PullRequestParserService,
        FileParserService,
        AdrParserService,
      ],
    }).compile();

    service = module.get<NormalizerService>(NormalizerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate a deterministic snapshot for the raw payload fixture', async () => {
    const fixturePath = path.join(
      process.cwd(),
      'test',
      'fixtures',
      'raw-github-payload.json',
    );
    const fixtureData = await fs.readFile(fixturePath, 'utf-8');
    const raw: RawRepositoryData = JSON.parse(fixtureData);

    const normalized = service.normalize(raw);

    // Assert overall structural correctness
    expect(normalized.jobId).toBe('test-job-id-123');

    // There were 3 valid commits out of 4
    expect(normalized.commits).toHaveLength(3);

    // There were 2 valid PRs out of 3 (one missing number)
    expect(normalized.pullRequests).toHaveLength(2);

    // There were 3 valid files out of 6
    expect(normalized.files).toHaveLength(4); // 4 blobs, 2 omitted (missing path / tree)

    // We expect the ADR parser to pick up the ADR PR, the ADR file, and the decision commit
    expect(normalized.adrCandidates).toHaveLength(3);

    // Deterministic snapshot match!
    expect(normalized).toMatchSnapshot();
  });
});
