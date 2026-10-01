"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, FileText, Keyboard, LogOut, Trash2 } from "lucide-react";
import DeleteAccountDialog from "@/components/auth/DeleteAccountDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/actions/auth.actions";
import { OPEN_HELP_EVENT } from "@/components/layout/KeyboardShortcuts";

const initials = (name?: string) =>
  (name || "U")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

const UserDropdown = ({ user }: { user: User }) => {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const isDemo = /@demo\.(tickline|signalist)\.app$/.test(user.email);

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
    router.refresh();
  };

  const item = "cursor-pointer text-[13px] focus:bg-gray-700 focus:text-gray-100";

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-8 shrink-0 items-center justify-center rounded-md border border-gray-600 bg-gray-700 text-[11px] font-semibold text-gray-100 transition-colors hover:border-gray-500"
        aria-label="Account menu"
      >
        {initials(user.name)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 border-gray-600 bg-gray-800 text-gray-400">
        <DropdownMenuLabel className="py-2.5">
          <p className="truncate text-sm font-medium text-gray-100">{user.name}</p>
          <p className="truncate text-xs font-normal text-gray-500">{isDemo ? "Demo workspace · resets in 24h" : user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-600" />
        <DropdownMenuItem onClick={() => window.dispatchEvent(new Event(OPEN_HELP_EVENT))} className={item}>
          <Keyboard className="size-4" /> Keyboard shortcuts
          <kbd className="num ml-auto text-[10px] text-gray-500">?</kbd>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={item}>
          <a href="/api/account/export"><Download className="size-4" /> Export my data</a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={item}>
          <Link href="/privacy"><FileText className="size-4" /> Privacy &amp; terms</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-gray-600" />
        <DropdownMenuItem onClick={handleSignOut} className={item}>
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
        {!isDemo && (
          <DropdownMenuItem onClick={() => setDeleting(true)} className="cursor-pointer text-[13px] text-loss focus:bg-gray-700 focus:text-loss">
            <Trash2 className="size-4" /> Delete account
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
    <DeleteAccountDialog open={deleting} onOpenChange={setDeleting} />
    </>
  );
};
export default UserDropdown;
