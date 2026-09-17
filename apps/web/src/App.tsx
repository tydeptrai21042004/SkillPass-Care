import { useEffect, useMemo, useState, type ButtonHTMLAttributes } from "react";
import { client, type ServiceRight, type VerificationEvidence } from "./api";

type View = "product" | "reviewer";
type Activity = { at: string; title: string; detail: string; tone: "ok" | "bad" | "neutral" };

export function App() {
  const [right, setRight] = useState<ServiceRight | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<View>("product");

  const currentOwnerLabel = useMemo(() => right?.owner === "alice" ? "Alice" : right?.owner === "bob" ? "Bob" : right?.owner ?? "—", [right]);

  async function refresh() {
    const rows = await client.list();
    setRight(rows[0] ?? null);
  }

  useEffect(() => { refresh().catch((e) => log("Load failed", message(e), "bad")); }, []);

  function log(title: string, detail: string, tone: Activity["tone"] = "neutral") {
    setActivities((items) => [{ at: new Date().toLocaleTimeString(), title, detail, tone }, ...items].slice(0, 12));
  }

  async function run(title: string, fn: () => Promise<unknown>, formatter?: (value: unknown) => string) {
    setBusy(true);
    try {
      const result = await fn();
      log(title, formatter ? formatter(result) : "Completed", "ok");
      await refresh();
    } catch (error) {
      log(`${title} failed`, message(error), "bad");
    } finally {
      setBusy(false);
    }
  }

  const active = right?.status === "ACTIVE" && Date.parse(right.expiresAt) > Date.now();

  return <main className="shell">
    <header className="hero">
      <div className="heroTop">
        <p className="eyebrow">SkillPass Care · Pilot</p>
        <div className="switcher" role="group" aria-label="View mode">
          <button className={view === "product" ? "selected" : ""} onClick={() => setView("product")}>Product</button>
          <button className={view === "reviewer" ? "selected" : ""} onClick={() => setView("reviewer")}>Reviewer</button>
        </div>
      </div>
      <h1>Service coverage that follows the product.</h1>
      <p className="lede">A service right can move from one owner to the next while independent providers verify the latest state instead of relying on a shared customer-entitlement database.</p>
    </header>

    {view === "product" ? <>
      <section className="card coverage">
        <div className="cardHead">
          <div><p className="kicker">Your coverage</p><h2>Refurbished device service plan</h2></div>
          <span className={`status ${active ? "active" : "inactive"}`}>{right?.status ?? "NO PASS"}</span>
        </div>
        {right ? <>
          <div className="headlineMetric">
            <span>Current owner</span>
            <strong>{currentOwnerLabel}</strong>
            <small>{right.owner}</small>
          </div>
          <div className="grid">
            <Info label="Plan" value={right.serviceClass} />
            <Info label="Service visits" value={`${right.remainingClaims} remaining`} />
            <Info label="Valid until" value={new Date(right.expiresAt).toLocaleDateString()} />
            <Info label="Transferable" value={right.transferable ? "Yes" : "No"} />
          </div>
          <div className="providers">
            <span>Accepted service providers</span>
            <div>{right.acceptedProviderIds.map((provider) => <b key={provider}>✓ {provider}</b>)}</div>
          </div>
        </> : <Empty />}
      </section>

      <section className="card">
        <div className="sectionTitle"><div><p className="kicker">Guided demo</p><h2>Test the second-owner lifecycle</h2></div><span className="demoFlag">Demo only</span></div>
        <p className="muted">These controls intentionally use isolated <code>/demo/*</code> routes. Authenticated non-demo routes do not trust caller-supplied owner, provider, or issuer identities.</p>
        <div className="actions">
          <Action n="1" disabled={busy} onClick={() => run("Reset to Alice", client.reset, () => "Alice owns a fresh 3-visit service right.")}>Reset to Alice</Action>
          <Action n="2" disabled={busy || !right} onClick={() => run("Provider A verifies Alice", () => client.verify(right!.id, "repair-a", "alice"), evidenceText)}>Verify Alice</Action>
          <Action n="3" disabled={busy || !right} onClick={() => run("Transfer Alice → Bob", () => client.transfer(right!.id, "alice", "bob", right!.version), () => "Ownership moved to Bob; the entitlement version advanced.")}>Transfer to Bob</Action>
          <Action n="4" disabled={busy || !right} onClick={() => run("Provider A checks old owner", () => client.verify(right!.id, "repair-a", "alice"), evidenceText)}>Reject old owner</Action>
          <Action n="5" disabled={busy || !right} onClick={() => run("Provider B verifies Bob", () => client.verify(right!.id, "repair-b", "bob"), evidenceText)}>Verify Bob</Action>
          <Action n="6" disabled={busy || !right} onClick={() => run("Provider B records service", () => client.claim(right!.id, "repair-b", "bob", right!.version), () => "One service visit was consumed atomically.")}>Use service</Action>
        </div>
      </section>
    </> : <>
      <section className="card">
        <div className="cardHead"><div><p className="kicker">Technical evidence</p><h2>Resolved entitlement state</h2></div><span className="pill">Memory pilot</span></div>
        {right ? <div className="grid technical">
          <Info label="Entitlement ID" value={right.id} wide />
          <Info label="Issuer" value={right.issuerId} />
          <Info label="Owner principal" value={right.owner} />
          <Info label="Status" value={right.status} />
          <Info label="Version" value={String(right.version)} />
          <Info label="Claims" value={String(right.remainingClaims)} />
          <Info label="Updated" value={new Date(right.updatedAt).toLocaleString()} />
          <Info label="Product commitment" value={right.productHash} wide />
          <Info label="Accepted providers" value={right.acceptedProviderIds.join(", ")} wide />
        </div> : <Empty />}
        <div className="notice"><strong>CKB boundary:</strong> this build intentionally fails readiness for <code>LEDGER_MODE=ckb</code> until the versioned Cell schema and wallet-signed state transitions are implemented. It never relabels an in-memory transfer as an on-chain transfer.</div>
      </section>
    </>}

    <section className="card">
      <div className="sectionTitle"><div><p className="kicker">Evidence log</p><h2>Activity</h2></div><button className="textButton" onClick={() => setActivities([])}>Clear</button></div>
      <div className="activity">
        {activities.length ? activities.map((item, i) => <div className={`activityItem ${item.tone}`} key={`${item.at}-${i}`}>
          <span className="dot"/><div><strong>{item.title}</strong><p>{item.detail}</p></div><time>{item.at}</time>
        </div>) : <p className="muted">Run the lifecycle above to generate verification evidence.</p>}
      </div>
    </section>

    <footer>Local pilot: product-facing language above, protocol/reviewer details behind the Reviewer view.</footer>
  </main>;
}

function evidenceText(value: unknown) {
  const evidence = value as VerificationEvidence;
  return `${evidence.allowed ? "ALLOW" : "DENY"} · ${evidence.reason} · provider ${evidence.providerId} · version ${evidence.entitlementVersion ?? "—"}`;
}

function message(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function Info({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <div className={wide ? "info wide" : "info"}><span>{label}</span><strong>{value}</strong></div>;
}

function Action({ n, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { n: string }) {
  return <button className="action" {...props}><span>{n}</span><strong>{children}</strong></button>;
}

function Empty() { return <p className="muted">No service entitlement found. Reset the demo to create one.</p>; }
