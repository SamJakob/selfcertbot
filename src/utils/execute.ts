import { exec, ExecOptions } from 'node:child_process';
import { promisify } from 'util';

export class Executor {

  private readonly defaultOptions: ExecOptions;

  public constructor(defaultOptions: ExecOptions) {
    this.defaultOptions = defaultOptions;
  }

  public async command(command: string, extraOptions?: ExecOptions) {
    return runCommand(command, {
      ...this.defaultOptions,
      ...extraOptions
    });
  }

  public async process(command: string, extraOptions?: ExecOptions) {
    return startProcess(command, {
      ...this.defaultOptions,
      ...extraOptions
    });
  }

}

export async function runCommand(command: string, options: ExecOptions): Promise<void> {
  await promisify(exec)(command, options);
}

export async function startProcess(command: string, options: ExecOptions): Promise<void> {
  const child = exec(command, options);

  // Pipe child output streams to current process.
  child.stdout?.pipe(process.stdout);
  child.stderr?.pipe(process.stderr);
  if (child.stdin) process.stdin.pipe(child.stdin);

  await new Promise<void>((resolve, reject) => {
    child.on('exit', (code) => {
      if (child.stdin) process.stdin.unpipe(child.stdin);

      if (code === 0) resolve();
      else reject();
    });
  });
}
