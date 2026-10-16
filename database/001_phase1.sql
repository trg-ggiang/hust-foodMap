-- HUST FoodMap / PostgreSQL / phase 1
-- Fresh installation only. No DROP, no application data, no credentials.
-- Run against an explicitly selected database, not an existing production schema.
BEGIN;
CREATE SCHEMA foodmap;
REVOKE ALL ON SCHEMA foodmap FROM PUBLIC;
SET LOCAL search_path = foodmap, pg_catalog;
SET LOCAL TIME ZONE 'Asia/Saigon';

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL CHECK (email = btrim(email) AND length(email) > 0),
  password_hash text NOT NULL CHECK (length(password_hash) > 0),
  display_name text NOT NULL CHECK (length(btrim(display_name)) > 0),
  avatar_asset_id uuid,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('owner','admin','user')),
  email_verified_at timestamptz,
  locked_at timestamptz,
  locked_by uuid REFERENCES users(id) ON DELETE RESTRICT,
  lock_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((locked_at IS NULL AND locked_by IS NULL AND lock_reason IS NULL)
    OR (locked_at IS NOT NULL AND locked_by IS NOT NULL AND length(btrim(lock_reason)) > 0 AND lock_reason IS NOT NULL))
);
CREATE UNIQUE INDEX users_email_uq ON users(lower(email));
CREATE UNIQUE INDEX users_owner_uq ON users(role) WHERE role = 'owner';
CREATE INDEX users_locked_by_idx ON users(locked_by) WHERE locked_by IS NOT NULL;

CREATE TABLE media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by uuid REFERENCES users(id) ON DELETE RESTRICT,
  storage_key text NOT NULL UNIQUE CHECK (length(btrim(storage_key)) > 0),
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp')),
  byte_size bigint NOT NULL CHECK (byte_size > 0),
  width integer CHECK (width > 0),
  height integer CHECK (height > 0),
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','ready','quarantined')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE users ADD CONSTRAINT users_avatar_fk FOREIGN KEY (avatar_asset_id)
  REFERENCES media_assets(id) ON DELETE RESTRICT;
CREATE INDEX users_avatar_idx ON users(avatar_asset_id) WHERE avatar_asset_id IS NOT NULL;
CREATE INDEX media_assets_uploader_idx ON media_assets(uploaded_by);

CREATE TABLE auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  refresh_token_hash text NOT NULL UNIQUE CHECK (length(refresh_token_hash) > 0),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);
CREATE INDEX auth_sessions_user_idx ON auth_sessions(user_id);
CREATE INDEX auth_sessions_expiry_idx ON auth_sessions(expires_at) WHERE revoked_at IS NULL;

CREATE TABLE auth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  purpose text NOT NULL CHECK (purpose IN ('verify_email','reset_password')),
  token_hash text NOT NULL UNIQUE CHECK (length(token_hash) > 0),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);
CREATE INDEX auth_tokens_user_idx ON auth_tokens(user_id,purpose);

CREATE TABLE restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  address text NOT NULL CHECK (length(btrim(address)) > 0),
  latitude numeric(9,6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude numeric(9,6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  thumbnail_asset_id uuid NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
  description text,
  opening_time time NOT NULL,
  closing_time time NOT NULL,
  visit_duration_minutes smallint NOT NULL CHECK (visit_duration_minutes > 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Phase-1 default: one same-day interval. Overnight policy remains open.
  CHECK (opening_time < closing_time)
);
CREATE INDEX restaurants_status_idx ON restaurants(status);
CREATE INDEX restaurants_thumbnail_idx ON restaurants(thumbnail_asset_id);
CREATE INDEX restaurants_created_by_idx ON restaurants(created_by);
CREATE INDEX restaurants_updated_by_idx ON restaurants(updated_by);

CREATE TABLE dishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  description text,
  image_asset_id uuid NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','discontinued')),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id,restaurant_id)
);
CREATE INDEX dishes_menu_idx ON dishes(restaurant_id,status,sort_order);
CREATE INDEX dishes_image_idx ON dishes(image_asset_id);

CREATE TABLE dish_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id uuid NOT NULL REFERENCES dishes(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (name = btrim(name) AND length(name) > 0),
  price_vnd numeric(12,0) NOT NULL CHECK (price_vnd >= 0),
  is_available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dish_id,name)
);
CREATE INDEX dish_options_menu_idx ON dish_options(dish_id,is_available,sort_order);

CREATE TABLE dish_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (name = btrim(name) AND length(name) > 0),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  is_active boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX dish_categories_name_uq ON dish_categories(lower(name));
CREATE TABLE dish_category_links (
  dish_id uuid NOT NULL REFERENCES dishes(id) ON DELETE RESTRICT,
  category_id uuid NOT NULL REFERENCES dish_categories(id) ON DELETE RESTRICT,
  PRIMARY KEY (dish_id,category_id)
);
CREATE INDEX dish_category_links_category_idx ON dish_category_links(category_id,dish_id);

CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE RESTRICT,
  dish_id uuid REFERENCES dishes(id) ON DELETE RESTRICT,
  current_version_no integer NOT NULL CHECK (current_version_no > 0),
  deleted_at timestamptz,
  moderation_state text NOT NULL DEFAULT 'visible' CHECK (moderation_state IN ('visible','hidden')),
  hidden_at timestamptz,
  hidden_by uuid REFERENCES users(id) ON DELETE RESTRICT,
  hidden_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id,user_id),
  CHECK (num_nonnulls(restaurant_id,dish_id) = 1),
  CHECK ((moderation_state = 'visible' AND hidden_at IS NULL AND hidden_by IS NULL AND hidden_reason IS NULL)
    OR (moderation_state = 'hidden' AND hidden_at IS NOT NULL AND hidden_by IS NOT NULL
      AND hidden_reason IS NOT NULL AND length(btrim(hidden_reason)) > 0))
);
CREATE UNIQUE INDEX reviews_user_restaurant_uq ON reviews(user_id,restaurant_id) WHERE restaurant_id IS NOT NULL;
CREATE UNIQUE INDEX reviews_user_dish_uq ON reviews(user_id,dish_id) WHERE dish_id IS NOT NULL;
CREATE INDEX reviews_restaurant_idx ON reviews(restaurant_id) WHERE restaurant_id IS NOT NULL;
CREATE INDEX reviews_dish_idx ON reviews(dish_id) WHERE dish_id IS NOT NULL;
CREATE INDEX reviews_hidden_by_idx ON reviews(hidden_by) WHERE hidden_by IS NOT NULL;
CREATE INDEX reviews_restaurant_feed_idx ON reviews(restaurant_id,updated_at DESC)
  WHERE deleted_at IS NULL AND moderation_state = 'visible';
CREATE INDEX reviews_dish_feed_idx ON reviews(dish_id,updated_at DESC)
  WHERE deleted_at IS NULL AND moderation_state = 'visible';

CREATE TABLE review_versions (
  review_id uuid NOT NULL REFERENCES reviews(id) ON DELETE RESTRICT,
  version_no integer NOT NULL CHECK (version_no > 0),
  rating_units smallint NOT NULL CHECK (rating_units BETWEEN 2 AND 10),
  body text,
  event_type text NOT NULL CHECK (event_type IN ('create','edit','recreate')),
  -- Explicit input: content-only edits need not contribute a new monthly rating.
  rating_submitted boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (review_id,version_no),
  CHECK (event_type = 'edit' OR rating_submitted)
);
ALTER TABLE reviews ADD CONSTRAINT reviews_current_version_fk
  FOREIGN KEY (id,current_version_no) REFERENCES review_versions(review_id,version_no)
  DEFERRABLE INITIALLY DEFERRED;
-- Insert review(pointer=1), then version 1 within the same transaction.

CREATE TABLE review_version_images (
  review_id uuid NOT NULL,
  version_no integer NOT NULL,
  asset_id uuid NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
  position smallint NOT NULL CHECK (position >= 0),
  PRIMARY KEY (review_id,version_no,asset_id),
  UNIQUE (review_id,version_no,position),
  FOREIGN KEY (review_id,version_no) REFERENCES review_versions(review_id,version_no) ON DELETE RESTRICT
);
CREATE INDEX review_version_images_asset_idx ON review_version_images(asset_id);

-- Moderation is separate from immutable snapshots: supports selective restoration.
CREATE TABLE review_version_moderation (
  review_id uuid NOT NULL,
  version_no integer NOT NULL,
  state text NOT NULL DEFAULT 'eligible' CHECK (state IN ('eligible','excluded')),
  reason text,
  moderated_by uuid REFERENCES users(id) ON DELETE RESTRICT,
  moderated_at timestamptz,
  PRIMARY KEY (review_id,version_no),
  FOREIGN KEY (review_id,version_no) REFERENCES review_versions(review_id,version_no) ON DELETE RESTRICT,
  CHECK (state <> 'excluded' OR (reason IS NOT NULL AND length(btrim(reason)) > 0
    AND moderated_by IS NOT NULL AND moderated_at IS NOT NULL))
);
CREATE INDEX review_version_moderation_actor_idx ON review_version_moderation(moderated_by);

CREATE TABLE review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES reviews(id) ON DELETE RESTRICT,
  actor_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN ('created','edited','deleted','recreated','hidden','restored')),
  version_no integer,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (review_id,version_no) REFERENCES review_versions(review_id,version_no) ON DELETE RESTRICT
);
CREATE INDEX review_events_history_idx ON review_events(review_id,created_at DESC);
CREATE INDEX review_events_version_idx ON review_events(review_id,version_no);
CREATE INDEX review_events_actor_idx ON review_events(actor_id);

CREATE TABLE review_monthly_contributions (
  review_id uuid NOT NULL,
  month_start date NOT NULL CHECK (extract(day FROM month_start) = 1),
  version_no integer NOT NULL,
  withdrawn_at timestamptz,
  withdrawal_reason text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (review_id,month_start),
  FOREIGN KEY (review_id,version_no) REFERENCES review_versions(review_id,version_no) ON DELETE RESTRICT,
  CHECK ((withdrawn_at IS NULL AND withdrawal_reason IS NULL)
    OR (withdrawn_at IS NOT NULL AND withdrawal_reason IS NOT NULL AND length(btrim(withdrawal_reason)) > 0))
);
CREATE INDEX review_monthly_month_idx ON review_monthly_contributions(month_start,review_id);
CREATE INDEX review_monthly_version_idx ON review_monthly_contributions(review_id,version_no);

CREATE TABLE review_reconsideration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL,
  version_no integer NOT NULL,
  requested_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  resolved_by uuid REFERENCES users(id) ON DELETE RESTRICT,
  resolution_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  FOREIGN KEY (review_id,version_no) REFERENCES review_versions(review_id,version_no) ON DELETE RESTRICT,
  FOREIGN KEY (review_id,requested_by) REFERENCES reviews(id,user_id) ON DELETE RESTRICT,
  CHECK ((status = 'pending' AND resolved_by IS NULL AND resolved_at IS NULL AND resolution_reason IS NULL)
    OR (status <> 'pending' AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL
      AND resolution_reason IS NOT NULL AND length(btrim(resolution_reason)) > 0))
);
CREATE UNIQUE INDEX review_reconsideration_pending_uq ON review_reconsideration_requests(review_id) WHERE status = 'pending';
CREATE INDEX review_reconsideration_version_idx ON review_reconsideration_requests(review_id,version_no);
CREATE INDEX review_reconsideration_requester_idx ON review_reconsideration_requests(requested_by);
CREATE INDEX review_reconsideration_resolver_idx ON review_reconsideration_requests(resolved_by);
CREATE INDEX review_reconsideration_queue_idx ON review_reconsideration_requests(created_at) WHERE status = 'pending';

CREATE TABLE saved_restaurants (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id,restaurant_id)
);
CREATE INDEX saved_restaurants_restaurant_idx ON saved_restaurants(restaurant_id);

CREATE TABLE favorite_restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
  is_public boolean NOT NULL DEFAULT false,
  introduction text,
  moderation_state text NOT NULL DEFAULT 'visible' CHECK (moderation_state IN ('visible','hidden')),
  hidden_reason text,
  hidden_by uuid REFERENCES users(id) ON DELETE RESTRICT,
  hidden_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id,restaurant_id),
  UNIQUE (id,restaurant_id),
  CHECK ((moderation_state = 'visible' AND hidden_at IS NULL AND hidden_by IS NULL AND hidden_reason IS NULL)
    OR (moderation_state = 'hidden' AND hidden_at IS NOT NULL AND hidden_by IS NOT NULL
      AND hidden_reason IS NOT NULL AND length(btrim(hidden_reason)) > 0))
);
CREATE INDEX favorite_restaurants_restaurant_idx ON favorite_restaurants(restaurant_id);
CREATE INDEX favorite_restaurants_hidden_by_idx ON favorite_restaurants(hidden_by);
CREATE INDEX favorite_restaurants_public_idx ON favorite_restaurants(user_id,created_at DESC)
  WHERE is_public AND removed_at IS NULL AND moderation_state = 'visible';
CREATE TABLE favorite_dishes (
  favorite_id uuid NOT NULL,
  restaurant_id uuid NOT NULL,
  dish_id uuid NOT NULL,
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  PRIMARY KEY (favorite_id,dish_id),
  FOREIGN KEY (favorite_id,restaurant_id) REFERENCES favorite_restaurants(id,restaurant_id) ON DELETE RESTRICT,
  FOREIGN KEY (dish_id,restaurant_id) REFERENCES dishes(id,restaurant_id) ON DELETE RESTRICT
);
CREATE INDEX favorite_dishes_favorite_restaurant_idx ON favorite_dishes(favorite_id,restaurant_id);
CREATE INDEX favorite_dishes_dish_restaurant_idx ON favorite_dishes(dish_id,restaurant_id);

CREATE TABLE visit_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
  party_size smallint NOT NULL DEFAULT 1 CHECK (party_size BETWEEN 1 AND 20),
  arrival_at timestamptz NOT NULL,
  duration_minutes_snapshot smallint NOT NULL CHECK (duration_minutes_snapshot > 0),
  closing_at_snapshot timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','cancelled','expired')),
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES users(id) ON DELETE RESTRICT,
  cancel_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (arrival_at < expires_at),
  CHECK (expires_at = LEAST(arrival_at + make_interval(mins => duration_minutes_snapshot),closing_at_snapshot)),
  CHECK ((status <> 'cancelled' AND cancelled_at IS NULL AND cancelled_by IS NULL AND cancel_reason IS NULL)
    OR (status = 'cancelled' AND cancelled_at IS NOT NULL AND cancel_reason IS NOT NULL AND length(btrim(cancel_reason)) > 0))
);
CREATE UNIQUE INDEX visit_plans_one_planned_uq ON visit_plans(user_id) WHERE status = 'planned';
CREATE INDEX visit_plans_user_history_idx ON visit_plans(user_id,created_at DESC);
CREATE INDEX visit_plans_restaurant_idx ON visit_plans(restaurant_id);
CREATE INDEX visit_plans_restaurant_live_idx ON visit_plans(restaurant_id,expires_at) WHERE status = 'planned';
CREATE INDEX visit_plans_expiry_idx ON visit_plans(expires_at) WHERE status = 'planned';
CREATE INDEX visit_plans_cancelled_by_idx ON visit_plans(cancelled_by);

CREATE TABLE content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  review_id uuid REFERENCES reviews(id) ON DELETE RESTRICT,
  favorite_id uuid REFERENCES favorite_restaurants(id) ON DELETE RESTRICT,
  reason_code text NOT NULL CHECK (reason_code IN ('spam','offensive','misinformation','inappropriate_image','other')),
  details text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','dismissed','actioned')),
  resolved_by uuid REFERENCES users(id) ON DELETE RESTRICT,
  resolution_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CHECK (num_nonnulls(review_id,favorite_id) = 1),
  CHECK ((status = 'pending' AND resolved_by IS NULL AND resolved_at IS NULL AND resolution_reason IS NULL)
    OR (status <> 'pending' AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL
      AND resolution_reason IS NOT NULL AND length(btrim(resolution_reason)) > 0))
);
CREATE UNIQUE INDEX content_reports_review_pending_uq ON content_reports(reporter_id,review_id)
  WHERE status = 'pending' AND review_id IS NOT NULL;
CREATE UNIQUE INDEX content_reports_favorite_pending_uq ON content_reports(reporter_id,favorite_id)
  WHERE status = 'pending' AND favorite_id IS NOT NULL;
CREATE INDEX content_reports_reporter_idx ON content_reports(reporter_id);
CREATE INDEX content_reports_review_idx ON content_reports(review_id);
CREATE INDEX content_reports_favorite_idx ON content_reports(favorite_id);
CREATE INDEX content_reports_resolver_idx ON content_reports(resolved_by);
CREATE INDEX content_reports_queue_idx ON content_reports(created_at) WHERE status = 'pending';

CREATE TABLE moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  review_id uuid REFERENCES reviews(id) ON DELETE RESTRICT,
  favorite_id uuid REFERENCES favorite_restaurants(id) ON DELETE RESTRICT,
  target_user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  report_id uuid REFERENCES content_reports(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (action IN ('hide','restore','lock','unlock')),
  reason text NOT NULL CHECK (length(btrim(reason)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(review_id,favorite_id,target_user_id) = 1),
  CHECK ((action IN ('lock','unlock') AND target_user_id IS NOT NULL AND report_id IS NULL)
    OR (action IN ('hide','restore') AND target_user_id IS NULL))
);
CREATE INDEX moderation_actions_actor_idx ON moderation_actions(actor_id);
CREATE INDEX moderation_actions_review_idx ON moderation_actions(review_id,created_at DESC);
CREATE INDEX moderation_actions_favorite_idx ON moderation_actions(favorite_id,created_at DESC);
CREATE INDEX moderation_actions_user_idx ON moderation_actions(target_user_id,created_at DESC);
CREATE INDEX moderation_actions_report_idx ON moderation_actions(report_id);

CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (length(btrim(action)) > 0),
  entity_type text NOT NULL,
  entity_id uuid,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(changes) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_actor_idx ON audit_events(actor_id);
CREATE INDEX audit_events_entity_idx ON audit_events(entity_type,entity_id,created_at DESC);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('plan_cancelled','content_hidden','report_resolved')),
  visit_plan_id uuid REFERENCES visit_plans(id) ON DELETE RESTRICT,
  report_id uuid REFERENCES content_reports(id) ON DELETE RESTRICT,
  moderation_action_id uuid REFERENCES moderation_actions(id) ON DELETE RESTRICT,
  message text NOT NULL CHECK (length(btrim(message)) > 0),
  read_at timestamptz,
  dedupe_key text NOT NULL UNIQUE CHECK (length(dedupe_key) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind = 'plan_cancelled' AND visit_plan_id IS NOT NULL AND report_id IS NULL AND moderation_action_id IS NULL)
    OR (kind = 'content_hidden' AND moderation_action_id IS NOT NULL AND visit_plan_id IS NULL AND report_id IS NULL)
    OR (kind = 'report_resolved' AND report_id IS NOT NULL AND visit_plan_id IS NULL AND moderation_action_id IS NULL))
);
CREATE INDEX notifications_feed_idx ON notifications(recipient_id,created_at DESC);
CREATE INDEX notifications_unread_idx ON notifications(recipient_id,created_at DESC) WHERE read_at IS NULL;
CREATE INDEX notifications_plan_idx ON notifications(visit_plan_id);
CREATE INDEX notifications_report_idx ON notifications(report_id);
CREATE INDEX notifications_moderation_idx ON notifications(moderation_action_id);

-- Generic timestamp and append-only guards; business ownership remains in NestJS.
CREATE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql
SET search_path = foodmap, pg_catalog AS $$
BEGIN NEW.updated_at := statement_timestamp(); RETURN NEW; END;
$$;
DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['users','restaurants','dishes','dish_options','reviews',
    'review_monthly_contributions','favorite_restaurants','visit_plans'] LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON foodmap.%I FOR EACH ROW EXECUTE FUNCTION foodmap.touch_updated_at()',
      tbl || '_touch',tbl);
  END LOOP;
END;
$$;

CREATE FUNCTION reject_history_mutation() RETURNS trigger LANGUAGE plpgsql
SET search_path = foodmap, pg_catalog AS $$
BEGIN RAISE EXCEPTION 'History is append-only: %', TG_TABLE_NAME USING ERRCODE = '55000'; END;
$$;
DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['review_versions','review_version_images','review_events','moderation_actions','audit_events'] LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON foodmap.%I FOR EACH ROW EXECUTE FUNCTION foodmap.reject_history_mutation()',
      tbl || '_immutable',tbl);
  END LOOP;
END;
$$;

CREATE FUNCTION project_review_version() RETURNS trigger LANGUAGE plpgsql
SET search_path = foodmap, pg_catalog AS $$
DECLARE month_key date;
BEGIN
  INSERT INTO review_version_moderation(review_id,version_no) VALUES (NEW.review_id,NEW.version_no);
  IF NEW.rating_submitted THEN
    month_key := date_trunc('month',NEW.created_at AT TIME ZONE 'Asia/Saigon')::date;
    INSERT INTO review_monthly_contributions(review_id,month_start,version_no)
      VALUES (NEW.review_id,month_key,NEW.version_no)
    ON CONFLICT (review_id,month_start) DO UPDATE SET version_no = EXCLUDED.version_no,
      withdrawn_at = NULL, withdrawal_reason = NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER review_versions_projection AFTER INSERT ON review_versions
  FOR EACH ROW EXECUTE FUNCTION project_review_version();

CREATE FUNCTION guard_review_identity() RETURNS trigger LANGUAGE plpgsql
SET search_path = foodmap, pg_catalog AS $$
BEGIN
  IF NEW.user_id <> OLD.user_id OR NEW.restaurant_id IS DISTINCT FROM OLD.restaurant_id
    OR NEW.dish_id IS DISTINCT FROM OLD.dish_id THEN
    RAISE EXCEPTION 'Review owner and target are immutable' USING ERRCODE = '23514';
  END IF;
  IF NEW.current_version_no < OLD.current_version_no THEN
    RAISE EXCEPTION 'Review current version cannot move backwards' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER reviews_identity BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION guard_review_identity();

CREATE FUNCTION validate_review_version() RETURNS trigger LANGUAGE plpgsql
SET search_path = foodmap, pg_catalog AS $$
DECLARE previous review_versions%ROWTYPE;
BEGIN
  PERFORM 1 FROM reviews WHERE id = NEW.review_id FOR UPDATE;
  SELECT * INTO previous FROM review_versions WHERE review_id = NEW.review_id ORDER BY version_no DESC LIMIT 1;
  IF NEW.version_no <> coalesce(previous.version_no,0) + 1 THEN
    RAISE EXCEPTION 'Review versions must be sequential' USING ERRCODE = '23514';
  END IF;
  IF previous.version_no IS NOT NULL AND NEW.created_at < previous.created_at THEN
    RAISE EXCEPTION 'Review version time cannot move backwards' USING ERRCODE = '23514';
  END IF;
  IF NOT NEW.rating_submitted AND (previous.version_no IS NULL OR NEW.rating_units <> previous.rating_units) THEN
    RAISE EXCEPTION 'A changed score must contribute a monthly rating' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER review_versions_validate BEFORE INSERT ON review_versions
  FOR EACH ROW EXECUTE FUNCTION validate_review_version();

CREATE FUNCTION validate_monthly_version() RETURNS trigger LANGUAGE plpgsql
SET search_path = foodmap, pg_catalog AS $$
DECLARE snapshot review_versions%ROWTYPE;
BEGIN
  SELECT * INTO STRICT snapshot FROM review_versions
    WHERE review_id = NEW.review_id AND version_no = NEW.version_no;
  IF NOT snapshot.rating_submitted OR NEW.month_start <>
    date_trunc('month',snapshot.created_at AT TIME ZONE 'Asia/Saigon')::date THEN
    RAISE EXCEPTION 'Monthly contribution must reference a rating from that month' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER review_monthly_validate BEFORE INSERT OR UPDATE ON review_monthly_contributions
  FOR EACH ROW EXECUTE FUNCTION validate_monthly_version();

-- Images are finalized with the version in one transaction. Later edits need a new version.
CREATE FUNCTION guard_review_image_insert() RETURNS trigger LANGUAGE plpgsql
SET search_path = foodmap, pg_catalog AS $$
DECLARE snapshot_xid bigint;
BEGIN
  SELECT xmin::text::bigint INTO STRICT snapshot_xid FROM review_versions
    WHERE review_id = NEW.review_id AND version_no = NEW.version_no;
  IF snapshot_xid <> (pg_current_xact_id()::text::bigint % 4294967296) THEN
    RAISE EXCEPTION 'Attach images in the same transaction as the version' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER review_version_images_seal BEFORE INSERT ON review_version_images
  FOR EACH ROW EXECUTE FUNCTION guard_review_image_insert();

-- Protect report-action linkage even though target IDs are nullable alternatives.
CREATE FUNCTION check_moderation_report_target() RETURNS trigger LANGUAGE plpgsql
SET search_path = foodmap, pg_catalog AS $$
DECLARE target content_reports%ROWTYPE;
BEGIN
  IF NEW.report_id IS NOT NULL THEN
    SELECT * INTO STRICT target FROM content_reports WHERE id = NEW.report_id;
    IF NEW.review_id IS DISTINCT FROM target.review_id OR NEW.favorite_id IS DISTINCT FROM target.favorite_id THEN
      RAISE EXCEPTION 'Moderation target differs from report target' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER moderation_actions_report_target BEFORE INSERT ON moderation_actions
  FOR EACH ROW EXECUTE FUNCTION check_moderation_report_target();

-- Same-day phase-1 visit workflow, validated at write time, not with volatile CHECKs.
CREATE FUNCTION validate_visit_plan() RETURNS trigger LANGUAGE plpgsql
SET search_path = foodmap, pg_catalog AS $$
DECLARE venue restaurants%ROWTYPE; member users%ROWTYPE;
  at_time timestamptz := statement_timestamp(); today date;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.user_id <> OLD.user_id OR NEW.restaurant_id <> OLD.restaurant_id THEN
      RAISE EXCEPTION 'Cancel and create a new plan to change its owner or restaurant' USING ERRCODE = '23514';
    END IF;
    IF OLD.status <> 'planned' AND NEW.status = 'planned' THEN
      RAISE EXCEPTION 'Terminal plans cannot be reopened' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF NEW.status <> 'planned' THEN RETURN NEW; END IF;
  SELECT * INTO STRICT venue FROM restaurants WHERE id = NEW.restaurant_id FOR UPDATE;
  SELECT * INTO STRICT member FROM users WHERE id = NEW.user_id FOR UPDATE;
  IF venue.status <> 'active' OR member.locked_at IS NOT NULL OR member.email_verified_at IS NULL THEN
    RAISE EXCEPTION 'Plan needs an active venue and verified, unlocked user' USING ERRCODE = '23514';
  END IF;
  today := (at_time AT TIME ZONE 'Asia/Saigon')::date;
  IF (NEW.arrival_at AT TIME ZONE 'Asia/Saigon')::date <> today OR NEW.arrival_at < at_time
    OR (NEW.arrival_at AT TIME ZONE 'Asia/Saigon')::time < venue.opening_time
    OR (NEW.arrival_at AT TIME ZONE 'Asia/Saigon')::time >= venue.closing_time THEN
    RAISE EXCEPTION 'Arrival must be today, not in the past, and inside opening hours' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.duration_minutes_snapshot := venue.visit_duration_minutes;
    UPDATE visit_plans SET status = 'expired' WHERE user_id = NEW.user_id AND status = 'planned' AND expires_at <= at_time;
  ELSE
    NEW.duration_minutes_snapshot := OLD.duration_minutes_snapshot;
  END IF;
  NEW.closing_at_snapshot := (today + venue.closing_time) AT TIME ZONE 'Asia/Saigon';
  NEW.expires_at := LEAST(NEW.arrival_at + make_interval(mins => NEW.duration_minutes_snapshot),NEW.closing_at_snapshot);
  RETURN NEW;
END;
$$;
CREATE TRIGGER visit_plans_validate BEFORE INSERT OR UPDATE ON visit_plans
  FOR EACH ROW EXECUTE FUNCTION validate_visit_plan();

CREATE FUNCTION cancel_plans_on_restaurant_closure() RETURNS trigger LANGUAGE plpgsql
SET search_path = foodmap, pg_catalog AS $$
DECLARE plan visit_plans%ROWTYPE; at_time timestamptz := statement_timestamp();
BEGIN
  IF OLD.status = 'active' AND NEW.status = 'inactive' THEN
    FOR plan IN UPDATE visit_plans SET status = 'cancelled', cancelled_at = at_time,
        cancelled_by = NEW.updated_by, cancel_reason = 'restaurant_inactive'
      WHERE restaurant_id = NEW.id AND status = 'planned' AND expires_at > at_time RETURNING * LOOP
      INSERT INTO notifications(recipient_id,kind,visit_plan_id,message,dedupe_key)
        VALUES (plan.user_id,'plan_cancelled',plan.id,'Quán ngừng hoạt động; kế hoạch đã được hủy.',
          'plan_cancelled:' || plan.id::text || ':' || plan.user_id::text)
        ON CONFLICT (dedupe_key) DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER restaurants_cancel_plans AFTER UPDATE OF status ON restaurants
  FOR EACH ROW EXECUTE FUNCTION cancel_plans_on_restaurant_closure();

CREATE VIEW restaurant_price_ranges AS
SELECT r.id AS restaurant_id, min(o.price_vnd) AS min_price_vnd, max(o.price_vnd) AS max_price_vnd
FROM restaurants r LEFT JOIN dishes d ON d.restaurant_id = r.id AND d.status = 'available'
LEFT JOIN dish_options o ON o.dish_id = d.id AND o.is_available GROUP BY r.id;

CREATE VIEW current_rating_stats AS
SELECT r.restaurant_id,r.dish_id,avg(v.rating_units)/2.0 AS average_stars,count(*) AS reviewer_count
FROM reviews r JOIN review_versions v ON v.review_id = r.id AND v.version_no = r.current_version_no
JOIN review_version_moderation m ON m.review_id = v.review_id AND m.version_no = v.version_no
WHERE r.deleted_at IS NULL AND r.moderation_state = 'visible' AND m.state = 'eligible'
GROUP BY r.restaurant_id,r.dish_id;

CREATE VIEW monthly_rating_stats AS
SELECT r.restaurant_id,r.dish_id,c.month_start,avg(v.rating_units)/2.0 AS average_stars,count(*) AS reviewer_count
FROM review_monthly_contributions c JOIN reviews r ON r.id = c.review_id
JOIN review_versions v ON v.review_id = c.review_id AND v.version_no = c.version_no
JOIN review_version_moderation m ON m.review_id = v.review_id AND m.version_no = v.version_no
WHERE c.withdrawn_at IS NULL AND r.moderation_state = 'visible' AND m.state = 'eligible'
GROUP BY r.restaurant_id,r.dish_id,c.month_start;

CREATE VIEW restaurant_planned_counts AS
SELECT r.id AS restaurant_id,coalesce(sum(p.party_size),0)::bigint AS planned_people
FROM restaurants r LEFT JOIN visit_plans p ON p.restaurant_id = r.id
  AND p.status = 'planned' AND p.expires_at > statement_timestamp()
GROUP BY r.id;

-- Backend-only by default. Deployment grants are deliberate and separate.
REVOKE ALL ON ALL TABLES IN SCHEMA foodmap FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA foodmap FROM PUBLIC;
COMMENT ON SCHEMA foodmap IS 'HUST FoodMap phase 1. Backend-only; no anonymous DB access.';
COMMENT ON COLUMN review_versions.rating_units IS 'Half-star units: 2=1 star, 10=5 stars.';
COMMENT ON COLUMN review_versions.rating_submitted IS 'Explicit rating activity; content-only edits may set false.';
COMMENT ON COLUMN visit_plans.party_size IS 'Exact user input, 1..20; do not add the creator.';
COMMENT ON TABLE review_monthly_contributions IS 'Rebuildable monthly projection; deleted reviews retain earlier months.';
COMMIT;
