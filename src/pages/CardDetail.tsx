import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ChevronDown, ChevronRight, Paperclip, ArrowUp, ArrowRight, ArrowDown, Loader2, Clock, User } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface JiraIssue {
  key: string;
  title: string;
  description: string;
  status: string;
  statusCategoryColor: string;
  priority: string;
  priorityName: string;
  assignee: { name: string; avatar: string } | null;
  reporter: { name: string; avatar: string } | null;
  created: string;
  updated: string;
  attachments: {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    created: string;
    thumbnail: string;
    content: string;
    author: string;
  }[];
  timetracking: { originalEstimate?: string; remainingEstimate?: string; timeSpent?: string } | null;
  labels: string[];
  components: string[];
  issueType: string;
  customFields: Record<string, any>;
}

const statusColorMap: Record<string, string> = {
  'backlog': 'bg-yellow-500/20 text-yellow-400',
  'em revisão qa': 'bg-blue-500/20 text-blue-400',
  'reprovado qa': 'bg-red-500/20 text-red-400',
  'em produção': 'bg-green-500/20 text-green-400',
  'done': 'bg-green-500/20 text-green-400',
};

const PriorityIcon = ({ priority }: { priority: string }) => {
  switch (priority) {
    case 'HIGH':
      return <ArrowUp className="w-4 h-4 text-red-400" />;
    case 'MEDIUM':
      return <ArrowRight className="w-4 h-4 text-orange-400" />;
    case 'LOW':
      return <ArrowDown className="w-4 h-4 text-blue-400" />;
    default:
      return <ArrowRight className="w-4 h-4 text-muted-foreground" />;
  }
};

const AvatarWithName = ({ name, avatar }: { name: string; avatar?: string }) => (
  <div className="flex items-center gap-2">
    {avatar ? (
      <img src={avatar} alt={name} className="w-6 h-6 rounded-full" />
    ) : (
      <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-medium text-foreground">
        {name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
      </div>
    )}
    <span className="text-sm text-foreground">{name}</span>
  </div>
);

const MetadataRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-border/50">
    <span className="text-sm text-muted-foreground">{label}</span>
    <div className="text-sm text-foreground">{children}</div>
  </div>
);

const CardDetail = () => {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const [infoOpen, setInfoOpen] = useState(true);
  const [attachmentsOpen, setAttachmentsOpen] = useState(true);

  const { data: issue, isLoading, error } = useQuery<JiraIssue>({
    queryKey: ["jira_issue", key],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-jira-issue", {
        body: null,
        headers: {},
        method: "GET",
      });
      // supabase.functions.invoke doesn't support query params, so we use a workaround
      // Actually, let's use POST with body
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-jira-issue?key=${encodeURIComponent(key!)}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao buscar card');
      }
      return res.json();
    },
    enabled: !!key,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-destructive text-sm">{(error as Error)?.message || 'Card não encontrado'}</p>
        <button onClick={() => navigate('/cards')} className="text-primary text-sm hover:underline">Voltar aos cards</button>
      </div>
    );
  }

  const statusClass = statusColorMap[issue.status.toLowerCase()] || 'bg-secondary text-foreground';

  // Find custom fields for known Jira fields
  const findCustomField = (keywords: string[]): string | null => {
    for (const [, value] of Object.entries(issue.customFields)) {
      if (typeof value === 'string' && keywords.some(kw => value.toLowerCase().includes(kw))) {
        return value;
      }
    }
    // Also check by field names if available
    return null;
  };

  // Try to extract known custom fields from the customFields map
  // These are best-effort - if not found, they won't render
  const customFieldValues = Object.values(issue.customFields).filter(v => v != null && v !== '');

  // Parse description sections
  const descriptionLines = issue.description.split('\n').filter(l => l.trim());

  // Extract specific fields from description or custom fields
  const extractFieldFromDescription = (label: string): string | null => {
    const idx = descriptionLines.findIndex(l => l.toLowerCase().includes(label.toLowerCase()));
    if (idx !== -1 && idx + 1 < descriptionLines.length) {
      return descriptionLines[idx + 1].trim();
    }
    return null;
  };

  const emailCliente = extractFieldFromDescription('e-mail cliente') || extractFieldFromDescription('email cliente');
  const empresaId = extractFieldFromDescription('empresa id') || extractFieldFromDescription('empresa');

  return (
    <div>
      {/* Breadcrumb + back */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate('/cards')} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-xs text-muted-foreground">Bugs Orçafascio</span>
        <ChevronRight className="w-3 h-3 text-muted-foreground" />
        <span className="text-xs text-primary font-mono">{issue.key}</span>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6">
        {/* Left column - main content */}
        <div className="flex-1 min-w-0" style={{ flex: '0 0 65%' }}>
          {/* Title */}
          <h1 className="text-xl font-bold text-foreground mb-6 leading-snug">{issue.title}</h1>

          {/* Informações principais */}
          <Collapsible open={infoOpen} onOpenChange={setInfoOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 mb-3 group cursor-pointer">
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${infoOpen ? '' : '-rotate-90'}`} />
              <span className="text-sm font-semibold text-primary">Informações principais</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="bg-card border border-border rounded-xl p-5 mb-6">
                {issue.description && (
                  <>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Descrição do Problema</h3>
                    <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line mb-4">
                      {issue.description}
                    </div>
                  </>
                )}

                {emailCliente && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">E-mail Cliente</h4>
                    <p className="text-sm text-foreground">{emailCliente}</p>
                  </div>
                )}

                {empresaId && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Empresa ID</h4>
                    {empresaId.startsWith('http') ? (
                      <a href={empresaId} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">{empresaId}</a>
                    ) : (
                      <p className="text-sm text-foreground">{empresaId}</p>
                    )}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Anexos */}
          {issue.attachments.length > 0 && (
            <Collapsible open={attachmentsOpen} onOpenChange={setAttachmentsOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 mb-3 group cursor-pointer">
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${attachmentsOpen ? '' : '-rotate-90'}`} />
                <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Anexos</span>
                <span className="text-xs bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">{issue.attachments.length}</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-3 gap-3">
                  {issue.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.content}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors group"
                    >
                      {att.thumbnail && att.mimeType.startsWith('image') ? (
                        <div className="aspect-video bg-secondary flex items-center justify-center overflow-hidden">
                          <img src={att.thumbnail} alt={att.filename} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="aspect-video bg-secondary flex items-center justify-center">
                          <Paperclip className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="p-2">
                        <p className="text-xs text-foreground truncate">{att.filename}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(att.created).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        {/* Right column - sidebar */}
        <div className="w-[35%] flex-shrink-0">
          {/* Status pill */}
          <div className="mb-5">
            <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-medium ${statusClass}`}>
              {issue.status}
            </span>
          </div>

          {/* Informações section */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Informações</h3>

            {issue.assignee && (
              <MetadataRow label="Responsável">
                <AvatarWithName name={issue.assignee.name} avatar={issue.assignee.avatar} />
              </MetadataRow>
            )}

            {issue.reporter && (
              <MetadataRow label="Relator">
                <AvatarWithName name={issue.reporter.name} avatar={issue.reporter.avatar} />
              </MetadataRow>
            )}

            {issue.components.length > 0 && (
              <MetadataRow label="Módulo">
                <div className="flex flex-wrap gap-1 justify-end">
                  {issue.components.map(c => (
                    <span key={c} className="text-xs bg-secondary px-2 py-0.5 rounded">{c}</span>
                  ))}
                </div>
              </MetadataRow>
            )}

            <MetadataRow label="Prioridade">
              <div className="flex items-center gap-1.5">
                <PriorityIcon priority={issue.priority} />
                <span>{issue.priorityName}</span>
              </div>
            </MetadataRow>

            {issue.timetracking?.timeSpent && (
              <MetadataRow label="Controle de tempo">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{issue.timetracking.timeSpent}</span>
                </div>
              </MetadataRow>
            )}

            {/* Custom fields that might contain Nome do Cliente, Card Revisado, Tester */}
            {Object.entries(issue.customFields).map(([fieldKey, value]) => {
              if (!value || value === '') return null;
              // Skip fields we can't display meaningfully
              if (typeof value !== 'string' && typeof value !== 'number') return null;
              return (
                <MetadataRow key={fieldKey} label={fieldKey}>
                  <span>{String(value)}</span>
                </MetadataRow>
              );
            })}
          </div>

          {/* Timestamps */}
          <div className="mt-4 space-y-1">
            <p className="text-xs text-muted-foreground">
              Criado {new Date(issue.created).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
            <p className="text-xs text-muted-foreground">
              Atualizado {new Date(issue.updated).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardDetail;
