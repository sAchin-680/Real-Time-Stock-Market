import { redirect } from "next/navigation";
import Header from "@/components/Header";
import AppRail from "@/components/layout/AppRail";
import KeyboardShortcuts from "@/components/layout/KeyboardShortcuts";
import MobileTabBar from "@/components/layout/MobileTabBar";
import StatusBar from "@/components/layout/StatusBar";
import { getSessionUser } from "@/lib/server/session";
import { isDemoEmail } from "@/lib/services/demo";

const Layout = async ({ children }: { children: React.ReactNode }) => {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="flex min-h-screen">
      <AppRail isDemo={isDemoEmail(user.email)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header user={user} />
        <main className="mx-auto w-full max-w-[1760px] flex-1 px-3 pt-4 pb-24 md:px-4 lg:pb-6">{children}</main>
        <StatusBar />
      </div>
      <MobileTabBar />
      <KeyboardShortcuts />
    </div>
  );
};

export default Layout;
