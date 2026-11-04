import { describe, it, expect } from "vitest";
import { descriptionDocument, documentHasContent, jiraPriority, safeJiraLink } from "@/lib/jiraDetails";

describe("Prioridades originais do Jira", () => {
  it("Highest e Critical são críticas", () => { expect(jiraPriority("Highest").tone).toBe("critical"); expect(jiraPriority("Critical").tone).toBe("critical"); });
  it("High é alta e distinta de crítica", () => expect(jiraPriority("High").tone).toBe("high"));
  it("Medium é média", () => expect(jiraPriority("Medium").tone).toBe("medium"));
  it("Low e Lowest mantêm níveis distintos", () => { expect(jiraPriority("Low").tone).toBe("low"); expect(jiraPriority("Lowest").tone).toBe("lowest"); });
});

describe("Descrição original segura", () => {
  it("preserva a árvore ADF sem achatar parágrafos, listas ou marcas", () => {
    const adf = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Problema", marks: [{ type: "strong" }] }] }, { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Passo" }] }] }] }] };
    expect(descriptionDocument(adf)).toEqual(adf);
    expect(documentHasContent(adf)).toBe(true);
  });
  it("reconhece descrições vazias inclusive ADF sem texto", () => { expect(documentHasContent(descriptionDocument("  "))).toBe(false); expect(documentHasContent({ type: "doc", content: [{ type: "paragraph" }] })).toBe(false); });
  it("não permite URLs que executem código", () => { expect(safeJiraLink("javascript:alert(1)")).toBeUndefined(); expect(safeJiraLink("data:text/html,unsafe")).toBeUndefined(); expect(safeJiraLink("https://example.com/test")).toBe("https://example.com/test"); });
  it("converte HTML preservando formatação e removendo elementos ativos", () => {
    const doc = descriptionDocument('<p><strong>Falha</strong><br>Detalhe <a href="https://example.com">link</a></p><script>alert(1)</script><pre>const x = 1;</pre>');
    expect(doc?.content?.[0].content?.[0].marks?.[0].type).toBe("strong");
    expect(doc?.content?.[0].content?.[1].type).toBe("hardBreak");
    expect(JSON.stringify(doc)).not.toContain("alert(1)");
    expect(doc?.content?.[1].type).toBe("codeBlock");
  });
  it("converte listas, negrito, links e código wiki", () => {
    const doc = descriptionDocument("* Item\n* *Falha* [link|https://example.com]\n{code:js}\nconst x = 1;\n{code}");
    expect(doc?.content?.[0].type).toBe("bulletList");
    expect(doc?.content?.[0].content).toHaveLength(2);
    expect(doc?.content?.[1]).toEqual({ type: "codeBlock", content: [{ type: "text", text: "const x = 1;" }] });
  });
});