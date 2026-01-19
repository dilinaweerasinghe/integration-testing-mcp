/**
 * SAR Test Runner.
 * Executes TAR tests using ScriptARest.exe command line tool.
 */

import { spawn } from 'node:child_process';
import { resolve, dirname, basename } from 'node:path';
import { existsSync } from 'node:fs';
import type { SarRunnerConfig, RunTestOptions, TestExecutionResult } from './types.js';
import { OutputParser } from './output-parser.js';

/**
 * Runs SAR/TAR tests using ScriptARest.exe.
 */
export class TestRunner {
  private readonly config: SarRunnerConfig;
  private readonly parser: OutputParser;

  constructor(config: SarRunnerConfig) {
    this.config = config;
    this.parser = new OutputParser();
  }

  /**
   * Run a TAR test file.
   */
  async runTest(options: RunTestOptions): Promise<TestExecutionResult> {
    // Validate ScriptARest path
    if (!existsSync(this.config.scriptARestPath)) {
      return this.createErrorResult(
        `ScriptARest.exe not found at: ${this.config.scriptARestPath}`,
        options.filePath
      );
    }

    // Validate test file path
    const absoluteFilePath = resolve(options.filePath);
    if (!existsSync(absoluteFilePath)) {
      return this.createErrorResult(
        `Test file not found: ${absoluteFilePath}`,
        options.filePath
      );
    }

    // Build command arguments
    const serverUrl = options.serverUrl ?? this.config.serverUrl;
    const username = options.username ?? this.config.username;
    const password = options.password ?? this.config.password;
    const fileName = basename(absoluteFilePath);
    const workingDir = dirname(absoluteFilePath);

    const args = [
      `serverurl=${serverUrl}`,
      `username=${username}`,
      `password=${password}`,
      `fileToRead=${fileName}`,
      ...(options.additionalArgs ?? []),
    ];

    // Execute ScriptARest
    try {
      const output = await this.executeCommand(
        this.config.scriptARestPath,
        args,
        workingDir,
        options.timeoutMs ?? this.config.timeoutMs ?? 600000 // 10 min default
      );

      // Parse the output
      return this.parser.parse(output);
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Unknown execution error',
        options.filePath
      );
    }
  }

  /**
   * Execute the ScriptARest command.
   */
  private executeCommand(
    executable: string,
    args: string[],
    cwd: string,
    timeoutMs: number
  ): Promise<string> {
    return new Promise((resolvePromise, reject) => {
      let output = '';
      let errorOutput = '';

      const process = spawn(executable, args, {
        cwd,
        shell: true,
        windowsHide: true,
      });

      // Set timeout
      const timeout = setTimeout(() => {
        process.kill('SIGTERM');
        reject(new Error(`Test execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      process.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
      });

      process.stderr?.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        clearTimeout(timeout);
        
        // Include both stdout and stderr in output
        const fullOutput = output + (errorOutput ? '\n--- STDERR ---\n' + errorOutput : '');
        
        // ScriptARest may return non-zero for test failures, but still produces valid output
        if (code !== 0 && !output) {
          reject(new Error(`ScriptARest exited with code ${code}: ${errorOutput || 'No output'}`));
        } else {
          resolvePromise(fullOutput);
        }
      });

      process.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to start ScriptARest: ${err.message}`));
      });
    });
  }

  /**
   * Create an error result.
   */
  private createErrorResult(message: string, filePath: string): TestExecutionResult {
    return {
      success: false,
      report: {
        testName: basename(filePath),
        status: 'Error',
        timeSeconds: 0,
        filePath,
        serverCalls: 0,
        failedServerCalls: 0,
        asserts: 0,
        failedAsserts: 0,
        exceptions: 1,
      },
      commands: [],
      serverCallStats: [],
      rawOutput: '',
      errorMessage: message,
      errors: [{
        type: 'exception',
        message,
      }],
      warnings: [],
    };
  }

  /**
   * Validate the runner configuration.
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.scriptARestPath) {
      errors.push('ScriptARest path is not configured');
    } else if (!existsSync(this.config.scriptARestPath)) {
      errors.push(`ScriptARest.exe not found at: ${this.config.scriptARestPath}`);
    }

    if (!this.config.serverUrl) {
      errors.push('Server URL is not configured');
    }

    if (!this.config.username) {
      errors.push('Username is not configured');
    }

    if (!this.config.password) {
      errors.push('Password is not configured');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
