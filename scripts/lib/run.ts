/**
 * scripts/lib/run.ts — the small process helpers every local tool script shares (U1;
 * cicd-pipeline.md).
 *
 * - `say` writes one line to stdout (the scripts are CLI entries; no console.log in code).
 * - `run` starts a command, streams or captures its output, and returns the exit code; it
 *   never goes through a shell, so no argument is ever re-parsed.
 * - `childEnv` is the environment for child processes with `CI` removed, so a local run can
 *   never relax a benchmark budget meant for slow hosted runners (team.md Way of Working).
 * - `gitHead` / `gitDirty` read the commit the build and smoke check compare.
 */
export const say = (line: string): void => {
  process.stdout.write(`${line}\n`);
};

export const fail = (line: string): never => {
  process.stderr.write(`${line}\n`);
  process.exit(1);
};

export const childEnv = (extra: Record<string, string> = {}): Record<string, string> => {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined && k !== "CI") env[k] = v;
  }
  return { ...env, ...extra };
};

/** Read a byte stream to its end, handing each decoded chunk to `onText`. */
export const eachChunk = async (
  stream: ReadableStream<Uint8Array>,
  onText: (text: string) => void,
): Promise<void> => {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    onText(decoder.decode(value, { stream: true }));
  }
};

export interface RunResult {
  readonly code: number;
  readonly out: string;
}

export interface RunOptions {
  readonly cwd?: string;
  readonly env?: Record<string, string>;
  /** Capture output instead of streaming it to the terminal. */
  readonly capture?: boolean;
  /** Stream and also capture (for scripts that parse a step's output). */
  readonly tee?: boolean;
}

export const run = async (
  cmd: ReadonlyArray<string>,
  opts: RunOptions = {},
): Promise<RunResult> => {
  const quiet = opts.capture === true;
  const keep = quiet || opts.tee === true;
  const proc = Bun.spawn([...cmd], {
    cwd: opts.cwd ?? process.cwd(),
    env: opts.env ?? childEnv(),
    stdout: keep ? "pipe" : "inherit",
    stderr: keep ? "pipe" : "inherit",
    stdin: "ignore",
  });
  let out = "";
  if (keep) {
    const pump = async (stream: ReadableStream<Uint8Array>, sink: NodeJS.WriteStream) => {
      await eachChunk(stream, (text) => {
        out += text;
        if (!quiet) sink.write(text);
      });
    };
    await Promise.all([
      pump(proc.stdout as ReadableStream<Uint8Array>, process.stdout),
      pump(proc.stderr as ReadableStream<Uint8Array>, process.stderr),
    ]);
  }
  const code = await proc.exited;
  return { code, out };
};

export const gitHead = async (): Promise<string> =>
  (await run(["git", "rev-parse", "HEAD"], { capture: true })).out.trim();

export const gitDirty = async (): Promise<boolean> =>
  (await run(["git", "status", "--porcelain", "--untracked-files=no"], { capture: true })).out
    .trim()
    .split("\n")
    .some((l) => l.trim() !== "" && !l.includes("aidlc/spaces/"));
