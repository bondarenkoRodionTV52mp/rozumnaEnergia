import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Ban, CircleCheck, CircleX, Play, RefreshCw, ShieldAlert, Ticket } from "lucide-react";
import { api, type ExecuteResult, type IssuedToken, type Operation, type TrustTokenInfo } from "../lib/api";
import { useRequireUser } from "../lib/context";
import { DECISION_REASONS, OP_TYPES, ROLE_LABELS, fmtDateTime } from "../lib/labels";
import { Alert, Badge, Button, Card, Field, Spinner, errorText } from "../components/ui";

const TYPE_ORDER = ["TYPE_A", "TYPE_B", "TYPE_C", "TYPE_D"];

function ResultPanel({ result }: { result: ExecuteResult }) {
  if (result.status === "ALLOWED") {
    return (
      <Alert tone="green">
        <div className="flex items-start gap-2">
          <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <b>Дозволено:</b> {result.operation_name}.{" "}
            {result.role_path === "delegated" ? "Виконано за токеном делегування." : "Виконано у межах власної ролі."}
          </div>
        </div>
      </Alert>
    );
  }
  if (result.status === "REAUTH_REQUIRED") {
    return (
      <Alert tone="amber">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <b>Потрібна повторна автентифікація</b> ({result.reauth_method === "EMAIL_CODE" ? "код з email" : "TOTP"}).{" "}
            {DECISION_REASONS[result.reason ?? ""] ?? result.reason}
            <div className="mt-1 text-xs">Токен делегування (якщо був) не витрачено.</div>
          </div>
        </div>
      </Alert>
    );
  }
  return (
    <Alert tone="red">
      <div className="flex items-start gap-2">
        <CircleX className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <b>Відмовлено:</b> {DECISION_REASONS[result.reason ?? ""] ?? result.reason ?? "без пояснення"}
        </div>
      </div>
    </Alert>
  );
}

function tokenState(t: TrustTokenInfo): { tone: "green" | "slate" | "red"; text: string } {
  if (t.is_revoked) return { tone: "red", text: "Відкликано" };
  if (new Date(t.valid_until.endsWith("Z") ? t.valid_until : `${t.valid_until}Z`) < new Date())
    return { tone: "slate", text: "Прострочено" };
  if (t.usage_count >= t.max_uses) return { tone: "slate", text: "Використано" };
  return { tone: "green", text: "Активний" };
}

function TokensTable({
  tokens,
  counterpartLabel,
  counterpart,
  onRevoke,
}: {
  tokens: TrustTokenInfo[];
  counterpartLabel: string;
  counterpart: (t: TrustTokenInfo) => string;
  onRevoke: (t: TrustTokenInfo) => void;
}) {
  if (!tokens.length) return <p className="text-sm text-slate-500">Токенів немає.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="text-left text-xs text-slate-500">
          <tr>
            <th className="pb-1 font-medium">Операція</th>
            <th className="pb-1 font-medium">{counterpartLabel}</th>
            <th className="pb-1 font-medium">Дійсний до</th>
            <th className="pb-1 font-medium">Використань</th>
            <th className="pb-1 font-medium">Стан</th>
            <th />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tokens.map((t) => {
            const st = tokenState(t);
            return (
              <tr key={t.id}>
                <td className="py-1.5">
                  <div className="font-medium">{t.operation_name}</div>
                  {t.notes && <div className="text-xs text-slate-500">{t.notes}</div>}
                </td>
                <td className="py-1.5 font-mono text-xs">{counterpart(t).slice(0, 8)}…</td>
                <td className="py-1.5 text-slate-600">{fmtDateTime(t.valid_until)}</td>
                <td className="py-1.5 tabular-nums">
                  {t.usage_count}/{t.max_uses}
                </td>
                <td className="py-1.5">
                  <Badge tone={st.tone}>{st.text}</Badge>
                </td>
                <td className="py-1.5 text-right">
                  {st.text === "Активний" && (
                    <Button variant="ghost" size="sm" onClick={() => onRevoke(t)}>
                      <Ban className="h-3.5 w-3.5" /> Відкликати
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function Operations() {
  const user = useRequireUser();
  const [ops, setOps] = useState<Operation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Виконання
  const [tokenFor, setTokenFor] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, ExecuteResult>>({});
  const [busyOp, setBusyOp] = useState<string | null>(null);

  // Токени
  const [issued, setIssued] = useState<TrustTokenInfo[]>([]);
  const [received, setReceived] = useState<TrustTokenInfo[]>([]);
  const [issueForm, setIssueForm] = useState({ recipient_id: "", operation_id: "", valid_for_minutes: 60, max_uses: 1, notes: "" });
  const [newToken, setNewToken] = useState<IssuedToken | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);

  const loadTokens = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([api.myIssuedTokens(), api.tokensIssuedToMe()]);
      setIssued(a.tokens);
      setReceived(b.tokens);
    } catch (e) {
      setError(errorText(e));
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    api
      .operations()
      .then((r) => setOps(r.operations))
      .catch((e) => setError(errorText(e)));
    void loadTokens();
  }, [!!user]);

  const grouped = useMemo(() => {
    const g: Record<string, Operation[]> = {};
    for (const op of ops ?? []) (g[op.operation_type] ??= []).push(op);
    return g;
  }, [ops]);

  const execute = async (op: Operation) => {
    setBusyOp(op.id);
    try {
      const res = await api.executeOperation(op.id, tokenFor[op.id]?.trim() || undefined);
      setResults((r) => ({ ...r, [op.id]: res }));
      if (res.role_path === "delegated") void loadTokens();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusyOp(null);
    }
  };

  const issue = async (e: FormEvent) => {
    e.preventDefault();
    setIssueError(null);
    setNewToken(null);
    try {
      const t = await api.issueToken({
        recipient_id: issueForm.recipient_id.trim(),
        operation_id: issueForm.operation_id,
        valid_for_minutes: Number(issueForm.valid_for_minutes),
        max_uses: Number(issueForm.max_uses),
        notes: issueForm.notes || undefined,
      });
      setNewToken(t);
      void loadTokens();
    } catch (err) {
      setIssueError(errorText(err));
    }
  };

  const revoke = async (t: TrustTokenInfo) => {
    const reason = window.prompt("Причина відкликання (необов'язково):") ?? undefined;
    try {
      await api.revokeToken(t.id, reason);
      void loadTokens();
    } catch (e) {
      setError(errorText(e));
    }
  };

  if (!user) return <Spinner label="Перевірка сесії…" />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Операції та делегування</h1>
        <p className="mt-1 text-sm text-slate-600">
          Кожен запит перевіряється за роллю (RBAC), токеном делегування та поточним trust score сесії. Ваша роль:{" "}
          <b>{ROLE_LABELS[user.role] ?? user.role}</b>.
        </p>
      </div>
      {error && <Alert tone="red">{error}</Alert>}

      <Card title="Матриця доступу" icon={<ShieldAlert className="h-4 w-4 text-indigo-600" />}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr>
                <th className="pb-1 font-medium">Тип операцій</th>
                <th className="pb-1 font-medium">Самостійно — від ролі</th>
                <th className="pb-1 font-medium">За токеном — від ролі</th>
                <th className="pb-1 font-medium">Поріг trust score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {TYPE_ORDER.map((t) => (
                <tr key={t}>
                  <td className="py-1.5">
                    <Badge tone={OP_TYPES[t].tone}>{OP_TYPES[t].label}</Badge>
                  </td>
                  <td className="py-1.5">{ROLE_LABELS[OP_TYPES[t].own]}</td>
                  <td className="py-1.5">{ROLE_LABELS[OP_TYPES[t].delegated]}</td>
                  <td className="py-1.5 tabular-nums">{OP_TYPES[t].threshold.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Довідник операцій Smart Energy Lab" icon={<Play className="h-4 w-4 text-indigo-600" />}>
        {!ops ? (
          <Spinner label="Завантаження довідника…" />
        ) : (
          <div className="space-y-5">
            {TYPE_ORDER.filter((t) => grouped[t]?.length).map((t) => (
              <div key={t}>
                <div className="mb-2">
                  <Badge tone={OP_TYPES[t].tone}>{OP_TYPES[t].label}</Badge>
                </div>
                <div className="space-y-2">
                  {grouped[t].map((op) => (
                    <div key={op.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{op.description ?? op.operation_name}</div>
                          <div className="font-mono text-xs text-slate-500">{op.operation_name}</div>
                        </div>
                        <input
                          value={tokenFor[op.id] ?? ""}
                          onChange={(e) => setTokenFor((s) => ({ ...s, [op.id]: e.target.value }))}
                          placeholder="Токен делегування (необов'язково)"
                          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 font-mono text-xs outline-none focus:border-indigo-500 sm:w-64"
                        />
                        <Button size="sm" onClick={() => execute(op)} disabled={busyOp === op.id}>
                          <Play className="h-3.5 w-3.5" /> Виконати
                        </Button>
                      </div>
                      {results[op.id] && (
                        <div className="mt-2">
                          <ResultPanel result={results[op.id]} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {!ops.length && <p className="text-sm text-slate-500">Довідник порожній.</p>}
          </div>
        )}
      </Card>

      <Card title="Видати токен делегування" icon={<Ticket className="h-4 w-4 text-indigo-600" />}>
        <p className="mb-3 text-sm text-slate-600">
          Токен дає конкретному користувачу тимчасове право на одну операцію. Ідентифікатор отримувача він бачить на своїй
          панелі. Бекенд перевірить, чи ваша роль дозволяє делегувати цю операцію.
        </p>
        <form onSubmit={issue} className="grid gap-3 md:grid-cols-2">
          <Field
            label="Ідентифікатор отримувача (UUID)"
            value={issueForm.recipient_id}
            onChange={(e) => setIssueForm({ ...issueForm, recipient_id: e.target.value })}
            required
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="font-mono text-xs"
          />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Операція</span>
            <select
              value={issueForm.operation_id}
              onChange={(e) => setIssueForm({ ...issueForm, operation_id: e.target.value })}
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
            >
              <option value="">— оберіть —</option>
              {(ops ?? []).map((op) => (
                <option key={op.id} value={op.id}>
                  [{op.operation_type.replace("TYPE_", "")}] {op.description ?? op.operation_name}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Термін дії, хв"
            type="number"
            min={1}
            max={10080}
            value={issueForm.valid_for_minutes}
            onChange={(e) => setIssueForm({ ...issueForm, valid_for_minutes: Number(e.target.value) })}
          />
          <Field
            label="Макс. використань"
            type="number"
            min={1}
            max={100}
            value={issueForm.max_uses}
            onChange={(e) => setIssueForm({ ...issueForm, max_uses: Number(e.target.value) })}
          />
          <div className="md:col-span-2">
            <Field
              label="Примітка"
              value={issueForm.notes}
              maxLength={500}
              onChange={(e) => setIssueForm({ ...issueForm, notes: e.target.value })}
              placeholder="Навіщо видається токен"
            />
          </div>
          <div className="md:col-span-2">
            {issueError && (
              <div className="mb-2">
                <Alert tone="red">{issueError}</Alert>
              </div>
            )}
            <Button type="submit">
              <Ticket className="h-4 w-4" /> Видати токен
            </Button>
          </div>
        </form>
        {newToken && (
          <div className="mt-4">
            <Alert tone="violet">
              <div className="mb-1 font-medium">Токен видано. Передайте його отримувачу — повторно його показати неможливо:</div>
              <code className="block break-all rounded bg-white px-2 py-1 font-mono text-xs">{newToken.raw_token}</code>
              <div className="mt-1 text-xs">
                {newToken.operation_name} · дійсний до {fmtDateTime(newToken.valid_until)} · використань: {newToken.max_uses}
              </div>
            </Alert>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Видані мною"
          icon={<Ticket className="h-4 w-4 text-indigo-600" />}
          actions={
            <Button variant="ghost" size="sm" onClick={loadTokens}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          }
        >
          <TokensTable tokens={issued} counterpartLabel="Кому" counterpart={(t) => t.issued_to_user_id} onRevoke={revoke} />
        </Card>
        <Card title="Видані мені" icon={<Ticket className="h-4 w-4 text-indigo-600" />}>
          <TokensTable tokens={received} counterpartLabel="Від кого" counterpart={(t) => t.issued_by_user_id} onRevoke={revoke} />
        </Card>
      </div>
    </div>
  );
}
