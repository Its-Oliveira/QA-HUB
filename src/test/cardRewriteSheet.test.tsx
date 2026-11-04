import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } } }));

import CardRewriteSheet from "@/components/jira/CardRewriteSheet";

const card = { key: "BUG-2067", title: "Orçamento - Encargos", description: null, jira_synced: true, priority: "Medium", status: "Backlog", assignee: null } as unknown as Tables<"jira_cards">;
const description = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Breve explicação: encargos não alteram em 09/26." }] }] };

describe("CardRewriteSheet", () => {
  it("manda para a ponte a descrição do Jira, mesmo sem descrição no sync", async () => {
    localStorage.setItem("qahub-ponte-token", "tok");
    invoke.mockResolvedValue({ data: { key: card.key, summary: card.title, modules: [], priority: null, description }, error: null });
    const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ error: "parar aqui" }), { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<QueryClientProvider client={new QueryClient()}><CardRewriteSheet card={card} onClose={() => {}} /></QueryClientProvider>);
    fireEvent.click(screen.getByText("Reescrever card com IA"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(invoke).toHaveBeenCalledWith("jira-issue-details", { body: { issueKey: "BUG-2067" } });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).texto).toBe("Breve explicação: encargos não alteram em 09/26.");
  });

  it("avisa que o navegador está esperando permissão quando a ponte não responde", async () => {
    localStorage.setItem("qahub-ponte-token", "tok");
    invoke.mockResolvedValue({ data: { key: card.key, summary: card.title, modules: [], priority: null, description }, error: null });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError")));

    render(<QueryClientProvider client={new QueryClient()}><CardRewriteSheet card={card} onClose={() => {}} /></QueryClientProvider>);
    fireEvent.click(screen.getByText("Reescrever card com IA"));

    expect(await screen.findByText("O navegador está esperando sua permissão")).toBeInTheDocument();
    expect(screen.getByText("Reescrever card com IA")).toBeInTheDocument();
  });
});
