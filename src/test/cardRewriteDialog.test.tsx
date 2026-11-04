import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } } }));

import JiraCardDetailsDialog from "@/components/jira/JiraCardDetailsDialog";

const clickRewrite = async () => {
  const button = await screen.findByRole("button", { name: /Reescrever card com IA/ });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
};

const card = { key: "BUG-2067", title: "Orçamento - Encargos", description: null, jira_synced: true, priority: "Medium", status: "Backlog", assignee: null } as unknown as Tables<"jira_cards">;
const description = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Breve explicação: encargos não alteram em 09/26." }] }] };

describe("Modal do card com reescrita", () => {
  it("manda para a ponte a descrição do Jira, mesmo sem descrição no sync", async () => {
    localStorage.setItem("qahub-ponte-token", "tok");
    invoke.mockResolvedValue({ data: { key: card.key, summary: card.title, modules: [], priority: null, description }, error: null });
    const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ error: "parar aqui" }), { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<QueryClientProvider client={new QueryClient()}><JiraCardDetailsDialog card={card} onClose={() => {}} /></QueryClientProvider>);
    await clickRewrite();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(invoke).toHaveBeenCalledWith("jira-issue-details", { body: { issueKey: "BUG-2067" } });
    expect(screen.getByRole("region", { name: "Card reescrito" })).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).texto).toBe("Breve explicação: encargos não alteram em 09/26.");
  });

  it("avisa que o navegador está esperando permissão quando a ponte não responde", async () => {
    localStorage.setItem("qahub-ponte-token", "tok");
    invoke.mockResolvedValue({ data: { key: card.key, summary: card.title, modules: [], priority: null, description }, error: null });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError")));

    render(<QueryClientProvider client={new QueryClient()}><JiraCardDetailsDialog card={card} onClose={() => {}} /></QueryClientProvider>);
    await clickRewrite();

    expect(await screen.findByText("O navegador está esperando sua permissão")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Card original" })).toBeInTheDocument();
  });
});

describe("Modal dividido", () => {
  it("mostra original e reescrito lado a lado, com o card no padrão do QA", async () => {
    localStorage.setItem("qahub-ponte-token", "tok");
    invoke.mockResolvedValue({ data: { key: card.key, summary: card.title, modules: ["01 - Orçamento"], priority: "High", description }, error: null });
    const rewritten = { titulo: "Orçamento - Encargos SINAPI não atualizam em 09/26", breve_explicacao: [{ tipo: "paragrafo", texto: "Ao trocar a base, o percentual não muda.", itens: [] }], acoes: ["Orçamento", "Alterar base"], resultado_esperado: "O percentual deve ser atualizado.", observacoes: ["Link: https://app.orcafascio.com/orc/1"], complementar: ["Confirmar o estado"] };
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string) => new Response(JSON.stringify(url.endsWith("/status") ? { ok: true } : { rewritten }), { status: 200 })));

    render(<QueryClientProvider client={new QueryClient()}><JiraCardDetailsDialog card={card} onClose={() => {}} /></QueryClientProvider>);
    await clickRewrite();

    expect(await screen.findByText("Orçamento - Encargos SINAPI não atualizam em 09/26")).toBeInTheDocument();
    expect(screen.getByText("Breve explicação: encargos não alteram em 09/26.")).toBeInTheDocument();
    expect(screen.getByText("Orçamento >> Alterar base")).toBeInTheDocument();
    expect(screen.getByText("Confirmar o estado")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "https://app.orcafascio.com/orc/1" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Voltar ao card/ }));
    expect(screen.queryByRole("region", { name: "Card reescrito" })).not.toBeInTheDocument();
  });
});
