export interface VirtualFile {
  kind: 'file';
  content: string;
}

export interface VirtualDirectory {
  kind: 'directory';
}

export type VirtualNode = VirtualFile | VirtualDirectory;
export type FileEntry = [path: string, node: VirtualNode];

const MAX_ENTRIES = 256;
const MAX_FILE_LENGTH = 16_384;
const MAX_TOTAL_LENGTH = 131_072;
const MAX_PATH_LENGTH = 256;

export function resolvePath(cwd: string, input: string): string {
  if (input.length > MAX_PATH_LENGTH || /[\u0000-\u001f]/u.test(input)) {
    throw new Error('Invalid path');
  }
  const path = input.startsWith('/') ? input : `${cwd}/${input}`;
  const parts: string[] = [];
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  const resolved = `/${parts.join('/')}`;
  if (resolved.length > MAX_PATH_LENGTH) throw new Error('Path too long');
  return resolved;
}

function parent(path: string): string {
  return path.slice(0, path.lastIndexOf('/')) || '/';
}

/** Flat, bounded, JSON-safe file tree; never touches the host filesystem. */
export class VirtualFileSystem {
  private nodes = new Map<string, VirtualNode>([['/', { kind: 'directory' }]]);

  constructor(entries: readonly FileEntry[] = []) {
    if (entries.length > MAX_ENTRIES) throw new Error('Disk full');
    const sorted = [...entries].sort(([a], [b]) => a.length - b.length);
    for (const [path, node] of sorted) {
      if (resolvePath('/', path) !== path) throw new Error('Invalid saved path');
      if (path === '/' && node.kind === 'directory') continue;
      if (node.kind === 'directory') this.mkdir(path);
      else if (node.kind === 'file') this.write(path, node.content);
      else throw new Error('Invalid saved entry');
    }
  }

  serialize(): FileEntry[] {
    return [...this.nodes].map(([path, node]) => [path, { ...node }]);
  }

  isDirectory(path: string): boolean {
    return this.nodes.get(path)?.kind === 'directory';
  }

  exists(path: string): boolean {
    return this.nodes.has(path);
  }

  list(path: string): string[] {
    if (!this.isDirectory(path)) throw new Error('Not a directory');
    return [...this.nodes]
      .filter(([key]) => key !== path && parent(key) === path)
      .map(([key, node]) => `${key.slice(key.lastIndexOf('/') + 1)}${node.kind === 'directory' ? '/' : ''}`)
      .sort();
  }

  read(path: string): string {
    const node = this.nodes.get(path);
    if (node?.kind !== 'file') throw new Error('Not a file');
    return node.content;
  }

  private checkDestination(path: string): void {
    if (resolvePath('/', path) !== path || path === '/') throw new Error('Invalid destination');
    if (!this.isDirectory(parent(path))) throw new Error('Parent directory does not exist');
    if (!this.nodes.has(path) && this.nodes.size >= MAX_ENTRIES) throw new Error('Disk full');
  }

  mkdir(path: string): void {
    this.checkDestination(path);
    if (this.nodes.has(path)) throw new Error('Already exists');
    this.nodes.set(path, { kind: 'directory' });
  }

  write(path: string, content: string): void {
    this.checkDestination(path);
    if (this.isDirectory(path)) throw new Error('Is a directory');
    if (typeof content !== 'string' || content.length > MAX_FILE_LENGTH) {
      throw new Error('File too large or invalid');
    }
    let total = content.length;
    for (const [key, node] of this.nodes) {
      if (key !== path && node.kind === 'file') total += node.content.length;
    }
    if (total > MAX_TOTAL_LENGTH) throw new Error('Disk full');
    this.nodes.set(path, { kind: 'file', content });
  }

  remove(path: string): void {
    if (path === '/') throw new Error('Cannot remove root');
    if (!this.nodes.has(path)) throw new Error('No such file or directory');
    if (this.isDirectory(path) && this.list(path).length) throw new Error('Directory not empty');
    this.nodes.delete(path);
  }
}
