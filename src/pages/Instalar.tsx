import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Share, Plus, Smartphone, Tablet, Pencil } from "lucide-react";

export default function Instalar() {
  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
      // @ts-ignore Safari iOS legacy
      window.navigator.standalone === true);

  return (
    <AppLayout title="Instalar no iPad / iPhone" subtitle="Use o Life OS como app nativo, com toque e Apple Pencil.">
      <div className="grid lg:grid-cols-2 gap-6 max-w-4xl">
        <Card className="p-6 shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <Tablet className="h-5 w-5 text-accent" />
            <h2 className="font-display text-xl font-semibold">Instalar pelo Safari</h2>
          </div>

          {isStandalone ? (
            <div className="rounded-md bg-success/10 border border-success/30 p-4 text-sm">
              ✓ Você já está usando o Life OS como app instalado. Tudo pronto.
            </div>
          ) : (
            <ol className="space-y-4 text-sm">
              <li className="flex gap-3">
                <span className="shrink-0 h-7 w-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-semibold">1</span>
                <div>
                  Abra este endereço no <strong>Safari</strong> do iPad (não funciona no Chrome iOS para instalar).
                </div>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 h-7 w-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-semibold">2</span>
                <div className="flex items-center gap-2 flex-wrap">
                  Toque no botão <Share className="inline h-4 w-4" /> <strong>Compartilhar</strong> na barra superior.
                </div>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 h-7 w-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-semibold">3</span>
                <div className="flex items-center gap-2 flex-wrap">
                  Role e escolha <Plus className="inline h-4 w-4" /> <strong>Adicionar à Tela de Início</strong>.
                </div>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 h-7 w-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-semibold">4</span>
                <div>
                  Confirme em <strong>Adicionar</strong>. O ícone do Life OS aparece na sua tela inicial e abre em tela cheia.
                </div>
              </li>
            </ol>
          )}

          {!isIOS && (
            <p className="text-xs text-muted-foreground mt-4">
              Você está em outro dispositivo agora. Abra esta página pelo Safari do seu iPad para instalar.
            </p>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="p-6 shadow-soft">
            <div className="flex items-center gap-2 mb-3">
              <Pencil className="h-5 w-5 text-accent" />
              <h3 className="font-display text-lg font-semibold">Apple Pencil pronto para usar</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Áreas de desenho aceitam o Pencil com pressão real (linha mais grossa quando você aperta).</li>
              <li>• Palm rejection ativo: encoste o pulso à vontade, só o Pencil/dedo desenha.</li>
              <li>• Borracha embutida — alterne com um toque.</li>
              <li>• Disponível em: Notas livres, Diário, Brain Dump.</li>
            </ul>
          </Card>

          <Card className="p-6 shadow-soft">
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="h-5 w-5 text-accent" />
              <h3 className="font-display text-lg font-semibold">Funciona offline?</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Não. O Life OS sincroniza tudo na nuvem em tempo real, então precisa de conexão para abrir e salvar.
              Em compensação, todos os dados estão sempre seguros e disponíveis em qualquer dispositivo onde você logar.
            </p>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
