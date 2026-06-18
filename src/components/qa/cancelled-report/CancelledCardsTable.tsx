import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { CancelledCard } from "@/types/cancelledReport.types";

type SortKey = "key" | "summary" | "assigneeDisplayName" | "resolutionDate";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 15;

const pad = (n: number) => String(n).padStart(2, "0");
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

interface Props {
  cards: CancelledCard[];
}

const CancelledCardsTable = ({ cards }: Props) => {
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("resolutionDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const arr = [...cards];
    arr.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [cards, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const slice = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey !== k ? (
      <ArrowUpDown className="w-3 h-3 inline opacity-50" />
    ) : sortDir === "asc" ? (
      <ArrowUp className="w-3 h-3 inline" />
    ) : (
      <ArrowDown className="w-3 h-3 inline" />
    );

  if (cards.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
        <p className="text-sm">Nenhum card cancelado pelo QA neste mês 🎉</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-secondary text-muted-foreground">
            <tr>
              <th
                onClick={() => toggleSort("key")}
                className="text-left px-4 py-2 cursor-pointer select-none"
              >
                Chave <SortIcon k="key" />
              </th>
              <th
                onClick={() => toggleSort("summary")}
                className="text-left px-4 py-2 cursor-pointer select-none"
              >
                Título <SortIcon k="summary" />
              </th>
              <th
                onClick={() => toggleSort("assigneeDisplayName")}
                className="text-left px-4 py-2 cursor-pointer select-none"
              >
                Responsável <SortIcon k="assigneeDisplayName" />
              </th>
              <th
                onClick={() => toggleSort("resolutionDate")}
                className="text-left px-4 py-2 cursor-pointer select-none whitespace-nowrap"
              >
                Data Resolução <SortIcon k="resolutionDate" />
              </th>
            </tr>
          </thead>
          <tbody>
            {slice.map((c) => (
              <tr key={c.key} className="border-t border-border hover:bg-secondary/40">
                <td className="px-4 py-2 whitespace-nowrap">
                  <a
                    href={c.jiraUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium"
                  >
                    {c.key}
                  </a>
                </td>
                <td className="px-4 py-2 max-w-md">
                  <span className="block truncate text-foreground" title={c.summary}>
                    {c.summary}
                  </span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {c.assigneeDisplayName ? (
                    <span className="text-foreground">{c.assigneeDisplayName}</span>
                  ) : (
                    <span className="italic text-muted-foreground">Não atribuído</span>
                  )}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                  {fmtDate(c.resolutionDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs">
          <span className="text-muted-foreground">
            Página {safePage} de {totalPages} · {sorted.length} cards
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="px-2 py-1 rounded border border-border disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="px-2 py-1 rounded border border-border disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CancelledCardsTable;
