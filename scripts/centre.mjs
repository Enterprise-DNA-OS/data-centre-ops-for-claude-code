#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { parseCsv,pick } from './lib/csv.mjs';
import { table } from './lib/format.mjs';

export const reads={
 inventory:'select * from v_inventory order by site,name',
 racks:'select *,units-occupied_units as free_units,budget_w-allocated_w as headroom_w from v_capacity order by site,cabinet',
 'audit-due':"select site,name,cabinet,audited_on from v_inventory where status='installed' and (audited_on is null or audited_on<current_date-90) order by site,name",
 'warranty-review':"select site,name,serial,warranty_until from assets where status<>'retired' and (warranty_until is null or warranty_until<=current_date+60) order by warranty_until nulls first,site,name",
 'change-window':"select reference,site,asset,kind,due,status,target_cabinet from v_change_review where status in ('draft','approved') order by due,reference",
 attention:'select site,name,issue from v_attention order by site,name,issue',
 compliance:'select site,name,issue,rule from v_compliance order by rule,site,name',
 followups:"select f.id,a.name,f.note,f.owner,f.due,f.resolved from followups f join assets a on a.id=f.asset_id order by due,f.id",
 connections:'select l.id,a.name as from_asset,l.a_port,b.name as to_asset,l.b_port,l.label from links l join assets a on a.id=l.a_asset join assets b on b.id=l.b_asset order by a.name,l.a_port',
 'owner-review':"select site,coalesce(nullif(owner,''),'Unassigned') as owner,count(*)::int as assets,coalesce(sum(power_w),0)::int as known_allocated_w,count(*) filter(where power_w is null)::int as unknown_power from assets where status in ('installed','planned') group by site,owner order by site,owner",
 activity:'select entity,record_id,operation,actor,created_at from activity order by created_at desc,id limit 100',
};
export const commands=[...Object.keys(reads),'help','show','capacity','impact','weekly-review','add-rack','set-rack','add','update','audit','connect','plan-change','approve-change','complete-change','cancel-change','log','resolve','import','export','draft-work-order','draft-review'];
const allowedFlags=new Set(['json','ref','rack','site','name','units','budget-w','height','start','power-w','owner','serial','make','model','status','warranty','date','evidence','actor','a','a-port','b','b-port','label','reference','kind','due','reason','rollback','licensed-worker','coc-required','coc','note','file','dry-run','update','out']);
function parse(args) { const o={},pos=[]; for(const arg of args) { if(!arg.startsWith('--'))pos.push(arg); else {const i=arg.indexOf('=');const key=arg.slice(2,i<0?undefined:i); if(!allowedFlags.has(key))throw Error(`Unknown flag --${key}`); o[key]=i<0?true:arg.slice(i+1);}} return {o,pos}; }
function need(o,k) { if(typeof o[k]!=='string'||!o[k].trim()) throw Error(`Required --${k}=value`); return o[k].trim(); }
function integer(v,label,min=0,max=100000000) { if(!/^\d+$/.test(String(v))||!Number.isSafeInteger(Number(v))||Number(v)<min||Number(v)>max)throw Error(`Invalid ${label}`); return Number(v); }
function date(v,label) {if(!/^\d{4}-\d{2}-\d{2}$/.test(String(v))||Number.isNaN(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error(`Invalid ${label}: use YYYY-MM-DD`);return v;}
const nullable=(v,fn)=>v===''||v==null?null:fn(v);
const today=()=>new Date().toISOString().slice(0,10);
async function find(db,entity,ref) {
 const names={assets:"site||'/'||name",racks:"site||'/'||name",changes:'reference',followups:'note'};
 const expr=names[entity]; if(!expr||!ref)throw Error('A record reference is required');
 const rows=await db.query(`select *,${expr} as match_name from ${entity} where lower(${expr})=lower($1) or lower(${expr}) like '%'||lower($1)||'%' or id::text like lower($1)||'%' order by ${expr}`,[ref]);
 const exact=rows.filter(x=>x.match_name.toLowerCase()===ref.toLowerCase()||x.id===ref.toLowerCase()); const matches=exact.length?exact:rows;
 if(matches.length!==1)throw Error(matches.length?`Ambiguous ${entity}: ${matches.map(x=>`${x.id} ${x.match_name}`).join('; ')}`:`No ${entity} match: ${ref}`); return matches[0];
}
async function transaction(db,actor,fn,dry=false) {
 await db.exec('BEGIN'); try { await db.query("select set_config('app.actor',$1,true)",[actor]);
 // Serialize operator mutations, including import and cross-endpoint port validation.
 await db.exec('LOCK TABLE racks,assets,links,changes,followups,audit_history,import_batches IN SHARE ROW EXCLUSIVE MODE');
 const result=await fn();await db.exec(dry?'ROLLBACK':'COMMIT');return result;
 } catch(e){await db.exec('ROLLBACK');throw e;}
}
async function placement(db,rackId,height,power,start,exclude=null) {
 const [r]=await db.query('select * from racks where id=$1',[rackId]);
 const assets=await db.query("select * from assets where rack_id=$1 and status in ('installed','planned') and ($2::uuid is null or id<>$2)",[rackId,exclude]);
 const reasons=[]; if(!r||r.units==null||r.budget_w==null)reasons.push('Cabinet dimensions or power budget missing');
 if(height==null||power==null)reasons.push('Device dimensions or power allocation missing');
 if(assets.some(a=>a.unit_start==null||a.height==null||a.power_w==null))reasons.push('Existing cabinet records incomplete');
 if(r?.units && assets.some(a=>a.unit_start+a.height-1>r.units || assets.some(b=>b.id!==a.id&&a.unit_start<=b.unit_start+b.height-1&&b.unit_start<=a.unit_start+a.height-1)))reasons.push('Existing placement conflicts need review');
 const used=assets.reduce((n,a)=>n+(a.power_w||0),0); const free=[];
 if(!reasons.length) {for(let u=1;u<=r.units-height+1;u++)if(!assets.some(a=>u<=a.unit_start+a.height-1&&a.unit_start<=u+height-1))free.push(u);
 if(used+power>r.budget_w)reasons.push('Declared power budget exceeded');
 if(start!=null&&!free.includes(start))reasons.push('Position overlaps or is outside cabinet');
 if(!free.length)reasons.push('No contiguous space');}
 return {site:r?.site,cabinet:r?.name,eligible:reasons.length===0,free_starts:free,headroom_w:r?.budget_w==null?null:r.budget_w-used,reason:reasons.join('; ')||'Declared records fit; verify site conditions'};
}
async function assetFields(o,existing={}) {
 const out={...existing};
 const fields={name:'name',owner:'owner',serial:'serial',make:'make',model:'model'};
 for(const [k,col] of Object.entries(fields))if(o[k]!==undefined)out[col]=need(o,k);
 for(const [k,col,min,max] of [['height','height',1,100],['start','unit_start',1,100],['power-w','power_w',0,100000000]])if(o[k]!==undefined)out[col]=integer(o[k],k,min,max);
 if(o.status!==undefined){if(!['planned','installed','storage','retired'].includes(o.status))throw Error('Invalid status');out.status=o.status;}
 if(o.warranty!==undefined)out.warranty_until=date(o.warranty,'warranty'); return out;
}
async function importDctrack(db,o) {
 const file=need(o,'file'),raw=fs.readFileSync(file,'utf8'),rows=parseCsv(raw);
 if(!rows.length)throw Error('CSV has no records');
 let inserted=0,unchanged=0,updated=0;
 const seen=new Set();
 for(const row of [...rows].sort((a,b)=>Number(/^cabinet$/i.test(pick(b,'Class','Item Class')))-Number(/^cabinet$/i.test(pick(a,'Class','Item Class'))))) {
 const site=pick(row,'Location','Site'),name=pick(row,'Item Name','Name');
 if(!site.trim()||!name.trim())throw Error('Each CSV record needs Location and Item Name (or Name)');
 const key=site+'\u0000'+name;if(seen.has(key.toLowerCase()))throw Error(`Duplicate record ${site}/${name}`);seen.add(key.toLowerCase());
 const cabinet=pick(row,'Cabinet'),klass=pick(row,'Class','Item Class');
 if(/^cabinet$/i.test(klass)) {
 const units=nullable(pick(row,'RU Height','Height (U)','RUHeight'),v=>integer(v,'cabinet height',1,100));
 const [r]=await db.query('select * from racks where site=$1 and name=$2',[site,name]);
 if(!r){await db.query('insert into racks(site,name,units) values($1,$2,$3)',[site,name,units]);inserted++;}
 else if(units!=null&&r.units!==units){if(!o.update)throw Error(`Cabinet changed: ${name}; use --update`);await db.query('update racks set units=$1 where id=$2',[units,r.id]);updated++;} else unchanged++;
 continue;
 }
 const originalStatus=pick(row,'Status','Item Status');
 const statuses={'installed':'installed','planned':'planned','storage':'storage','in storage':'storage','archived':'retired','retired':'retired'};
 const status=statuses[originalStatus.toLowerCase()];if(!status)throw Error(`Unsupported or missing Status '${originalStatus}' for ${name}`);
 let rackId=null;
 if(cabinet){const [r]=await db.query('insert into racks(site,name) values($1,$2) on conflict(site,name) do update set name=excluded.name returning id',[site,cabinet]);rackId=r.id;}
 const record={site,name,rack_id:rackId,unit_start:nullable(pick(row,'U Position','UPosition','RU Position'),v=>integer(v,'U Position',1,100)),height:nullable(pick(row,'RU Height','RUHeight','Height (U)'),v=>integer(v,'RU Height',1,100)),power_w:nullable(pick(row,'Power Budget (W)','Power Allocation (W)'),v=>integer(v,'power allocation')),status,owner:pick(row,'Owner','Customer')||null,serial:pick(row,'Serial Number','SerialNumber')||null,make:pick(row,'Make')||null,model:pick(row,'Model')||null,source:row};
 const [old]=await db.query('select * from assets where site=$1 and name=$2',[site,name]);
 const same=old&&Object.entries(record).every(([k,v])=>k==='source'?JSON.stringify(Object.entries(old[k]).sort())===JSON.stringify(Object.entries(v).sort()):old[k]===v);
 if(same){unchanged++;continue;}
 if(old&&!o.update)throw Error(`Existing record changed: ${site}/${name}; use --update after reviewing`);
 const keys=Object.keys(record),values=Object.values(record).map(v=>v&&typeof v==='object'?JSON.stringify(v):v);
 if(old){await db.query(`update assets set ${keys.map((k,i)=>`${k}=$${i+1}`).join(',')} where id=$${keys.length+1}`,[...values,old.id]);updated++;}
 else {await db.query(`insert into assets(${keys.join(',')}) values(${keys.map((_,i)=>`$${i+1}`).join(',')})`,values);inserted++;}
 }
 await db.query('insert into import_batches(sha256,filename,row_count,actor,source_rows) values($1,$2,$3,$4,$5)',[createHash('sha256').update(raw).digest('hex'),path.basename(file),rows.length,need(o,'actor'),JSON.stringify(rows)]);
 return {rows:rows.length,inserted,updated,unchanged,dry_run:Boolean(o['dry-run'])};
}
export async function run(db,args) {
 const {o,pos}=parse(args),cmd=pos[0]||'help';
 if(!commands.includes(cmd))throw Error(`Unknown command ${cmd}. Run help.`);
 if(reads[cmd])return db.query(reads[cmd]);
 if(cmd==='help')return commands.map(command=>({command}));
 if(cmd==='show') {const a=await find(db,'assets',need(o,'ref'));return {asset:a,links:await db.query('select * from links where a_asset=$1 or b_asset=$1',[a.id]),changes:await db.query('select * from changes where asset_id=$1 order by due',[a.id]),audits:await db.query('select * from audit_history where asset_id=$1 order by checked_on desc',[a.id])};}
 if(cmd==='capacity') {const h=integer(need(o,'height'),'height',1,100),w=integer(need(o,'power-w'),'power-w');const racks=o.rack?[await find(db,'racks',o.rack)]:await db.query('select * from racks order by site,name');const out=[];for(const r of racks)out.push(await placement(db,r.id,h,w,o.start?integer(o.start,'start',1,100):null));return out;}
 if(cmd==='impact'){const a=await find(db,'assets',need(o,'ref'));return db.query('select x.site,x.name,x.owner,l.label from links l join assets x on x.id=case when l.a_asset=$1 then l.b_asset else l.a_asset end where l.a_asset=$1 or l.b_asset=$1 order by x.name',[a.id]);}
 if(cmd==='weekly-review'||cmd==='draft-review') {const report={capacity:await run(db,['racks']),attention:await run(db,['attention']),changes:await run(db,['change-window'])};if(cmd==='weekly-review')return report;return draft('weekly-review',report,o);}
 if(cmd==='draft-work-order'){const c=await find(db,'changes',need(o,'ref'));const [record]=await db.query('select * from v_change_review where id=$1',[c.id]);return draft(`work-order-${c.id}`,{notice:'DRAFT. Review site procedure and approvals before work.',record},o);}
 if(cmd==='export') {const out={format:'data-centre-ops-v1',exported_at:new Date().toISOString(),records:{}};for(const t of ['racks','assets','links','changes','followups','audit_history','import_batches','activity'])out.records[t]=await db.query(`select * from ${t} order by id`);if(o.out){fs.mkdirSync(path.dirname(path.resolve(o.out)),{recursive:true});fs.writeFileSync(o.out,JSON.stringify(out,null,2)+'\n');return {file:path.resolve(o.out),tables:Object.keys(out.records).length};}return out;}
 const actor=need(o,'actor');
 return transaction(db,actor,async()=>{
 if(cmd==='add-rack') {const site=need(o,'site'),name=need(o,'name');const [r]=await db.query('insert into racks(site,name,units,budget_w) values($1,$2,$3,$4) returning *',[site,name,integer(need(o,'units'),'units',1,100),integer(need(o,'budget-w'),'budget-w',1)]);return r;}
 if(cmd==='set-rack'){need(o,'evidence');const r=await find(db,'racks',need(o,'ref'));const [row]=await db.query('update racks set units=$1,budget_w=$2 where id=$3 returning *',[o.units?integer(o.units,'units',1,100):r.units,o['budget-w']?integer(o['budget-w'],'budget-w',1):r.budget_w,r.id]);await logEvidence(db,row.id,actor,o.evidence);return row;}
 if(cmd==='add'||cmd==='update') {
 const old=cmd==='update'?await find(db,'assets',need(o,'ref')):null;
 const a=await assetFields(o,old||{site:need(o,'site'),name:need(o,'name'),status:'planned'});
 if(old)need(o,'evidence');
 if(o.rack){const r=await find(db,'racks',o.rack);if(r.site!==a.site)throw Error('Asset and cabinet must be at the same site');a.rack_id=r.id;}
 if(a.status==='installed'||a.status==='planned') {if(!a.rack_id)throw Error('Cabinet required');const p=await placement(db,a.rack_id,a.height,a.power_w,a.unit_start,old?.id);if(a.unit_start==null||!p.eligible)throw Error(`Placement blocked: ${p.reason}`);}
 const keys=['site','name','rack_id','unit_start','height','power_w','status','owner','serial','make','model','warranty_until'],values=keys.map(k=>a[k]??null);
 const [row]=old?await db.query(`update assets set ${keys.map((k,i)=>`${k}=$${i+1}`).join(',')} where id=$${keys.length+1} returning *`,[...values,old.id]):await db.query(`insert into assets(${keys.join(',')}) values(${keys.map((_,i)=>`$${i+1}`).join(',')}) returning *`,values);
 if(old)await logEvidence(db,row.id,actor,o.evidence);return row;
 }
 if(cmd==='audit'){const a=await find(db,'assets',need(o,'ref')),day=date(need(o,'date'),'date');if(day>today())throw Error('Audit date cannot be in the future');await db.query('insert into audit_history(asset_id,checked_on,actor,evidence) values($1,$2,$3,$4)',[a.id,day,actor,need(o,'evidence')]);const [r]=await db.query('update assets set audited_on=greatest(audited_on,$1::date) where id=$2 returning *',[day,a.id]);return r;}
 if(cmd==='connect'){const a=await find(db,'assets',need(o,'a')),b=await find(db,'assets',need(o,'b'));const [r]=await db.query('insert into links(a_asset,a_port,b_asset,b_port,label) values($1,$2,$3,$4,$5) returning *',[a.id,need(o,'a-port'),b.id,need(o,'b-port'),need(o,'label')]);return r;}
 if(cmd==='plan-change') {const a=await find(db,'assets',need(o,'ref')),kind=need(o,'kind');if(!['move','install','retire','electrical'].includes(kind))throw Error('Invalid change kind');const r=o.rack?await find(db,'racks',o.rack):null;if(r&&r.site!==a.site)throw Error('Cross-site changes need a separate transport and site review');const start=o.start?integer(o.start,'start',1,100):null;
 if(['move','install'].includes(kind)){if(!r||!start)throw Error('Move/install needs --rack and --start');const p=await placement(db,r.id,a.height,a.power_w,start,a.id);if(!p.eligible)throw Error(p.reason);}
 const [c]=await db.query('insert into changes(reference,asset_id,kind,target_rack,target_start,due,requester,reason,rollback,licensed_worker_ref,coc_required) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *',[need(o,'reference'),a.id,kind,r?.id||null,start,date(need(o,'due'),'due'),actor,need(o,'reason'),need(o,'rollback'),o['licensed-worker']||null,Boolean(o['coc-required'])]);return c;}
 if(['approve-change','complete-change','cancel-change'].includes(cmd)) {
 const c=await find(db,'changes',need(o,'ref'));const evidence=need(o,'evidence');
 if(cmd==='approve-change'){if(c.status!=='draft')throw Error('Only draft changes can be approved');if(actor.toLowerCase()===c.requester.trim().toLowerCase())throw Error('Requester cannot approve own change');if(c.kind==='electrical'&&!c.licensed_worker_ref)throw Error('Electrical change requires practitioner evidence at planning');const [r]=await db.query("update changes set status='approved',approver=$1,evidence=$2 where id=$3 returning *",[actor,evidence,c.id]);return r;}
 if(cmd==='cancel-change'){if(!['draft','approved'].includes(c.status))throw Error('Only open changes can be cancelled');const [r]=await db.query("update changes set status='cancelled',evidence=$1 where id=$2 returning *",[evidence,c.id]);return r;}
 if(c.status!=='approved')throw Error('Only approved changes can be completed');
 if(c.kind==='electrical'&&c.coc_required&&!o.coc)throw Error('Certificate reference required');
 const [a]=await db.query('select * from assets where id=$1',[c.asset_id]);
 if(['move','install'].includes(c.kind)){const p=await placement(db,c.target_rack,a.height,a.power_w,c.target_start,a.id);if(!p.eligible)throw Error(`Recheck failed: ${p.reason}`);await db.query("update assets set rack_id=$1,unit_start=$2,status='installed' where id=$3",[c.target_rack,c.target_start,a.id]);}
 if(c.kind==='retire')await db.query("update assets set status='retired',rack_id=null,unit_start=null where id=$1",[a.id]);
 const [r]=await db.query("update changes set status='completed',evidence=$1,coc_ref=$2 where id=$3 returning *",[evidence,o.coc||null,c.id]);return r;
 }
 if(cmd==='log'){const a=await find(db,'assets',need(o,'ref'));const [r]=await db.query('insert into followups(asset_id,note,due,owner) values($1,$2,$3,$4) returning *',[a.id,need(o,'note'),date(need(o,'due'),'due'),o.owner||actor]);return r;}
 if(cmd==='resolve'){const f=await find(db,'followups',need(o,'ref'));if(f.resolved)throw Error('Follow-up already resolved');const [r]=await db.query('update followups set resolved=true,evidence=$1 where id=$2 returning *',[need(o,'evidence'),f.id]);return r;}
 if(cmd==='import'){if(pos[1]!=='sunbird-dctrack')throw Error('Use import sunbird-dctrack');return importDctrack(db,o);}
 throw Error(`Unhandled command ${cmd}`);
 },Boolean(o['dry-run']));
}
async function logEvidence(db,id,actor,evidence){await db.query("insert into activity(entity,record_id,operation,actor,after_data) values('operator-evidence',$1,'NOTE',$2,$3)",[id,actor,JSON.stringify({evidence})]);}
function draft(name,content,o){const dir=path.join(process.env.OUTPUT_DIR||REPO_ROOT,'drafts');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,`${name}-${Date.now()}.md`);fs.writeFileSync(file,`# DRAFT: ${name}\n\n${JSON.stringify(content,null,2)}\n`);return {file,notice:'Draft saved. Nothing sent.'};}
export function human(result){if(Array.isArray(result)){if(!result.length)return '(none)';return table(result.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,Array.isArray(v)?v.join(', '):v]))),Object.keys(result[0]).filter(k=>!['id','created_at','updated_at','source'].includes(k)).map(key=>({key,label:key,width:65})));}return Object.entries(result).map(([k,v])=>Array.isArray(v)?`\n${k.toUpperCase()}\n${human(v)}`:typeof v==='object'&&v!==null?`${k}: ${JSON.stringify(v)}`:`${k}: ${v}`).join('\n');}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{db=await getDb();const result=await run(db,process.argv.slice(2));console.log(process.argv.includes('--json')?JSON.stringify(result,null,2):human(result));}catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}}
