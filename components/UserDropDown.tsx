"use client";

import { useRouter } from "next/navigation";
import { Keyboard, LogOut } from "lucide-react";
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
  const isDemo = /@demo\.(tickline|signalist)\.app$/.test(user.email);

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-8 shrink-0 items-center justify-center rounded-md border border-gray-600 bg-gray-700 text-[11px] font-semibold text-gray-100 transition-colors hover:border-amber/60"
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
        <DropdownMenuItem onClick={() => window.dispatchEvent(new Event(OPEN_HELP_EVENT))} className="cursor-pointer text-[13px] focus:bg-gray-700 focus:text-gray-100">
          <Keyboard className="size-4" /> Keyboard shortcuts
          <kbd className="num ml-auto text-[10px] text-gray-500">?</kbd>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-[13px] focus:bg-gray-700 focus:text-gray-100">
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
export default UserDropdown;
