import type { FolderRecord, ProjectFileRecord } from "@/lib/server/types";

export type ExplorerFolderNode = {
  kind: "folder";
  id: string;
  path: string;
  name: string;
  isVirtual: boolean;
  children: ExplorerNode[];
};

export type ExplorerFileNode = {
  kind: "file";
  id: string;
  path: string;
  name: string;
  language: ProjectFileRecord["language"];
};

export type ExplorerNode = ExplorerFolderNode | ExplorerFileNode;

export function parentDir(filePath: string): string {
  const i = filePath.lastIndexOf("/");
  return i <= 0 ? "" : filePath.slice(0, i);
}

function upsertFolderRecord(root: ExplorerFolderNode, record: FolderRecord): void {
  const segments = record.path.split("/").filter(Boolean);
  let current = root;
  let acc = "";
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    acc = acc ? `${acc}/${seg}` : seg;
    let child = current.children.find(
      (c): c is ExplorerFolderNode => c.kind === "folder" && c.path === acc
    );
    if (!child) {
      child = {
        kind: "folder",
        id: `virtual:${acc}`,
        path: acc,
        name: seg,
        isVirtual: true,
        children: []
      };
      current.children.push(child);
    }
    if (i === segments.length - 1) {
      child.id = record.id;
      child.isVirtual = false;
    }
    current = child;
  }
}

function ensureFolderPath(root: ExplorerFolderNode, path: string): ExplorerFolderNode {
  if (!path) return root;
  const segments = path.split("/").filter(Boolean);
  let current = root;
  let acc = "";
  for (const seg of segments) {
    acc = acc ? `${acc}/${seg}` : seg;
    let child = current.children.find(
      (c): c is ExplorerFolderNode => c.kind === "folder" && c.path === acc
    );
    if (!child) {
      child = {
        kind: "folder",
        id: `virtual:${acc}`,
        path: acc,
        name: seg,
        isVirtual: true,
        children: []
      };
      current.children.push(child);
    }
    current = child;
  }
  return current;
}

function sortChildren(folder: ExplorerFolderNode): void {
  folder.children.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const c of folder.children) {
    if (c.kind === "folder") sortChildren(c);
  }
}

export function buildExplorerTree(folders: FolderRecord[], files: ProjectFileRecord[]): ExplorerFolderNode {
  const root: ExplorerFolderNode = {
    kind: "folder",
    id: "virtual:root",
    path: "",
    name: "",
    isVirtual: true,
    children: []
  };

  const sortedFolders = [...folders].sort(
    (a, b) =>
      a.path.split("/").filter(Boolean).length - b.path.split("/").filter(Boolean).length
  );
  for (const f of sortedFolders) {
    upsertFolderRecord(root, f);
  }

  for (const file of files) {
    const dir = parentDir(file.path);
    const parent = ensureFolderPath(root, dir);
    parent.children.push({
      kind: "file",
      id: file.id,
      path: file.path,
      name: file.name,
      language: file.language
    });
  }

  sortChildren(root);
  return root;
}

export function flattenExplorerFiles(root: ExplorerFolderNode): ExplorerFileNode[] {
  const out: ExplorerFileNode[] = [];
  const walk = (node: ExplorerNode) => {
    if (node.kind === "file") out.push(node);
    else node.children.forEach(walk);
  };
  walk(root);
  return out;
}
