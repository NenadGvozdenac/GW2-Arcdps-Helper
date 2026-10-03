import { ADMIN_PAGE_SIZE } from "../../../config/constants";
import { useAdminList } from "../../../hooks/useAdminList";
import { adminService } from "../../../services/adminService";
import { ErrorAlert, SearchBox } from "../../components/admin/AdminKit";
import WebhookTable from "../../components/admin/WebhookTable";
import PageHeader from "../../components/PageHeader";
import Pagination from "../../components/Pagination";

export default function AdminWebhooksPage() {
  const list = useAdminList(adminService.webhooks);

  return (
    <>
      <PageHeader
        title="Discord webhooks"
        description={`${list.total} webhooks · URLs are shown shortened; the secret part stays with the user.`}
      />
      <SearchBox value={list.searchInput} onChange={list.setSearchInput} placeholder="User email" />
      <ErrorAlert message={list.error} />
      <WebhookTable rows={list.rows} onChanged={list.reload} onError={list.setError} />
      <Pagination page={list.page} pageSize={ADMIN_PAGE_SIZE} total={list.total} onPageChange={list.setPage} />
    </>
  );
}
