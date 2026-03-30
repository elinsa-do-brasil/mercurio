"use client";

import { useMemo, useRef } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import html2canvas from "html2canvas-pro";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const DDI_VALUES = ["+55", "+34"] as const;

const phoneSchema = z.object({
  ddi: z.enum(DDI_VALUES),
  numero: z.string(),
});

const formSchema = z.object({
  nome: z
    .string()
    .refine((v) => v.trim().split(/\s+/).filter(Boolean).length >= 2, {
      message: "Informe nome e sobrenome.",
    }),
  cargo: z.string().min(1, "Cargo é obrigatório."),
  local: z.string().optional().default(""),
  telefone: phoneSchema
    .refine(
      ({ ddi, numero }) => {
        if (!numero) return true;
        if (ddi === "+55") return /^\(\d{2}\) \d \d{4}-\d{4}$/.test(numero);
        if (ddi === "+34") return /^\d{3} \d{3} \d{3}$/.test(numero);
        return true;
      },
      {
        message: "Número incompleto.",
      },
    )
    .default({ ddi: "+55", numero: "" }),
  telefone2: phoneSchema
    .refine(
      ({ ddi, numero }) => {
        if (!numero) return true;
        if (ddi === "+55") return /^\(\d{2}\) \d \d{4}-\d{4}$/.test(numero);
        if (ddi === "+34") return /^\d{3} \d{3} \d{3}$/.test(numero);
        return true;
      },
      {
        message: "Número incompleto.",
      },
    )
    .default({ ddi: "+55", numero: "" }),
  email: z
    .string()
    .regex(/^[^\s@]+$/, "Informe um username válido (sem espaços ou @)."),
});

type FormValues = z.input<typeof formSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CONNECTORS = new Set(["de", "da", "do", "dos", "das", "e"]);

function abbreviateMiddleNames(nome: string): string {
  const words = nome.trim().split(/\s+/);
  if (words.length <= 2) return nome;
  return words
    .map((word, i) => {
      if (i === 0 || i === words.length - 1) return word;
      if (CONNECTORS.has(word.toLowerCase())) return null;
      if (/^[A-Za-zÀ-ÖØ-öø-ÿ]\.$/.test(word)) return word;
      return word[0].toUpperCase() + ".";
    })
    .filter(Boolean)
    .join(" ");
}

interface Recommendation {
  field: keyof FormValues;
  label: string;
  suggestion: string;
}

function getRecommendations(nome: string): Recommendation[] {
  if (!nome) return [];
  const abbreviated = abbreviateMiddleNames(nome);
  if (abbreviated === nome) return [];
  return [{ field: "nome", label: "Abreviar nomes do meio", suggestion: abbreviated }];
}

function maskBR(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  let masked = "";
  if (digits.length > 0) masked += "(" + digits.slice(0, 2);
  if (digits.length > 2) masked += ") " + digits.slice(2, 3);
  if (digits.length > 3) masked += " " + digits.slice(3, 7);
  if (digits.length > 7) masked += "-" + digits.slice(7, 11);
  return masked;
}

function maskES(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 3) return digits;
  let masked = digits.slice(0, 3) + " " + digits.slice(3, 6);
  if (digits.length > 6) masked += " " + digits.slice(6, 9);
  return masked;
}

function applyMask(ddi: string, value: string): string {
  return ddi === "+55" ? maskBR(value) : maskES(value);
}

function formatPhone(ddi: string, numero: string): string {
  return `${ddi} ${numero}`;
}

const EMAIL_DOMAIN = "@grupoamperelinsa.com";

const CARD_TEXT_STYLE: React.CSSProperties = {
  fontSize: "13px",
  color: "#333333",
  lineHeight: 1.5,
  whiteSpace: "nowrap",
};

// ---------------------------------------------------------------------------
// Phone field component
// ---------------------------------------------------------------------------

function PhoneField({
  id,
  label,
  control,
  name,
}: {
  id: string;
  label: string;
  control: ReturnType<typeof useForm<FormValues>>["control"];
  name: "telefone" | "telefone2";
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const ddi = field.value?.ddi ?? "+55";
        const numero = field.value?.numero ?? "";
        return (
          <Field data-invalid={!!fieldState.error}>
            <FieldLabel htmlFor={id}>
              {label}{" "}
              <span className="text-muted-foreground font-normal">(opcional)</span>
            </FieldLabel>
            <div className="flex gap-2">
              <select
                value={ddi}
                onChange={(e) => {
                  field.onChange({ ddi: e.target.value, numero: "" });
                }}
                className="h-8 rounded-md border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="+55">🇧🇷 +55</option>
                <option value="+34">🇪🇸 +34</option>
              </select>
              <Input
                id={id}
                value={numero}
                onChange={(e) => {
                  const masked = applyMask(ddi, e.target.value);
                  field.onChange({ ddi, numero: masked });
                }}
                onBlur={field.onBlur}
                placeholder={ddi === "+55" ? "(91) 9 0000-0000" : "000 000 000"}
                className={`flex-1 ${fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
            </div>
            <FieldError>{fieldState.error?.message}</FieldError>
          </Field>
        );
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Email field component
// ---------------------------------------------------------------------------

function EmailField({
  control,
}: {
  control: ReturnType<typeof useForm<FormValues>>["control"];
}) {
  return (
    <Controller
      control={control}
      name="email"
      render={({ field, fieldState }) => (
        <Field data-invalid={!!fieldState.error}>
          <FieldLabel htmlFor="email">E-mail</FieldLabel>
          <div className="flex items-center gap-0">
            <Input
              id="email"
              {...field}
              autoComplete="off"
              placeholder="nome.sobrenome"
              className={`flex-1 rounded-r-none border-r-0 ${fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}`}
            />
            <span className="h-8 inline-flex items-center rounded-r-lg border border-l-0 border-input bg-muted/40 px-2.5 text-sm text-muted-foreground select-none whitespace-nowrap">
              {EMAIL_DOMAIN}
            </span>
          </div>
          <FieldError>{fieldState.error?.message}</FieldError>
        </Field>
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Home() {
  const signatureRef = useRef<HTMLDivElement>(null);

  const {
    register,
    control,
    setValue,
    formState: { isValid },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema as any),
    mode: "onTouched",
    defaultValues: {
      nome: "",
      cargo: "",
      local: "",
      telefone: { ddi: "+55", numero: "" },
      telefone2: { ddi: "+55", numero: "" },
      email: "",
    },
  });

  const form = useWatch({ control });

  const recs = useMemo(() => getRecommendations(form.nome ?? ""), [form.nome]);

  const exportPng = async () => {
    if (!signatureRef.current) return;

    const raw = await html2canvas(signatureRef.current, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
    });

    const radius = 16;
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
    link.download = `assinatura-${(form.nome ?? "").toLowerCase().replace(/\s+/g, "-")}.png`;
    link.href = rounded.toDataURL("image/png");
    link.click();
  };

  const tel1 = form.telefone?.numero ?? "";
  const tel2 = form.telefone2?.numero ?? "";
  const ddi1 = form.telefone?.ddi ?? "+55";
  const ddi2 = form.telefone2?.ddi ?? "+55";

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
            <CardContent>
              <FieldGroup>
                {/* Nome */}
                <Controller
                  control={control}
                  name="nome"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={!!fieldState.error}>
                      <FieldLabel htmlFor="nome">Nome completo</FieldLabel>
                      <Input
                        id="nome"
                        {...field}
                        placeholder="Fulano de Tal"
                        className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}
                      />
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </Field>
                  )}
                />

                {/* Cargo */}
                <Controller
                  control={control}
                  name="cargo"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={!!fieldState.error}>
                      <FieldLabel htmlFor="cargo">Cargo</FieldLabel>
                      <Input
                        id="cargo"
                        {...field}
                        placeholder="Trabalho com isso..."
                        className={fieldState.error ? "border-destructive focus-visible:ring-destructive" : ""}
                      />
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </Field>
                  )}
                />

                {/* E-mail */}
                <EmailField control={control} />

                {/* Local */}
                <Field>
                  <FieldLabel htmlFor="local">
                    Local de atuação{" "}
                    <span className="text-muted-foreground font-normal">(opcional)</span>
                  </FieldLabel>
                  <Input
                    id="local"
                    {...register("local")}
                    placeholder="Base Paragominas, Regional Centro-Oeste..."
                  />
                  <FieldDescription>
                    Informe o seu local de atuação (ex: Base Paragominas; Base
                    Santarém; Regional Centro-Oeste; Regional Nordeste...) ou
                    deixe em branco caso seu cargo seja de atuação geral na
                    empresa (ex: Diretor; Gerente; Conselheiro; Consultor...).
                  </FieldDescription>
                </Field>

                {/* Telefone 1 */}
                <PhoneField
                  id="telefone"
                  label="Telefone"
                  control={control}
                  name="telefone"
                />

                {/* Telefone 2 */}
                <PhoneField
                  id="telefone2"
                  label="Segundo telefone"
                  control={control}
                  name="telefone2"
                />

                <Button
                  type="button"
                  onClick={exportPng}
                  disabled={!isValid}
                  className="w-full mt-2 bg-elinsa hover:bg-elinsa-dim text-white font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Baixar como PNG
                </Button>
              </FieldGroup>
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
                  maxWidth: "700px",
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
                  <span style={{ ...CARD_TEXT_STYLE, lineHeight: 1.4 }}>
                    Elinsa do Brasil{form.local ? ` | ${form.local}` : ""}
                  </span>
                  <div style={{ height: "6px" }} />
                  {(tel1 || tel2) && (
                    <span style={CARD_TEXT_STYLE}>
                      {[
                        tel1 && formatPhone(ddi1, tel1),
                        tel2 && formatPhone(ddi2, tel2),
                      ]
                        .filter(Boolean)
                        .join(" | ")}
                    </span>
                  )}
                  <span style={CARD_TEXT_STYLE}>
                    {form.email
                      ? form.email + EMAIL_DOMAIN
                      : "alguem@grupoamperelinsa.com"}
                  </span>
                </div>
              </div>
            </div>

            {/* Recommendations */}
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
                        {rec.suggestion !== form[rec.field] && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0 text-xs h-7 cursor-pointer"
                            onClick={() =>
                              setValue(rec.field, rec.suggestion, {
                                shouldValidate: true,
                              })
                            }
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
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-3">
        <p className="text-xs text-muted-foreground text-center">
          Feito com 😝 e código aberto na <strong>Elinsa do Brasil</strong> por{" "}
          <strong>Raave L. Aires</strong>
        </p>
      </footer>
    </main>
  );
}
