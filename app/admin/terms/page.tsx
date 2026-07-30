import { AdminTermsEditor } from "@/components/AdminTermsEditor";
import { AdminShell } from "@/components/AdminShell";
import { requireAdminSession } from "@/lib/admin-auth";
import { getAllTermsContents } from "@/lib/content-repository";

export const dynamic = "force-dynamic";

export default async function AdminTermsPage() {
  await requireAdminSession();
  const contents = await getAllTermsContents();

  return (
    <AdminShell title="이용약관" subtitle="사용자 화면에 노출되는 이용약관을 편집합니다.">
      <AdminTermsEditor initialContents={contents} />
    </AdminShell>
  );
}
