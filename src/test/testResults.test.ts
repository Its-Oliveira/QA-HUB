import { describe, expect, it } from "vitest";
import {
  buildFolderTree,
  countFailedSpecs,
  failedOnly,
  moduleRoot,
  countFolderTests,
  folderStatus,
  normalizeSpecPath,
  splitSpecPath,
  type TestResult,
} from "@/lib/testResults";

const make = (spec: string, title: string, status: TestResult["status"] = "passed"): TestResult => ({
  id: `${spec}-${title}`,
  run_id: "run",
  spec,
  describe_path: ["Suite"],
  title,
  full_title: `Suite > ${title}`,
  status,
  duration_ms: 10,
  error_message: null,
  error_stack: null,
  screenshot: null,
  video: null,
  source_line: null,
  attempts: 1,
});

describe("spec path parsing", () => {
  it("normalizes windows separators and relative prefixes", () => {
    expect(normalizeSpecPath("./cypress\\e2e\\Cadastro\\login.cy.js")).toBe(
      "cypress/e2e/Cadastro/login.cy.js",
    );
  });

  it("splits directories from the file name", () => {
    expect(splitSpecPath("cypress/e2e/Cadastro/login.cy.js")).toEqual({
      dirs: ["cypress", "e2e", "Cadastro"],
      fileName: "login.cy.js",
    });
  });
});

describe("buildFolderTree", () => {
  it("names a single-level folder with the real directory", () => {
    const root = buildFolderTree([make("cypress/e2e/login/entrar.cy.js", "a")]);
    expect(root.folders).toHaveLength(1);
    expect(root.folders[0].name).toBe("cypress/e2e/login");
    expect(root.folders[0].specs[0].fileName).toBe("entrar.cy.js");
  });

  it("keeps nested folders separate at more than one level", () => {
    const root = buildFolderTree([
      make("cypress/e2e/regression/checkout/pagar.cy.js", "a"),
      make("cypress/e2e/regression/login/entrar.cy.js", "b", "failed"),
    ]);
    const base = root.folders[0];
    expect(base.name).toBe("cypress/e2e/regression");
    expect(base.folders.map((f) => f.name)).toEqual(["checkout", "login"]);
    expect(countFolderTests(base)).toBe(2);
    expect(folderStatus(base)).toBe("failed");
  });

  it("handles specs without any folder", () => {
    const root = buildFolderTree([make("smoke.cy.js", "a")]);
    expect(root.folders).toHaveLength(0);
    expect(root.specs[0].fileName).toBe("smoke.cy.js");
  });
});

describe("modules and failed filter", () => {
  const results = [
    make("cypress/e2e/Cadastro/clientes.cy.js", "a"),
    make("cypress/e2e/Orcamento/Editar/bdi.cy.js", "b", "failed"),
    make("cypress/e2e/Orcamento/Exibir/curva.cy.js", "c"),
  ];

  it("skips the cypress/e2e wrapper and exposes modules", () => {
    const base = moduleRoot(buildFolderTree(results));
    expect(base.folders.map((f) => f.name)).toEqual(["Cadastro", "Orcamento"]);
  });

  it("keeps only failed specs and drops empty folders", () => {
    const base = moduleRoot(buildFolderTree(results));
    const failed = failedOnly(base)!;
    expect(failed.folders.map((f) => f.name)).toEqual(["Orcamento"]);
    expect(failed.folders[0].folders.map((f) => f.name)).toEqual(["Editar"]);
    expect(countFailedSpecs(base)).toBe(1);
    expect(failedOnly(base.folders[0])).toBeNull();
  });
});
