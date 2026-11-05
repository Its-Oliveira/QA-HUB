import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { TestResult } from "@/lib/testResults";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import TestTree from "@/components/automation/TestTree";

const make = (spec: string, title: string, status: TestResult["status"] = "passed"): TestResult => ({
  id: `${spec}-${title}`,
  run_id: "run",
  spec,
  describe_path: ["Suite"],
  title,
  full_title: `Suite > ${title}`,
  status,
  duration_ms: 1000,
  error_message: status === "failed" ? "AssertionError: esperado 14\nlinha 2" : null,
  error_stack: null,
  screenshot: null,
  video: null,
  source_line: null,
  attempts: 1,
});

const results = [
  make("cypress/e2e/Cadastro/clientes.cy.js", "Cadastrar cliente"),
  make("cypress/e2e/Orcamento/Editar/bdi.cy.js", "Aplicar BDI", "failed"),
  make("cypress/e2e/Orcamento/Exibir/curva.cy.js", "Gerar curva ABC"),
];

describe("Árvore de testes", () => {
  it("separa por módulo e abre as specs que falharam com o erro", () => {
    render(<TestTree results={results} />);
    expect(screen.getByRole("heading", { name: "Cadastro" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Orcamento" })).toBeInTheDocument();
    expect(screen.getByText("Editar/")).toBeInTheDocument();
    expect(screen.getByText("AssertionError: esperado 14")).toBeInTheDocument();
    expect(screen.queryByText("Cadastrar cliente")).not.toBeInTheDocument();
  });

  it("filtra por módulo e por specs que falharam", () => {
    render(<TestTree results={results} />);
    fireEvent.click(screen.getByRole("button", { name: /Cadastro/ }));
    expect(screen.queryByRole("heading", { name: "Orcamento" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch"));
    expect(screen.getByText("Nenhuma spec falhou neste módulo.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Todos/ }));
    expect(screen.queryByText("curva.cy.js")).not.toBeInTheDocument();
    expect(screen.getByText("bdi.cy.js")).toBeInTheDocument();
  });
});
