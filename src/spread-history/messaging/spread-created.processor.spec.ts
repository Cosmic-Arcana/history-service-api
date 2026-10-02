import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { CommandBus } from '@nestjs/cqrs';
import { SpreadCreatedProcessor } from './spread-created.processor';

describe('Feature: report worker errors by what actually happened', () => {
  const processor = new SpreadCreatedProcessor({} as CommandBus, {} as ConfigService);
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  it('Given a job whose lock expired, When the worker reports it, Then it is a warning naming the job, not a broker failure', () => {
    processor.onWorkerError(new Error('Missing lock for job 2961ca0a. moveToFinished'));

    expect(warn).toHaveBeenCalledWith('job lock lost', {
      jobId: '2961ca0a',
      command: 'moveToFinished',
      errorName: 'Error',
    });
    expect(error).not.toHaveBeenCalled();
  });

  it('Given any other worker error, When the worker reports it, Then it is logged as a worker failure', () => {
    processor.onWorkerError(new Error('connect ECONNREFUSED 127.0.0.1:6379'));

    expect(error).toHaveBeenCalledWith('worker failed', {
      errorName: 'Error',
      errorMessage: 'connect ECONNREFUSED 127.0.0.1:6379',
    });
    expect(warn).not.toHaveBeenCalled();
  });
});
