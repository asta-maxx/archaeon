import { Injectable, Logger } from '@nestjs/common';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);
  private readonly baseTmpDir = os.tmpdir();

  async createJobWorkspace(jobId: string): Promise<string> {
    const workspacePath = this.getWorkspacePath(jobId);

    try {
      await fs.mkdir(workspacePath, { recursive: true });
      this.logger.debug(
        `Created workspace for job ${jobId} at ${workspacePath}`,
      );
      return workspacePath;
    } catch (error) {
      this.logger.error(
        `Failed to create workspace for job ${jobId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async destroyJobWorkspace(jobId: string): Promise<void> {
    const workspacePath = this.getWorkspacePath(jobId);

    try {
      await fs.rm(workspacePath, { recursive: true, force: true });
      this.logger.debug(
        `Destroyed workspace for job ${jobId} at ${workspacePath}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to destroy workspace for job ${jobId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  private getWorkspacePath(jobId: string): string {
    return path.join(this.baseTmpDir, `repo-intel-${jobId}`);
  }
}
