import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { parsePatientsCSV, useImportPatients } from "@/hooks/usePsicoterapia";
import { toast } from "sonner";

export function PatientsCSVImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const importMut = useImportPatients();

  const handleFile = async (file: File) => {
    const text = await file.text();
    const rows = parsePatientsCSV(text);
    if (rows.length === 0) {
      toast.error("Não consegui ler o CSV. Use uma coluna 'Nome' (e opcionalmente: Email, Telefone, Valor, Observações, ID, Nascimento)");
      return;
    }
    await importMut.mutateAsync(rows);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
        <Upload className="h-4 w-4 mr-1" /> Importar pacientes (CSV)
      </Button>
    </>
  );
}
