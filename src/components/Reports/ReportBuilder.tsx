import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import type { ReportField } from "@/types/reports.types";
import FieldSelector from "./FieldSelector";

interface Props {
  availableFields: ReportField[];
  selectedFieldIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

const ReportBuilder = ({ availableFields, selectedFieldIds, onSelectionChange }: Props) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <div className="hidden md:block h-full">
        <FieldSelector
          availableFields={availableFields}
          selectedFieldIds={selectedFieldIds}
          onSelectionChange={onSelectionChange}
        />
      </div>
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden flex items-center gap-2 px-3 py-2 rounded-md bg-secondary border border-border text-xs"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" /> Campos ({selectedFieldIds.length})
      </button>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="flex-1 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="w-80 bg-background border-l border-border p-3 flex flex-col">
            <button
              onClick={() => setMobileOpen(false)}
              className="self-end p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex-1 overflow-hidden">
              <FieldSelector
                availableFields={availableFields}
                selectedFieldIds={selectedFieldIds}
                onSelectionChange={onSelectionChange}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReportBuilder;
