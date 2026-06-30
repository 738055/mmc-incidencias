import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface IncidentEmailProps {
  ref: number;
  kindLabel: string;
  title: string;
  description: string;
  systemName?: string | null;
  category?: string | null;
  stakeholderArea?: string | null;
  benefit?: string | null;
  priorityLabel: string;
  requesterName: string;
  companyName: string;
  openedAt: string;
  aiAnalysis?: string | null;
  /** Observação/avaliação do admin na triagem (vai em destaque para o dev). */
  triageNote?: string | null;
  url: string;
  imageUrls?: string[];
  /** Anexos não-imagem (PDF, docs, etc.) como links de download assinados. */
  fileLinks?: { name: string; url: string; size: string }[];
}

const navy = "#0b2545";
const orange = "#f26c21";

/** Linha "rótulo: valor" do bloco de metadados. */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <Text style={{ margin: "0 0 8px", fontSize: 13, lineHeight: "18px" }}>
      <span style={{ color: "#8a93a3" }}>{label}: </span>
      <span style={{ color: navy, fontWeight: 600 }}>{value}</span>
    </Text>
  );
}

/** Título de seção dentro do corpo. */
function SectionTitle({ children }: { children: string }) {
  return (
    <Text style={{ color: navy, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, margin: "24px 0 8px" }}>
      {children}
    </Text>
  );
}

const bodyText = { color: "#0b1524", fontSize: 14, lineHeight: "22px", whiteSpace: "pre-wrap" as const, margin: 0 };

/**
 * E-mail do chamado encaminhado ao DESENVOLVEDOR (e contatos da empresa) após a
 * triagem do admin. Pensado para ser autossuficiente: o dev não precisa abrir a
 * plataforma — traz metadados, descrição, avaliação da triagem, análise da IA,
 * imagens embutidas e links de download dos demais anexos.
 */
export function IncidentNotificationEmail({
  ref,
  kindLabel,
  title,
  description,
  systemName,
  category,
  stakeholderArea,
  benefit,
  priorityLabel,
  requesterName,
  companyName,
  openedAt,
  aiAnalysis,
  triageNote,
  url,
  imageUrls = [],
  fileLinks = [],
}: IncidentEmailProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{`Nova ${kindLabel} #${ref}: ${title}`}</Preview>
      <Body style={{ backgroundColor: "#f5f7fb", fontFamily: "Arial, sans-serif", margin: 0, padding: "24px 0" }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", backgroundColor: "#ffffff", borderRadius: 12, overflow: "hidden", border: "1px solid #e3e8f0" }}>
          {/* Cabeçalho */}
          <Section style={{ background: navy, padding: "24px 28px" }}>
            <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: 700, margin: 0 }}>
              MMC Incidências
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, margin: "2px 0 0" }}>
              Chamado encaminhado após a triagem
            </Text>
          </Section>

          <Section style={{ padding: "28px" }}>
            <Text style={{ display: "inline-block", background: "#fff3ec", color: orange, fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999, margin: 0 }}>
              {`${kindLabel} #${ref} · Prioridade ${priorityLabel}`}
            </Text>
            <Heading style={{ color: navy, fontSize: 20, margin: "14px 0 6px" }}>
              {title}
            </Heading>

            {/* Metadados estruturados */}
            <Section style={{ marginTop: 14, background: "#f5f7fb", borderRadius: 8, padding: "16px 18px", border: "1px solid #e3e8f0" }}>
              {systemName && <Field label="Sistema" value={systemName} />}
              {category && <Field label="Categoria" value={category} />}
              {stakeholderArea && <Field label="Área solicitante" value={stakeholderArea} />}
              <Field label="Empresa" value={companyName} />
              <Field label="Aberto por" value={requesterName} />
              <Text style={{ margin: 0, fontSize: 13, lineHeight: "18px" }}>
                <span style={{ color: "#8a93a3" }}>Aberto em: </span>
                <span style={{ color: navy, fontWeight: 600 }}>{openedAt}</span>
              </Text>
            </Section>

            {/* Descrição */}
            <SectionTitle>Descrição</SectionTitle>
            <Text style={bodyText}>{description}</Text>

            {/* Benefício esperado (melhorias) */}
            {benefit && (
              <>
                <SectionTitle>Benefício esperado</SectionTitle>
                <Text style={bodyText}>{benefit}</Text>
              </>
            )}

            {/* Avaliação da triagem (admin) — em destaque */}
            {triageNote && (
              <Section style={{ marginTop: 24, background: "#fff8f3", borderLeft: `3px solid ${orange}`, borderRadius: 6, padding: "14px 16px" }}>
                <Text style={{ color: orange, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 6px" }}>
                  Avaliação da triagem (admin)
                </Text>
                <Text style={{ ...bodyText, fontSize: 14 }}>{triageNote}</Text>
              </Section>
            )}

            {/* Análise da IA */}
            {aiAnalysis && (
              <>
                <SectionTitle>Análise da IA</SectionTitle>
                <Text style={{ ...bodyText, color: "#3a4658" }}>{aiAnalysis}</Text>
              </>
            )}

            {/* Imagens anexadas (embutidas) */}
            {imageUrls.length > 0 && (
              <>
                <SectionTitle>Imagens</SectionTitle>
                {imageUrls.map((src, i) => (
                  <Img
                    key={i}
                    src={src}
                    alt={`Imagem ${i + 1}`}
                    style={{ width: "100%", borderRadius: 8, border: "1px solid #e3e8f0", marginBottom: 8 }}
                  />
                ))}
              </>
            )}

            {/* Demais anexos (download) */}
            {fileLinks.length > 0 && (
              <>
                <SectionTitle>Arquivos anexos</SectionTitle>
                {fileLinks.map((f, i) => (
                  <Text key={i} style={{ margin: "0 0 6px", fontSize: 14 }}>
                    <Link href={f.url} style={{ color: orange, fontWeight: 600, textDecoration: "none" }}>
                      ↓ {f.name}
                    </Link>
                    <span style={{ color: "#8a93a3" }}> · {f.size}</span>
                  </Text>
                ))}
              </>
            )}

            <Section style={{ marginTop: 28, textAlign: "center" as const }}>
              <Link
                href={url}
                style={{ background: orange, color: "#ffffff", fontSize: 14, fontWeight: 700, padding: "12px 24px", borderRadius: 8, textDecoration: "none", display: "inline-block" }}
              >
                Abrir na plataforma
              </Link>
            </Section>
          </Section>

          <Section style={{ background: "#f5f7fb", padding: "16px 28px" }}>
            <Text style={{ color: "#8a93a3", fontSize: 11, margin: 0 }}>
              {`Chamado #${ref} encaminhado automaticamente após a triagem da MMC Incidências. Os links de anexo expiram em 7 dias.`}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
