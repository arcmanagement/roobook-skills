#!/usr/bin/env node
import {
  chmodSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
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
  const quotedExecutable = `'${executable.replaceAll("'", `'\\''`)}'`;
  mkdirSync(binDirectory, { recursive: true });
  writeFileSync(
    temporary,
    `#!/bin/sh\nexec ${quotedExecutable} --agent-cli "$@"\n`,
    { mode: 0o755 },
  );
  chmodSync(temporary, 0o755);
  renameSync(temporary, destination);
  return {
    destination,
    binDirectory,
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
  const { forwarded, outputPath } = parseWrapperArguments(arguments_);
  let outputDescriptor;
  try {
    outputDescriptor = outputPath ? openSync(outputPath, "w") : "inherit";
    const result = spawnSync(executable, ["--agent-cli", ...forwarded], {
      env: options.env ?? process.env,
      stdio: ["inherit", outputDescriptor, "inherit"],
    });
    if (result.error) throw result.error;
    return result.status ?? 1;
  } finally {
    if (typeof outputDescriptor === "number") closeSync(outputDescriptor);
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
