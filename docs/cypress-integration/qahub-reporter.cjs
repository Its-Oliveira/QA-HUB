/* eslint-disable */
/**
 * QA Hub live reporter for Cypress/Mocha.
 *
 * Sends one HTTP POST per test start/end to the QA Hub backend so the
 * "Automação de Testes" tab can show a live spec > describe > it tree.
 *
 * Copy this file to the Cypress repository (LeonardoTaadeu/Automa-o-OF), e.g.
 * as `cypress/reporters/qahub-reporter.cjs`.
 *
 * Required environment variables inside the GitHub Actions job:
 *   QAHUB_EVENTS_URL     full URL of the `cypress-events` function
 *   QAHUB_EVENTS_SECRET  shared secret (same value saved in QA Hub)
 *   QAHUB_CORRELATION_ID correlation id passed as a workflow input by QA Hub
 *                        (falls back to GITHUB_RUN_ID)
 *
 * Live delivery failures are logged without changing the Cypress result.
 */

const Mocha = require("mocha");
const path = require("path");

const {
  EVENT_TEST_BEGIN,
  EVENT_TEST_PASS,
  EVENT_TEST_FAIL,
  EVENT_TEST_PENDING,
} = Mocha.Runner.constants;

const URL_ = process.env.QAHUB_EVENTS_URL;
const SECRET = process.env.QAHUB_EVENTS_SECRET;
const CORRELATION_ID = process.env.QAHUB_CORRELATION_ID || "";
const GITHUB_RUN_ID = process.env.GITHUB_RUN_ID || "";

/**
 * Cypress rarely sets `test.file`; the spec path lives in
 * `invocationDetails` (relativeFile/absoluteFile) of the test or one of its
 * parent suites. Walk every known source before giving up.
 */
function findCypressSpec(value, seen = new Set()) {
  if (!value || seen.has(value)) return "";
  if (typeof value === "string") {
    const match = value.replace(/\\/g, "/").match(/(?:^|[\s"'])([^\s"']+\.cy\.(?:js|jsx|ts|tsx))(?=$|[\s"'])/i);
    return match ? match[1] : "";
  }
  if (typeof value !== "object") return "";
  seen.add(value);
  for (const key of ["relativeFile", "absoluteFile", "file", "fullFile", "fileUrl"]) {
    const found = findCypressSpec(value[key], seen);
    if (found) return found;
  }
  for (const nested of Object.values(value)) {
    const found = findCypressSpec(nested, seen);
    if (found) return found;
  }
  return "";
}

function rawSpecPath(test, runner) {
  let node = test;
  while (node) {
    const candidate =
      findCypressSpec(node.invocationDetails) ||
      findCypressSpec(node) ||
      findCypressSpec(node.parent);
    if (candidate) return candidate;
    node = node.parent;
  }
  const runnerSpec =
    findCypressSpec(runner && runner.suite) ||
    findCypressSpec(runner && runner.test) ||
    findCypressSpec(runner);
  if (runnerSpec) return runnerSpec;
  return (
    process.env.SPEC ||
    process.env.CYPRESS_SPEC ||
    ""
  );
}

function specPath(test, runner) {
  const file = rawSpecPath(test, runner);
  if (!file) return "spec desconhecida";
  const normalized = path.isAbsolute(file)
    ? path.relative(process.cwd(), file)
    : file;
  return normalized.split(path.sep).join("/").replace(/^\.\//, "");
}

function describePath(test) {
  const titles = [];
  let parent = test.parent;
  while (parent && parent.title) {
    titles.unshift(parent.title);
    parent = parent.parent;
  }
  return titles;
}

async function send(payload) {
  if (!URL_ || !SECRET) {
    console.error("[QA Hub] QAHUB_EVENTS_URL ou QAHUB_EVENTS_SECRET não configurado.");
    return;
  }

  try {
    const response = await fetch(URL_, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-QAHub-Secret": SECRET },
    body: JSON.stringify({
      type: "event",
      correlation_id: CORRELATION_ID || undefined,
      github_run_id: CORRELATION_ID ? undefined : GITHUB_RUN_ID,
      ...payload,
    }),
    });

    if (!response.ok) {
      const details = await response.text();
      console.error(`[QA Hub] Envio rejeitado (${response.status}): ${details}`);
    }
  } catch (error) {
    console.error(`[QA Hub] Falha ao enviar evento: ${error.message || error}`);
  }
}

function base(test, runner) {
  const describe_path = describePath(test);
  return {
    spec: specPath(test, runner),
    describe_path,
    title: test.title,
    full_title: [...describe_path, test.title].join(" > "),
    attempts: (test.currentRetry ? test.currentRetry() : 0) + 1,
  };
}

class QAHubReporter {
  constructor(runner) {
    this.pending = [];
    const track = (promise) => this.pending.push(promise);

    runner.on(EVENT_TEST_BEGIN, (test) => {
      track(send({ ...base(test, runner), status: "running" }));
    });
    runner.on(EVENT_TEST_PASS, (test) => {
      track(send({ ...base(test, runner), status: "passed", duration_ms: test.duration }));
    });
    runner.on(EVENT_TEST_FAIL, (test, err) => {
      track(
        send({
          ...base(test, runner),
          status: "failed",
          duration_ms: test.duration,
          error_message: err && err.message,
          error_stack: err && err.stack,
        }),
      );
    });
    runner.on(EVENT_TEST_PENDING, (test) => {
      track(send({ ...base(test, runner), status: "pending" }));
    });

  }

  done(_failures, callback) {
    Promise.allSettled(this.pending).then(() => callback());
  }
}

module.exports = QAHubReporter;
