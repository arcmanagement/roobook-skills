#!/usr/bin/env node
import {
  chmodSync,
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const executableSuffix = join("Contents", "MacOS", "RooBook");

export function resolveRooBookExecutable({ env = process.env, home = env.HOME } = {}) {
  const candidates = [
    env.ROOBOOK_APP_PATH,
    "/Applications/RooBook.app",
    home ? join(home, "Applications", "RooBook.app") : undefined,
  ].filter(Boolean);
  for (const candidate of candidates) {
    const executable = candidate.endsWith(".app")
      ? join(candidate, executableSuffix)
      : candidate;
    if (existsSync(executable)) return realpathSync(executable);
  }
  throw new Error(
    "RooBook.app was not found. Install RooBook from the Mac App Store or set ROOBOOK_APP_PATH.",
  );
}

export function parseWrapperArguments(arguments_) {
  const forwarded = [];
  let outputPath;
  for (let index = 0; index < arguments_.length; index += 1) {
    if (arguments_[index] !== "--output") {
      forwarded.push(arguments_[index]);
      continue;
    }
    if (!arguments_[index + 1]) throw new Error("--output requires a file path");
    outputPath = resolve(arguments_[index + 1]);
    index += 1;
  }
  return { forwarded, outputPath };
}

export function stageImportArguments(arguments_, options = {}) {
  if (arguments_[0] !== "import") {
    return { forwarded: arguments_, cleanup() {} };
  }
  const env = options.env ?? process.env;
  const home = options.home ?? env.HOME;
  if (!home) throw new Error("HOME is required to stage a PDF import.");
  let sourceArgument;
  let remaining;
  if (arguments_[1] === "--file") {
    sourceArgument = arguments_[2];
    remaining = arguments_.slice(3);
  } else {
    sourceArgument = arguments_[1];
    remaining = arguments_.slice(2);
  }
  if (!sourceArgument) throw new Error("Usage: roobook import <book.pdf>");
  const source = realpathSync(resolve(sourceArgument));
  if (!statSync(source).isFile() || !source.toLowerCase().endsWith(".pdf")) {
    throw new Error("Import source must be an existing PDF file.");
  }
  const root = options.importRoot
    ?? env.ROOBOOK_AGENT_IMPORT_ROOT
    ?? join(
      home,
      "Library",
      "Containers",
      "app.roobook",
      "Data",
      "Library",
      "Application Support",
      "RooBook",
      "ImportSources",
    );
  const jobId = options.jobId ?? randomUUID();
  const directory = join(root, jobId.toLowerCase());
  const staged = join(directory, basename(source));
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  copyFileSync(source, staged);
  return {
    forwarded: ["import", "--file", staged, ...remaining],
    jobId,
    staged,
    cleanup() {
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

export function importHandoff(executable, staged, options = {}) {
  const jobId = options.jobId ?? randomUUID();
  const appBundle = dirname(dirname(dirname(executable)));
  const submit = (options.spawn ?? spawnSync)(
    executable,
    ["--agent-cli", "submit-import", "--job", jobId, "--file", staged],
    {
      encoding: "utf8",
      env: options.env ?? process.env,
      timeout: options.timeout ?? 10_000,
    },
  );
  if (submit.error) throw submit.error;
  if (submit.status !== 0) {
    throw new Error(submit.stderr?.trim() || "RooBook rejected the import handoff.");
  }
  const result = (options.spawn ?? spawnSync)(
    options.openExecutable ?? "/usr/bin/open",
    ["-g", "-a", appBundle],
    {
      encoding: "utf8",
      env: options.env ?? process.env,
      timeout: options.timeout ?? 10_000,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || "RooBook could not start for the import handoff.");
  }
  const queued = options.queuePath
    ? waitForImportQueue(options.queuePath, jobId, options.queueWaitMs ?? 10_000)
    : undefined;
  return {
    jobId,
    status: queued?.state ?? "submitted",
    progress: queued?.progress,
    message: queued?.message,
    bookId: queued?.bookId,
    file: basename(staged),
    appBundle,
  };
}

export function waitForImportQueue(queuePath, jobId, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  const sleeper = new Int32Array(new SharedArrayBuffer(4));
  do {
    try {
      const snapshot = JSON.parse(readFileSync(queuePath, "utf8"));
      const item = snapshot.items?.find(
        (candidate) => candidate.id?.toLowerCase() === jobId.toLowerCase(),
      );
      if (item) return item;
    } catch {
      // Atomic replacement or first launch can briefly leave no readable file.
    }
    Atomics.wait(sleeper, 0, 0, 100);
  } while (Date.now() < deadline);
  return undefined;
}

export function resolveSharedPaths(executable, options = {}) {
  const result = (options.spawn ?? spawnSync)(
    executable,
    ["--agent-cli", "paths"],
    {
      encoding: "utf8",
      env: options.env ?? process.env,
      timeout: options.timeout ?? 10_000,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || "RooBook shared paths are unavailable.");
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error("RooBook returned invalid shared path metadata.");
  }
}

export function installShellCommand(options = {}) {
  const env = options.env ?? process.env;
  const home = options.home ?? env.HOME;
  if (!home) throw new Error("HOME is required to install the shell command.");
  const executable = options.executable ?? resolveRooBookExecutable({ env, home });
  const probe = spawnSync(executable, ["--agent-cli", "help"], {
    encoding: "utf8",
    env,
    timeout: options.timeout ?? 5_000,
  });
  if (probe.status !== 0 || !probe.stdout?.includes("RooBook AI CLI")) {
    throw new Error(
      "RooBook is installed, but this version does not contain the AI CLI. Update RooBook in the Mac App Store and try again.",
    );
  }
  const binDirectory = options.binDirectory
    ?? env.ROOBOOK_CLI_BIN_DIR
    ?? join(home, ".local", "bin");
  const destination = join(binDirectory, "roobook");
  const temporary = `${destination}.tmp-${process.pid}`;
  const wrapperDirectory = join(home, ".local", "share", "roobook-cli");
  const wrapperDestination = join(wrapperDirectory, "roobook.mjs");
  const wrapperTemporary = `${wrapperDestination}.tmp-${process.pid}`;
  const wrapperSource = realpathSync(fileURLToPath(import.meta.url));
  const quotedWrapper = `'${wrapperDestination.replaceAll("'", `'\\''`)}'`;
  mkdirSync(binDirectory, { recursive: true });
  mkdirSync(wrapperDirectory, { recursive: true });
  copyFileSync(wrapperSource, wrapperTemporary);
  chmodSync(wrapperTemporary, 0o755);
  renameSync(wrapperTemporary, wrapperDestination);
  writeFileSync(
    temporary,
    `#!/bin/sh\nexec /usr/bin/env node ${quotedWrapper} "$@"\n`,
    { mode: 0o755 },
  );
  chmodSync(temporary, 0o755);
  renameSync(temporary, destination);
  return {
    destination,
    binDirectory,
    wrapperDestination,
    pathConfigured: (env.PATH ?? "").split(":").includes(binDirectory),
  };
}

export function run(arguments_ = process.argv.slice(2), options = {}) {
  if (process.platform !== "darwin" && !options.allowNonDarwin) {
    throw new Error("The RooBook native CLI currently requires macOS.");
  }
  if (arguments_[0] === "install-shell-command") {
    const installed = installShellCommand(options);
    process.stdout.write(`Installed ${installed.destination}\n`);
    if (!installed.pathConfigured) {
      process.stdout.write(
        `Add ${installed.binDirectory} to PATH, then run: roobook doctor\n`,
      );
    }
    return 0;
  }
  const executable = options.executable ?? resolveRooBookExecutable(options);
  const parsed = parseWrapperArguments(arguments_);
  const sharedPaths = parsed.forwarded[0] === "import"
    && !options.importRoot
    && !options.env?.ROOBOOK_AGENT_IMPORT_ROOT
    ? resolveSharedPaths(executable, options)
    : undefined;
  const importOptions = sharedPaths
    ? {
        ...options,
        importRoot: sharedPaths.importSources,
      }
    : options;
  const staged = stageImportArguments(parsed.forwarded, importOptions);
  let outputDescriptor;
  let preserveStagedImport = false;
  try {
    if (parsed.forwarded[0] === "import") {
      const handoff = importHandoff(executable, staged.staged, {
        ...options,
        env: options.env ?? process.env,
        jobId: staged.jobId,
        queuePath: sharedPaths?.importQueue,
      });
      const output = `${JSON.stringify(handoff, null, 2)}\n`;
      if (parsed.outputPath) writeFileSync(parsed.outputPath, output);
      else process.stdout.write(output);
      preserveStagedImport = true;
      return 0;
    }
    outputDescriptor = parsed.outputPath ? openSync(parsed.outputPath, "w") : "inherit";
    const result = spawnSync(executable, ["--agent-cli", ...staged.forwarded], {
      env: options.env ?? process.env,
      stdio: ["inherit", outputDescriptor, "inherit"],
    });
    if (result.error) throw result.error;
    return result.status ?? 1;
  } finally {
    if (typeof outputDescriptor === "number") closeSync(outputDescriptor);
    if (!preserveStagedImport) staged.cleanup();
  }
}

const invokedDirectly = process.argv[1]
  && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  try {
    process.exitCode = run();
  } catch (error) {
    process.stderr.write(`roobook: ${error.message}\n`);
    process.exitCode = 1;
  }
}
