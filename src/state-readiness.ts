import {
  existsSync,
  readFileSync,
  statSync,
} from "node:fs";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";

export type StateReadiness = "PASS" | "DEGRADED" | "BLOCK";
export type FindingLevel = Exclude<StateReadiness, "PASS">;

export interface StateReadinessFinding {
  code: string;
  level: FindingLevel;
  message: string;
  path: string;
}

export interface StateReadinessResult {
  readiness: StateReadiness;
  project: string;
  projectCwd: string;
  workspaceRoot: string;
  checkedAt: string;
  findings: StateReadinessFinding[];
}

export interface StateReadinessOptions {
  projectCwd: string;
  projectName?: string;
  workspaceRoot?: string;
  now?: Date;
}

interface ParsedTimestamp {
  date: Date;
  dateKey: string;
  precision: "date" | "time";
}

interface LogTimestamps {
  latest?: ParsedTimestamp;
  future: ParsedTimestamp[];
  parsedCount: number;
}

const MAX_SHARED_BYTES = 24 * 1024;
const MAX_HANDOFF_BYTES = 4 * 1024;
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;
const HOT_DEGRADED_LAG_MS = 5 * 60 * 1000;
const HOT_BLOCK_LAG_MS = 14 * 24 * 60 * 60 * 1000;
const ACTIVE_ACTION_LAG_MS = 24 * 60 * 60 * 1000;
const WORKSPACE_STATE_LAG_MS = 7 * 24 * 60 * 60 * 1000;
const PROJECT_SUFFIXES = ["-ai", "-app", "-web", "-site", "-cli"] as const;
const NEW_YORK_OFFSET_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  timeZoneName: "shortOffset",
});

function read(path: string): string | undefined {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return undefined;
  }
}

function fileSize(path: string): number | undefined {
  try {
    return statSync(path).size;
  } catch {
    return undefined;
  }
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function newYorkOffsetMinutes(instant: Date): number {
  const name = NEW_YORK_OFFSET_FORMATTER
    .formatToParts(instant)
    .find((part) => part.type === "timeZoneName")?.value;
  const match = name?.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
  if (!match?.[1] || !match[2]) return -240;
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? "0");
  return match[1] === "+" ? minutes : -minutes;
}

function newYorkWallTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond = 0,
): Date {
  const wallUtc = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
    second,
    millisecond,
  );
  let candidate = new Date(wallUtc);
  for (let index = 0; index < 2; index += 1) {
    candidate = new Date(wallUtc - newYorkOffsetMinutes(candidate) * 60_000);
  }
  return candidate;
}

function dateParts(dateKey: string): [number, number, number] | undefined {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match?.[1] || !match[2] || !match[3]) return undefined;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function parseStateTimestamp(value: string): ParsedTimestamp | undefined {
  const trimmed = value.trim();
  const dateOnly = trimmed.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (dateOnly?.[1]) {
    const parts = dateParts(dateOnly[1]);
    if (!parts) return undefined;
    const date = newYorkWallTime(parts[0], parts[1], parts[2], 0, 0, 0);
    return Number.isNaN(date.getTime())
      ? undefined
      : { date, dateKey: dateOnly[1], precision: "date" };
  }

  const newYorkZoned = trimmed.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?\s*(?:(AM|PM)\s*)?(?:EDT|EST|ET)$/i,
  );
  if (
    newYorkZoned?.[1] &&
    newYorkZoned[2] &&
    newYorkZoned[3]
  ) {
    const parts = dateParts(newYorkZoned[1]);
    if (!parts) return undefined;
    let hour = Number(newYorkZoned[2]);
    if (newYorkZoned[5]) {
      hour %= 12;
      if (newYorkZoned[5].toUpperCase() === "PM") hour += 12;
    }
    const date = newYorkWallTime(
      parts[0],
      parts[1],
      parts[2],
      hour,
      Number(newYorkZoned[3]),
      Number(newYorkZoned[4] ?? "0"),
    );
    return Number.isNaN(date.getTime())
      ? undefined
      : { date, dateKey: newYorkZoned[1], precision: "time" };
  }

  const explicitOffset = trimmed.match(
    /^(\d{4}-\d{2}-\d{2})[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/,
  );
  if (!explicitOffset?.[1]) return undefined;
  const parsed = new Date(trimmed.replace(" ", "T"));
  return Number.isNaN(parsed.getTime())
    ? undefined
    : { date: parsed, dateKey: explicitOffset[1], precision: "time" };
}

function timestampFromHeading(line: string): ParsedTimestamp | undefined {
  const match = line.match(
    /^#{2,3}\s+\[?(\d{4}-\d{2}-\d{2}(?:[ T]\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2}|\s+(?:(?:AM|PM)\s+)?(?:EDT|EST|ET)))?)/i,
  );
  return match?.[1] ? parseStateTimestamp(match[1]) : undefined;
}

function logTimestamps(markdown: string, now: Date): LogTimestamps {
  const parsed: ParsedTimestamp[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const timestamp = timestampFromHeading(line);
    if (timestamp) parsed.push(timestamp);
  }
  const future = parsed
    .filter(
      (timestamp) =>
        timestamp.date.getTime() > now.getTime() + FUTURE_TOLERANCE_MS,
    )
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  const usable = parsed
    .filter(
      (timestamp) =>
        timestamp.date.getTime() <= now.getTime() + FUTURE_TOLERANCE_MS,
    )
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  return { latest: usable[0], future, parsedCount: parsed.length };
}

function hotHeadingRuns(markdown: string): ParsedTimestamp[][] {
  const runs: ParsedTimestamp[][] = [[]];
  for (const line of markdown.split(/\r?\n/)) {
    if (/^##\s+/.test(line) && !/^###\s+/.test(line)) {
      runs.push([]);
      continue;
    }
    if (!/^###\s+/.test(line)) continue;
    const timestamp = timestampFromHeading(line);
    if (timestamp) runs.at(-1)?.push(timestamp);
  }
  return runs.filter((run) => run.length > 0);
}

function targetReferenceTime(target: ParsedTimestamp): number {
  if (target.precision === "time") return target.date.getTime();
  const parts = dateParts(target.dateKey);
  if (!parts) return target.date.getTime();
  return newYorkWallTime(
    parts[0],
    parts[1],
    parts[2],
    23,
    59,
    59,
    999,
  ).getTime();
}

function sourceLagMs(
  source: ParsedTimestamp,
  target: ParsedTimestamp,
): number {
  return source.date.getTime() - targetReferenceTime(target);
}

function sourceIsNewer(
  source: ParsedTimestamp,
  target: ParsedTimestamp,
  toleranceMs: number,
): boolean {
  return sourceLagMs(source, target) > toleranceMs;
}

function findWorkspaceRoot(projectCwd: string): string | undefined {
  let cursor = resolve(projectCwd);
  while (true) {
    if (
      isDirectory(join(cursor, "_wikis")) &&
      existsSync(join(cursor, "_workspace_state.md"))
    ) {
      return cursor;
    }
    const parent = dirname(cursor);
    if (parent === cursor) return undefined;
    cursor = parent;
  }
}

function gitProjectName(
  projectCwd: string,
  workspaceRoot: string,
): string | undefined {
  let cursor = projectCwd;
  while (cursor !== workspaceRoot && cursor.startsWith(`${workspaceRoot}${sep}`)) {
    const dotGit = join(cursor, ".git");
    const gitFile = read(dotGit);
    const gitDir = gitFile?.match(/^gitdir:\s*(.+)$/m)?.[1]?.trim();
    if (gitDir) {
      const marker = `${sep}.git${sep}worktrees${sep}`;
      const markerIndex = gitDir.indexOf(marker);
      if (markerIndex !== -1) {
        return basename(gitDir.slice(0, markerIndex));
      }
    }
    cursor = dirname(cursor);
  }
  return undefined;
}

function deriveProjectName(
  projectCwd: string,
  workspaceRoot: string,
  explicit?: string,
): string {
  const override = explicit?.trim();
  if (override) return override;
  const firstSegment = relative(workspaceRoot, projectCwd).split(sep)[0];
  if (
    firstSegment &&
    firstSegment !== "." &&
    firstSegment !== ".." &&
    !firstSegment.startsWith("_")
  ) {
    return firstSegment;
  }
  const gitName = gitProjectName(projectCwd, workspaceRoot);
  if (gitName) return gitName;
  return basename(projectCwd);
}

function wikiCandidates(workspaceRoot: string, project: string): string[] {
  const names = [project];
  for (const suffix of PROJECT_SUFFIXES) {
    if (project.endsWith(suffix)) {
      const stripped = project.slice(0, -suffix.length);
      if (stripped) names.push(stripped);
    }
  }
  return names.flatMap((name) => [
    join(workspaceRoot, "_wikis", name, "wiki"),
    join(workspaceRoot, `${name}-wiki`, "wiki"),
  ]);
}

function resolveWikiDir(
  workspaceRoot: string,
  project: string,
): { path: string; exists: boolean } {
  const candidates = wikiCandidates(workspaceRoot, project);
  const found = candidates.find((candidate) => isDirectory(candidate));
  return {
    path: found ?? candidates[0] ?? join(workspaceRoot, "_wikis", project, "wiki"),
    exists: found !== undefined,
  };
}

function frontmatterValue(markdown: string, key: string): string | undefined {
  return markdown.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]?.trim();
}

function projectSection(markdown: string, project: string): string | undefined {
  const escaped = project.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return markdown.match(
    new RegExp(
      `<!-- BEGIN: ${escaped} -->([\\s\\S]*?)<!-- END: ${escaped} -->`,
    ),
  )?.[1];
}

function result(
  readiness: StateReadiness,
  project: string,
  projectCwd: string,
  workspaceRoot: string,
  now: Date,
  findings: StateReadinessFinding[],
): StateReadinessResult {
  return {
    readiness,
    project,
    projectCwd,
    workspaceRoot,
    checkedAt: now.toISOString(),
    findings,
  };
}

export function assessStateReadiness(
  options: StateReadinessOptions,
): StateReadinessResult {
  if (!options.projectCwd || !isAbsolute(options.projectCwd)) {
    throw new Error("projectCwd must be an absolute path");
  }
  const projectCwd = resolve(options.projectCwd);
  const now = options.now ?? new Date();
  const discoveredRoot = options.workspaceRoot
    ? resolve(options.workspaceRoot)
    : findWorkspaceRoot(projectCwd);
  const fallbackProject = options.projectName?.trim() || basename(projectCwd);
  if (!discoveredRoot) {
    return result(
      "DEGRADED",
      fallbackProject,
      projectCwd,
      "",
      now,
      [{
        code: "WORKSPACE_ROOT_MISSING",
        level: "DEGRADED",
        message: "Exclude shared continuity state: no workspace root was found.",
        path: projectCwd,
      }],
    );
  }
  const workspaceRoot = discoveredRoot;
  const project = deriveProjectName(
    projectCwd,
    workspaceRoot,
    options.projectName,
  );
  if (
    !project ||
    project.includes("/") ||
    project.includes("\\") ||
    project === "." ||
    project === ".."
  ) {
    throw new Error("projectName must be a basename, not a path");
  }

  const findings: StateReadinessFinding[] = [];
  const add = (
    code: string,
    level: FindingLevel,
    message: string,
    path: string,
  ): void => {
    findings.push({ code, level, message, path });
  };

  const handoffPath = join(workspaceRoot, "_handoff.md");
  const handoff = read(handoffPath);
  const handoffBytes = fileSize(handoffPath);
  if (handoff === undefined) {
    add(
      "HANDOFF_MISSING",
      "DEGRADED",
      "Exclude handoff: file is missing or unreadable.",
      handoffPath,
    );
  } else if (handoff.length === 0) {
    add("HANDOFF_EMPTY", "DEGRADED", "Exclude handoff: file is empty.", handoffPath);
  } else {
    if (handoffBytes !== undefined && handoffBytes > MAX_HANDOFF_BYTES) {
      add(
        "HANDOFF_OVERSIZE",
        "DEGRADED",
        `Exclude handoff: ${handoffBytes} bytes exceeds the 4096-byte live-context budget.`,
        handoffPath,
      );
    }
    const closedAt = frontmatterValue(handoff, "closed_at");
    const ttlHours = Number(frontmatterValue(handoff, "ttl_hours"));
    const handoffProject = frontmatterValue(handoff, "project");
    if (handoffProject && handoffProject !== project) {
      add(
        "HANDOFF_PROJECT_MISMATCH",
        "DEGRADED",
        `Exclude handoff: it belongs to ${handoffProject}, not ${project}.`,
        handoffPath,
      );
    }
    const closed = closedAt ? parseStateTimestamp(closedAt) : undefined;
    if (!closed || !Number.isFinite(ttlHours) || ttlHours <= 0) {
      add(
        "HANDOFF_TTL_INVALID",
        "DEGRADED",
        "Exclude handoff: closed_at or ttl_hours is missing or invalid.",
        handoffPath,
      );
    } else {
      const expiresAt = new Date(closed.date.getTime() + ttlHours * 3_600_000);
      if (now.getTime() > expiresAt.getTime()) {
        add(
          "HANDOFF_EXPIRED",
          "DEGRADED",
          `Exclude handoff: TTL expired at ${expiresAt.toISOString()}.`,
          handoffPath,
        );
      }
    }
  }

  const wiki = resolveWikiDir(workspaceRoot, project);
  const hotPath = join(wiki.path, "hot.md");
  const logPath = join(wiki.path, "log.md");
  const hot = read(hotPath);
  const log = read(logPath);
  const hotBytes = fileSize(hotPath);
  const logState = log ? logTimestamps(log, now) : {
    latest: undefined,
    future: [],
    parsedCount: 0,
  };
  const latestLog = logState.latest;

  if (!wiki.exists || hot === undefined) {
    add(
      "HOT_MISSING",
      "DEGRADED",
      "Exclude hot state: project hot.md is missing or unreadable.",
      hotPath,
    );
  } else if (hot.length === 0) {
    add("HOT_EMPTY", "DEGRADED", "Exclude hot state: hot.md is empty.", hotPath);
  } else {
    if (hotBytes !== undefined && hotBytes > MAX_SHARED_BYTES) {
      add(
        "HOT_OVERSIZE",
        "DEGRADED",
        `Exclude hot state: ${hotBytes} bytes exceeds the 24576-byte live-state budget.`,
        hotPath,
      );
    }
    const curated = hot.match(/<!--\s*curated:\s*([^>]+?)\s*-->/i)?.[1];
    const hotCurated = curated ? parseStateTimestamp(curated) : undefined;
    if (!hotCurated) {
      add(
        "HOT_CURATED_MISSING",
        "DEGRADED",
        "Exclude hot state: no valid curated timestamp exists.",
        hotPath,
      );
    } else if (latestLog) {
      const lag = sourceLagMs(latestLog, hotCurated);
      if (lag > HOT_BLOCK_LAG_MS) {
        add(
          "HOT_SEVERELY_BEHIND_LOG",
          "BLOCK",
          "hot.md is more than 14 days behind the newest usable log entry.",
          hotPath,
        );
      } else if (lag > HOT_DEGRADED_LAG_MS) {
        add(
          "HOT_BEHIND_LOG",
          "DEGRADED",
          "Exclude hot state: its curated timestamp trails the newest usable log entry.",
          hotPath,
        );
      }
    }

    for (const run of hotHeadingRuns(hot)) {
      for (let index = 1; index < run.length; index += 1) {
        const previous = run[index - 1];
        const current = run[index];
        if (
          previous &&
          current &&
          targetReferenceTime(current) > targetReferenceTime(previous)
        ) {
          add(
            "HOT_NON_MONOTONIC",
            "BLOCK",
            `Dated hot.md headings are not newest-first within one section near ${current.date.toISOString()}.`,
            hotPath,
          );
          break;
        }
      }
      if (findings.some((finding) => finding.code === "HOT_NON_MONOTONIC")) break;
    }
  }

  if (!wiki.exists || log === undefined) {
    add(
      "LOG_MISSING",
      "DEGRADED",
      "Exclude durable log: project log.md is missing or unreadable.",
      logPath,
    );
  } else if (log.length === 0) {
    add("LOG_EMPTY", "DEGRADED", "Exclude durable log: log.md is empty.", logPath);
  } else {
    if (logState.parsedCount === 0) {
      add(
        "LOG_TIMESTAMP_UNPARSEABLE",
        "DEGRADED",
        "Exclude log freshness: no supported dated heading was found.",
        logPath,
      );
    }
    if (logState.future.length > 0) {
      add(
        "LOG_FUTURE_TIMESTAMP",
        "DEGRADED",
        `Ignore future log heading ${logState.future[0]?.date.toISOString()}.`,
        logPath,
      );
    }
  }

  const activePath = join(workspaceRoot, "_active_actions.md");
  const active = read(activePath);
  const activeBytes = fileSize(activePath);
  if (active === undefined) {
    add(
      "ACTIVE_ACTIONS_MISSING",
      "DEGRADED",
      "Exclude active actions: file is missing or unreadable.",
      activePath,
    );
  } else if (active.length === 0) {
    add(
      "ACTIVE_ACTIONS_EMPTY",
      "DEGRADED",
      "Exclude active actions: file is empty.",
      activePath,
    );
  } else {
    if (activeBytes !== undefined && activeBytes > MAX_SHARED_BYTES) {
      add(
        "ACTIVE_ACTIONS_OVERSIZE",
        "DEGRADED",
        `Exclude active actions: ${activeBytes} bytes exceeds the 24576-byte budget.`,
        activePath,
      );
    }
    const curated = active.match(/_Last curated:\s*([^_]+?)\s+by\b/i)?.[1];
    const activeCurated = curated ? parseStateTimestamp(curated) : undefined;
    if (!activeCurated) {
      add(
        "ACTIVE_ACTIONS_TIMESTAMP_MISSING",
        "DEGRADED",
        "Exclude active actions: Last curated timestamp is missing or invalid.",
        activePath,
      );
    } else if (
      latestLog &&
      sourceIsNewer(latestLog, activeCurated, ACTIVE_ACTION_LAG_MS)
    ) {
      add(
        "ACTIVE_ACTIONS_STALE",
        "DEGRADED",
        "Exclude active actions: project log is more than 24 hours newer.",
        activePath,
      );
    }
  }

  const workspaceStatePath = join(workspaceRoot, "_workspace_state.md");
  const workspaceState = read(workspaceStatePath);
  if (workspaceState === undefined) {
    add(
      "WORKSPACE_STATE_MISSING",
      "DEGRADED",
      "Exclude workspace state: file is missing or unreadable.",
      workspaceStatePath,
    );
  } else if (workspaceState.length === 0) {
    add(
      "WORKSPACE_STATE_EMPTY",
      "DEGRADED",
      "Exclude workspace state: file is empty.",
      workspaceStatePath,
    );
  } else {
    const section = projectSection(workspaceState, project);
    if (!section) {
      add(
        "WORKSPACE_PROJECT_MISSING",
        "DEGRADED",
        `Exclude workspace state: no ${project} section exists.`,
        workspaceStatePath,
      );
    } else {
      const updated = section.match(
        /_Last self-update:\s*([^_(]+?)(?:\s*\(|_)/i,
      )?.[1];
      const parsed = updated ? parseStateTimestamp(updated) : undefined;
      if (!parsed) {
        add(
          "WORKSPACE_PROJECT_TIMESTAMP_INVALID",
          "DEGRADED",
          "Exclude workspace state: project self-update timestamp is missing or invalid.",
          workspaceStatePath,
        );
      } else if (
        latestLog &&
        sourceIsNewer(latestLog, parsed, WORKSPACE_STATE_LAG_MS)
      ) {
        add(
          "WORKSPACE_PROJECT_STALE",
          "DEGRADED",
          "Exclude workspace state: project section is more than seven days behind its log.",
          workspaceStatePath,
        );
      }
    }
  }

  const readiness: StateReadiness = findings.some(
    (finding) => finding.level === "BLOCK",
  )
    ? "BLOCK"
    : findings.length > 0
      ? "DEGRADED"
      : "PASS";
  return result(
    readiness,
    project,
    projectCwd,
    workspaceRoot,
    now,
    findings,
  );
}

export function formatStateReadiness(
  state: StateReadinessResult,
  maxBytes = 1000,
  maxFindings = 5,
): string {
  if (state.readiness === "PASS") {
    return "STATE READINESS PASS — current shared sources are structurally safe.";
  }
  const ordered = state.findings
    .map((finding, index) => ({ finding, index }))
    .sort((a, b) => {
      const severity =
        Number(b.finding.level === "BLOCK") - Number(a.finding.level === "BLOCK");
      return severity || a.index - b.index;
    })
    .map(({ finding }) => finding);
  const shown = ordered.slice(0, maxFindings);
  const lines = [
    `STATE READINESS ${state.readiness} — ${state.project}`,
    ...shown.map(
      (finding) => `- ${finding.level} ${finding.code}: ${finding.message}`,
    ),
  ];
  const hidden = ordered.length - shown.length;
  if (hidden > 0) lines.push(`- ${hidden} additional finding(s) withheld.`);
  let output = lines.join("\n");
  while (Buffer.byteLength(output, "utf8") > maxBytes && output.length > 32) {
    output = `${output.slice(0, -32).trimEnd()}…`;
  }
  return output;
}
