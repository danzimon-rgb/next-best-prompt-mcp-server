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
  return /^none(?:\b|\s*\()/i.test(value.replaceAll("`", "").trim());
}

function isStatus(value, expected) {
  return value.replaceAll("`", "").trim().toUpperCase() === expected;
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
        content: body.trim(),
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
  const request = field(output, "Request");
  const program = field(output, "Program");
  const nextOwner = field(output, "Next owner");
  const human = field(output, "Human");
  const leadingTerminalAck = output.match(
    /^\s*\*\*Loop closed — .+ is complete; no required work remains\.\*\*(?:\r?\n|$)/i,
  );
  const anyTerminalAck = output.match(
    /\*\*Loop closed — .+ is complete; no required work remains\.\*\*/i,
  );
  const terminalBlock = output.match(
    /^\s*\*\*Loop closed — .+ is complete; no required work remains\.\*\*\r?\n\*\*Proof:\*\*\s+(.+)(?:\r?\n|$)/i,
  );
  const nowOptional = /(?:^|\n)NOW \(optional\)\s*\n/i.test(output);

  if (actions.length === 0) {
    add(
      "E21_MISSING_NEXT_ACTION",
      "Every substantive response needs at least one numbered NOW action.",
    );
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

  if (human && !isNone(human) && nextOwner && isNone(nextOwner)) {
    add(
      "HANDOFF_HUMAN_WITHOUT_OWNER",
      "A required Human action cannot coexist with Next owner: None.",
    );
  }

  if (context.terminalClosureRequired === true) {
    if (!leadingTerminalAck) {
      add(
        "E31_MISSING_TERMINAL_ACK",
        "Program completion needs a leading Loop closed acknowledgement.",
      );
    }
    const proofWords =
      terminalBlock?.[1]?.trim().split(/\s+/).filter(Boolean) ?? [];
    if (proofWords.length < 3) {
      add(
        "E31_MISSING_COMPLETION_PROOF",
        "Program completion needs non-vacuous observable proof.",
      );
    }
    if (
      !isStatus(request, "DONE") ||
      !isStatus(program, "DONE") ||
      !isNone(nextOwner) ||
      !isNone(human)
    ) {
      add(
        "E31_INCONSISTENT_DONE_HANDOFF",
        "Terminal closure requires Request DONE, Program DONE, Next owner None, and Human None.",
      );
    }
  }

  if (context.terminalClosureForbidden === true && anyTerminalAck) {
    add(
      "E32_PREMATURE_TERMINAL_ACK",
      "Do not declare terminal closure while the program remains active or gated.",
    );
  }

  if (context.postClosureOptional === true) {
    const actionsAreNewScope =
      actions.length === 1 &&
      /^["'“”]?New optional scope:/i.test(actions[0].content);
    if (!actionsAreNewScope) {
      add(
        "E33_POST_CLOSURE_NOT_NEW_SCOPE",
        "After closure, offer at most one action and begin it with New optional scope:.",
      );
    }
    if (!nowOptional) {
      add(
        "E33_POST_CLOSURE_BOARD_NOT_OPTIONAL",
        "After closure, the action board must be NOW (optional).",
      );
    }
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
  const inFlightSection = section(output, "IN FLIGHT");
  const inFlight = inFlightSection.toLowerCase();
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

  if (
    context.completionDeliveryRequired === true &&
    !inFlightSection
  ) {
    add(
      "E29_MISSING_COMPLETION_NOTICE",
      "A completion-delivery scenario needs an IN FLIGHT section with an honest Completion notice.",
    );
  } else if (context.completionDeliveryRequired === true) {
    const completionNotice = inFlightSection.match(
      /^\s*-\s+\*\*Completion notice:\*\*\s+(.+)$/im,
    )?.[1] ?? "";
    const completionNoticeWords = completionNotice.trim().split(/\s+/).filter(Boolean);
    const namesDelivery =
      /(monitor|watch|report|notify|post|publish|show|display|surface|send|return|proactiv|next user message|next turn)/i.test(
        completionNotice,
      );
    const namesTerminalSignal =
      /(complete|terminal|pass|fail|green|done|finish|result|status)/i.test(
        completionNotice,
      );
    if (
      completionNoticeWords.length < 7 ||
      !namesDelivery ||
      !namesTerminalSignal
    ) {
      add(
        "E29_MISSING_COMPLETION_NOTICE",
        "An IN FLIGHT gate needs an honest Completion notice naming who or what reports the terminal signal and how the user learns it.",
      );
    }

    const queue = section(output, "QUEUE");
    const after = queue.match(
      /^\s*-\s+\*\*AFTER:\*\*\s+(.+)$/im,
    )?.[1] ?? "";
    const [terminalCheckpoint, nextAction] = after.split(/\s+(?:→|->)\s+/, 2);
    const terminalWords = terminalCheckpoint?.trim().split(/\s+/).filter(Boolean) ?? [];
    const actionWords = nextAction?.trim().split(/\s+/).filter(Boolean) ?? [];
    const hasTerminalOutcome =
      /(complete|terminal|pass|fail|green|done|finish|result|status)/i.test(
        terminalCheckpoint ?? "",
      );
    const hasConcreteAction =
      /(offer|report|review|merge|deploy|send|open|run|verify|inspect|ask|notify|update|close|start|continue)/i.test(
        nextAction ?? "",
      );
    if (
      terminalWords.length < 2 ||
      actionWords.length < 3 ||
      !hasTerminalOutcome ||
      !hasConcreteAction
    ) {
      add(
        "E30_MISSING_POST_COMPLETION_ACTION",
        "An IN FLIGHT gate needs an AFTER entry that maps a terminal checkpoint to a concrete next action.",
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
