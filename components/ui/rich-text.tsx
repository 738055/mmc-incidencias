"use client";

import { useState } from "react";
import Editor from "react-simple-wysiwyg";

/**
 * Editor de texto rico (WYSIWYG) para a descrição de chamados/melhorias.
 * Emite o HTML num input oculto para o envio nativo do formulário (Server
 * Action). O HTML é sanitizado no servidor antes de gravar (ver lib/sanitize).
 */
export function RichTextField({
  name,
  defaultValue = "",
  placeholder,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const [html, setHtml] = useState(defaultValue);
  return (
    <div className="rich-editor">
      <Editor
        value={html}
        onChange={(e) => setHtml(e.target.value)}
        placeholder={placeholder}
      />
      <input type="hidden" name={name} value={html} />
    </div>
  );
}
