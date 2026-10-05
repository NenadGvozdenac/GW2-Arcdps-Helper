import { Link } from "react-router-dom";
import { Trash2Icon } from "lucide-react";
import { useI18n } from "../../../controllers/I18nController";
import type { AdminWebhook, AdminWebhookContent } from "../../../domain/types/admin.types";
import { adminService } from "../../../services/adminService";
import { Checkbox } from "@/presentation/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/presentation/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/presentation/components/ui/table";
import { ConfirmButton, useAdminAction } from "./AdminKit";

const CONTENT_LABELS: Record<AdminWebhookContent, string> = { all: "Logs + sessions", logs: "Logs only", sessions: "Sessions only" };

/** Webhooks with their actions: pause / resume, what they post, delete. */
export default function WebhookTable({
  rows,
  showOwner = true,
  onChanged,
  onError,
}: {
  rows: AdminWebhook[];
  showOwner?: boolean;
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  const { fmt } = useI18n();
  const action = useAdminAction(onChanged, onError);
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted-foreground">No webhooks.</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showOwner && <TableHead>User</TableHead>}
          <TableHead>#</TableHead>
          <TableHead>URL</TableHead>
          <TableHead>Posts</TableHead>
          <TableHead>Active</TableHead>
          <TableHead>Filters</TableHead>
          <TableHead>Added</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((w) => (
          <TableRow key={w.id}>
            {showOwner && (
              <TableCell>
                <Link to={`/admin/users/${w.userId}`} className="font-medium hover:underline">
                  {w.ownerEmail}
                </Link>
              </TableCell>
            )}
            <TableCell className="tabular-nums">{w.position + 1}</TableCell>
            <TableCell className="max-w-72" title={w.urlMasked}>
              {w.name && <div className="truncate text-sm font-medium">{w.name}</div>}
              <div className="truncate font-mono text-xs">{w.urlMasked}</div>
            </TableCell>
            <TableCell>
              <Select
                value={w.content}
                onValueChange={(v) => action.run(w.id, () => adminService.updateWebhook(w.id, { content: v as AdminWebhookContent }))}
                disabled={action.busy === w.id}
              >
                <SelectTrigger size="sm" aria-label="What the webhook posts">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CONTENT_LABELS) as AdminWebhookContent[]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {CONTENT_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              <Checkbox
                checked={w.enabled}
                disabled={action.busy === w.id}
                onCheckedChange={(v) => action.run(w.id, () => adminService.updateWebhook(w.id, { enabled: v === true }))}
                aria-label={w.enabled ? "Pause webhook" : "Resume webhook"}
              />
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {w.accounts.length || w.excludedAccounts.length ? (
                <>
                  {w.accounts.length > 0 && <div>{`${w.minAccounts} of ${w.accounts.join(", ")}`}</div>}
                  {w.excludedAccounts.length > 0 && <div>{`Not with ${w.excludedAccounts.join(", ")}`}</div>}
                </>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">{fmt.date(w.createdAt)}</TableCell>
            <TableCell className="text-right">
              <ConfirmButton
                label="Delete"
                icon={<Trash2Icon />}
                title="Delete this webhook?"
                description={`${w.ownerEmail} stops getting Discord posts in that channel. They can connect it again in their settings.`}
                busy={action.busy === `delete-${w.id}`}
                onConfirm={() => action.run(`delete-${w.id}`, () => adminService.deleteWebhook(w.id))}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
