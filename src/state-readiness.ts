import {
  existsSync,
  readFileSync,
  statSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";

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
  workspaceRoot?: string;
  now?: Date;
}

interface ParsedTimestamp {
  date: Date;
  dateKey: string;
  precision: "date" | "time";
}

const MAX_SHARED_BYTES = 24 * 1024;
const MAX_HANDOFF_BYTES = 4 * 1024;
const HOT_LOG_LAG_MS = 5 * 60 * 1000;
const ACTIVE_ACTION_LAG_MS = 24 * 60 * 60 * 1000;
const WORKSPACE_STATE_LAG_MS = 7 * 24 * 60 * 60 * 1000;

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

function offsetForZone(zone: string): string {
  return zone.toUpperCase() === "EST" ? "-05:00" : "-04:00";
}

export function parseStateTimestamp(value: string): ParsedTimestamp | undefined {
  const trimmed = value.trim();
  const dateOnly = trimmed.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (dateOnly?.[1]) {
    const date = new Date(`${dateOnly[1]}T00:00:00Z`);
    return Number.isNaN(date.getTime())
      ? undefined
      : { date, dateKey: dateOnly[1], precision: "date" };
  }

  const zoned = trimmed.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?\s*(?:(AM|PM)\s*)?(EDT|EST)$/i,
  );
  if (zoned?.[1] && zoned[2] && zoned[3] && zoned[6]) {
    const seconds = zoned[4] ?? "00";
    let hour = Number(zoned[2]);
    if (zoned[5]) {
      hour %= 12;
      if (zoned[5].toUpperCase() === "PM") hour += 12;
    }
    const date = new Date(
      `${zoned[1]}T${String(hour).padStart(2, "0")}:${zoned[3]}:${seconds}${offsetForZone(zoned[6])}`,
    );
    return Number.isNaN(date.getTime())
      ? undefined
      : { date, dateKey: zoned[1], precision: "time" };
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime())
    ? undefined
    : { date: parsed, dateKey: trimmed.slice(0, 10), precision: "time" };
}

function latestHeadingTimestamp(markdown: string): ParsedTimestamp | undefined {
  const values: ParsedTimestamp[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(
      /^#{2,3}\s+\[?(\d{4}-\d{2}-\d{2}(?:[ T]\d{1,2}:\d{2}(?::\d{2})?(?:-0[45]:00|\s+(?:EDT|EST)))?)/,
    );
    if (!match?.[1]) continue;
    const parsed = parseStateTimestamp(match[1]);
    if (parsed) values.push(parsed);
  }
  return values.sort((a, b) => b.date.getTime() - a.date.getTime())[0];
}

function headingSequence(markdown: string): ParsedTimestamp[] {
  const values: ParsedTimestamp[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(
      /^###\s+(\d{4}-\d{2}-\d{2}[ T]\d{1,2}:\d{2}(?::\d{2})?(?:-0[45]:00|\s+(?:EDT|EST)))/,
    );
    if (!match?.[1]) continue;
    const parsed = parseStateTimestamp(match[1]);
    if (parsed) values.push(parsed);
  }
  return values;
}

function sourceIsNewer(
  source: ParsedTimestamp,
  target: ParsedTimestamp,
  toleranceMs: number,
): boolean {
  if (target.precision === "date") {
    return source.dateKey !== target.dateKey &&
      source.date.getTime() > target.date.getTime();
  }
  return source.date.getTime() - target.date.getTime() > toleranceMs;
}

function findWorkspaceRoot(projectCwd: string): string {
  let cursor = resolve(projectCwd);
  while (true) {
    if (
      existsSync(join(cursor, "_handoff.md")) &&
      existsSync(join(cursor, "_active_actions.md")) &&
      existsSync(join(cursor, "_workspace_state.md")) &&
      existsSync(join(cursor, "_wikis"))
    ) {
      return cursor;
    }
    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  throw new Error(`No continuity workspace found above ${projectCwd}`);
}

function frontmatterValue(markdown: string, key: string): string | undefined {
  const match = markdown.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  return match?.[1]?.trim();
}

function projectSection(markdown: string, project: string): string | undefined {
  const escaped = project.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return markdown.match(
    new RegExp(
      `<!-- BEGIN: ${escaped} -->([\\s\\S]*?)<!-- END: ${escaped} -->`,
    ),
  )?.[1];
}

export function assessStateReadiness(
  options: StateReadinessOptions,
): StateReadinessResult {
  if (!options.projectCwd || !isAbsolute(options.projectCwd)) {
    throw new Error("projectCwd must be an absolute path");
  }
  const projectCwd = resolve(options.projectCwd);
  const workspaceRoot = options.workspaceRoot
    ? resolve(options.workspaceRoot)
    : findWorkspaceRoot(projectCwd);
  const project = basename(projectCwd);
  const now = options.now ?? new Date();
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
  if (!handoff) {
    add(
      "HANDOFF_MISSING",
      "DEGRADED",
      "Exclude handoff: file is missing or unreadable.",
      handoffPath,
    );
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

  const wikiDir = join(workspaceRoot, "_wikis", project, "wiki");
  const hotPath = join(wikiDir, "hot.md");
  const logPath = join(wikiDir, "log.md");
  const hot = read(hotPath);
  const log = read(logPath);
  const hotBytes = fileSize(hotPath);
  const latestLog = log ? latestHeadingTimestamp(log) : undefined;
  let hotCurated: ParsedTimestamp | undefined;

  if (!hot) {
    add("HOT_MISSING", "BLOCK", "Project hot.md is missing or unreadable.", hotPath);
  } else {
    if (hotBytes !== undefined && hotBytes > MAX_SHARED_BYTES) {
      add(
        "HOT_OVERSIZE",
        "BLOCK",
        `hot.md is ${hotBytes} bytes; it exceeds the 24576-byte live-state budget.`,
        hotPath,
      );
    }
    const curated = hot.match(/<!--\s*curated:\s*([^>]+?)\s*-->/i)?.[1];
    hotCurated = curated ? parseStateTimestamp(curated) : undefined;
    if (!hotCurated) {
      add(
        "HOT_CURATED_MISSING",
        "DEGRADED",
        "hot.md has no valid curated timestamp.",
        hotPath,
      );
    } else if (latestLog && sourceIsNewer(latestLog, hotCurated, HOT_LOG_LAG_MS)) {
      add(
        "HOT_BEHIND_LOG",
        "BLOCK",
        "hot.md predates the newest durable log entry; reconcile current state before prioritizing.",
        hotPath,
      );
    }

    const sequence = headingSequence(hot);
    for (let index = 1; index < sequence.length; index += 1) {
      const previous = sequence[index - 1];
      const current = sequence[index];
      if (previous && current && current.date.getTime() > previous.date.getTime()) {
        add(
          "HOT_NON_MONOTONIC",
          "BLOCK",
          `Dated hot.md headings are not newest-first near ${current.date.toISOString()}.`,
          hotPath,
        );
        break;
      }
    }
  }

  if (!log) {
    add("LOG_MISSING", "DEGRADED", "Project log.md is missing or unreadable.", logPath);
  } else {
    if (latestLog && latestLog.date.getTime() > now.getTime() + HOT_LOG_LAG_MS) {
      add(
        "LOG_FUTURE_TIMESTAMP",
        "BLOCK",
        `log.md contains a future timestamp: ${latestLog.date.toISOString()}.`,
        logPath,
      );
    }
  }

  const activePath = join(workspaceRoot, "_active_actions.md");
  const active = read(activePath);
  const activeBytes = fileSize(activePath);
  if (!active) {
    add(
      "ACTIVE_ACTIONS_MISSING",
      "DEGRADED",
      "Exclude active actions: file is missing or unreadable.",
      activePath,
    );
  } else {
    if (activeBytes !== undefined && activeBytes > MAX_SHARED_BYTES) {
      add(
        "ACTIVE_ACTIONS_OVERSIZE",
        "BLOCK",
        `_active_actions.md is ${activeBytes} bytes; it exceeds the 24576-byte budget.`,
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
    } else if (latestLog && sourceIsNewer(latestLog, activeCurated, ACTIVE_ACTION_LAG_MS)) {
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
  if (!workspaceState) {
    add(
      "WORKSPACE_STATE_MISSING",
      "DEGRADED",
      "Exclude workspace state: file is missing or unreadable.",
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
      const updated = section.match(/_Last self-update:\s*([^_(]+?)(?:\s*\(|_)/i)?.[1];
      const parsed = updated ? parseStateTimestamp(updated) : undefined;
      if (!parsed) {
        add(
          "WORKSPACE_PROJECT_TIMESTAMP_INVALID",
          "DEGRADED",
          "Exclude workspace state: project self-update timestamp is missing or invalid.",
          workspaceStatePath,
        );
      } else if (latestLog && sourceIsNewer(latestLog, parsed, WORKSPACE_STATE_LAG_MS)) {
        add(
          "WORKSPACE_PROJECT_STALE",
          "DEGRADED",
          "Exclude workspace state: project section is more than seven days behind its log.",
          workspaceStatePath,
        );
      }
    }
  }

  const readiness: StateReadiness = findings.some((finding) => finding.level === "BLOCK")
    ? "BLOCK"
    : findings.length > 0
      ? "DEGRADED"
      : "PASS";
  return {
    readiness,
    project,
    projectCwd,
    workspaceRoot,
    checkedAt: now.toISOString(),
    findings,
  };
}

export function formatStateReadiness(
  result: StateReadinessResult,
  maxBytes = 1000,
  maxFindings = 5,
): string {
  if (result.readiness === "PASS") {
    return "STATE READINESS PASS — current shared sources are structurally safe.";
  }
  const shown = result.findings.slice(0, maxFindings);
  const lines = [
    `STATE READINESS ${result.readiness} — ${result.project}`,
    ...shown.map(
      (finding) => `- ${finding.level} ${finding.code}: ${finding.message}`,
    ),
  ];
  const hidden = result.findings.length - shown.length;
  if (hidden > 0) lines.push(`- ${hidden} additional finding(s) withheld.`);
  let output = lines.join("\n");
  while (Buffer.byteLength(output, "utf8") > maxBytes && output.length > 32) {
    output = `${output.slice(0, -32).trimEnd()}…`;
  }
  return output;
}
