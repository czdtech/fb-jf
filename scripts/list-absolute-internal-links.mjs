#!/usr/bin/env node
import { execSync } from 'child_process';

const ROOT = process.cwd();

function main() {
  const cmd = "rg 'href=\\\"https://www.playfiddlebops.com' src/components src/pages -n --glob '*.astro'";
  const rgOutput = execSync(cmd, { cwd: ROOT, encoding: 'utf8' });
  console.log(rgOutput);
}

main();
