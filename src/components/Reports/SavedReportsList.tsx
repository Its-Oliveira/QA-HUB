import { useState } from "react";
import { ChevronDown, ChevronUp, Trash2, Pencil, FolderOpen } from "lucide-react";
import type { ReportConfig } from "@/types/reports.types";

interface Props {
  configs: ReportConfig[];
  onLoad: (config: ReportConfig) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  maxReached: boolean;
}

const SavedReportsList = ({ configs, onLoad, onRename, onDelete, maxReached }: Props) => {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  return (
    <div className="bg-card border border-border rounded-xl">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-3 text-sm font-medium text-foreground"
      >
        <span>Configurações salvas ({configs.length})</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="border-t border-border p-3">
          {maxReached && (
            <p className="text-[11px] text-yellow-400 mb-2">Limite de 10 configurações atingido.</p>
          )}
          {configs.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma configuração salva.</p>
          ) : (
            <ul className="space-y-1">
              {configs.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-xs"
                >
                  {editingId === c.id ? (
                    <>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 bg-secondary border border-border rounded px-2 py-1 text-foreground"
                      />
                      <button
                        onClick={() => {
                          onRename(c.id, editName || c.name);
                          setEditingId(null);
                        }}
                        className="text-primary"
                      >
                        Salvar
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-muted-foreground">
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-foreground truncate">{c.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {c.selectedFieldIds.length} campos
                      </span>
                      <button
                        onClick={() => onLoad(c)}
                        className="p-1 rounded text-muted-foreground hover:text-primary"
                        title="Carregar"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(c.id);
                          setEditName(c.name);
                        }}
                        className="p-1 rounded text-muted-foreground hover:text-foreground"
                        title="Renomear"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(c.id)}
                        className="p-1 rounded text-muted-foreground hover:text-destructive"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default SavedReportsList;
