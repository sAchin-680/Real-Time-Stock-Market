"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import NavItems from "@/components/NavItems";
import { Sign } from "crypto";

type User = {
  name?: string;
  email?: string;
};

const UserDropdown = ({ user }: { user?: User }) => {
  const router = useRouter();

  const handleSignOut = async () => {
    await fetch("/api/auth/sign-out", {
      method: "POST",
    });

    router.push("/sign-in");
  };

  // Use empty user object if user is undefined to avoid errors
  const safeUser = user || {};

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-3 text-gray-4 hover:text-yellow-500"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src="https://static.vecteezy.com/system/resources/thumbnails/066/178/824/small_2x/a-vibrant-neon-user-icon-glows-brightly-against-a-black-backdrop-ideal-for-digital-interfaces-video.jpg" />
            <AvatarFallback className="bg-yellow-500 text-yellow-900 text-sm font-bold">
              {safeUser.name?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col items-start">
            <span className="text-base font-medium text-gray-400">
              {safeUser.name || "User"}
            </span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="text-gray-400">
        <DropdownMenuLabel>
          <div className="flex relative items-center gap-3 py-2">
            <Avatar className="h-10 w-10">
              <AvatarImage src="https://static.vecteezy.com/system/resources/thumbnails/066/178/824/small_2x/a-vibrant-neon-user-icon-glows-brightly-against-a-black-backdrop-ideal-for-digital-interfaces-video.jpg" />
              <AvatarFallback className="bg-yellow-500 text-yellow-900 text-sm font-bold">
                {safeUser.name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-base font-medium text-gray-400">
                {safeUser.name || "User"}
              </span>
              <span className="text-sm text-gray-500">
                {safeUser.email || ""}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-600" />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-gray-100 text-md font-medium focus:bg-transparent focus:text-yellow-500 transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4 mr-2 hidden sm:block" />
          Logout
        </DropdownMenuItem>
        <DropdownMenuSeparator className="hidden sm:block bg-gray-600" />
        <nav className="sm:hidden">
          <NavItems />
        </nav>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserDropdown;
