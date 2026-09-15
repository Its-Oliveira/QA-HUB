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

function specPath(test) {
  const file = test.file || (test.parent && test.parent.file) || "";
  if (!file) return "spec desconhecida";
  return path.relative(process.cwd(), file).split(path.sep).join("/");
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

function base(test) {
  const describe_path = describePath(test);
  return {
    spec: specPath(test),
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
      track(send({ ...base(test), status: "running" }));
    });
    runner.on(EVENT_TEST_PASS, (test) => {
      track(send({ ...base(test), status: "passed", duration_ms: test.duration }));
    });
    runner.on(EVENT_TEST_FAIL, (test, err) => {
      track(
        send({
          ...base(test),
          status: "failed",
          duration_ms: test.duration,
          error_message: err && err.message,
          error_stack: err && err.stack,
        }),
      );
    });
    runner.on(EVENT_TEST_PENDING, (test) => {
      track(send({ ...base(test), status: "pending" }));
    });

  }

  done(_failures, callback) {
    Promise.allSettled(this.pending).then(() => callback());
  }
}

module.exports = QAHubReporter;
