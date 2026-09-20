#!/usr/bin/env node

/**
 * Find source files that are not reachable from real application entry points.
 *
 * A plain "is this imported anywhere?" scan cannot detect dead islands: if two
 * abandoned files import each other, both look used. This audit builds the
 * TypeScript module graph instead and asks whether a runtime root can reach a
 * file at all.
 *
 * It also reports test-only reachability, Snake Encyclopedia references, LOC,
 * Vite import.meta.glob() edges, and unreachable strongly connected components
 * so dead subsystems can be removed as units.
 *
 * Test-support infrastructure under src/test is tracked by the graph but is not
 * counted as production merely because browsers do not import the headless test
 * harness.
 *
 * Usage:
 *   node scripts/check-unused-files.mjs
 *   node scripts/check-unused-files.mjs --json
 *   node scripts/check-unused-files.mjs --no-fail
 *   node scripts/check-unused-files.mjs --root=src/someEntry.ts
 */

import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC = join(ROOT, 'src');
const TSCONFIG = join(ROOT, 'tsconfig.json');
const ENCYCLOPEDIA = join(ROOT, 'docs', 'core', 'Snake Encyclopedia.md');

const TEST_FILE_PATTERN = /(?:^|\/)__tests__\/|\.(?:test|spec)\.[cm]?[jt]sx?$/;
const TEST_SUPPORT_PATTERN = /(?:^|\/)src\/test\//;
const SOURCE_FILE_PATTERN = /\.(?:ts|tsx)$/;
const DECLARATION_FILE_PATTERN = /\.d\.ts$/;

function toPosix(value) {
  return value.split(sep).join('/');
}

function repoRelative(filePath) {
  return toPosix(relative(ROOT, filePath));
}

function isInside(parent, child) {
  const rel = relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function readTsConfig() {
  const loaded = ts.readConfigFile(TSCONFIG, ts.sys.readFile);
  if (loaded.error) {
    throw new Error(ts.flattenDiagnosticMessageText(loaded.error.messageText, '\n'));
  }

  const parsed = ts.parseJsonConfigFileContent(loaded.config, ts.sys, ROOT);
  if (parsed.errors.length > 0) {
    throw new Error(
      parsed.errors
        .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
        .join('\n'),
    );
  }
  return parsed;
}

function collectFiles(parsedConfig) {
  const files = new Map();
  for (const rawPath of parsedConfig.fileNames) {
    const filePath = resolve(rawPath);
    if (!isInside(SRC, filePath) || !SOURCE_FILE_PATTERN.test(filePath)) continue;
    const content = readFileSync(filePath, 'utf-8');
    const posixPath = toPosix(filePath);
    files.set(filePath, {
      path: filePath,
      relative: repoRelative(filePath),
      content,
      lines: content.length === 0 ? 0 : content.split(/\r?\n/).length,
      isTest: TEST_FILE_PATTERN.test(posixPath),
      isTestSupport: TEST_SUPPORT_PATTERN.test(posixPath),
      isDeclaration: DECLARATION_FILE_PATTERN.test(filePath),
    });
  }
  return files;
}

function createResolver(parsedConfig, files) {
  const host = {
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    realpath: ts.sys.realpath,
    directoryExists: ts.sys.directoryExists,
    getCurrentDirectory: () => ROOT,
    getDirectories: ts.sys.getDirectories,
  };

  return (specifier, containingFile) => {
    const resolvedModule = ts.resolveModuleName(
      specifier,
      containingFile,
      parsedConfig.options,
      host,
    ).resolvedModule;
    if (!resolvedModule) return undefined;

    const resolvedPath = resolve(resolvedModule.resolvedFileName);
    if (!isInside(SRC, resolvedPath)) return undefined;
    if (files.has(resolvedPath)) return resolvedPath;
    if (resolvedPath.endsWith('.d.ts')) return undefined;

    const withoutExtension = resolvedPath.replace(/\.[^.]+$/, '');
    for (const extension of ['.ts', '.tsx']) {
      const candidate = `${withoutExtension}${extension}`;
      if (files.has(candidate)) return candidate;
    }
    return undefined;
  };
}

function globPatternToRegex(pattern) {
  let output = '^';
  for (let index = 0; index < pattern.length; index++) {
    const char = pattern[index];
    const next = pattern[index + 1];
    if (char === '*' && next === '*') {
      output += '.*';
      index++;
    } else if (char === '*') {
      output += '[^/]*';
    } else if (char === '?') {
      output += '[^/]';
    } else {
      output += char.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
    }
  }
  return new RegExp(`${output}$`);
}

function getLiteralGlobPatterns(argument) {
  if (!argument) return [];
  if (ts.isStringLiteralLike(argument)) return [argument.text];
  if (ts.isArrayLiteralExpression(argument)) {
    return argument.elements.filter(ts.isStringLiteralLike).map((element) => element.text);
  }
  return [];
}

function isImportMetaGlob(call) {
  if (!ts.isPropertyAccessExpression(call.expression)) return false;
  if (call.expression.name.text !== 'glob') return false;
  const target = call.expression.expression;
  return (
    ts.isMetaProperty(target) &&
    target.keywordToken === ts.SyntaxKind.ImportKeyword &&
    target.name.text === 'meta'
  );
}

function expandImportMetaGlob(pattern, containingFile, files) {
  const absolutePattern = toPosix(resolve(dirname(containingFile), pattern));
  const matcher = globPatternToRegex(absolutePattern);
  return [...files.keys()].filter((candidate) => matcher.test(toPosix(candidate)));
}

function buildGraph(files, parsedConfig) {
  const resolveModule = createResolver(parsedConfig, files);
  const graph = new Map([...files.keys()].map((filePath) => [filePath, new Set()]));
  const unresolved = [];

  for (const file of files.values()) {
    const source = ts.createSourceFile(
      file.path,
      file.content,
      ts.ScriptTarget.Latest,
      true,
      file.path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

    const addSpecifier = (specifier) => {
      const resolved = resolveModule(specifier, file.path);
      if (resolved) {
        graph.get(file.path).add(resolved);
      } else if (specifier.startsWith('.') || specifier.startsWith('/')) {
        unresolved.push({ from: file.relative, specifier });
      }
    };

    const visit = (node) => {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteralLike(node.moduleSpecifier)
      ) {
        addSpecifier(node.moduleSpecifier.text);
      } else if (ts.isCallExpression(node)) {
        if (
          node.expression.kind === ts.SyntaxKind.ImportKeyword &&
          node.arguments.length > 0 &&
          ts.isStringLiteralLike(node.arguments[0])
        ) {
          addSpecifier(node.arguments[0].text);
        } else if (
          ts.isIdentifier(node.expression) &&
          node.expression.text === 'require' &&
          node.arguments.length > 0 &&
          ts.isStringLiteralLike(node.arguments[0])
        ) {
          addSpecifier(node.arguments[0].text);
        } else if (isImportMetaGlob(node)) {
          for (const pattern of getLiteralGlobPatterns(node.arguments[0])) {
            for (const match of expandImportMetaGlob(pattern, file.path, files)) {
              graph.get(file.path).add(match);
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }

  return { graph, unresolved };
}

function reachableFrom(graph, roots) {
  const seen = new Set();
  const stack = [...roots];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || seen.has(current) || !graph.has(current)) continue;
    seen.add(current);
    for (const dependency of graph.get(current)) {
      if (!seen.has(dependency)) stack.push(dependency);
    }
  }
  return seen;
}

function findRuntimeRoots(files, args) {
  const explicitRoots = args
    .filter((arg) => arg.startsWith('--root='))
    .map((arg) => resolve(ROOT, arg.slice('--root='.length)));
  const candidates =
    explicitRoots.length > 0
      ? explicitRoots
      : [join(SRC, 'main.ts'), join(SRC, 'main.tsx'), join(SRC, 'App.ts'), join(SRC, 'App.tsx')];
  return candidates.filter((candidate) => files.has(candidate));
}

function encyclopediaReferences(files) {
  let content;
  try {
    content = readFileSync(ENCYCLOPEDIA, 'utf-8');
  } catch {
    return new Set();
  }

  const references = new Set();
  for (const match of content.matchAll(/src\/[A-Za-z0-9_./ -]+?\.(?:ts|tsx)/g)) {
    const candidate = resolve(ROOT, match[0]);
    if (files.has(candidate)) references.add(candidate);
  }
  return references;
}

function stronglyConnectedComponents(graph, allowed) {
  let nextIndex = 0;
  const indexByNode = new Map();
  const lowLinkByNode = new Map();
  const stack = [];
  const onStack = new Set();
  const components = [];

  const visit = (node) => {
    indexByNode.set(node, nextIndex);
    lowLinkByNode.set(node, nextIndex);
    nextIndex++;
    stack.push(node);
    onStack.add(node);

    for (const dependency of graph.get(node) ?? []) {
      if (!allowed.has(dependency)) continue;
      if (!indexByNode.has(dependency)) {
        visit(dependency);
        lowLinkByNode.set(node, Math.min(lowLinkByNode.get(node), lowLinkByNode.get(dependency)));
      } else if (onStack.has(dependency)) {
        lowLinkByNode.set(node, Math.min(lowLinkByNode.get(node), indexByNode.get(dependency)));
      }
    }

    if (lowLinkByNode.get(node) !== indexByNode.get(node)) return;
    const component = [];
    while (stack.length > 0) {
      const member = stack.pop();
      onStack.delete(member);
      component.push(member);
      if (member === node) break;
    }
    components.push(component);
  };

  for (const node of allowed) {
    if (!indexByNode.has(node)) visit(node);
  }
  return components;
}

function reverseGraph(graph) {
  const reverse = new Map([...graph.keys()].map((node) => [node, new Set()]));
  for (const [from, dependencies] of graph) {
    for (const dependency of dependencies) reverse.get(dependency)?.add(from);
  }
  return reverse;
}

function buildReport(files, graph, runtimeRoots, encyclopedia, unresolved) {
  const runtimeReachable = reachableFrom(graph, runtimeRoots);
  const testRoots = [...files.values()].filter((file) => file.isTest).map((file) => file.path);
  const testReachable = reachableFrom(graph, testRoots);
  const reverse = reverseGraph(graph);
  const production = [...files.values()].filter(
    (file) => !file.isTest && !file.isTestSupport && !file.isDeclaration,
  );
  const testSupport = [...files.values()].filter((file) => file.isTestSupport && !file.isTest);
  const unreachable = production.filter((file) => !runtimeReachable.has(file.path));
  const unreachableSet = new Set(unreachable.map((file) => file.path));

  const components = stronglyConnectedComponents(graph, unreachableSet)
    .map((members) => {
      const memberFiles = members.map((member) => files.get(member));
      return {
        files: memberFiles.map((file) => file.relative).sort(),
        lines: memberFiles.reduce((sum, file) => sum + file.lines, 0),
        encyclopediaFiles: memberFiles
          .filter((file) => encyclopedia.has(file.path))
          .map((file) => file.relative)
          .sort(),
        testOnlyFiles: memberFiles
          .filter((file) => testReachable.has(file.path))
          .map((file) => file.relative)
          .sort(),
      };
    })
    .sort((a, b) => b.lines - a.lines || b.files.length - a.files.length);

  return {
    totals: {
      sourceFiles: files.size,
      productionFiles: production.length,
      testSupportFiles: testSupport.length,
      runtimeReachableFiles: production.filter((file) => runtimeReachable.has(file.path)).length,
      unreachableFiles: unreachable.length,
      unreachableLines: unreachable.reduce((sum, file) => sum + file.lines, 0),
      testOnlyUnreachableFiles: unreachable.filter((file) => testReachable.has(file.path)).length,
      encyclopediaReferencedUnreachableFiles: unreachable.filter((file) => encyclopedia.has(file.path)).length,
    },
    runtimeRoots: runtimeRoots.map(repoRelative),
    unreachable: unreachable
      .map((file) => ({
        file: file.relative,
        lines: file.lines,
        testReachable: testReachable.has(file.path),
        encyclopediaReferenced: encyclopedia.has(file.path),
        incomingReferences: reverse.get(file.path)?.size ?? 0,
      }))
      .sort((a, b) => b.lines - a.lines || a.file.localeCompare(b.file)),
    components,
    unresolved,
  };
}

function printHuman(report) {
  console.log('Reachability audit');
  console.log(`  Runtime roots: ${report.runtimeRoots.join(', ') || '(none found)'}`);
  console.log(`  Source files: ${report.totals.sourceFiles}`);
  console.log(`  Production files: ${report.totals.productionFiles}`);
  console.log(`  Test-support files: ${report.totals.testSupportFiles}`);
  console.log(`  Runtime reachable: ${report.totals.runtimeReachableFiles}`);
  console.log(
    `  Unreachable production: ${report.totals.unreachableFiles} files / ${report.totals.unreachableLines} lines`,
  );
  console.log(`  Unreachable but test-reachable: ${report.totals.testOnlyUnreachableFiles}`);
  console.log(
    `  Unreachable but Encyclopedia-referenced: ${report.totals.encyclopediaReferencedUnreachableFiles}`,
  );

  if (report.totals.unreachableFiles === 0) {
    console.log('\nAll production files are reachable from a runtime root.');
    return;
  }

  console.log('\nLargest unreachable components:');
  for (const component of report.components.slice(0, 30)) {
    const annotations = [];
    if (component.testOnlyFiles.length > 0) annotations.push(`${component.testOnlyFiles.length} test-reachable`);
    if (component.encyclopediaFiles.length > 0) annotations.push(`${component.encyclopediaFiles.length} Encyclopedia-referenced`);
    const suffix = annotations.length > 0 ? ` [${annotations.join(', ')}]` : '';
    console.log(`  ${component.lines} lines / ${component.files.length} files${suffix}`);
    for (const file of component.files.slice(0, 12)) console.log(`    ${file}`);
    if (component.files.length > 12) console.log(`    ... ${component.files.length - 12} more`);
  }

  console.log('\nLargest individual unreachable files:');
  for (const file of report.unreachable.slice(0, 40)) {
    const annotations = [];
    if (file.testReachable) annotations.push('test-only');
    if (file.encyclopediaReferenced) annotations.push('Encyclopedia');
    const suffix = annotations.length > 0 ? ` [${annotations.join(', ')}]` : '';
    console.log(`  ${String(file.lines).padStart(6)}  ${file.file}${suffix}`);
  }

  if (report.unresolved.length > 0) {
    console.log(`\nNote: ${report.unresolved.length} relative imports could not be resolved.`);
    for (const item of report.unresolved.slice(0, 10)) console.log(`  ${item.from} -> ${item.specifier}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const parsedConfig = readTsConfig();
  const files = collectFiles(parsedConfig);
  const { graph, unresolved } = buildGraph(files, parsedConfig);
  const runtimeRoots = findRuntimeRoots(files, args);
  if (runtimeRoots.length === 0) {
    throw new Error('No runtime roots found. Pass --root=src/path/to/entry.ts explicitly.');
  }

  const report = buildReport(
    files,
    graph,
    runtimeRoots,
    encyclopediaReferences(files),
    unresolved,
  );

  if (args.includes('--json')) console.log(JSON.stringify(report, null, 2));
  else printHuman(report);

  if (report.totals.unreachableFiles > 0 && !args.includes('--no-fail')) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
