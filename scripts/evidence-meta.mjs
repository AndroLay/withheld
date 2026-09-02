import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";

function digestEntries(entries) {
  const hash = createHash("sha256");
  for (const [name, contents] of entries.sort(([left], [right]) => left.localeCompare(right))) {
    hash.update(name);
    hash.update("\0");
    hash.update(contents);
    hash.update("\0");
  }
  return hash.digest("hex");
}

function filesUnder(root) {
  if (!existsSync(root)) return [];

  const stat = statSync(root);
  if (stat.isFile()) return [[root, readFileSync(root)]];

  return readdirSync(root, { withFileTypes: true }).flatMap((entry) =>
    filesUnder(join(root, entry.name)),
  );
}

function treeHash(root, paths) {
  const entries = paths.flatMap((path) =>
    filesUnder(resolve(root, path)).map(([file, contents]) => [relative(root, file), contents]),
  );
  return digestEntries(entries);
}

function commandOutput(command, args, cwd) {
  try {
    return execFileSync(command, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

function fileHash(file) {
  if (!existsSync(file) || !statSync(file).isFile()) return null;
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

/** Metadata that makes a generated evidence file refer to the inputs that produced it. */
export function evidenceMeta(
  packageRoot,
  { browserFlags = [], artifactPaths = [] } = {},
) {
  const repoRoot = resolve(packageRoot, "../..");
  const sourceHash = treeHash(packageRoot, [
    "index.html",
    "vite.config.ts",
    "package.json",
    "pnpm-lock.yaml",
    "tsconfig.json",
    "tsconfig.app.json",
    "tsconfig.node.json",
    "src",
    "scripts",
  ]);
  const buildHash = treeHash(packageRoot, ["dist"]);
  const status = commandOutput("git", ["status", "--porcelain", "--", "submissions/withheld"], repoRoot);

  return {
    gitSha: commandOutput("git", ["rev-parse", "HEAD"], repoRoot),
    workingTreeDirty: status !== null && status.length > 0,
    sourceSha256: sourceHash,
    buildSha256: buildHash,
    node: process.version,
    browserFlags: [...browserFlags],
    artifactSha256: Object.fromEntries(
      artifactPaths.map((path) => [relative(packageRoot, path), fileHash(path)]),
    ),
  };
}
