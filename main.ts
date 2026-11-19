/**
 * Tidewater Heat - make.fun gta6-01 submission packager.
 *
 * Copies static game assets and screenshots to the target output directory
 * and compiles the entry dossier via the vendored makefun-game build utility.
 */

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const ROOT_DIR = resolve(fileURLToPath(new URL('.', import.meta.url)));
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function exportEntry(): void {
  const targetDir = resolve(OUTPUT_DIR);
  mkdirSync(targetDir, { recursive: true });

  const gameSrc = join(ROOT_DIR, 'game');
  const gameDest = join(targetDir, 'game');
  mkdirSync(gameDest, { recursive: true });
  cpSync(gameSrc, gameDest, { recursive: true });

  const shotSrc = join(ROOT_DIR, 'screenshots');
  const shotDest = join(targetDir, 'screenshots');
  mkdirSync(shotDest, { recursive: true });
  if (existsSync(shotSrc)) {
    cpSync(shotSrc, shotDest, { recursive: true });
  }

  const dossierLimits = {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  };

  const dossierContent = buildDossier(targetDir, dossierLimits);
  const dossierPath = join(targetDir, 'dossier.json');
  writeFileSync(dossierPath, dossierContent, 'utf-8');
  console.log(`[Tidewater Heat] Packaged entry to ${targetDir} (dossier size: ${Buffer.byteLength(dossierContent)} bytes)`);
}

exportEntry();
