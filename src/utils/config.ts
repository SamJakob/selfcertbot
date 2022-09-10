import * as path from 'path';
import * as os from 'os';
import * as fs from 'node:fs/promises';
import { fileExists } from './files';

/**
 * Reads the CA directory from the default configuration location or,
 * if it cannot be found, logs an error and causes the process to exit.
 */
export async function getCADirectory() : Promise<string> {
  // Check for existence of valid config file.
  const configFile = path.join(os.homedir(), '.selfcertbot');
  if (!await fileExists(configFile)) {
    console.error('~/.selfcertbot does not exist. You need to run `selfcertbot setup` before use.');
    process.exit(1);
  }

  return await fs.readFile(configFile, { encoding: 'utf-8' });
}
