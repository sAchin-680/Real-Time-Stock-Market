import type { Metadata } from "next";
import { listAlerts } from "@/lib/actions/alert.actions";
import AlertsBoard from "@/components/finance/AlertsBoard";

export const metadata: Metadata = { title: "Alerts" };

export default async function AlertsPage() {
  return <AlertsBoard alerts={await listAlerts()} />;
}
