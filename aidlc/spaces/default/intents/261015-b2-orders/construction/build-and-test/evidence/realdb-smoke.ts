// Build-and-Test real-Postgres smoke for B2 order paths (run as app_role member).
import postgres from "postgres";
import { createOrder, updateOrder, transitionStatus, getOrder, listOrders } from "/Users/bs1071/Downloads/Temp/E2E/SmartBiz/src/orders/index.ts";
import { linkConsignment } from "/Users/bs1071/Downloads/Temp/E2E/SmartBiz/src/orders/consignment.ts";
const sql = postgres(process.argv[2]!, { max: 2, prepare: false });
const A = { businessId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", actorUserId: "11111111-1111-4111-8111-111111111111", role: "owner" } as any;
const B = { businessId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", actorUserId: "22222222-2222-4222-8222-222222222222", role: "owner" } as any;
const out: Record<string, unknown> = {};
const item = { variantId: null, description: "কালো কুর্তি", quantity: 2, unitPricePaise: 125000, lineDiscountPaise: 5000 };
const c = await createOrder(sql, A, { source: "manual", customerId: null, contact: { name: "রিনা", phone: "01711111111", address: null, extra: "x" } as any, repeatOfOrderId: null, items: [item, { ...item, description: "ওড়না", quantity: 1 }], orderDiscountPaise: 10000, deliveryChargePaise: 6000 });
out.create = c.ok ? { orderNo: c.value.orderNo, total: c.value.totalPaise } : c.error;
if (!c.ok) throw new Error("create failed");
const id = c.value.id;
const stored = await sql`SELECT contact FROM orders WHERE id=${id}`;
const sc = stored[0]!.contact; out.contactJsonbType = typeof sc; out.unknownKeyStripped = !(typeof sc === "string" ? sc : JSON.stringify(sc)).includes("extra");
const u = await updateOrder(sql, A, id, { deliveryChargePaise: 8000 });
out.update = u.ok ? u.value.totalPaise : u.error;
for (const s of ["confirmed", "packed"] as const) { const t = await transitionStatus(sql, A, id, s); out[`to_${s}`] = t.ok ? t.value.status : t.error; }
const l = await linkConsignment(sql, A, { orderId: id, consignmentRef: "PT-1234" } as any);
out.link = l.ok ? l.value.courier : l.error;
const l2 = await linkConsignment(sql, A, { orderId: id, consignmentRef: "PT-5678" } as any);
out.linkTwice = l2.ok ? "linked again (BAD)" : l2.error.kind;
for (let i = 0; i < 4; i++) await createOrder(sql, A, { source: "quick-add", customerId: null, contact: null, repeatOfOrderId: null, items: [item], orderDiscountPaise: 0, deliveryChargePaise: 0 });
const p1 = await listOrders(sql, A, { limit: 2 } as any);
out.page1 = p1.ok ? p1.value.orders.length : p1.error;
const p2 = p1.ok && p1.value.nextCursor ? await listOrders(sql, A, { limit: 2, cursor: p1.value.nextCursor } as any) : null;
out.page2Distinct = p1.ok && p2?.ok ? p2.value.orders.every(o => !p1.value.orders.some(x => x.id === o.id)) : "no cursor";
const cross = await getOrder(sql, B, id);
out.crossTenant = cross.ok ? "VISIBLE (BAD)" : cross.error.kind;
const audits = await sql`SELECT action FROM audit_log WHERE subject_id=${id} ORDER BY occurred_at`;
out.auditActions = audits.map(r => r.action);
try { await sql`UPDATE audit_log SET action='x' WHERE subject_id=${id}`; out.auditUpdate = "ALLOWED (BAD)"; } catch (e: any) { out.auditUpdate = e.code; }
try { await sql`DELETE FROM audit_log WHERE subject_id=${id}`; out.auditDelete = "ALLOWED (BAD)"; } catch (e: any) { out.auditDelete = e.code; }
const big = await createOrder(sql, A, { source: "manual", customerId: null, contact: null, repeatOfOrderId: null, items: Array.from({ length: 200 }, () => ({ ...item, quantity: 9999, unitPricePaise: 1_000_000_000_000, lineDiscountPaise: 0 })), orderDiscountPaise: 0, deliveryChargePaise: 0 });
out.overflowRefused = big.ok ? "STORED (BAD)" : big.error.kind;
const after = await listOrders(sql, A, {} as any);
out.listStillReadable = after.ok;
console.log(JSON.stringify(out, null, 1));
await sql.end();
