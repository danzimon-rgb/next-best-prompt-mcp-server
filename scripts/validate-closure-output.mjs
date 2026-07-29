#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function field(output, name) {
  const match = output.match(
    new RegExp(`^- \\*\\*${name}:\\*\\*\\s*(.+)$`, "im"),
  );
  return match?.[1]?.trim() ?? "";
}

function isNone(value) {
  return /^none(?:\b|\s*\()/i.test(value);
}

function parseNowActions(output) {
  const nowMatch = output.match(
    /(?:^|\n)NOW(?: \(optional\))?\s*\n([\s\S]*?)(?=\n(?:QUEUE|IN FLIGHT|\*\*Execution handoff\*\*)|\s*$)/i,
  );
  if (!nowMatch) return [];

  return nowMatch[1]
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(
        /^\s*(\d+)\.\s+\*\*\[([^\]]+)\]([^*]*)\*\*\s*(.*)$/,
      );
      if (!match) return null;
      const [, number, tag, target, body] = match;
      return {
        number: Number(number),
        tag,
        body: `${target} ${body}`.trim(),
        dispatch: ["RUN HERE", "PASTE TO", "EXTERNAL"].find((candidate) =>
          tag.includes(candidate),
        ),
        suggested: tag.includes("SUGGESTED MOVE"),
        option: tag.includes("OPTION"),
      };
    })
    .filter(Boolean);
}

function section(output, name) {
  const match = output.match(
    new RegExp(
      `(?:^|\\n)${name}\\s*\\n([\\s\\S]*?)(?=\\n(?:NOW|QUEUE|IN FLIGHT|\\*\\*Execution handoff\\*\\*)|\\s*$)`,
      "i",
    ),
  );
  return match?.[1]?.trim() ?? "";
}

export function validateClosureOutput(output, context = {}) {
  const findings = new Map();
  const add = (code, message) => {
    if (!findings.has(code)) findings.set(code, { code, message });
  };
  const actions = parseNowActions(output);

  if (actions.length === 0 && !/^No board:\s*\S/im.test(output)) {
    add("E21_NO_BOARD_REASON", "A response without NOW actions needs a truthful No board line.");
  }

  if (actions.length === 1 && (actions[0].suggested || actions[0].option)) {
    add("E24_SINGLE_LABEL", "A single NOW action must not carry SUGGESTED MOVE or OPTION.");
  }

  if (actions.length > 1) {
    const suggestedCount = actions.filter((action) => action.suggested).length;
    const labelsValid = actions.every(
      (action) => action.suggested !== action.option,
    );
    if (
      !labelsValid ||
      suggestedCount > 1 ||
      (context.defensiblePriority === true && suggestedCount !== 1)
    ) {
      add(
        "G3_LABELING",
        "Multiple NOW actions need valid labels and exactly one SUGGESTED MOVE when priority is defensible.",
      );
    }

    const relationship = output.match(
      /^\s*\d+(?:\s*,\s*\d+)*(?:,?\s+and\s+\d+)?\s+are\s+(alternatives|independent)\b.*$/im,
    );
    if (!relationship) {
      add("E25_RELATIONSHIP", "Multiple NOW actions need an alternatives-or-independent statement.");
    } else if (
      relationship[1].toLowerCase() === "independent" &&
      actions.filter((action) => action.dispatch === "RUN HERE").length > 1
    ) {
      add(
        "E04_CONCURRENT_RUN_HERE",
        "Independent RUN HERE actions collide in the current agent window; serialize one in QUEUE.",
      );
    }
  }

  const authorizedPatterns = context.alreadyAuthorizedActionPatterns ?? [];
  if (
    actions.some((action) =>
      authorizedPatterns.some((pattern) =>
        action.body.toLowerCase().includes(String(pattern).toLowerCase()),
      ),
    )
  ) {
    add(
      "E01_AUTHORIZED_REOFFER",
      "A safe, already-authorized action was offered instead of executed.",
    );
  }

  const nextOwner = field(output, "Next owner");
  const human = field(output, "Human");
  if (human && !isNone(human) && nextOwner && isNone(nextOwner)) {
    add(
      "HANDOFF_HUMAN_WITHOUT_OWNER",
      "A required Human action cannot coexist with Next owner: None.",
    );
  }

  const courierPatterns = context.operatorCourierPatterns ?? [];
  if (
    courierPatterns.some((pattern) =>
      output.toLowerCase().includes(String(pattern).toLowerCase()),
    )
  ) {
    add(
      "OPERATOR_COURIER",
      "The operator was asked to relay state that the agent can read from shared or live sources.",
    );
  }

  const requiredAgentDispatchOwners =
    context.requiredAgentDispatchOwners ?? [];
  const inFlight = section(output, "IN FLIGHT").toLowerCase();
  for (const owner of requiredAgentDispatchOwners) {
    const ownerText = String(owner).toLowerCase();
    const hasPasteTo = actions.some(
      (action) =>
        action.dispatch === "PASTE TO" &&
        action.body.toLowerCase().includes(ownerText),
    );
    const isInFlight = inFlight.includes(ownerText);
    if (!hasPasteTo && !isInFlight) {
      add(
        "E08_MISSING_AGENT_DISPATCH",
        `Action assigned to ${owner} needs a self-contained PASTE TO prompt or a verified IN FLIGHT checkpoint.`,
      );
    }
  }

  return [...findings.values()];
}

function runCli() {
  const args = process.argv.slice(2);
  let context = {};
  const contextIndex = args.indexOf("--context");
  if (contextIndex !== -1) {
    const contextPath = args[contextIndex + 1];
    if (!contextPath) throw new Error("--context requires a JSON file path");
    context = JSON.parse(readFileSync(contextPath, "utf8"));
    args.splice(contextIndex, 2);
  }

  const outputPath = args[0];
  const output = readFileSync(
    outputPath && outputPath !== "-" ? outputPath : 0,
    "utf8",
  );
  const findings = validateClosureOutput(output, context);
  if (findings.length === 0) {
    console.log("PASS — closure output satisfies the configured checks");
    return;
  }
  for (const finding of findings) {
    console.error(`FAIL ${finding.code} — ${finding.message}`);
  }
  process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runCli();
}
