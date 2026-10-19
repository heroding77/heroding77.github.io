const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { execFileSync } = require("node:child_process");

test("statistics publishing preserves history and main, and treats unchanged data as success", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "portfolio-workflow-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const remote = join(dir, "origin.git"),
    seed = join(dir, "seed"),
    runner = join(dir, "runner");
  const git = (cwd, ...args) =>
    execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  mkdirSync(seed);
  mkdirSync(runner);
  git(dir, "init", "--bare", "--initial-branch=main", remote);
  git(seed, "init", "--initial-branch=main");
  git(seed, "config", "user.name", "Test");
  git(seed, "config", "user.email", "test@example.invalid");
  for (const file of ["gs_data.json", "gs_data_shieldsio.json"])
    writeFileSync(join(seed, file), "{}\n");
  git(seed, "add", ".");
  git(seed, "commit", "-m", "Initial snapshot");
  git(seed, "branch", "google-scholar-stats");
  git(seed, "remote", "add", "origin", remote);
  git(seed, "push", "origin", "main", "google-scholar-stats");
  const original = git(seed, "rev-parse", "HEAD");
  const results = join(seed, "google_scholar_crawler", "results");
  mkdirSync(results, { recursive: true });
  writeFileSync(
    join(results, "gs_data.json"),
    JSON.stringify({ citedby: 3000 }),
  );
  writeFileSync(
    join(results, "gs_data_shieldsio.json"),
    JSON.stringify({ message: "3000" }),
  );
  const yaml = readFileSync(
    resolve(__dirname, "../.github/workflows/google_scholar_crawler.yaml"),
    "utf8",
  );
  const script = yaml
    .slice(yaml.lastIndexOf("        run: |\n") + "        run: |\n".length)
    .split("\n")
    .map((line) => (line.startsWith("          ") ? line.slice(10) : line))
    .join("\n");
  const run = () =>
    execFileSync("bash", ["-e", "-o", "pipefail", "-c", script], {
      cwd: seed,
      env: { ...process.env, RUNNER_TEMP: runner },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  run();
  const next = git(remote, "rev-parse", "google-scholar-stats");
  assert.equal(git(remote, "rev-parse", "main"), original);
  assert.equal(git(remote, "rev-parse", "google-scholar-stats^"), original);
  assert.equal(
    JSON.parse(git(remote, "show", "google-scholar-stats:gs_data.json"))
      .citedby,
    3000,
  );
  // A new Actions run has a fresh RUNNER_TEMP directory.
  const secondRunner = join(dir, "runner-second");
  mkdirSync(secondRunner);
  execFileSync("bash", ["-e", "-o", "pipefail", "-c", script], {
    cwd: seed,
    env: { ...process.env, RUNNER_TEMP: secondRunner },
    stdio: ["ignore", "pipe", "pipe"],
  });
  assert.equal(git(remote, "rev-parse", "google-scholar-stats"), next);
});
