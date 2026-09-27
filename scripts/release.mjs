// Tags and pushes a release; GitHub Actions then builds it and publishes the GitHub Release.
//
//   node scripts/release.mjs uploader [X.Y.Z]   -> tag uploader-vX.Y.Z (.github/workflows/build-uploader.yml)
//   node scripts/release.mjs addon    [X.Y.Z]   -> tag vX.Y.Z          (.github/workflows/build-nexus-addon.yml)
//
// Without a version the patch number of the latest release is increased. Used by `make release-uploader` /
// `make release-addon` (plain Node + git, so it works the same from PowerShell, cmd.exe and bash), and by the
// workflows' "Run workflow → release" button. In GitHub Actions the tag and version are written to $GITHUB_OUTPUT and
// the same run builds and publishes (a tag pushed with GITHUB_TOKEN doesn't start another workflow run).
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const PRODUCTS = {
  // Nexus only understands plain vX.Y.Z tags, so the addon has no prefix (see nexus-addon/src/entry.cpp).
  uploader: { prefix: "uploader-v", workflow: "build-uploader.yml" },
  addon: { prefix: "v", workflow: "build-nexus-addon.yml" },
};
const REPO_URL = "https://github.com/NenadGvozdenac/GW2-Arcdps-Helper";
const VERSION = /^(\d+)\.(\d+)\.(\d+)$/;
const CI = process.env.GITHUB_ACTIONS === "true";

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

function fail(message) {
  console.error(`\n  ✖ ${message}\n`);
  process.exit(1);
}

function compare(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

const [productName, requested] = process.argv.slice(2);
const product = PRODUCTS[productName];
if (!product) fail(`Unknown product "${productName ?? ""}". Use "uploader" or "addon".`);

if (CI) {
  // Actions checks out the commit the run was started on.
  if (process.env.GITHUB_REF !== "refs/heads/main") fail(`Releases are made from main, not ${process.env.GITHUB_REF}.`);
  git("fetch", "--quiet", "--tags", "origin");
} else {
  // The tag builds the commit it points to, so that commit must be the one on GitHub.
  if (git("status", "--porcelain")) fail("You have uncommitted changes. Commit (and push) them first.");
  const branch = git("branch", "--show-current");
  if (branch !== "main") fail(`You are on "${branch}". Releases are made from main.`);
  git("fetch", "--quiet", "--tags", "origin");
  if (git("rev-list", "--count", "origin/main..HEAD") !== "0") fail("main has commits that are not on GitHub yet. Run `git push` first.");
  if (git("rev-list", "--count", "HEAD..origin/main") !== "0") fail("GitHub has newer commits on main. Run `git pull` first.");
}

const tagPattern = new RegExp(`^${product.prefix.replace("-", "\\-")}(\\d+\\.\\d+\\.\\d+)$`);
const released = git("tag", "--list")
  .split("\n")
  .map((tag) => tagPattern.exec(tag.trim())?.[1])
  .filter(Boolean)
  .sort(compare);
const latest = released.at(-1) ?? null;

let version = requested?.replace(/^v/, "");
if (!version) {
  const [major, minor, patch] = (latest ?? "0.0.0").split(".").map(Number);
  version = `${major}.${minor}.${patch + 1}`;
}
if (!VERSION.test(version)) fail(`"${version}" is not a version like 1.2.3.`);
if (latest && compare(version, latest) <= 0) fail(`${version} is not newer than the latest ${productName} release ${latest}.`);

const tag = `${product.prefix}${version}`;
console.log(`\n  ${productName}: ${latest ?? "(none yet)"} -> ${version}  (tag ${tag} on ${git("rev-parse", "--short", "HEAD")})`);
git("tag", tag);
try {
  execFileSync("git", ["push", "origin", tag], { stdio: "inherit" });
} catch {
  git("tag", "-d", tag);
  fail(`Pushing ${tag} failed; the local tag was removed again.`);
}
if (CI) {
  // The following workflow steps build this version and publish the release under this tag.
  appendFileSync(process.env.GITHUB_OUTPUT, `tag=${tag}\nversion=${version}\n`);
  console.log(`\n  ✔ Pushed ${tag}. This run builds and publishes it.\n`);
} else {
  console.log(`\n  ✔ Pushed ${tag}. GitHub Actions builds it now:`);
  console.log(`    ${REPO_URL}/actions/workflows/${product.workflow}`);
  console.log(`    The release appears at ${REPO_URL}/releases/tag/${tag}\n`);
}
