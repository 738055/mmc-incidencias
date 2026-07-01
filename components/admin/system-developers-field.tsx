"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { SystemDeveloper } from "@/lib/supabase/types";

/**
 * Cadastro dos desenvolvedores do sistema: linhas de nome + e-mail (add/remove).
 * Serializa em JSON num input oculto; a Server Action valida cada um e dedup.
 */
export function SystemDevelopersField({
  name = "developers",
  defaultValue = [],
}: {
  name?: string;
  defaultValue?: SystemDeveloper[];
}) {
  const [devs, setDevs] = useState<SystemDeveloper[]>(
    defaultValue.length ? defaultValue : [{ name: "", email: "" }],
  );

  const patch = (i: number, p: Partial<SystemDeveloper>) =>
    setDevs((d) => d.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const add = () => setDevs((d) => [...d, { name: "", email: "" }]);
  const remove = (i: number) =>
    setDevs((d) => (d.length > 1 ? d.filter((_, j) => j !== i) : [{ name: "", email: "" }]));

  // Só entra no payload quem tem e-mail preenchido.
  const payload = JSON.stringify(devs.filter((d) => d.email.trim()));

  return (
    <div className="space-y-2">
      {devs.map((d, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            placeholder="Nome"
            value={d.name}
            onChange={(e) => patch(i, { name: e.target.value })}
            className="sm:max-w-[40%]"
          />
          <Input
            type="email"
            placeholder="email@empresa.com"
            value={d.email}
            onChange={(e) => patch(i, { email: e.target.value })}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => remove(i)}
            aria-label="Remover desenvolvedor"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-4 w-4" /> Adicionar desenvolvedor
      </Button>
      <input type="hidden" name={name} value={payload} />
    </div>
  );
}
