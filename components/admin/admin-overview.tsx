"use client";

import { AlertTriangle, Bike, Boxes, Download, FileSpreadsheet, FileText, IndianRupee, LoaderCircle, PackageCheck, ShoppingBag, Users, X } from "lucide-react";
import { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type DashboardStats = {
  revenue: number;
  revenueChange: number;
  orders: number;
  orderChange: number;
  customers: number;
  customerChange: number;
  activeDeliveries: number;
  deliveredToday: number;
  lowStock: number;
  revenueChart: Array<{ label: string; revenue: number; orders: number }>;
  orderStatuses: Array<{ name: string; value: number }>;
  recentOrders: Array<{ id: string; trackingCode: string; customerName: string; total: number; status: string; createdAt: string }>;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  inventory: { totalProducts: number; healthy: number; lowStock: number; outOfStock: number };
};

const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(paise || 0) / 100);
const moneyPdf = (paise: number) => `INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(paise || 0) / 100)}`;
const statusPalette = ["#191a17", "#153f2e", "#7c8f38", "#d8ff72", "#d6d3c9", "#b36c23", "#a33a32"];

function StatCard({ label, value, detail, icon: Icon, dark = false }: { label: string; value: string | number; detail: string; icon: React.ElementType; dark?: boolean }) {
  return <article className={`rounded-[22px] border p-5 ${dark ? "border-[#191a17] bg-[#191a17] text-white" : "border-black/6 bg-white"}`}>
    <div className="flex items-center justify-between"><span className={`text-xs font-semibold ${dark ? "text-white/55" : "text-[#85847d]"}`}>{label}</span><span className={`grid size-9 place-items-center rounded-xl ${dark ? "bg-white/10 text-[#d8ff72]" : "bg-[#efeee8]"}`}><Icon size={16} /></span></div>
    <strong className="mt-5 block text-3xl font-semibold tracking-[-.045em]">{value}</strong><p className={`mt-1 text-[11px] ${dark ? "text-white/45" : "text-[#99978f]"}`}>{detail}</p>
  </article>;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AdminOverview({ stats }: { stats: DashboardStats }) {
  const totalInventory = Math.max(1, stats.inventory.totalProducts);
  const health = Math.round((stats.inventory.healthy / totalInventory) * 100);
  const totalStatuses = Math.max(1, stats.orderStatuses.reduce((sum, item) => sum + item.value, 0));
  const [exportOpen, setExportOpen] = useState(false);
  const [format, setFormat] = useState<"pdf" | "excel">("pdf");
  const [includeText, setIncludeText] = useState(true);
  const [includeDiagrams, setIncludeDiagrams] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  async function chartImages() {
    const { toPng } = await import("html-to-image");
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-export-chart]"));
    const images: Array<{ title: string; data: string; width: number; height: number }> = [];
    for (const node of nodes) {
      const data = await toPng(node, { pixelRatio: 1.5, backgroundColor: "#fbfaf7", cacheBust: true });
      images.push({ title: node.dataset.exportChart || "Diagram", data, width: node.offsetWidth, height: node.offsetHeight });
    }
    return images;
  }

  async function exportPdf() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 42;
    let y = 48;
    const ensure = (height: number) => { if (y + height > pageHeight - margin) { doc.addPage(); y = margin; } };
    const heading = (text: string, size = 15) => { ensure(size + 18); doc.setFont("helvetica", "bold"); doc.setFontSize(size); doc.text(text, margin, y); y += size + 10; };
    const row = (label: string, value: string) => { ensure(18); doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text(label, margin, y); doc.setFont("helvetica", "bold"); doc.text(value, pageWidth - margin, y, { align: "right" }); y += 17; };

    doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.text("UK Store - Admin Overview", margin, y); y += 20;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text(`Exported ${new Date().toLocaleString("en-IN")}`, margin, y); y += 24;

    if (includeText) {
      heading("Key metrics");
      row("Revenue this month", moneyPdf(stats.revenue)); row("Orders this month", String(stats.orders)); row("Customers", String(stats.customers)); row("Active deliveries", String(stats.activeDeliveries)); row("Delivered today", String(stats.deliveredToday)); row("Low-stock products", String(stats.lowStock));
      y += 8; heading("Order status");
      stats.orderStatuses.forEach((item) => row(item.name.replaceAll("_", " "), String(item.value)));
      y += 8; heading("Top products");
      stats.topProducts.forEach((item) => row(`${item.name} - ${item.quantity} units`, moneyPdf(item.revenue)));
      y += 8; heading("Recent orders");
      for (const order of stats.recentOrders) {
        ensure(34); doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text(order.trackingCode, margin, y); doc.text(moneyPdf(order.total), pageWidth - margin, y, { align: "right" }); y += 13;
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(`${order.customerName} | ${order.status.replaceAll("_", " ")} | ${new Date(order.createdAt).toLocaleDateString("en-IN")}`, margin, y); y += 18;
      }
    }

    if (includeDiagrams) {
      const images = await chartImages();
      for (const image of images) {
        doc.addPage(); y = margin; heading(image.title, 16);
        const maxWidth = pageWidth - margin * 2;
        const maxHeight = pageHeight - y - margin;
        const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
        doc.addImage(image.data, "PNG", margin, y, image.width * ratio, image.height * ratio, undefined, "FAST");
      }
    }
    doc.save(`uk-market-overview-${new Date().toISOString().slice(0,10)}.pdf`);
  }

  async function exportExcel() {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "UK Store"; workbook.created = new Date();
    if (includeText) {
      const summary = workbook.addWorksheet("Overview");
      summary.addRow(["UK Store - Admin Overview"]); summary.addRow(["Exported", new Date()]); summary.addRow([]);
      summary.addRow(["Metric", "Value"]); summary.addRows([
        ["Revenue this month", stats.revenue / 100], ["Orders this month", stats.orders], ["Customers", stats.customers], ["Active deliveries", stats.activeDeliveries], ["Delivered today", stats.deliveredToday], ["Low-stock products", stats.lowStock],
      ]);
      summary.getColumn(1).width = 28; summary.getColumn(2).width = 22; summary.getCell("B5").numFmt = '₹#,##0.00';
      summary.getRow(1).font = { bold: true, size: 16 }; summary.getRow(4).font = { bold: true };

      const orders = workbook.addWorksheet("Recent Orders"); orders.addRow(["Tracking code", "Customer", "Status", "Amount (INR)", "Created"]); stats.recentOrders.forEach((order) => orders.addRow([order.trackingCode,order.customerName,order.status,order.total/100,new Date(order.createdAt)]));
      orders.columns = [{ width: 28 },{ width: 24 },{ width: 22 },{ width: 16 },{ width: 22 }]; orders.getRow(1).font = { bold: true }; orders.getColumn(4).numFmt = '₹#,##0.00';
      const products = workbook.addWorksheet("Top Products"); products.addRow(["Product", "Quantity", "Revenue (INR)"]); stats.topProducts.forEach((item) => products.addRow([item.name,item.quantity,item.revenue/100])); products.columns = [{ width: 34 },{ width: 14 },{ width: 18 }]; products.getRow(1).font = { bold: true }; products.getColumn(3).numFmt = '₹#,##0.00';
      const statuses = workbook.addWorksheet("Order Status"); statuses.addRow(["Status", "Orders"]); stats.orderStatuses.forEach((item) => statuses.addRow([item.name,item.value])); statuses.columns = [{ width: 24 },{ width: 14 }]; statuses.getRow(1).font = { bold: true };
    }
    if (includeDiagrams) {
      const visualsSheet = workbook.addWorksheet("Diagrams");
      const images = await chartImages();
      let row = 1;
      for (const image of images) {
        visualsSheet.getCell(`A${row}`).value = image.title; visualsSheet.getCell(`A${row}`).font = { bold: true, size: 13 };
        const id = workbook.addImage({ base64: image.data, extension: "png" });
        const width = 760; const height = Math.min(500, width * (image.height / Math.max(1,image.width)));
        visualsSheet.addImage(id, { tl: { col: 0, row }, ext: { width, height } });
        row += Math.ceil(height / 20) + 3;
      }
      visualsSheet.getColumn(1).width = 110;
    }
    const buffer = await workbook.xlsx.writeBuffer();
    downloadBlob(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `uk-market-overview-${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  async function runExport() {
    if (!includeText && !includeDiagrams) { setExportError("Select textual data, diagrams, or both."); return; }
    setExporting(true); setExportError("");
    try { if (format === "pdf") await exportPdf(); else await exportExcel(); setExportOpen(false); }
    catch (error) { console.error(error); setExportError(error instanceof Error ? error.message : "Export failed"); }
    finally { setExporting(false); }
  }

  return <div className="space-y-5">
    <div className="flex justify-end"><button type="button" onClick={() => setExportOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white px-4 py-2.5 text-xs font-semibold"><Download size={14}/> Export overview</button></div>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard label="Revenue" value={money(stats.revenue)} detail="This month" icon={IndianRupee} dark />
      <StatCard label="Orders" value={stats.orders.toLocaleString("en-IN")} detail="This month" icon={ShoppingBag} />
      <StatCard label="Customers" value={stats.customers.toLocaleString("en-IN")} detail="Registered + guest buyers" icon={Users} />
      <StatCard label="Active deliveries" value={stats.activeDeliveries} detail={`${stats.deliveredToday} delivered today`} icon={Bike} />
      <StatCard label="Low stock" value={stats.lowStock} detail="Products need attention" icon={AlertTriangle} />
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.45fr_.85fr]">
      <article data-export-chart="Sales and orders - last 7 days" className="panel p-5 md:p-6">
        <div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#99978f]">Sales & orders</p><h2 className="mt-2 text-xl font-semibold">Last 7 days</h2></div><span className="rounded-full bg-[#efeee8] px-3 py-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#66655f]">Live data</span></div>
        <div className="mt-5 h-[280px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={stats.revenueChart}><defs><linearGradient id="ukRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#153f2e" stopOpacity={0.28}/><stop offset="100%" stopColor="#153f2e" stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#eeece5"/><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#85847d", fontSize: 11 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: "#85847d", fontSize: 10 }} tickFormatter={(value)=>`₹${Math.round(Number(value)/100)}`}/><Tooltip formatter={(value)=>money(Number(value))}/><Area type="monotone" dataKey="revenue" stroke="#153f2e" strokeWidth={2.5} fill="url(#ukRevenue)"/></AreaChart></ResponsiveContainer></div>
      </article>

      <article data-export-chart="Order status distribution" className="panel p-5 md:p-6">
        <div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#99978f]">Order mix</p><h2 className="mt-2 text-xl font-semibold">Status distribution</h2></div>
        <div className="relative mt-3 h-[205px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stats.orderStatuses} dataKey="value" nameKey="name" innerRadius={62} outerRadius={86} paddingAngle={3}>{stats.orderStatuses.map((_, index)=><Cell key={index} fill={statusPalette[index % statusPalette.length]}/>)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 grid place-items-center"><div className="text-center"><strong className="block text-2xl">{totalStatuses}</strong><span className="text-[10px] uppercase tracking-[.12em] text-[#99978f]">30 days</span></div></div></div>
        <div className="grid grid-cols-2 gap-2">{stats.orderStatuses.slice(0,6).map((item,index)=><div key={item.name} className="flex items-center justify-between rounded-xl bg-[#f6f5f0] px-3 py-2 text-[11px]"><span className="flex min-w-0 items-center gap-2"><i className="size-2 shrink-0 rounded-full" style={{ background: statusPalette[index % statusPalette.length] }}/><span className="truncate">{item.name.replaceAll("_"," ").toLowerCase()}</span></span><strong>{item.value}</strong></div>)}</div>
      </article>
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr_.72fr]">
      <article className="panel overflow-hidden">
        <div className="border-b border-black/6 p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#99978f]">Transactions</p><h2 className="mt-2 text-xl font-semibold">Recent orders</h2></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[610px] border-collapse"><thead><tr className="bg-[#faf9f5] text-left text-[10px] uppercase tracking-[.12em] text-[#99978f]"><th className="px-5 py-3">Order</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Amount</th></tr></thead><tbody>{stats.recentOrders.map(order=><tr key={order.id} className="border-t border-black/5 text-xs"><td className="px-5 py-4"><strong className="block text-sm">{order.trackingCode}</strong><span className="mt-1 block text-[10px] text-[#99978f]">{new Date(order.createdAt).toLocaleDateString("en-IN")}</span></td><td className="px-5 py-4">{order.customerName}</td><td className="px-5 py-4"><span className="status-pill">{order.status.replaceAll("_"," ")}</span></td><td className="px-5 py-4 text-right font-semibold">{money(order.total)}</td></tr>)}</tbody></table></div>
      </article>

      <article data-export-chart="Top products" className="panel p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#99978f]">Top products</p><h2 className="mt-2 text-xl font-semibold">Quantity sold</h2></div><Boxes size={19}/></div><div className="mt-5 h-[250px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats.topProducts}><CartesianGrid vertical={false} stroke="#eeece5"/><XAxis dataKey="name" hide/><YAxis axisLine={false} tickLine={false} tick={{ fill: "#85847d", fontSize: 10 }}/><Tooltip/><Bar dataKey="quantity" fill="#153f2e" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer></div><div className="space-y-2">{stats.topProducts.map((product,index)=><div key={product.name} className="flex items-center justify-between text-xs"><span className="min-w-0 truncate text-[#66655f]">{index+1}. {product.name}</span><strong className="ml-3">{product.quantity}</strong></div>)}</div></article>

      <article data-export-chart="Inventory stock health" className="panel p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#99978f]">Inventory</p><h2 className="mt-2 text-xl font-semibold">Stock health</h2></div><PackageCheck size={19}/></div><div className="mt-6 grid place-items-center"><div className="grid size-36 place-items-center rounded-full" style={{ background: `conic-gradient(#153f2e ${health * 3.6}deg, #eceae3 0deg)` }}><div className="grid size-28 place-items-center rounded-full bg-white text-center"><div><strong className="block text-3xl">{health}%</strong><span className="text-[10px] text-[#85847d]">healthy</span></div></div></div></div><div className="mt-7 space-y-2 text-xs"><div className="flex justify-between rounded-xl bg-[#f6f5f0] px-3 py-3"><span>Healthy</span><strong>{stats.inventory.healthy}</strong></div><div className="flex justify-between rounded-xl bg-[#f6f5f0] px-3 py-3"><span>Low stock</span><strong>{stats.inventory.lowStock}</strong></div><div className="flex justify-between rounded-xl bg-[#f6f5f0] px-3 py-3"><span>Out of stock</span><strong>{stats.inventory.outOfStock}</strong></div></div></article>
    </section>

    {exportOpen ? <><button aria-label="Close export options" onClick={() => setExportOpen(false)} className="fixed inset-0 z-[90] bg-black/35 backdrop-blur-sm"/><section className="fixed inset-x-3 bottom-3 z-[100] rounded-[26px] bg-[#fbfaf7] p-5 shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[500px] sm:-translate-x-1/2 sm:-translate-y-1/2"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#99978f]">Overview export</p><h2 className="mt-2 text-2xl font-semibold">Choose what to export</h2></div><button type="button" onClick={() => setExportOpen(false)} className="grid size-10 place-items-center rounded-full bg-white"><X size={17}/></button></div><div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => setFormat("pdf")} className={`rounded-2xl border p-4 text-left ${format === "pdf" ? "border-[#191a17] bg-[#f2f4ec]" : "border-black/7 bg-white"}`}><FileText size={18}/><strong className="mt-3 block text-sm">PDF</strong><span className="mt-1 block text-xs text-[#85847d]">Report pages</span></button><button type="button" onClick={() => setFormat("excel")} className={`rounded-2xl border p-4 text-left ${format === "excel" ? "border-[#191a17] bg-[#f2f4ec]" : "border-black/7 bg-white"}`}><FileSpreadsheet size={18}/><strong className="mt-3 block text-sm">Excel</strong><span className="mt-1 block text-xs text-[#85847d]">Workbook sheets</span></button></div><div className="mt-5 space-y-2"><label className="flex cursor-pointer items-center justify-between rounded-2xl border border-black/7 bg-white p-4"><div><strong className="block text-sm">Textual data</strong><span className="mt-1 block text-xs text-[#85847d]">Metrics, order status, products and recent orders</span></div><input type="checkbox" checked={includeText} onChange={(event) => setIncludeText(event.target.checked)} className="size-4"/></label><label className="flex cursor-pointer items-center justify-between rounded-2xl border border-black/7 bg-white p-4"><div><strong className="block text-sm">Diagrams</strong><span className="mt-1 block text-xs text-[#85847d]">Sales, status, products and inventory visuals</span></div><input type="checkbox" checked={includeDiagrams} onChange={(event) => setIncludeDiagrams(event.target.checked)} className="size-4"/></label></div>{exportError ? <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{exportError}</p> : null}<button type="button" onClick={() => void runExport()} disabled={exporting} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#191a17] py-3.5 text-xs font-semibold text-white disabled:opacity-50">{exporting ? <LoaderCircle size={15} className="animate-spin"/> : <Download size={15}/>} {exporting ? "Preparing export…" : `Export ${format === "pdf" ? "PDF" : "Excel"}`}</button></section></> : null}
  </div>;
}
