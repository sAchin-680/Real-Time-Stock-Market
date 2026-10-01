"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { deleteMyAccount } from "@/lib/actions/account.actions";

export default function DeleteAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      const res = await deleteMyAccount(text);
      if (!res.ok) return void toast.error("Couldn't delete account", { description: res.error });
      toast.success("Your account and data were deleted");
      router.push("/sign-in");
      router.refresh();
    });

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setText(""); }}>
      <DialogContent className="border-gray-600 bg-gray-800 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-gray-100">Delete your account</DialogTitle>
          <DialogDescription>
            This permanently deletes your profile, transactions, watchlist, alerts and sessions. It can&apos;t be undone. Consider{" "}
            <a href="/api/account/export" className="text-gray-100 underline underline-offset-2">exporting your data</a> first.
          </DialogDescription>
        </DialogHeader>
        <label className="space-y-1.5">
          <span className="form-label">Type <span className="num text-gray-100">DELETE</span> to confirm</span>
          <Input value={text} onChange={(e) => setText(e.target.value)} className="form-input num" autoComplete="off" autoFocus />
        </label>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" disabled={text !== "DELETE" || pending} onClick={submit}>
            {pending && <Loader2 className="animate-spin" />} Delete account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
