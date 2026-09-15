// Adicione `path` ao topo do seu cypress.config.js.
const path = require("path");

// Adicione estas propriedades dentro do defineConfig({ ... }) existente.
const qahubReporterConfig = {
  reporter: "cypress-multi-reporters",
  reporterOptions: {
    reporterEnabled: [
      "mochawesome",
      path.resolve(__dirname, "cypress/reporters/qahub-reporter.cjs"),
    ],
    mochawesomeReporterOptions: {
      reportDir: "cypress/results",
      overwrite: false,
      html: false,
      json: true,
    },
  },
};

module.exports = { qahubReporterConfig };