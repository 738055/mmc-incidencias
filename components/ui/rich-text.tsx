"use client";

import { useState } from "react";
import Editor from "react-simple-wysiwyg";

/**
 * Editor de texto rico (WYSIWYG). O HTML é sanitizado no servidor antes de
 * gravar (ver lib/sanitize).
 * - Não-controlado (padrão): passe `name`; emite o HTML num input oculto para o
 *   envio nativo do formulário (Server Action).
 * - Controlado: passe `value` + `onValueChange` (ex.: quando o pai monta a
 *   FormData à mão, como o painel de triagem).
 */
export function RichTextField({
  name,
  defaultValue = "",
  placeholder,
  value,
  onValueChange,
}: {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  value?: string;
  onValueChange?: (html: string) => void;
}) {
  const [internal, setInternal] = useState(defaultValue);
  const html = value !== undefined ? value : internal;
  const setHtml = (v: string) => {
    if (value === undefined) setInternal(v);
    onValueChange?.(v);
  };
  return (
    <div className="rich-editor">
      <Editor
        value={html}
        onChange={(e) => setHtml(e.target.value)}
        placeholder={placeholder}
      />
      {name && <input type="hidden" name={name} value={html} />}
    </div>
  );
}
