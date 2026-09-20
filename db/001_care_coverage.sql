-- SkillPass Care durable application-state schema (PostgreSQL reference)
-- IMPORTANT: there is intentionally no authoritative `owner` column here.
-- Current ownership belongs to SkillPass/CKB and must be resolved fresh.

CREATE TABLE IF NOT EXISTS care_coverage (
  entitlement_id        text PRIMARY KEY,
  issuer_id              text NOT NULL,
  product_commitment     text NOT NULL CHECK (product_commitment ~ '^sha256:[0-9a-f]{64}$'),
  service_class          text NOT NULL,
  remaining_claims       integer NOT NULL CHECK (remaining_claims >= 0 AND remaining_claims <= 10000),
  status                 text NOT NULL CHECK (status IN ('ACTIVE', 'SUSPENDED', 'REVOKED')),
  version                bigint NOT NULL CHECK (version >= 1),
  transferable           boolean NOT NULL,
  expires_at             timestamptz NOT NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS care_provider_acceptance (
  entitlement_id text NOT NULL REFERENCES care_coverage(entitlement_id) ON DELETE CASCADE,
  provider_id    text NOT NULL,
  PRIMARY KEY (entitlement_id, provider_id)
);

CREATE TABLE IF NOT EXISTS care_service_event (
  provider_id                 text NOT NULL,
  event_id                    text NOT NULL,
  entitlement_id              text NOT NULL REFERENCES care_coverage(entitlement_id) ON DELETE RESTRICT,
  claimant                    text NOT NULL,
  service_type                text NOT NULL CHECK (service_type IN (
    'DIAGNOSTIC', 'INSPECTION', 'REPAIR', 'REPLACEMENT', 'BATTERY_REPLACEMENT'
  )),
  units_consumed              integer NOT NULL CHECK (units_consumed >= 1 AND units_consumed <= 100),
  request_hash                text NOT NULL CHECK (request_hash ~ '^sha256:[0-9a-f]{64}$'),
  entitlement_version_before  bigint NOT NULL,
  entitlement_version_after   bigint NOT NULL,
  remaining_claims_after      integer NOT NULL CHECK (remaining_claims_after >= 0),
  occurred_at                 timestamptz NOT NULL,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_id, event_id),
  CHECK (entitlement_version_after = entitlement_version_before + 1)
);

CREATE INDEX IF NOT EXISTS care_service_event_entitlement_idx
  ON care_service_event (entitlement_id, occurred_at, provider_id, event_id);

-- A durable implementation should commit the coverage decrement and service
-- event insert in one SQL transaction using an optimistic version predicate:
--
-- UPDATE care_coverage
-- SET remaining_claims = remaining_claims - :units,
--     version = version + 1,
--     updated_at = now()
-- WHERE entitlement_id = :id
--   AND version = :expected_version
--   AND status = 'ACTIVE'
--   AND remaining_claims >= :units;
--
-- Require exactly one updated row, then INSERT care_service_event before COMMIT.
