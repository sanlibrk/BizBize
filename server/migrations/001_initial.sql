CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY, email text UNIQUE NOT NULL, password_hash text NOT NULL,
 email_verified boolean NOT NULL DEFAULT false, couple_id uuid, sharing boolean NOT NULL DEFAULT false,
 sharing_version uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 terms_version text NOT NULL, disabled boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
 CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS session_user_idx ON sessions(user_id);
CREATE TABLE IF NOT EXISTS email_codes (
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, purpose text NOT NULL CHECK(purpose IN ('verify','reset')),
 code_hash text NOT NULL, expires_at timestamptz NOT NULL, attempts integer NOT NULL DEFAULT 0, PRIMARY KEY(user_id,purpose)
);
CREATE TABLE IF NOT EXISTS couples (id uuid PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS members (
 user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
 slot smallint NOT NULL CHECK(slot IN (1,2)), UNIQUE(couple_id,slot)
);
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_couple_fk;
ALTER TABLE users ADD CONSTRAINT users_couple_fk FOREIGN KEY(couple_id) REFERENCES couples(id) ON DELETE SET NULL;
CREATE TABLE IF NOT EXISTS invites (
 hash text PRIMARY KEY, couple_id uuid UNIQUE NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
 owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS blocks (
 owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 blocked_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(owner_id,blocked_id), CHECK(owner_id<>blocked_id)
);
CREATE TABLE IF NOT EXISTS photos (
 id uuid PRIMARY KEY, couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
 owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 bytes bytea NOT NULL CHECK(octet_length(bytes)<=5242880),
 status text NOT NULL CHECK(status IN ('pending','approved','rejected')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS memories (
 id uuid PRIMARY KEY REFERENCES photos(id) ON DELETE CASCADE,
 couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
 author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 note text NOT NULL CHECK(length(note) BETWEEN 1 AND 500), place text NOT NULL CHECK(length(place) BETWEEN 1 AND 120),
 happened_on date NOT NULL, latitude double precision NOT NULL CHECK(latitude BETWEEN -90 AND 90),
 longitude double precision NOT NULL CHECK(longitude BETWEEN -180 AND 180), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS messages (
 id uuid PRIMARY KEY, couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
 author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, kind text NOT NULL CHECK(kind IN ('text','task')),
 body text NOT NULL CHECK(length(body) BETWEEN 1 AND 2000), completed_at timestamptz,
 memory_id uuid REFERENCES memories(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS locations (
 user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 couple_id uuid NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
 latitude double precision NOT NULL CHECK(latitude BETWEEN -90 AND 90), longitude double precision NOT NULL CHECK(longitude BETWEEN -180 AND 180),
 accuracy double precision CHECK(accuracy>=0), captured_at timestamptz NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), sharing boolean NOT NULL
);
CREATE TABLE IF NOT EXISTS rate_limits (key text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS reports (
 id uuid PRIMARY KEY, reporter_id uuid REFERENCES users(id) ON DELETE SET NULL, target_id uuid REFERENCES users(id) ON DELETE SET NULL,
 kind text NOT NULL, reason text NOT NULL, details text NOT NULL, evidence text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')),
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days'
);
CREATE TABLE IF NOT EXISTS audit_events (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, action text NOT NULL, object_id uuid, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS memories_pair_idx ON memories(couple_id,happened_on DESC,created_at DESC);
CREATE INDEX IF NOT EXISTS messages_pair_idx ON messages(couple_id,created_at DESC);
CREATE TABLE IF NOT EXISTS mail_outbox (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, purpose text NOT NULL,
 envelope text NOT NULL, attempts integer NOT NULL DEFAULT 0, next_attempt timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '15 minutes', sent_at timestamptz
);
