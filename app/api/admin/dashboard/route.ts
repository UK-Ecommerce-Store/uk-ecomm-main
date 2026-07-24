import { NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";

export const dynamic = "force-dynamic";
const change = (current: number, previous: number) => previous === 0 ? (current === 0 ? 0 : 100) : ((current - previous) / previous) * 100;

export async function GET(request: Request) {
  try {
    await requireRequestUser(request, ["ADMIN"]);
    const [summary, deliveries, stock, statuses, chart, recent, products] = await Promise.all([
      db.query(`SELECT
        COALESCE(SUM(total_paise) FILTER (WHERE created_at >= date_trunc('month',now()) AND status<>'CANCELLED'),0)::bigint AS revenue_current,
        COALESCE(SUM(total_paise) FILTER (WHERE created_at >= date_trunc('month',now())-interval '1 month' AND created_at < date_trunc('month',now()) AND status<>'CANCELLED'),0)::bigint AS revenue_previous,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month',now()))::int AS orders_current,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month',now())-interval '1 month' AND created_at < date_trunc('month',now()))::int AS orders_previous,
        COUNT(DISTINCT lower(customer_email))::int AS customers_total,
        COUNT(DISTINCT lower(customer_email)) FILTER (WHERE created_at >= date_trunc('month',now()))::int AS customers_current,
        COUNT(DISTINCT lower(customer_email)) FILTER (WHERE created_at >= date_trunc('month',now())-interval '1 month' AND created_at < date_trunc('month',now()))::int AS customers_previous
        FROM orders`),
      db.query(`SELECT
        COUNT(*) FILTER (WHERE status IN ('ASSIGNED','PICKED_UP','ON_THE_WAY'))::int AS active,
        COUNT(*) FILTER (WHERE status='DELIVERED' AND delivered_at::date=CURRENT_DATE)::int AS delivered_today
        FROM deliveries`),
      db.query(`SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE stock_quantity>reorder_level)::int AS healthy,
        COUNT(*) FILTER (WHERE stock_quantity>0 AND stock_quantity<=reorder_level)::int AS low_stock,
        COUNT(*) FILTER (WHERE stock_quantity=0)::int AS out_of_stock
        FROM products WHERE status='ACTIVE'`),
      db.query(`SELECT status::text AS name,COUNT(*)::int AS value FROM orders WHERE created_at>=now()-interval '30 days' GROUP BY status ORDER BY value DESC`),
      db.query(`SELECT to_char(day,'Dy') AS label,COALESCE(SUM(o.total_paise),0)::bigint AS revenue,COUNT(o.id)::int AS orders
        FROM generate_series(CURRENT_DATE-interval '6 days',CURRENT_DATE,interval '1 day') day
        LEFT JOIN orders o ON o.created_at::date=day::date AND o.status<>'CANCELLED' GROUP BY day ORDER BY day`),
      db.query(`SELECT id,tracking_code,customer_name,total_paise,status::text,created_at FROM orders ORDER BY created_at DESC LIMIT 6`),
      db.query(`SELECT oi.product_name AS name,SUM(oi.quantity)::int AS quantity,SUM(oi.line_total_paise)::bigint AS revenue
        FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.status<>'CANCELLED' GROUP BY oi.product_name ORDER BY quantity DESC LIMIT 6`),
    ]);

    const s = summary.rows[0];
    const d = deliveries.rows[0];
    const st = stock.rows[0];
    const revenue = Number(s.revenue_current);
    const previousRevenue = Number(s.revenue_previous);
    const currentOrders = Number(s.orders_current);
    const previousOrders = Number(s.orders_previous);
    const currentCustomers = Number(s.customers_current);
    const previousCustomers = Number(s.customers_previous);

    return NextResponse.json({ data: {
      revenue,
      revenueChange: change(revenue, previousRevenue),
      orders: currentOrders,
      orderChange: change(currentOrders, previousOrders),
      customers: Number(s.customers_total),
      customerChange: change(currentCustomers, previousCustomers),
      activeDeliveries: Number(d.active),
      deliveredToday: Number(d.delivered_today),
      lowStock: Number(st.low_stock),
      revenueChart: chart.rows.map((row) => ({ label: row.label, revenue: Number(row.revenue), orders: Number(row.orders) })),
      orderStatuses: statuses.rows.map((row) => ({ name: row.name, value: Number(row.value) })),
      recentOrders: recent.rows.map((row) => ({ id: row.id, trackingCode: row.tracking_code, customerName: row.customer_name, total: Number(row.total_paise), status: row.status, createdAt: row.created_at.toISOString() })),
      topProducts: products.rows.map((row) => ({ name: row.name, quantity: Number(row.quantity), revenue: Number(row.revenue) })),
      inventory: { totalProducts: Number(st.total), healthy: Number(st.healthy), lowStock: Number(st.low_stock), outOfStock: Number(st.out_of_stock) },
    }});
  } catch (error) { return apiError(error); }
}
