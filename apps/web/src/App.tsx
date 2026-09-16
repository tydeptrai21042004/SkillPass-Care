import { useEffect, useState } from "react";
import { client, type ServiceRight } from "./api";

export function App() {
  const [right, setRight] = useState<ServiceRight | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const add = (message: string) => setLog((items) => [message, ...items].slice(0, 12));

  async function refresh() {
    const rows = await client.list();
    setRight(rows[0] ?? null);
  }

  useEffect(() => { refresh().catch((e) => add(String(e))); }, []);

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      const result = await fn();
      add(`${label}: ${JSON.stringify(result)}`);
      await refresh();
    } catch (e) {
      add(`${label} FAILED: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setBusy(false); }
  }

  return <main className="shell">
    <header className="hero">
      <p className="eyebrow">SkillPass Care · Pilot</p>
      <h1>Service coverage that follows ownership.</h1>
      <p className="lede">A seller issues coverage once. Independent service providers verify the current owner without sharing a customer entitlement database.</p>
    </header>

    <section className="card">
      <div className="cardHead"><h2>Current coverage</h2><span className="pill">Demo ledger</span></div>
      {right ? <div className="grid">
        <Info label="Owner" value={right.owner} />
        <Info label="Plan" value={right.serviceClass} />
        <Info label="Remaining visits" value={String(right.remainingClaims)} />
        <Info label="Version" value={String(right.version)} />
        <Info label="Accepted providers" value={right.acceptedProviderIds.join(", ")} wide />
        <Info label="Product commitment" value={right.productHash} wide />
      </div> : <p>No entitlement found.</p>}
    </section>

    <section className="card">
      <h2>Lifecycle test</h2>
      <p>Run the exact story a reviewer or pilot partner should understand.</p>
      <div className="actions">
        <button disabled={busy} onClick={() => run("Reset demo to Alice", () => client.reset())}>1. Reset to Alice</button>
        <button disabled={busy || !right} onClick={() => run("Provider A verifies Alice", () => client.verify(right!.id, "repair-a", "alice"))}>2. Verify Alice</button>
        <button disabled={busy || !right} onClick={() => run("Transfer Alice → Bob", () => client.transfer(right!.id, "alice", "bob"))}>3. Transfer to Bob</button>
        <button disabled={busy || !right} onClick={() => run("Provider A checks old owner", () => client.verify(right!.id, "repair-a", "alice"))}>4. Reject Alice</button>
        <button disabled={busy || !right} onClick={() => run("Provider B verifies Bob", () => client.verify(right!.id, "repair-b", "bob"))}>5. Verify Bob</button>
        <button disabled={busy || !right} onClick={() => run("Provider B records service", () => client.claim(right!.id, "repair-b", "bob"))}>6. Use service</button>
      </div>
    </section>

    <section className="card">
      <h2>Activity</h2>
      <div className="log">{log.length ? log.map((x, i) => <code key={i}>{x}</code>) : <span>No actions yet.</span>}</div>
    </section>

    <footer>Customer-facing production UI should hide blockchain vocabulary. This page is intentionally half product demo, half reviewer tool.</footer>
  </main>;
}

function Info({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <div className={wide ? "info wide" : "info"}><span>{label}</span><strong>{value}</strong></div>;
}
