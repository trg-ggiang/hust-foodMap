import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from './.validation/node_modules/@electric-sql/pglite/dist/index.js';

// Disposable in-memory PostgreSQL; never reads a DATABASE_URL.
const db = new PGlite();
const sql = await readFile(new URL('./001_phase1.sql', import.meta.url), 'utf8');
let checks = 0;
async function query(sql, args = []) { return (await db.query(sql, args)).rows; }
async function rejects(sql, args = [], code) {
  try { await db.query(sql,args); assert.fail('Expected SQL rejection'); }
  catch (error) { if (code) assert.equal(error.code,code); else assert.ok(error.code); checks++; }
}
async function review(user, target, dish = false, units = 8, timestamp) {
  await db.exec('BEGIN');
  try {
    const [r] = await query(`INSERT INTO foodmap.reviews(user_id,${dish?'dish_id':'restaurant_id'},current_version_no) VALUES ($1,$2,1) RETURNING id`,[user,target]);
    await query(`INSERT INTO foodmap.review_versions(review_id,version_no,rating_units,event_type,created_at)
      VALUES ($1,1,$2,'create',coalesce($3::timestamptz,now()))`,[r.id,units,timestamp??null]);
    await db.exec('COMMIT'); return r.id;
  } catch(error) { await db.exec('ROLLBACK'); throw error; }
}
try {
  await db.exec(sql);
  const tables = await query("SELECT table_name FROM information_schema.tables WHERE table_schema='foodmap' AND table_type='BASE TABLE'");
  assert.equal(tables.length,24); checks++;
  const [owner] = await query("INSERT INTO foodmap.users(email,password_hash,display_name,role,email_verified_at) VALUES ('admin@test.local','test-hash','Admin','owner',now()) RETURNING id");
  const [user] = await query("INSERT INTO foodmap.users(email,password_hash,display_name,email_verified_at) VALUES ('user@test.local','test-hash','User',now()) RETURNING id");
  const [other] = await query("INSERT INTO foodmap.users(email,password_hash,display_name,email_verified_at) VALUES ('other@test.local','test-hash','User',now()) RETURNING id");
  await rejects("INSERT INTO foodmap.users(email,password_hash,display_name) VALUES ('USER@test.local','x','Other')",[],'23505');
  await rejects("INSERT INTO foodmap.users(email,password_hash,display_name,role) VALUES ('owner2@test.local','x','Other','owner')",[],'23505');
  const [asset] = await query("INSERT INTO foodmap.media_assets(uploaded_by,storage_key,mime_type,byte_size,state) VALUES ($1,'test/image.webp','image/webp',100,'ready') RETURNING id",[owner.id]);
  async function venue(name) {
    return (await query(`INSERT INTO foodmap.restaurants(name,address,latitude,longitude,thumbnail_asset_id,opening_time,closing_time,visit_duration_minutes,created_by,updated_by)
      VALUES ($1,'Hanoi',21,105,$2,'00:00','23:59:59',45,$3,$3) RETURNING id`,[name,asset.id,owner.id]))[0];
  }
  const a = await venue('A'), b = await venue('B');
  const [dish] = await query("INSERT INTO foodmap.dishes(restaurant_id,name,image_asset_id) VALUES ($1,'Pho',$2) RETURNING id",[a.id,asset.id]);
  await query("INSERT INTO foodmap.dish_options(dish_id,name,price_vnd) VALUES ($1,'Small',30000),($1,'Large',50000)",[dish.id]);
  let [prices] = await query('SELECT * FROM foodmap.restaurant_price_ranges WHERE restaurant_id=$1',[a.id]);
  assert.equal(Number(prices.min_price_vnd),30000); assert.equal(Number(prices.max_price_vnd),50000); checks++;
  await query("UPDATE foodmap.dish_options SET is_available=false WHERE dish_id=$1 AND name='Small'",[dish.id]);
  [prices] = await query('SELECT * FROM foodmap.restaurant_price_ranges WHERE restaurant_id=$1',[a.id]);
  assert.equal(Number(prices.min_price_vnd),50000); checks++;
  const [empty] = await query('SELECT * FROM foodmap.restaurant_price_ranges WHERE restaurant_id=$1',[b.id]);
  assert.equal(empty.min_price_vnd,null); checks++;
  const [fav] = await query('INSERT INTO foodmap.favorite_restaurants(user_id,restaurant_id) VALUES ($1,$2) RETURNING id,is_public',[user.id,b.id]);
  assert.equal(fav.is_public,false); checks++;
  await rejects('INSERT INTO foodmap.favorite_dishes(favorite_id,restaurant_id,dish_id) VALUES ($1,$2,$3)',[fav.id,b.id,dish.id],'23503');

  const [months] = await query(`SELECT to_char(date_trunc('month',now() AT TIME ZONE 'Asia/Saigon'),'YYYY-MM-DD') AS current_month,
    to_char(date_trunc('month',now() AT TIME ZONE 'Asia/Saigon')-interval '1 month','YYYY-MM-DD') AS previous_month`);
  const reviewId = await review(user.id,a.id,false,8,months.previous_month+'T05:00:00+07:00');
  await query("INSERT INTO foodmap.review_versions(review_id,version_no,rating_units,event_type) VALUES ($1,2,6,'edit')",[reviewId]);
  await query('UPDATE foodmap.reviews SET current_version_no=2 WHERE id=$1',[reviewId]);
  await query("INSERT INTO foodmap.review_versions(review_id,version_no,rating_units,event_type) VALUES ($1,3,7,'edit')",[reviewId]);
  await query('UPDATE foodmap.reviews SET current_version_no=3 WHERE id=$1',[reviewId]);
  let stats = await query('SELECT * FROM foodmap.monthly_rating_stats WHERE restaurant_id=$1 ORDER BY month_start',[a.id]);
  assert.equal(stats.length,2); assert.equal(Number(stats[0].average_stars),4);
  assert.equal(Number(stats[1].average_stars),3.5); assert.equal(Number(stats[1].reviewer_count),1); checks++;
  const dishReviewId = await review(user.id,dish.id,true,9);
  const [ds] = await query('SELECT * FROM foodmap.current_rating_stats WHERE dish_id=$1',[dish.id]);
  assert.equal(Number(ds.average_stars),4.5); checks++;
  await rejects('INSERT INTO foodmap.review_versions(review_id,version_no,rating_units,event_type) VALUES ($1,4,11,\'edit\')',[reviewId],'23514');
  await rejects('UPDATE foodmap.review_versions SET rating_units=10 WHERE review_id=$1 AND version_no=1',[reviewId],'55000');
  await rejects('INSERT INTO foodmap.reviews(user_id,restaurant_id,dish_id,current_version_no) VALUES ($1,$2,$3,1)',[other.id,a.id,dish.id],'23514');
  await rejects('INSERT INTO foodmap.reviews(user_id,restaurant_id,current_version_no) VALUES ($1,$2,1)',[user.id,a.id],'23505');
  await rejects('UPDATE foodmap.reviews SET current_version_no=999 WHERE id=$1',[reviewId],'23503');
  await rejects('UPDATE foodmap.reviews SET user_id=$2 WHERE id=$1',[reviewId,other.id],'23514');
  await rejects("INSERT INTO foodmap.review_versions(review_id,version_no,rating_units,event_type) VALUES ($1,5,8,'edit')",[reviewId],'23514');
  await rejects("INSERT INTO foodmap.review_versions(review_id,version_no,rating_units,event_type,rating_submitted) VALUES ($1,4,8,'edit',false)",[reviewId],'23514');
  await rejects("INSERT INTO foodmap.review_monthly_contributions(review_id,month_start,version_no) VALUES ($1,'2000-01-01',1)",[reviewId],'23514');
  await rejects('INSERT INTO foodmap.review_version_images(review_id,version_no,asset_id,position) VALUES ($1,3,$2,0)',[reviewId,asset.id],'55000');
  await db.exec('BEGIN');
  await query("INSERT INTO foodmap.review_versions(review_id,version_no,rating_units,event_type,rating_submitted) VALUES ($1,4,7,'edit',false)",[reviewId]);
  await query('INSERT INTO foodmap.review_version_images(review_id,version_no,asset_id,position) VALUES ($1,4,$2,0)',[reviewId,asset.id]);
  await query('UPDATE foodmap.reviews SET current_version_no=4 WHERE id=$1',[reviewId]);
  await db.exec('COMMIT');
  assert.equal((await query('SELECT version_no FROM foodmap.review_monthly_contributions WHERE review_id=$1 ORDER BY month_start DESC',[reviewId]))[0].version_no,3); checks++;
  await rejects('DELETE FROM foodmap.review_version_images WHERE review_id=$1',[reviewId],'55000');

  await query('UPDATE foodmap.reviews SET deleted_at=now() WHERE id=$1',[reviewId]);
  assert.equal((await query('SELECT * FROM foodmap.current_rating_stats WHERE restaurant_id=$1',[a.id])).length,0);
  assert.equal((await query('SELECT * FROM foodmap.monthly_rating_stats WHERE restaurant_id=$1',[a.id])).length,2); checks++;
  await query("UPDATE foodmap.reviews SET moderation_state='hidden',hidden_at=now(),hidden_by=$2,hidden_reason='spam' WHERE id=$1",[reviewId,owner.id]);
  assert.equal((await query('SELECT * FROM foodmap.monthly_rating_stats WHERE restaurant_id=$1',[a.id])).length,0); checks++;
  await query("UPDATE foodmap.reviews SET moderation_state='visible',hidden_at=null,hidden_by=null,hidden_reason=null WHERE id=$1",[reviewId]);
  await query("UPDATE foodmap.review_version_moderation SET state='excluded',reason='spam',moderated_by=$2,moderated_at=now() WHERE review_id=$1 AND version_no=3",[reviewId,owner.id]);
  assert.equal((await query('SELECT * FROM foodmap.monthly_rating_stats WHERE restaurant_id=$1',[a.id])).length,1); checks++;
  await query("INSERT INTO foodmap.review_reconsideration_requests(review_id,version_no,requested_by) VALUES ($1,3,$2)",[reviewId,user.id]);
  await rejects("INSERT INTO foodmap.review_reconsideration_requests(review_id,version_no,requested_by) VALUES ($1,1,$2)",[dishReviewId,other.id],'23503');

  const [report] = await query("INSERT INTO foodmap.content_reports(reporter_id,review_id,reason_code) VALUES ($1,$2,'spam') RETURNING id",[other.id,reviewId]);
  await rejects("INSERT INTO foodmap.content_reports(reporter_id,review_id,reason_code) VALUES ($1,$2,'spam')",[other.id,reviewId],'23505');
  await rejects("INSERT INTO foodmap.moderation_actions(actor_id,review_id,report_id,action,reason) VALUES ($1,$2,$3,'hide','spam')",[owner.id,dishReviewId,report.id],'23514');

  async function plan(userId, restaurantId, size) {
    return (await query(`INSERT INTO foodmap.visit_plans(user_id,restaurant_id,party_size,arrival_at)
      VALUES ($1,$2,$3,statement_timestamp()+interval '2 minutes') RETURNING *`,[userId,restaurantId,size]))[0];
  }
  const first = await plan(user.id,a.id,3); const second = await plan(other.id,a.id,2);
  assert.equal(first.duration_minutes_snapshot,45); checks++;
  const [people] = await query('SELECT * FROM foodmap.restaurant_planned_counts WHERE restaurant_id=$1',[a.id]);
  assert.equal(Number(people.planned_people),5); checks++;
  await rejects(`INSERT INTO foodmap.visit_plans(user_id,restaurant_id,arrival_at) VALUES ($1,$2,statement_timestamp()+interval '5 minutes')`,[user.id,b.id],'23505');
  await rejects(`UPDATE foodmap.visit_plans SET party_size=21 WHERE id=$1`,[first.id],'23514');
  await rejects(`UPDATE foodmap.visit_plans SET arrival_at=statement_timestamp()-interval '1 minute' WHERE id=$1`,[first.id],'23514');
  await rejects(`UPDATE foodmap.visit_plans SET arrival_at=statement_timestamp()+interval '1 day' WHERE id=$1`,[first.id],'23514');
  await query('UPDATE foodmap.restaurants SET visit_duration_minutes=90 WHERE id=$1',[a.id]);
  await query('UPDATE foodmap.visit_plans SET party_size=4 WHERE id=$1',[first.id]);
  const [snapshot] = await query('SELECT duration_minutes_snapshot FROM foodmap.visit_plans WHERE id=$1',[first.id]);
  assert.equal(snapshot.duration_minutes_snapshot,45); checks++;
  await query("UPDATE foodmap.restaurants SET status='inactive',updated_by=$2 WHERE id=$1",[a.id,owner.id]);
  const cancelled = await query('SELECT status FROM foodmap.visit_plans WHERE id IN ($1,$2)',[first.id,second.id]);
  assert.ok(cancelled.every(p=>p.status==='cancelled'));
  assert.equal((await query("SELECT * FROM foodmap.notifications WHERE kind='plan_cancelled'")).length,2);
  assert.equal(Number((await query('SELECT planned_people FROM foodmap.restaurant_planned_counts WHERE restaurant_id=$1',[a.id]))[0].planned_people),0); checks++;
  await rejects(`INSERT INTO foodmap.visit_plans(user_id,restaurant_id,arrival_at) VALUES ($1,$2,statement_timestamp()+interval '5 minutes')`,[user.id,a.id],'23514');
  const [unverified] = await query("INSERT INTO foodmap.users(email,password_hash,display_name) VALUES ('unverified@test.local','x','New') RETURNING id");
  await rejects(`INSERT INTO foodmap.visit_plans(user_id,restaurant_id,arrival_at) VALUES ($1,$2,statement_timestamp()+interval '2 minutes')`,[unverified.id,b.id],'23514');
  // Narrow remaining opening time to verify the closing-time cap.
  await query("UPDATE foodmap.restaurants SET closing_time=(statement_timestamp() AT TIME ZONE 'Asia/Saigon' + interval '10 minutes')::time WHERE id=$1",[b.id]);
  const capped=await plan(user.id,b.id,1);
  assert.equal(capped.expires_at.getTime(),capped.closing_at_snapshot.getTime()); checks++;
  await rejects('DELETE FROM foodmap.dishes WHERE id=$1',[dish.id],'23001');

  // No public DB privileges are granted by the migration.
  const privileges = await query("SELECT has_schema_privilege('public','foodmap','USAGE') AS allowed");
  assert.equal(privileges[0].allowed,false); checks++;
  console.log(`PASS: ${tables.length} tables; ${checks} behavioral checks; disposable PostgreSQL only.`);
} catch(error) {
  console.error('Schema validation failed:', error.message, error.code ?? '', error.query ?? '');
  process.exitCode=1;
} finally { await db.close(); }
