import { describe, expect, it } from "vitest";
import { formatCardHtml, formatCardText, type RewrittenCard } from "@/lib/cardRewrite";
import { adfToText } from "../../supabase/functions/_shared/adf";

const card: RewrittenCard = {
  titulo: "Cronograma - Soma dos custos mensais diverge do total",
  breve_explicacao: [
    { tipo: "paragrafo", texto: "Ao preencher o cronograma, foi identificado que a soma diverge.", itens: [] },
    { tipo: "lista", texto: "", itens: ["30 dias (29,69%): R$ 145.726,09", "120 dias (15,08%): R$ 74.016,49"] },
    { tipo: "paragrafo", texto: "Gerando uma divergência de R$ 0,01.", itens: [] },
  ],
  acoes: ["Orçamento", "Acessar Cronograma", "Somar os valores dos períodos"],
  resultado_esperado: "A soma deve ser de R$ 490.825,51.",
  observacoes: ["Imagem demonstrando a divergência em anexo.", "Link do orçamento: https://app.orcafascio.com/orc/orcamentos/abc"],
  complementar: ["Valores dos períodos de 60 e 90 dias"],
};

describe("formatCardText", () => {
  it("monta o template do QA sem o título nem os itens a complementar", () => {
    expect(formatCardText(card)).toBe(
      [
        "Breve explicação:",
        "Ao preencher o cronograma, foi identificado que a soma diverge.",
        "* 30 dias (29,69%): R$ 145.726,09",
        "* 120 dias (15,08%): R$ 74.016,49",
        "Gerando uma divergência de R$ 0,01.",
        "Ações tomadas para gerar o erro:",
        "Orçamento >> Acessar Cronograma >> Somar os valores dos períodos",
        "Resultado esperado:",
        "A soma deve ser de R$ 490.825,51.",
        "OBSERVAÇÕES:",
        "",
        "* Imagem demonstrando a divergência em anexo.",
        "* Link do orçamento: https://app.orcafascio.com/orc/orcamentos/abc",
      ].join("\n"),
    );
  });

  it("omite OBSERVAÇÕES quando não há nenhuma", () => {
    expect(formatCardText({ ...card, observacoes: [] })).not.toContain("OBSERVAÇÕES");
  });
});

describe("formatCardHtml", () => {
  it("gera listas, links e escapa HTML do texto da IA", () => {
    const html = formatCardHtml({ ...card, resultado_esperado: "Valor <b> & cia" });
    expect(html).toContain("<li>30 dias (29,69%): R$ 145.726,09</li>");
    expect(html).toContain('<a href="https://app.orcafascio.com/orc/orcamentos/abc">');
    expect(html).toContain("Valor &lt;b&gt; &amp; cia");
    expect(html).toContain("<p>Orçamento &gt;&gt; Acessar Cronograma &gt;&gt; Somar os valores dos períodos</p>");
  });
});

describe("adfToText", () => {
  it("preserva parágrafos, quebras, listas e links do Jira", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Breve explicação: erro" }] },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Segue link de medição:" },
            { type: "hardBreak" },
            { type: "inlineCard", attrs: { url: "https://app.orcafascio.com/medicoes/1" } },
          ],
        },
        {
          type: "bulletList",
          content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "item A" }] }] },
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "aqui", marks: [{ type: "link", attrs: { href: "https://x.com" } }] }] }],
            },
          ],
        },
        { type: "mediaSingle", content: [{ type: "media", attrs: { id: "1" } }] },
      ],
    };
    expect(adfToText(doc)).toBe(
      "Breve explicação: erro\n\nSegue link de medição:\nhttps://app.orcafascio.com/medicoes/1\n\n* item A\n* aqui (https://x.com)",
    );
  });

  it("aceita vazio e texto puro", () => {
    expect(adfToText(null)).toBe("");
    expect(adfToText("  texto  ")).toBe("texto");
  });
});
