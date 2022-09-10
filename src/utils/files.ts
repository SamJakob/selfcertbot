import * as fs from 'node:fs/promises';
import * as path from 'path';

export async function fileExists(filename: string) : Promise<boolean> {
  try {
    return (await fs.stat(filename)).isFile();
  } catch(ex) { return false; }
}

export async function directoryExists(dirname: string) : Promise<boolean> {
  try {
    return (await fs.stat(dirname)).isDirectory();
  } catch(ex) { return false; }
}

export async function createDirIfNotExists(dirname: string): Promise<void> {
  // If the directory already exists, exit early.
  if (await directoryExists(dirname)) return;

  // Otherwise, make the directory.
  await fs.mkdir(dirname);
}
