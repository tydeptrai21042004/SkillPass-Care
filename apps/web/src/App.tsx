import { useEffect, useMemo, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { client, type ApiMeta, type ServiceRight, type VerificationEvidence } from "./api";

type View = "product" | "reviewer";
type Activity = {
  at: string;
  title: string;
  detail: string;
  tone: "ok" | "bad" | "neutral";
};

const providerNames: Record<string, string> = {
  "repair-a": "Northside Repair",
  "repair-b": "CityCare Service"
};

export function App() {
  const [right, setRight] = useState<ServiceRight | null>(null);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("product");
  const [fatal, setFatal] = useState<string | null>(null);

  const currentOwnerLabel = useMemo(() => ownerName(right?.owner), [right?.owner]);
  const active = Boolean(right && right.status === "ACTIVE" && Date.parse(right.expiresAt) > Date.now());
  const transferred = right?.owner === "bob";
  const aliceServiceUsed = Boolean(right && right.remainingClaims <= 2);
  const bobServiceUsed = Boolean(right && transferred && right.remainingClaims <= 1);

  useEffect(() => {
    client.meta()
      .then(async (apiMeta) => {
        setMeta(apiMeta);
        if (!apiMeta.demoEnabled || !apiMeta.demoRoute) {
          throw new Error(
            "Public demo endpoints are disabled. Set ENABLE_DEMO_ENDPOINTS=true for the Vercel demo deployment, then redeploy."
          );
        }
        return client.state(apiMeta.demoRoute);
      })
      .then((state) => setRight(state))
      .catch((error) => setFatal(message(error)))
      .finally(() => setLoading(false));
  }, []);

  function log(title: string, detail: string, tone: Activity["tone"] = "neutral") {
    setActivities((items) => [
      { at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }), title, detail, tone },
      ...items
    ].slice(0, 16));
  }

  async function runMutation(title: string, fn: () => Promise<ServiceRight>, detail: (value: ServiceRight) => string) {
    setBusy(true);
    try {
      const result = await fn();
      setRight(result);
      log(title, detail(result), "ok");
    } catch (error) {
      log(`${title} failed`, message(error), "bad");
    } finally {
      setBusy(false);
    }
  }

  async function runVerification(title: string, fn: () => Promise<VerificationEvidence>) {
    setBusy(true);
    try {
      const evidence = await fn();
      log(title, evidenceText(evidence), evidence.allowed ? "ok" : "bad");
    } catch (error) {
      log(`${title} failed`, message(error), "bad");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <main className="shell"><div className="loadingCard"><span className="spinner" />Loading SkillPass Care…</div></main>;
  }

  if (fatal || !right) {
    return <main className="shell">
      <section className="fatalCard">
        <p className="eyebrow">SkillPass Care</p>
        <h1>Demo API unavailable</h1>
        <p>{fatal ?? "No demo entitlement was returned."}</p>
        <button className="primaryButton" onClick={() => window.location.reload()}>Retry</button>
      </section>
    </main>;
  }

  return <main className="shell">
    <header className="topbar">
      <a className="brand" href="#top" aria-label="SkillPass Care home">
        <span className="brandMark" aria-hidden="true">S</span>
        <span><strong>SkillPass</strong><small>Care</small></span>
      </a>
      <div className="topActions">
        <span className={`apiStatus ${meta?.ledgerReady ? "online" : "warning"}`}>
          <i />{meta?.ledgerReady ? "Demo API online" : "Ledger not ready"}
        </span>
        <div className="switcher" role="group" aria-label="View mode">
          <button className={view === "product" ? "selected" : ""} onClick={() => setView("product")}>Product</button>
          <button className={view === "reviewer" ? "selected" : ""} onClick={() => setView("reviewer")}>Reviewer</button>
        </div>
      </div>
    </header>

    <section className="hero" id="top">
      <div>
        <p className="eyebrow">Portable service rights · CKB-oriented pilot</p>
        <h1>Coverage that can move with the product.</h1>
        <p className="lede">A transferable service right for second-hand devices. The current holder can use remaining coverage at accepted providers, while the previous holder stops qualifying after transfer.</p>
        <div className="heroBadges">
          <Badge icon="↔">Transferable</Badge>
          <Badge icon="✓">Multi-provider</Badge>
          <Badge icon="◌">No shared customer database</Badge>
        </div>
      </div>
      <div className="heroVisual" aria-label="Coverage follows ownership illustration">
        <div className="device"><span /><span /><b>Refurbished device</b><small>Product commitment</small></div>
        <div className="flowLine"><i /><strong>service right</strong><i /></div>
        <div className="owners">
          <div className={!transferred ? "owner activeOwner" : "owner"}><span>A</span><b>Alice</b><small>{!transferred ? "current owner" : "previous owner"}</small></div>
          <div className={transferred ? "owner activeOwner" : "owner"}><span>B</span><b>Bob</b><small>{transferred ? "current owner" : "next owner"}</small></div>
        </div>
      </div>
    </section>

    {view === "product" ? <>
      <section className="sectionIntro">
        <div><p className="kicker">Live demo state</p><h2>Refurbished device care plan</h2></div>
        <span className={`status ${active ? "active" : "inactive"}`}><i />{active ? "Active" : right.status}</span>
      </section>

      <section className="coverageGrid">
        <article className="card coverageCard">
          <div className="ownerHero">
            <span>Current entitlement holder</span>
            <div className="ownerIdentity"><i>{currentOwnerLabel[0]}</i><div><strong>{currentOwnerLabel}</strong><small>{right.owner}</small></div></div>
          </div>
          <div className="metrics">
            <Metric label="Coverage" value="90-day standard" />
            <Metric label="Visits left" value={`${right.remainingClaims} / 3`} emphasis={right.remainingClaims <= 1} />
            <Metric label="Version" value={`v${right.version}`} />
            <Metric label="Transfer" value={right.transferable ? "Allowed" : "Locked"} />
          </div>
          <div className="providerBlock">
            <div><span>Accepted providers</span><small>Each checks current entitlement state before service.</small></div>
            <div className="providerPills">
              {right.acceptedProviderIds.map((provider) => <span key={provider}>✓ {providerNames[provider] ?? provider}</span>)}
            </div>
          </div>
        </article>

        <aside className="card promiseCard">
          <p className="kicker">What changes after resale?</p>
          <h3>The service right changes hands. The product policy does not.</h3>
          <div className="promiseRows">
            <PromiseRow done icon="1" title="Seller issues coverage" text="Bound to the product commitment and initial holder." />
            <PromiseRow done={aliceServiceUsed} icon="2" title="Alice uses part of the plan" text="Provider A records a covered diagnostic; unused coverage remains portable." />
            <PromiseRow done={transferred} icon="3" title="Coverage moves to Bob" text="Ownership changes while the remaining Care policy and quota continue." />
            <PromiseRow done={bobServiceUsed} icon="4" title="Bob continues at Provider B" text="A different accepted provider verifies Bob and consumes the next unit." />
          </div>
        </aside>
      </section>

      <section className="card demoCard">
        <div className="sectionTitle">
          <div><p className="kicker">Interactive lifecycle</p><h2>Prove the second-owner flow</h2><p>Run the sequence. The demo state is stored in a signed browser session, so it remains deterministic across Vercel serverless instances.</p></div>
          <span className="demoFlag">Public demo · not on-chain</span>
        </div>
        <div className="stepRail">
          <DemoAction n="01" label="Reset" detail="Fresh plan → Alice" disabled={busy} complete={!transferred && right.remainingClaims === 3 && right.version === 1} onClick={() => runMutation("Demo reset", client.reset, () => "Fresh Care plan issued to Alice with three coverage units.")} />
          <DemoAction n="02" label="Verify Alice" detail="Provider A → allow" disabled={busy || right.owner !== "alice"} onClick={() => runVerification("Provider A verifies Alice", () => client.verify(right.id, "repair-a", "alice"))} />
          <DemoAction n="03" label="Alice diagnostic" detail="3 → 2 coverage units" disabled={busy || right.owner !== "alice" || right.remainingClaims !== 3} complete={aliceServiceUsed} onClick={() => runMutation("Provider A records Alice diagnostic", () => client.claim(right.id, "repair-a", "alice", right.version, "DIAGNOSTIC", 1), (next) => `Diagnostic completed. ${next.remainingClaims} coverage units remain and stay transferable.`)} />
          <DemoAction n="04" label="Transfer" detail="Alice → Bob" disabled={busy || right.owner !== "alice" || right.remainingClaims > 2} complete={transferred} onClick={() => runMutation("Transfer Alice → Bob", () => client.transfer(right.id, "alice", "bob", right.version), (next) => `Ownership moved to Bob without resetting coverage. ${next.remainingClaims} units remain.`)} />
          <DemoAction n="05" label="Reject Alice" detail="Old owner → deny" disabled={busy || !transferred} onClick={() => runVerification("Provider A checks previous owner", () => client.verify(right.id, "repair-a", "alice"))} />
          <DemoAction n="06" label="Verify Bob" detail="Provider B → allow" disabled={busy || !transferred} onClick={() => runVerification("Provider B verifies Bob", () => client.verify(right.id, "repair-b", "bob"))} />
          <DemoAction n="07" label="Bob repair" detail="2 → 1 coverage unit" disabled={busy || !transferred || right.remainingClaims !== 2} complete={bobServiceUsed} onClick={() => runMutation("Provider B records Bob repair", () => client.claim(right.id, "repair-b", "bob", right.version, "REPAIR", 1), (next) => `${next.remainingClaims} coverage unit${next.remainingClaims === 1 ? "" : "s"} remain after cross-provider service continuity.`)} />
        </div>
      </section>
    </> : <ReviewerView right={right} meta={meta} />}

    <section className="card activityCard">
      <div className="sectionTitle compact">
        <div><p className="kicker">Verification evidence</p><h2>Activity log</h2></div>
        <button className="textButton" onClick={() => setActivities([])} disabled={!activities.length}>Clear</button>
      </div>
      <div className="activity" aria-live="polite">
        {activities.length ? activities.map((item, i) => <div className={`activityItem ${item.tone}`} key={`${item.at}-${i}`}>
          <span className="dot" /><div><strong>{item.title}</strong><p>{item.detail}</p></div><time>{item.at}</time>
        </div>) : <div className="emptyLog"><span>◎</span><div><strong>No evidence yet</strong><p>Run a verification step above. Allow and deny decisions will appear here.</p></div></div>}
      </div>
    </section>

    <footer>
      <div><strong>SkillPass Care</strong><span>Portable service coverage pilot</span></div>
      <p>Demo behavior is intentionally separated from authoritative CKB state. No screen in this build claims an in-memory or browser-session mutation is an on-chain transfer.</p>
    </footer>
  </main>;
}

function ReviewerView({ right, meta }: { right: ServiceRight; meta: ApiMeta | null }) {
  return <>
    <section className="reviewerHero card">
      <div><p className="kicker">Reviewer view</p><h2>Portable ownership plus persistent Care coverage.</h2><p>The demo proves a richer application lifecycle: Alice can consume part of a plan, transfer the entitlement, and Bob can continue the remaining coverage at another accepted provider. Ownership and Care policy are intentionally separate layers.</p></div>
      <div className="readiness">
        <Readiness label="Vercel demo" value="Ready" tone="ok" />
        <Readiness label="Owner proof + scoped API" value="Implemented" tone="ok" />
        <Readiness label="CKB RPC boundary" value="Probe only" tone="warn" />
        <Readiness label="CKB write path" value="Not implemented" tone="warn" />
      </div>
    </section>

    <section className="reviewGrid">
      <article className="card">
        <p className="kicker">Authorization invariant</p>
        <h3>Every provider decision resolves current state.</h3>
        <div className="logicStack">
          {[
            "claimant proof is request-bound to service type and units",
            "entitlement exists",
            "status is ACTIVE and not expired",
            "claimant equals latest current owner",
            "provider is accepted",
            "Care plan permits the requested service",
            "enough coverage units remain"
          ].map((item) => <div key={item}><span>✓</span>{item}</div>)}
        </div>
      </article>
      <article className="card">
        <p className="kicker">Deployment boundary</p>
        <h3>Stateless where Vercel requires statelessness.</h3>
        <p className="bodyCopy">Public demo state is carried in a signed, HttpOnly browser cookie. Authenticated memory-ledger routes remain suitable for local/single-process pilots, not durable multi-instance production.</p>
        <div className="miniStats"><Metric label="API" value={`v${meta?.apiVersion ?? "—"}`} /><Metric label="Owner proof" value={meta?.ownerProof ?? "—"} /></div>
      </article>
    </section>

    <section className="card technicalCard">
      <div className="sectionTitle compact"><div><p className="kicker">Resolved entitlement</p><h2>Technical state</h2></div><span className="pill">demo session</span></div>
      <div className="technicalGrid">
        <Info label="Entitlement ID" value={right.id} wide />
        <Info label="Issuer" value={right.issuerId} />
        <Info label="Owner principal" value={right.owner} />
        <Info label="Status" value={right.status} />
        <Info label="Schema" value={`v${right.schemaVersion}`} />
        <Info label="State version" value={String(right.version)} />
        <Info label="Remaining claims" value={String(right.remainingClaims)} />
        <Info label="Updated" value={new Date(right.updatedAt).toLocaleString()} />
        <Info label="Product commitment" value={right.productCommitment} wide mono />
        <Info label="Accepted providers" value={right.acceptedProviderIds.join(", ")} wide />
      </div>
      <div className="boundaryNotice"><span>!</span><div><strong>CKB honesty boundary</strong><p><code>LEDGER_MODE=ckb</code> reports RPC reachability but readiness stays false until a versioned Cell schema, canonical live-Cell resolution, and wallet-signed state transitions are implemented.</p></div></div>
    </section>
  </>;
}

function Badge({ icon, children }: { icon: string; children: ReactNode }) {
  return <span className="heroBadge"><i>{icon}</i>{children}</span>;
}

function Metric({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return <div className={emphasis ? "metric emphasis" : "metric"}><span>{label}</span><strong>{value}</strong></div>;
}

function PromiseRow({ done, icon, title, text }: { done: boolean; icon: string; title: string; text: string }) {
  return <div className={done ? "promiseRow done" : "promiseRow"}><i>{done ? "✓" : icon}</i><div><strong>{title}</strong><p>{text}</p></div></div>;
}

function DemoAction({ n, label, detail, complete = false, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { n: string; label: string; detail: string; complete?: boolean }) {
  return <button className={complete ? "demoAction complete" : "demoAction"} {...props}><span className="stepNo">{complete ? "✓" : n}</span><span><strong>{label}</strong><small>{detail}</small></span><b aria-hidden="true">→</b></button>;
}

function Readiness({ label, value, tone }: { label: string; value: string; tone: "ok" | "warn" }) {
  return <div className={`readinessRow ${tone}`}><span>{label}</span><strong><i />{value}</strong></div>;
}

function evidenceText(evidence: VerificationEvidence) {
  return `${evidence.allowed ? "ALLOW" : "DENY"} · ${humanReason(evidence.reason)} · ${providerNames[evidence.providerId] ?? evidence.providerId} · entitlement v${evidence.entitlementVersion ?? "—"}`;
}

function humanReason(reason: string) {
  const labels: Record<string, string> = {
    ALLOW: "current holder is eligible",
    WRONG_OWNER: "claimant is not the current holder",
    PROVIDER_NOT_ACCEPTED: "provider is outside the acceptance policy",
    NO_CLAIMS_LEFT: "no covered visits remain",
    EXPIRED: "coverage expired",
    SUSPENDED: "coverage suspended",
    REVOKED: "coverage revoked",
    NOT_FOUND: "entitlement not found"
  };
  return labels[reason] ?? reason;
}

function ownerName(owner?: string) {
  if (owner === "alice") return "Alice";
  if (owner === "bob") return "Bob";
  return owner || "Unknown";
}

function message(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function Info({ label, value, wide = false, mono = false }: { label: string; value: string; wide?: boolean; mono?: boolean }) {
  return <div className={`${wide ? "info wide" : "info"}${mono ? " mono" : ""}`}><span>{label}</span><strong>{value}</strong></div>;
}
