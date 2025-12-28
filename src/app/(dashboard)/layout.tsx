import { DashboardLayout } from "@/components/layout";

export const dynamic = "force-dynamic";

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

