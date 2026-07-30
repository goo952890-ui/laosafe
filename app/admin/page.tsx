import { requireAdminSession } from "@/lib/admin-auth";
import { AdminDashboard } from "@/components/AdminDashboard";
import { AdminShell } from "@/components/AdminShell";
import { getAdminDashboardData } from "@/lib/site-repository";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireAdminSession();
  const dashboard = await getAdminDashboardData();

  return (
    <AdminShell title="관리자 메인" subtitle="등록된 번호와 최근 활동을 빠르게 검토합니다.">
      <AdminDashboard
        stats={dashboard.stats}
        targets={dashboard.targets}
        siteDailyViews={dashboard.siteDailyViews}
        recentComments={dashboard.recentComments}
        safeRequests={dashboard.safeRequests}
        deletionRequests={dashboard.deletionRequests}
        objections={dashboard.objections}
        adminUsername={session.username}
      />
    </AdminShell>
  );
}
