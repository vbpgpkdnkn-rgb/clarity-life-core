import { useEffect, useRef, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Sparkles, ArrowRight } from "lucide-react";
import { TextareaWithMic } from "@/components/ui/textarea-with-mic";
import {
  useFindOrCreateRefinementChat,
  useIdeaRefinementChat,
  useSendRefinementMessage,
  type RefinementContext,
  type RefinedIdea,
} from "@/hooks/useIdeaRefinementChat";

interface Props {
  open: boolean;
  onClose: () => void;
  analysisId: string | null;
  ideaIndex: number | null;
  ideaTitle: string;
  context: RefinementContext;
  onSendToMotor: (refined: RefinedIdea) => void;
}

export function IdeaRefinementChatDrawer({ open, onClose, analysisId, ideaIndex, ideaTitle, context, onSendToMotor }: Props) {
  const [chatId, setChatId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const findOrCreate = useFindOrCreateRefinementChat();
  const send = useSendRefinementMessage();
  const { data: chat } = useIdeaRefinementChat(chatId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Cria/encontra chat ao abrir
  useEffect(() => {
    if (!open) return;
    if (chatId) return;
    findOrCreate.mutateAsync({
      analysis_id: analysisId,
      idea_index: ideaIndex,
      idea_title: ideaTitle,
      context,
    }).then((c) => setChatId(c.id));
  }, [open, analysisId, ideaIndex, ideaTitle]);

  // Reseta ao fechar
  useEffect(() => {
    if (!open) { setChatId(null); setDraft(""); }
  }, [open]);

  // Scroll para o final
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat?.messages?.length]);

  // Mensagem inicial automática da IA quando o chat for criado vazio
  useEffect(() => {
    if (!chat || chat.messages.length > 0 || send.isPending) return;
    send.mutate({ chat, user_text: `Olá. Estou com a ideia "${chat.idea_title}" aberta. Conte com o que você quer ajustar — o que gostou, o que quer tirar, aprofundar ou mudar de ângulo.` });
  }, [chat?.id]);

  function handleSend() {
    if (!chat || !draft.trim()) return;
    send.mutate({ chat, user_text: draft.trim() });
    setDraft("");
  }

  const messages = chat?.messages ?? [];
  const refined = chat?.refined_idea ?? null;

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="ml-auto h-[92vh] max-w-2xl rounded-l-[10px] rounded-r-none">
        <DrawerHeader className="border-b">
          <DrawerTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            Refinar ideia
          </DrawerTitle>
          <p className="text-xs text-muted-foreground line-clamp-1">{ideaTitle}</p>
        </DrawerHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {findOrCreate.isPending && !chat && (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <Card className={`p-3 max-w-[85%] text-sm whitespace-pre-wrap leading-relaxed ${
                m.role === "user" ? "bg-accent/10 border-accent/30" : "bg-muted/30"
              } ${m.is_synthesis ? "border-accent" : ""}`}>
                {m.is_synthesis && <Badge className="mb-2 text-[10px]">SÍNTESE FINAL</Badge>}
                {m.content.replace(/^\s*\[S[ÍI]NTESE\]\s*/i, "")}
              </Card>
            </div>
          ))}

          {send.isPending && (
            <div className="flex justify-start"><Card className="p-3 bg-muted/30 text-sm"><Loader2 className="h-3.5 w-3.5 animate-spin inline mr-2" />pensando…</Card></div>
          )}
        </div>

        {refined && (
          <div className="border-t bg-accent/5 px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-accent mb-1">Ideia refinada · pronta para o Motor</p>
            <p className="text-sm font-medium line-clamp-2">{refined.title}</p>
            <Button size="sm" className="mt-2 w-full" onClick={() => onSendToMotor(refined)}>
              Enviar para o Motor Relacional <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        )}

        <div className="border-t p-3 space-y-2">
          <TextareaWithMic
            value={draft}
            onValueChange={setDraft}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSend(); } }}
            placeholder="O que você quer ajustar? (Ctrl/Cmd+Enter envia)"
            rows={2}
          />
          <div className="flex justify-between items-center gap-2">
            <p className="text-[11px] text-muted-foreground">Quando estiver pronta, peça "me dá a síntese".</p>
            <Button size="sm" onClick={handleSend} disabled={!draft.trim() || send.isPending || !chat}>
              <Send className="h-3.5 w-3.5 mr-1" /> Enviar
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
