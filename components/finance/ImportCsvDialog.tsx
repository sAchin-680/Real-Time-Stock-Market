"use client";

import { useState, useTransition } from "react";
import { FileUp, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { importTransactionsCsv } from "@/lib/actions/portfolio.actions";

const SAMPLE = `date,symbol,side,quantity,price,fees,notes
2026-01-15,AAPL,BUY,10,185.50,1,Core position
2026-03-02,MSFT,BUY,5,402.10,1,
2026-06-20,AAPL,SELL,4,214.30,1,Trim
2026-08-14,AAPL,DIVIDEND,6,0.26,0,Q3 dividend`;

export default function ImportCsvDialog() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 1_000_000) return setError("File is too large (max 1 MB)");
    setText(await file.text());
    setError(null);
  };

  const submit = () =>
    startTransition(async () => {
      const res = await importTransactionsCsv(text);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success(`Imported ${res.data.imported} transaction${res.data.imported === 1 ? "" : "s"}`);
      setText("");
      setOpen(false);
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline"><Upload /> Import CSV</Button>
      </DialogTrigger>
      <DialogContent className="border-gray-600 bg-gray-800 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-gray-100">Import transactions</DialogTitle>
          <DialogDescription>
            Columns: <code className="num text-gray-400">date, symbol, side, quantity, price, fees, notes</code>. Side is BUY, SELL or DIVIDEND. Every row is validated before anything is saved.
          </DialogDescription>
        </DialogHeader>

        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-gray-600 bg-gray-900 px-4 py-6 text-sm text-gray-500 hover:border-gray-500">
          <FileUp className="size-5 text-gray-100" />
          <span>Choose a .csv file or paste below</span>
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>

        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          rows={7}
          spellCheck={false}
          placeholder={SAMPLE}
          className="num w-full rounded-lg border border-gray-600 bg-gray-900 p-3 text-xs text-gray-100 placeholder:text-gray-600 focus:border-yellow-500 focus:outline-none"
        />
        {error && <p className="text-sm text-loss">{error}</p>}

        <DialogFooter className="sm:justify-between">
          <button type="button" onClick={() => setText(SAMPLE)} className="text-xs text-gray-500 underline-offset-4 hover:text-gray-400 hover:underline">
            Use sample data
          </button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!text.trim() || pending} onClick={submit} className="btn-primary">
              {pending && <Loader2 className="animate-spin" />} Import
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
