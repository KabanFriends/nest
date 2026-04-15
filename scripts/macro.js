const fs = require('fs/promises');
const path = require('path');

const SOURCE_DIR = path.join(process.cwd(), 'src');
const OUTPUT_DIR = path.join(process.cwd(), '.build');
const SOURCE_EXTENSIONS = new Set(['.tc', '.tcm']);
const DEFINE_PATTERN = /^#!define\s+([A-Z0-9_]+)\s*(.*)$/;
const IMPORT_PATTERN = /^#!import\s+(.+)$/;
const EXPAND_PATTERN = /^#!expand\s+(.+)$/;

async function main() {
  //await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const existingEntries = await fs.readdir(OUTPUT_DIR, { withFileTypes: true });
  await Promise.all(
    existingEntries
      .filter((entry) => entry.name !== '.terracotta')
      .map((entry) => fs.rm(path.join(OUTPUT_DIR, entry.name), { recursive: true, force: true })),
  );

  const macroCache = new Map();
  const sourceFiles = await collectSourceFiles(SOURCE_DIR);

  for (const filePath of sourceFiles) {
    const relativePath = path.relative(SOURCE_DIR, filePath);
    const outputPath = path.join(OUTPUT_DIR, relativePath);

    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    const content = await fs.readFile(filePath, 'utf8');
    const expandedContent = await preprocessFile(content, filePath, macroCache);
    await fs.writeFile(outputPath, expandedContent, 'utf8');
  }

  console.log(`${sourceFiles.length} file(s) processed, written to ${OUTPUT_DIR}`);
}

async function collectSourceFiles(directoryPath) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === '.build') {
        continue;
      }

      files.push(...await collectSourceFiles(entryPath));
      continue;
    }

    if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }

  return files;
}

async function preprocessFile(content, filePath, macroCache, processingStack = new Set()) {
  const macros = new Map();
  const lines = content.split(/\r?\n/);
  const outputLines = [];

  if (processingStack.has(filePath)) {
    throw new Error(`Circular macro import detected for ${filePath}`);
  }

  if (processingStack.size === 0) {
    console.log(`Preprocess ${filePath}`);
  } else {
    console.log("  ".repeat(processingStack.size) + `- ${filePath}`);
  }

  processingStack.add(filePath);

  try {
    for (const line of lines) {
      const importMatch = line.match(IMPORT_PATTERN);
      if (importMatch) {
        const importedPath = await resolveMacroImport(filePath, importMatch[1].trim());
        const importedMacros = await loadMacroDefinitions(importedPath, macroCache, processingStack);

        for (const [macroName, macroValue] of importedMacros) {
          macros.set(macroName, macroValue);
        }

        continue;
      }

      const expandMatch = line.match(EXPAND_PATTERN);
      if (expandMatch) {
        const expandedPath = await resolveMacroImport(filePath, expandMatch[1].trim());
        const expandedContent = await preprocessPath(expandedPath, macroCache, processingStack);
        outputLines.push(expandedContent);
        continue;
      }

      const defineMatch = line.match(DEFINE_PATTERN);
      if (defineMatch) {
        macros.set(defineMatch[1], defineMatch[2].trimStart());
        continue;
      }

      outputLines.push(expandText(line, macros));
    }

    return outputLines.join('\n');
  } finally {
    processingStack.delete(filePath);
  }
}

async function preprocessPath(filePath, macroCache, processingStack) {
  const content = await fs.readFile(filePath, 'utf8');
  return preprocessFile(content, filePath, macroCache, processingStack);
}

async function loadMacroDefinitions(filePath, macroCache, processingStack) {
  if (macroCache.has(filePath)) {
    return macroCache.get(filePath);
  }

  if (processingStack.has(filePath)) {
    throw new Error(`Circular macro import detected for ${filePath}`);
  }

  const content = await fs.readFile(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const macros = new Map();

  processingStack.add(filePath);

  try {
    for (const line of lines) {
      const importMatch = line.match(IMPORT_PATTERN);
      if (importMatch) {
        const importedPath = await resolveMacroImport(filePath, importMatch[1].trim());
        const importedMacros = await loadMacroDefinitions(importedPath, macroCache, processingStack);

        for (const [macroName, macroValue] of importedMacros) {
          macros.set(macroName, macroValue);
        }

        continue;
      }

      const defineMatch = line.match(DEFINE_PATTERN);
      if (defineMatch) {
        macros.set(defineMatch[1], defineMatch[2].trimStart());
      }
    }
  } finally {
    processingStack.delete(filePath);
  }

  macroCache.set(filePath, macros);
  return macros;
}

async function resolveMacroImport(fromFilePath, importTarget) {
  const fileDirectory = path.dirname(fromFilePath);
  const resolutionBases = [fileDirectory, SOURCE_DIR];

  for (const basePath of resolutionBases) {
    const resolvedTarget = path.resolve(basePath, importTarget);

    if (path.extname(resolvedTarget)) {
      if (await canReadFile(resolvedTarget)) {
        return resolvedTarget;
      }

      continue;
    }

    const candidates = [resolvedTarget + '.tc', resolvedTarget + '.tcm'];

    for (const candidate of candidates) {
      if (await canReadFile(candidate)) {
        return candidate;
      }
    }
  }

  throw new Error(`Unable to resolve macro import ${importTarget} from ${fromFilePath}`);
}

async function canReadFile(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function expandText(text, macros) {
  let result = text;
  const entries = [...macros.entries()].sort((left, right) => right[0].length - left[0].length);

  for (let iteration = 0; iteration < 20; iteration += 1) {
    let changed = false;

    for (const [macroName, macroValue] of entries) {
      const pattern = new RegExp(`\\b${escapeRegExp(macroName)}\\b`, 'g');
      const nextResult = result.replace(pattern, macroValue);

      if (nextResult !== result) {
        result = nextResult;
        changed = true;
      }
    }

    if (!changed) {
      return result;
    }
  }

  throw new Error('Macro expansion did not converge');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
