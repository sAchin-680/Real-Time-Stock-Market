import { redirect } from "next/navigation";
import Header from "@/components/Header";
import AppSidebar from "@/components/layout/AppSidebar";
import { getSessionUser } from "@/lib/server/session";
import { isDemoEmail } from "@/lib/services/demo";

const Layout = async ({ children }: { children: React.ReactNode }) => {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="flex min-h-screen text-gray-400">
      <AppSidebar isDemo={isDemoEmail(user.email)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header user={user} />
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
