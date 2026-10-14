CREATE TABLE racks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), site text NOT NULL CHECK(trim(site)<>''), name text NOT NULL CHECK(trim(name)<>''),
 units integer CHECK(units BETWEEN 1 AND 100), budget_w integer CHECK(budget_w>0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(site,name)
);
CREATE TABLE assets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), site text NOT NULL, name text NOT NULL CHECK(trim(name)<>''), rack_id uuid REFERENCES racks,
 unit_start integer CHECK(unit_start>0), height integer CHECK(height BETWEEN 1 AND 100), power_w integer CHECK(power_w>=0),
 status text NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','installed','storage','retired')),
 owner text, serial text, make text, model text, audited_on date, warranty_until date, source jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(site,name)
);
CREATE TABLE links (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), a_asset uuid NOT NULL REFERENCES assets, a_port text NOT NULL CHECK(trim(a_port)<>''),
 b_asset uuid NOT NULL REFERENCES assets, b_port text NOT NULL CHECK(trim(b_port)<>''), label text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(a_asset<>b_asset)
);
CREATE TABLE changes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reference text NOT NULL UNIQUE, asset_id uuid NOT NULL REFERENCES assets,
 kind text NOT NULL CHECK(kind IN ('move','install','retire','electrical')), target_rack uuid REFERENCES racks, target_start integer CHECK(target_start>0),
 due date NOT NULL, requester text NOT NULL, approver text, reason text NOT NULL, rollback text NOT NULL,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved','completed','cancelled')), evidence text,
 licensed_worker_ref text, coc_required boolean NOT NULL DEFAULT false, coc_ref text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(kind NOT IN ('move','install') OR (target_rack IS NOT NULL AND target_start IS NOT NULL)),
 CHECK(status NOT IN ('approved','completed') OR (approver IS NOT NULL AND lower(trim(approver))<>lower(trim(requester))))
);
CREATE TABLE followups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), asset_id uuid NOT NULL REFERENCES assets, note text NOT NULL, due date NOT NULL,
 owner text NOT NULL, resolved boolean NOT NULL DEFAULT false, evidence text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE audit_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), asset_id uuid NOT NULL REFERENCES assets, checked_on date NOT NULL, actor text NOT NULL, evidence text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE import_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sha256 text NOT NULL, filename text NOT NULL, row_count integer NOT NULL, actor text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE activity (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), entity text NOT NULL, record_id uuid NOT NULL, operation text NOT NULL, actor text NOT NULL,
 before_data jsonb, after_data jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION touch_and_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' THEN NEW.updated_at=now(); END IF;
 INSERT INTO activity(entity,record_id,operation,actor,before_data,after_data)
 VALUES(TG_TABLE_NAME,NEW.id,TG_OP,coalesce(nullif(current_setting('app.actor',true),''),'database operator'),CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) END,to_jsonb(NEW));
 RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['racks','assets','links','changes','followups','audit_history','import_batches'] LOOP
 EXECUTE format('CREATE TRIGGER record_change BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_and_audit()',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['racks','assets','links','changes','followups','audit_history','import_batches','activity'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON %I FROM PUBLIC',t);
 END LOOP;
END $$;
CREATE FUNCTION validate_link() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM links l WHERE l.id<>NEW.id AND
 ((l.a_asset=NEW.a_asset AND l.a_port=NEW.a_port) OR (l.b_asset=NEW.a_asset AND l.b_port=NEW.a_port)
 OR (l.a_asset=NEW.b_asset AND l.a_port=NEW.b_port) OR (l.b_asset=NEW.b_asset AND l.b_port=NEW.b_port)))
 THEN RAISE EXCEPTION 'Port already connected'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER validate_ports BEFORE INSERT OR UPDATE ON links FOR EACH ROW EXECUTE FUNCTION validate_link();
CREATE VIEW v_inventory AS
 SELECT a.id,a.site,a.name,r.name AS cabinet,a.unit_start,a.height,a.power_w,a.status,a.owner,a.serial,a.audited_on,a.warranty_until
 FROM assets a LEFT JOIN racks r ON a.rack_id=r.id;
CREATE VIEW v_capacity AS
 SELECT r.id,r.site,r.name AS cabinet,r.units,r.budget_w,
 (SELECT count(DISTINCT u)::int FROM assets a CROSS JOIN LATERAL generate_series(a.unit_start,a.unit_start+a.height-1) u
 WHERE a.rack_id=r.id AND a.status IN ('installed','planned') AND u BETWEEN 1 AND r.units) AS occupied_units,
 (SELECT coalesce(sum(power_w),0)::int FROM assets a WHERE a.rack_id=r.id AND a.status IN ('installed','planned')) AS allocated_w,
 (SELECT count(*)::int FROM assets a WHERE a.rack_id=r.id AND a.status IN ('installed','planned') AND (power_w IS NULL OR height IS NULL OR unit_start IS NULL)) AS incomplete_assets
 FROM racks r;
CREATE VIEW v_attention AS
 SELECT a.id,a.site,a.name,'Missing owner' AS issue FROM assets a WHERE a.status<>'retired' AND nullif(trim(a.owner),'') IS NULL
 UNION ALL SELECT a.id,a.site,a.name,'Audit missing or over 90 days old' FROM assets a WHERE a.status='installed' AND (audited_on IS NULL OR audited_on<current_date-90)
 UNION ALL SELECT a.id,a.site,a.name,'Capacity inputs incomplete' FROM assets a LEFT JOIN racks r ON r.id=a.rack_id WHERE a.status IN ('installed','planned') AND (r.id IS NULL OR r.units IS NULL OR r.budget_w IS NULL OR a.unit_start IS NULL OR a.height IS NULL OR a.power_w IS NULL)
 UNION ALL SELECT a.id,a.site,a.name,'Placement outside cabinet' FROM assets a JOIN racks r ON r.id=a.rack_id WHERE a.status IN ('installed','planned') AND a.unit_start+a.height-1>r.units
 UNION ALL SELECT a.id,a.site,a.name,'Overlapping rack allocation' FROM assets a JOIN assets b ON a.rack_id=b.rack_id AND a.id<>b.id AND a.unit_start<=b.unit_start+b.height-1 AND b.unit_start<=a.unit_start+a.height-1 WHERE a.status IN ('installed','planned') AND b.status IN ('installed','planned')
 UNION ALL SELECT a.id,a.site,a.name,'Rack site disagrees with asset site' FROM assets a JOIN racks r ON a.rack_id=r.id WHERE a.site<>r.site
 UNION ALL SELECT id,site,cabinet,'Declared power budget exceeded' FROM v_capacity WHERE allocated_w>budget_w
 UNION ALL SELECT f.id,a.site,a.name,'Overdue follow-up: '||f.note FROM followups f JOIN assets a ON a.id=f.asset_id WHERE NOT f.resolved AND f.due<current_date
 UNION ALL SELECT c.id,a.site,c.reference,'Overdue change: '||c.kind FROM changes c JOIN assets a ON a.id=c.asset_id WHERE c.status IN ('draft','approved') AND c.due<current_date;
CREATE VIEW v_change_review AS
 SELECT c.id,c.reference,a.site,a.name AS asset,c.kind,c.due,c.status,c.requester,c.approver,r.name AS target_cabinet,c.target_start,c.reason,c.rollback,c.licensed_worker_ref,c.coc_required,c.coc_ref,c.evidence
 FROM changes c JOIN assets a ON a.id=c.asset_id LEFT JOIN racks r ON r.id=c.target_rack;
CREATE VIEW v_compliance AS
 SELECT id,site,name,issue,'OPS-01'::text AS rule FROM v_attention
 UNION ALL SELECT c.id,a.site,c.reference,'Electrical work needs practitioner evidence','NZ-ELEC-01' FROM changes c JOIN assets a ON a.id=c.asset_id WHERE c.kind='electrical' AND c.status<>'cancelled' AND nullif(trim(c.licensed_worker_ref),'') IS NULL
 UNION ALL SELECT c.id,a.site,c.reference,'Required electrical certificate reference missing','NZ-ELEC-02' FROM changes c JOIN assets a ON a.id=c.asset_id WHERE c.kind='electrical' AND c.status='completed' AND c.coc_required AND nullif(trim(c.coc_ref),'') IS NULL;
REVOKE ALL ON v_inventory,v_capacity,v_attention,v_change_review,v_compliance FROM PUBLIC;
