import { Bell, Briefcase, Globe2, LayoutDashboard, Star } from "lucide-react";

export const NAV_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "/": LayoutDashboard,
  "/portfolio": Briefcase,
  "/watchlist": Star,
  "/alerts": Bell,
  "/markets": Globe2,
};
