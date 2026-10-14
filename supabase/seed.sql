INSERT INTO racks(id,site,name,units,budget_w) VALUES
 ('10000000-0000-0000-0000-000000000001','Auckland','AKL-A01',42,4000),
 ('10000000-0000-0000-0000-000000000002','Auckland','AKL-A02',42,6000),
 ('10000000-0000-0000-0000-000000000003','Wellington','WLG-B01',42,3000) ON CONFLICT DO NOTHING;
INSERT INTO assets(id,site,name,rack_id,unit_start,height,power_w,status,owner,serial,audited_on,warranty_until) VALUES
 ('20000000-0000-0000-0000-000000000001','Auckland','AKL-DB01','10000000-0000-0000-0000-000000000001',1,4,1800,'installed','Harbour Hosting','DEMO-DB01',current_date-120,current_date+25),
 ('20000000-0000-0000-0000-000000000002','Auckland','AKL-SW01','10000000-0000-0000-0000-000000000001',10,1,250,'installed','Harbour Hosting','DEMO-SW01',current_date-10,current_date+365),
 ('20000000-0000-0000-0000-000000000003','Auckland','AKL-BACKUP','10000000-0000-0000-0000-000000000002',1,4,2000,'planned','Tui Services','DEMO-BK01',NULL,current_date+60),
 ('20000000-0000-0000-0000-000000000004','Wellington','WLG-EDGE','10000000-0000-0000-0000-000000000003',1,2,3200,'installed',NULL,'DEMO-EDGE',current_date-150,current_date-5),
 ('20000000-0000-0000-0000-000000000005','Wellington','WLG-SPARE',NULL,NULL,2,NULL,'storage','Harbour Hosting','DEMO-SPARE',NULL,NULL) ON CONFLICT DO NOTHING;
INSERT INTO links(id,a_asset,a_port,b_asset,b_port,label) VALUES
 ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','eth0','20000000-0000-0000-0000-000000000002','Gi1/1','DEMO-CABLE-01') ON CONFLICT DO NOTHING;
INSERT INTO changes(id,reference,asset_id,kind,target_rack,target_start,due,requester,reason,rollback) VALUES
 ('40000000-0000-0000-0000-000000000001','CHG-101','20000000-0000-0000-0000-000000000001','move','10000000-0000-0000-0000-000000000002',10,current_date+3,'Aroha','Separate backup and production allocation','Return to AKL-A01 U1 after operator review'),
 ('40000000-0000-0000-0000-000000000002','CHG-102','20000000-0000-0000-0000-000000000004','electrical',NULL,NULL,current_date-4,'Ben','Review declared load with licensed worker','Do not proceed without the site work plan') ON CONFLICT DO NOTHING;
INSERT INTO followups(id,asset_id,note,due,owner) VALUES
 ('50000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Verify serial and rack position',current_date-2,'Aroha'),
 ('50000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000004','Assign business owner',current_date+1,'Ben') ON CONFLICT DO NOTHING;
