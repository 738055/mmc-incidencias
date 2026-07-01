"use client";

import { FileSpreadsheet, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Exporta os indicadores: CSV (abre no Excel) e PDF (via impressão do navegador). */
export function IndicatorsExport({ periodo }: { periodo: string }) {
  return (
    <div className="flex gap-2">
      <Button asChild variant="outline" size="sm">
        <a href={`/indicadores/export?periodo=${periodo}`}>
          <FileSpreadsheet className="h-4 w-4" /> Excel
        </a>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => window.print()}
      >
        <Printer className="h-4 w-4" /> PDF
      </Button>
    </div>
  );
}
