"use client";

import { useCallback, useRef, useState } from "react";
import html2canvas from "html2canvas-pro";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface FormData {
  nome: string;
  cargo: string;
  email: string;
  telefone: string;
}

interface Recommendation {
  field: keyof FormData;
  label: string;
  suggestion: string;
  apply: () => string;
}

const CONNECTORS = new Set(["de", "da", "do", "dos", "das", "e", "e"]);

function abbreviateMiddleNames(nome: string): string {
  const words = nome.trim().split(/\s+/);
  if (words.length <= 2) return nome;
  const result = words
    .map((word, i) => {
      if (i === 0 || i === words.length - 1) return word;
      if (CONNECTORS.has(word.toLowerCase())) return null;
      if (/^[A-Za-zÀ-ÖØ-öø-ÿ]\.$/.test(word)) return word; // already abbreviated
      return word[0].toUpperCase() + ".";
    })
    .filter(Boolean);
  return result.join(" ");
}

function getRecommendations(form: FormData): Recommendation[] {
  const recs: Recommendation[] = [];

  if (form.nome) {
    const abbreviated = abbreviateMiddleNames(form.nome);
    if (abbreviated !== form.nome) {
      recs.push({
        field: "nome",
        label: "Abreviar nomes do meio",
        suggestion: abbreviated,
        apply: () => abbreviated,
      });
    }
  }

  if (form.cargo && !form.cargo.trimEnd().endsWith(".")) {
    const withDot = form.cargo.trimEnd() + ".";
    recs.push({
      field: "cargo",
      label: "Adicionar ponto final ao cargo",
      suggestion: withDot,
      apply: () => withDot,
    });
  }

  return recs;
}

const EMAIL_DOMAIN = "@grupoamperelinsa.com";

export default function Home() {
  const signatureRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<FormData>({
    nome: "",
    cargo: "",
    email: "",
    telefone: "",
  });

  const [touched, setTouched] = useState<Partial<Record<keyof FormData, boolean>>>({});

  const touch = useCallback(
    (field: keyof FormData) =>
      setTouched((prev) => ({ ...prev, [field]: true })),
    [],
  );

  const updateField = useCallback(
    (field: keyof FormData, value: string) => {
      if (field === "telefone") {
        const digits = value.replace(/\D/g, "").slice(0, 11);
        let masked = "";
        if (digits.length > 0) masked += "(" + digits.slice(0, 2);
        if (digits.length >= 2) masked += ") ";
        if (digits.length > 2) masked += digits.slice(2, 3);
        if (digits.length > 3) masked += " " + digits.slice(3, 7);
        if (digits.length > 7) masked += "-" + digits.slice(7, 11);
        setForm((prev) => ({ ...prev, telefone: masked }));
      } else {
        setForm((prev) => ({ ...prev, [field]: value }));
      }
    },
    [],
  );

  const applyRec = useCallback(
    (rec: Recommendation) => setForm((prev) => ({ ...prev, [rec.field]: rec.apply() })),
    [],
  );

  const errors: Partial<Record<keyof FormData, string>> = {
    ...(form.nome.trim().split(/\s+/).filter(Boolean).length < 2 && {
      nome: "Informe nome e sobrenome.",
    }),
    ...(form.cargo.trim().length === 0 && { cargo: "Cargo é obrigatório." }),
    ...(!/^[^\s@]+$/.test(form.email.trim()) && {
      email: "Informe um username válido (sem espaços ou @).",
    }),
    ...(form.telefone &&
      !/^\(\d{2}\) \d \d{4}-\d{4}$/.test(form.telefone) && {
        telefone: "Formato esperado: (00) 9 0000-0000",
      }),
  };

  const isValid = Object.keys(errors).length === 0;

  const exportPng = async () => {
    if (!signatureRef.current) return;

    const raw = await html2canvas(signatureRef.current, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
    });

    const radius = 16; // px at 2x scale
    const rounded = document.createElement("canvas");
    rounded.width = raw.width;
    rounded.height = raw.height;
    const ctx = rounded.getContext("2d")!;
    ctx.beginPath();
    ctx.roundRect(0, 0, raw.width, raw.height, radius);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(raw, 0, 0);

    const link = document.createElement("a");
    link.download = `assinatura-${form.nome.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.href = rounded.toDataURL("image/png");
    link.click();
  };

  return (
    <main className="flex-1 flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-elinsa" />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Gerador de assinatura
            </h1>
            <p className="text-sm text-muted-foreground">Elinsa do Brasil</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Form */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base font-medium">
                Dados da assinatura
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome completo</Label>
                <Input
                  id="nome"
                  value={form.nome}
                  onChange={(e) => updateField("nome", e.target.value)}
                  onBlur={() => touch("nome")}
                  placeholder="Fulano de Tal"
                  className={touched.nome && errors.nome ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {touched.nome && errors.nome && (
                  <p className="text-xs text-destructive">{errors.nome}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cargo">Cargo</Label>
                <Input
                  id="cargo"
                  value={form.cargo}
                  onChange={(e) => updateField("cargo", e.target.value)}
                  onBlur={() => touch("cargo")}
                  placeholder="Trabalho com isso..."
                  className={touched.cargo && errors.cargo ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {touched.cargo && errors.cargo && (
                  <p className="text-xs text-destructive">{errors.cargo}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className={`flex items-center rounded-md border bg-transparent focus-within:ring-1 overflow-hidden ${touched.email && errors.email ? "border-destructive focus-within:ring-destructive" : "border-input focus-within:ring-ring"}`}>
                  <input
                    id="email"
                    type="text"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    onBlur={() => touch("email")}
                    autoComplete="off"
                    placeholder="nome.sobrenome"
                    className="flex-1 min-w-0 px-3 py-2 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                  />
                  <span className="px-3 py-2 text-sm text-muted-foreground bg-muted/40 border-l border-input select-none whitespace-nowrap">
                    {EMAIL_DOMAIN}
                  </span>
                </div>
                {touched.email && errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">
                  Telefone{" "}
                  <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Input
                  id="telefone"
                  value={form.telefone}
                  onChange={(e) => updateField("telefone", e.target.value)}
                  onBlur={() => touch("telefone")}
                  placeholder="(91) 9 0000-0000"
                  className={touched.telefone && errors.telefone ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {touched.telefone && errors.telefone && (
                  <p className="text-xs text-destructive">{errors.telefone}</p>
                )}
              </div>

              <Button
                onClick={exportPng}
                disabled={!isValid}
                className="w-full mt-2 bg-elinsa hover:bg-elinsa-dim text-white font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Baixar como PNG
              </Button>
            </CardContent>
          </Card>

          {/* Preview */}
          <div className="lg:sticky lg:top-8 space-y-4">
            <p className="text-sm font-medium text-muted-foreground">
              Preview da assinatura
            </p>

            <div className="rounded-lg border border-border/50 bg-white overflow-x-auto w-fit">
              {/* Signature — exported as PNG */}
              <div
                ref={signatureRef}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "20px",
                  padding: "28px 32px",
                  fontFamily: "'Geist', 'Segoe UI', Arial, sans-serif",
                  backgroundColor: "#ffffff",
                  width: "fit-content",
                  maxWidth: "600px",
                  overflow: "hidden",
                  borderRadius: "8px",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- html2canvas requires native <img> */}
                <img
                  src="/Logo.png"
                  alt="Elinsa do Brasil"
                  style={{ height: "80px", objectFit: "contain" }}
                  crossOrigin="anonymous"
                />

                {/* Divider */}
                <div
                  style={{
                    width: "1px",
                    alignSelf: "stretch",
                    backgroundColor: "black",
                    borderRadius: "1px",
                    flexShrink: 0,
                  }}
                />

                {/* Info */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    overflow: "hidden",
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: "18px",
                      fontWeight: 700,
                      color: "#111111",
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {form.nome || "Nome completo"}
                    {form.nome ? "," : ""}
                  </span>
                  <span
                    style={{
                      fontSize: "14px",
                      color: "#333333",
                      lineHeight: 1.4,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {form.cargo || "Cargo"}
                  </span>
                  <div style={{ height: "6px" }} />
                  <span
                    style={{
                      fontSize: "13px",
                      color: "#333333",
                      lineHeight: 1.5,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {form.email
                      ? form.email + EMAIL_DOMAIN
                      : "alguem@grupoamperelinsa.com"}
                  </span>
                  {form.telefone && (
                    <span
                      style={{
                        fontSize: "13px",
                        color: "#333333",
                        lineHeight: 1.5,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {form.telefone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {(() => {
              const recs = getRecommendations(form);
              return (
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Recomendações
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma recomendação no momento.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {recs.map((rec, i) => (
                          <div
                            key={i}
                            className="flex items-start justify-between gap-4"
                          >
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-sm font-medium">{rec.label}</p>
                              <p className="text-xs text-muted-foreground font-mono truncate">
                                {rec.suggestion}
                              </p>
                            </div>
                            {rec.apply() !== form[rec.field] && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="shrink-0 text-xs h-7 cursor-pointer"
                                onClick={() => applyRec(rec)}
                              >
                                Aplicar
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-3">
        <p className="text-xs text-muted-foreground text-center">
          Feito com 😝 e código aberto na <strong>Elinsa do Brasil</strong> por <strong>Raave L. Aires</strong>
        </p>
      </footer>
    </main>
  );
}
