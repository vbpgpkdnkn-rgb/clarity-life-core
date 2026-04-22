import { useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ExtractedSession,
  useExtractAgenda,
  usePatients,
  useUpsertTherapySession,
} from "@/hooks/usePsicoterapia";
import { useAccounts } from "@/hooks/useData";
import { todayISO, addDaysISO } from "@/lib/format";
import { ImageUp, Loader2, Sparkles, Trash2, AlertCircle, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

type Row = ExtractedSession & {
  patient_id: string | null; // após resolução
  include: boolean;
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function bestMatch(name: string, patients: any[]): string | null {
  if (!name) return null;
  const target = normalize(name);
  if (!target) return null;
  // 1) match exato
  const exact = patients.find((p) => normalize(p.name) === target);
  if (exact) return exact.id;
  // 2) começa com o primeiro nome
  const first = target.split(" ")[0];
  const candidates = patients.filter((p) => normalize(p.name).startsWith(first));
  if (candidates.length === 1) return candidates[0].id;
  // 3) inclui (substring)
  const contains = patients.find(
    (p) => normalize(p.name).includes(target) || target.includes(normalize(p.name)),
  );
  return contains?.id ?? null;
}

export function AgendaImportDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: patients = [] } = usePatients();
  const { data: accounts = [] } = useAccounts();
  const extract = useExtractAgenda();
  const upsertSession = useUpsertTherapySession();
  const qc = useQueryClient();

  const [date, setDate] = useState(addDaysISO(todayISO(), -1)); // padrão: ontem
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);

  const defaultAccount =
    (accounts as any[]).find((a) => a.scope === "profissional") ?? (accounts as any[])[0];

  const reset = () => {
    setImageDataUrl(null);
    setImagePath(null);
    setRows([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onFile = async (file: File) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 8 MB)");
      return;
    }
    // lê como data URL para enviar à edge function
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setImageDataUrl(dataUrl);
      // upload para storage (histórico)
      try {
        const ext = file.name.split(".").pop() || "png";
        const path = `${date}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("agenda-imports").upload(path, file, {
          upsert: false,
          contentType: file.type,
        });
        if (!error) setImagePath(path);
      } catch {
        // não bloqueia o fluxo se storage falhar
      }
    };
    reader.readAsDataURL(file);
  };

  const runExtraction = async () => {
    if (!imageDataUrl) {
      toast.error("Anexe uma imagem primeiro");
      return;
    }
    try {
      const sessions = await extract.mutateAsync({
        image_data_url: imageDataUrl,
        date,
        patient_names: (patients as any[]).map((p) => p.name),
      });
      const enriched: Row[] = sessions.map((s) => {
        const matched =
          (s.matched_name && bestMatch(s.matched_name, patients as any[])) ||
          bestMatch(s.raw_name, patients as any[]);
        return {
          ...s,
          patient_id: matched,
          include: true,
        };
      });
      setRows(enriched);
      if (enriched.length === 0) {
        toast.warning("Nenhuma sessão identificada na imagem.");
      } else {
        toast.success(`${enriched.length} sessões identificadas. Confira antes de salvar.`);
      }
    } catch (e: any) {
      toast.error(e.message || "Falha ao ler a imagem");
    }
  };

  const updateRow = (idx: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const removeRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const includedCount = rows.filter((r) => r.include && r.patient_id).length;
  const unmatchedCount = rows.filter((r) => r.include && !r.patient_id).length;

  const saveAll = async () => {
    const toSave = rows.filter((r) => r.include && r.patient_id);
    if (toSave.length === 0) {
      toast.error("Nenhuma sessão pronta para salvar (faltando paciente)");
      return;
    }
    setSaving(true);
    let ok = 0;
    for (const r of toSave) {
      try {
        await upsertSession.mutateAsync({
          patient_id: r.patient_id,
          date,
          start_time: r.start_time || null,
          duration_minutes: r.duration_minutes ?? 50,
          modality: r.modality || "online",
          status: r.status,
          price: r.price ?? 0,
          payment_status: "pendente",
          account_id: defaultAccount?.id ?? null,
          chart_updated: false,
          internal_notes: r.note || null,
        });
        ok++;
      } catch (e: any) {
        console.error("save row err", e);
      }
    }
    // Registra histórico
    try {
      await supabase.from("agenda_imports").insert({
        date,
        image_path: imagePath,
        sessions_created: ok,
        raw_extraction: { rows },
      });
    } catch {
      // ignore
    }
    qc.invalidateQueries({ queryKey: ["therapy_sessions"] });
    setSaving(false);
    toast.success(`${ok} sessões importadas para ${date}`);
    reset();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl flex items-center gap-2">
            <ImageUp className="h-5 w-5 text-accent" />
            Importar agenda por foto
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
            <div>
              <Label className="text-xs">Data desta agenda</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Padrão: ontem. As sessões serão criadas nesta data.
              </p>
            </div>

            <div>
              <Label className="text-xs">Print da agenda (PNG/JPG)</Label>
              <Input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
              />
            </div>

            {imageDataUrl && (
              <div className="rounded border border-border overflow-hidden bg-background">
                <img src={imageDataUrl} alt="Pré-visualização da agenda" className="w-full max-h-64 object-contain" />
              </div>
            )}

            <Button
              onClick={runExtraction}
              disabled={!imageDataUrl || extract.isPending}
              className="w-full"
            >
              {extract.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Lendo agenda…</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Extrair sessões</>
              )}
            </Button>
          </div>

          {rows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-semibold">Confira e edite antes de salvar</h3>
                <div className="flex gap-1.5">
                  <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30">
                    {includedCount} prontas
                  </Badge>
                  {unmatchedCount > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">
                      {unmatchedCount} sem paciente
                    </Badge>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                A IA pode errar nomes, horários ou valores. Revise cada linha — desmarque para ignorar ou ajuste os campos antes de salvar.
              </p>

              <div className="space-y-2">
                {rows.map((r, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-3 space-y-2 ${
                      !r.include ? "opacity-50" : r.patient_id ? "border-border" : "border-warning/40 bg-warning/5"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={r.include}
                        onChange={(e) => updateRow(i, { include: e.target.checked })}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="text-xs text-muted-foreground">
                          Lido pela IA: <span className="font-medium text-foreground">"{r.raw_name}"</span>
                        </div>

                        <div>
                          <Label className="text-[10px]">Paciente</Label>
                          <Select
                            value={r.patient_id ?? "none"}
                            onValueChange={(v) => updateRow(i, { patient_id: v === "none" ? null : v })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Selecionar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">— sem match —</SelectItem>
                              {(patients as any[]).map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <Label className="text-[10px]">Horário</Label>
                            <Input
                              value={r.start_time ?? ""}
                              onChange={(e) => updateRow(i, { start_time: e.target.value })}
                              placeholder="HH:MM"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px]">Duração (min)</Label>
                            <Input
                              type="number"
                              value={r.duration_minutes ?? ""}
                              onChange={(e) =>
                                updateRow(i, {
                                  duration_minutes: e.target.value ? Number(e.target.value) : null,
                                })
                              }
                              placeholder="50"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px]">Valor (R$)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={r.price ?? ""}
                              onChange={(e) =>
                                updateRow(i, { price: e.target.value ? Number(e.target.value) : null })
                              }
                              placeholder="0,00"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px]">Status</Label>
                            <Select
                              value={r.status}
                              onValueChange={(v: any) => updateRow(i, { status: v })}
                            >
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="agendada">Agendada</SelectItem>
                                <SelectItem value="realizada">Realizada</SelectItem>
                                <SelectItem value="cancelada">Cancelada</SelectItem>
                                <SelectItem value="falta">Falta</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[10px]">Modalidade</Label>
                            <Select
                              value={r.modality ?? "online"}
                              onValueChange={(v: any) => updateRow(i, { modality: v })}
                            >
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="online">Online</SelectItem>
                                <SelectItem value="presencial">Presencial</SelectItem>
                                <SelectItem value="hibrido">Híbrido</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[10px]">Observação</Label>
                            <Input
                              value={r.note ?? ""}
                              onChange={(e) => updateRow(i, { note: e.target.value })}
                              placeholder="(opcional)"
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>

                        {!r.patient_id && (
                          <div className="flex items-center gap-1 text-[10px] text-warning">
                            <AlertCircle className="h-3 w-3" />
                            Selecione um paciente ou desmarque a linha.
                          </div>
                        )}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => removeRow(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={saveAll}
                disabled={saving || includedCount === 0}
                className="w-full"
              >
                {saving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando…</>
                ) : (
                  <><Check className="h-4 w-4 mr-2" /> Salvar {includedCount} sessões</>
                )}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
