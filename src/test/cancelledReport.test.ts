import { describe, expect, it } from "vitest";
import { buildReporterRanking } from "@/utils/cancelledReport";

describe("Taxa de cancelamento por relator", () => {
  it("calcula 20% para 2 cards cancelados entre 10 criados", () => {
    const ranking = buildReporterRanking(
      [{ reporter: "Ana" }, { reporter: "Ana" }],
      { Ana: 10 }
    );

    expect(ranking).toEqual([
      { reporter: "Ana", count: 2, created: 10, rate: 20 },
    ]);
  });

  it("mantém relatores com cards criados e nenhum cancelamento", () => {
    const ranking = buildReporterRanking([], { Bruno: 4 });

    expect(ranking).toEqual([
      { reporter: "Bruno", count: 0, created: 4, rate: 0 },
    ]);
  });

  it("agrupa cards sem relator sem alterar suas quantidades", () => {
    const ranking = buildReporterRanking(
      [{ reporter: "" }, { reporter: null }],
      { "Sem relator": 5 }
    );

    expect(ranking).toEqual([
      { reporter: "Sem relator", count: 2, created: 5, rate: 40 },
    ]);
  });
});
