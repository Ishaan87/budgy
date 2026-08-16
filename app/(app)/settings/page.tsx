import { listChainWithState, listCredentials } from "@/lib/db/queries/llm";
import { requireUserId } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { PROVIDER_LABELS } from "@/lib/llm/models";
import { AddCredentialDialog } from "@/components/settings/add-credential-dialog";
import { AddChainEntryDialog } from "@/components/settings/add-chain-entry-dialog";
import { ChainList } from "@/components/settings/chain-list";
import { removeCredential } from "./llm-actions";

export default async function SettingsPage() {
  const userId = await requireUserId();
  const [credentials, chain] = await Promise.all([listCredentials(userId), listChainWithState(userId)]);

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage the LLM providers used for natural-language entry and analytics.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>API keys</CardTitle>
            <CardDescription>Encrypted at rest. Only the last 4 characters are shown.</CardDescription>
          </div>
          <AddCredentialDialog />
        </CardHeader>
        <CardContent className="space-y-2">
          {credentials.length === 0 && (
            <p className="text-sm text-muted-foreground">No API keys added yet.</p>
          )}
          {credentials.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">{c.label}</p>
                <p className="text-xs text-muted-foreground">
                  {PROVIDER_LABELS[c.provider]} · ···{c.keyLast4}
                </p>
              </div>
              <form action={removeCredential.bind(null, c.id)}>
                <Button variant="ghost" size="icon-sm" type="submit">
                  <Trash2 className="size-3.5" />
                </Button>
              </form>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Fallback chain</CardTitle>
            <CardDescription>
              Tried in order for every natural-language parse. If one is rate-limited or out of
              quota, BUDGY automatically moves to the next.
            </CardDescription>
          </div>
          <AddChainEntryDialog credentials={credentials} />
        </CardHeader>
        <CardContent>
          <ChainList rows={chain} />
        </CardContent>
      </Card>
    </div>
  );
}
