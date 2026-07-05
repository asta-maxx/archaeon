import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceService } from './workspace.service';

import fs = require('fs/promises');
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';

describe('WorkspaceService', () => {
  let service: WorkspaceService;
  let baseTmpDir: string;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkspaceService],
    }).compile();

    service = module.get<WorkspaceService>(WorkspaceService);
    baseTmpDir = os.tmpdir();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createJobWorkspace', () => {
    it('should create a new directory and return its path', async () => {
      const jobId = crypto.randomUUID();
      const expectedPath = path.join(baseTmpDir, `repo-intel-${jobId}`);

      const result = await service.createJobWorkspace(jobId);

      expect(result).toBe(expectedPath);
      const stat = await fs.stat(expectedPath);
      expect(stat.isDirectory()).toBe(true);

      // cleanup
      await service.destroyJobWorkspace(jobId);
    });

    it('should throw an error if mkdir fails', async () => {
      const jobId = crypto.randomUUID();

      // Mock fs.mkdir to throw
      const mkdirSpy = jest
        .spyOn(fs, 'mkdir')
        .mockRejectedValueOnce(new Error('Permission denied'));

      await expect(service.createJobWorkspace(jobId)).rejects.toThrow(
        'Permission denied',
      );

      mkdirSpy.mockRestore();
    });
  });

  describe('destroyJobWorkspace', () => {
    it('should destroy an existing directory', async () => {
      const jobId = crypto.randomUUID();
      const expectedPath = path.join(baseTmpDir, `repo-intel-${jobId}`);

      // create it first
      await service.createJobWorkspace(jobId);

      // destroy it
      await service.destroyJobWorkspace(jobId);

      // Verify it doesn't exist
      await expect(fs.stat(expectedPath)).rejects.toThrow();
    });

    it('should throw an error if rm fails', async () => {
      const jobId = crypto.randomUUID();

      // Mock fs.rm to throw
      const rmSpy = jest
        .spyOn(fs, 'rm')
        .mockRejectedValueOnce(new Error('rm failed'));

      await expect(service.destroyJobWorkspace(jobId)).rejects.toThrow(
        'rm failed',
      );

      rmSpy.mockRestore();
    });
  });
});
