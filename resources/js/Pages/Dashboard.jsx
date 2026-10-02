import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

/*
 * Dashboard — ข้อมูลจาก DashboardController
 * กราฟทั้งหมดวาดด้วย div + Tailwind ไม่ต้องติดตั้ง library เพิ่ม และเปลี่ยนสีตามโหมด Day / Night เอง
 */

const JOB_TYPES = [
    { label: 'ซ่อมเร่งด่วน', bar: 'bg-red-500', dot: 'bg-red-500' },
    { label: 'บำรุงรักษา', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
    { label: 'ติดตั้ง', bar: 'bg-sky-500', dot: 'bg-sky-500' },
    { label: 'Audit', bar: 'bg-amber-400', dot: 'bg-amber-400' },
    { label: 'ซ่อมภายใน', bar: 'bg-violet-500', dot: 'bg-violet-500' },
];

const GROUP_COLORS = ['bg-indigo-500', 'bg-sky-500', 'bg-amber-400'];

const PERIODS = [
    { key: 'month', label: 'เดือนนี้', months: 1, compare: 'เดือนก่อน' , openCompare: 'ต้นเดือน' },
    { key: 'quarter', label: '3 เดือน', months: 3, compare: '3 เดือนก่อนหน้า' , openCompare: 'ต้นช่วง 3 เดือน' },
    { key: 'year', label: 'ปีนี้', months: 12, compare: 'ปีก่อน' , openCompare: 'ต้นปี' },
];

const baht = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// ---------- ชิ้นส่วนพื้นฐาน ----------
function Card({ title, subtitle, action, className = '', children }) {
    return (
        <section className={`rounded-xl bg-white shadow-sm ring-1 ring-gray-200 ${className}`}>
            {(title || action) && (
                <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                        {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
                    </div>
                    {action}
                </header>
            )}
            <div className="p-5">{children}</div>
        </section>
    );
}

function Delta({ now, prev, goodWhen = 'down', compare }) {
    if (!prev) return <span className="text-xs text-gray-400">ไม่มีข้อมูลเทียบ</span>;
    const pct = ((now - prev) / prev) * 100;
    const up = pct > 0;
    const flat = Math.abs(pct) < 0.5;
    const good = flat ? null : goodWhen === 'down' ? !up : up;
    const tone = good === null ? 'text-gray-500' : good ? 'text-emerald-600' : 'text-rose-600';
    return (
        <span className="text-xs text-gray-500">
            <span className={`font-medium ${tone}`}>
                {flat ? '±0%' : `${up ? '▲' : '▼'} ${Math.abs(pct).toFixed(0)}%`}
            </span>{' '}
            เทียบ{compare}
        </span>
    );
}

function Kpi({ label, value, unit, icon, tone, footer }) {
    return (
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-gray-500">{label}</p>
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>{icon}</span>
            </div>
            <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-gray-900">
                {value}
                {unit && <span className="ms-1 text-base font-medium text-gray-400">{unit}</span>}
            </p>
            <div className="mt-1.5">{footer}</div>
        </div>
    );
}

const Icon = ({ d }) => (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
);
const ICONS = {
    clipboard: 'M9 5h6m-6 0a2 2 0 002 2h2a2 2 0 002-2m-6 0a2 2 0 012-2h2a2 2 0 012 2m-9 2h.01M7 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1M9 13h6m-6 4h4',
    bolt: 'M13 2L4 14h7l-1 8 9-12h-7l1-8z',
    wrench: 'M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.5 2.5-2.8-.7-.7-2.8 2.5-2.5z',
    coins: 'M12 8c-3.3 0-6-1.1-6-2.5S8.7 3 12 3s6 1.1 6 2.5S15.3 8 12 8zm-6-2.5v5C6 11.9 8.7 13 12 13s6-1.1 6-2.5v-5M6 10.5v5C6 16.9 8.7 18 12 18s6-1.1 6-2.5v-5M6 15.5v3C6 19.9 8.7 21 12 21s6-1.1 6-2.5v-3',
};

// ---------- กราฟแท่งซ้อนรายเดือน ----------
function MonthlyChart({ monthly }) {
    const months = monthly.map((m) => m.label);
    const data = monthly.map((m) => m.counts);
    const totals = data.map((row) => row.reduce((a, b) => a + b, 0));
    const max = Math.max(0, ...totals);
    const top = Math.max(10, Math.ceil(max / 10) * 10);
    const ticks = [top, top / 2, 0];
    const [hover, setHover] = useState(null);

    return (
        <div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-600">
                {JOB_TYPES.map((t) => (
                    <span key={t.label} className="inline-flex items-center gap-1.5">
                        <span className={`h-2.5 w-2.5 rounded-sm ${t.dot}`} />
                        {t.label}
                    </span>
                ))}
            </div>

            <div className="relative mt-5 flex h-56 gap-3">
                {/* แกน Y */}
                <div className="flex w-6 flex-col justify-between text-right text-[11px] tabular-nums text-gray-400">
                    {ticks.map((t) => (
                        <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">{t}</span>
                    ))}
                </div>

                <div className="relative flex-1">
                    {/* เส้นกริด */}
                    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                        {ticks.map((t) => (
                            <div key={t} className="border-t border-dashed border-gray-200" />
                        ))}
                    </div>

                    <div className="relative flex h-full items-end gap-1.5 sm:gap-2.5">
                        {data.map((row, i) => (
                            <div
                                key={i}
                                className="group relative flex h-full flex-1 flex-col justify-end"
                                onMouseEnter={() => setHover(i)}
                                onMouseLeave={() => setHover(null)}
                            >
                                <div
                                    className={`flex flex-col-reverse overflow-hidden rounded-t-md transition-opacity ${hover !== null && hover !== i ? 'opacity-50' : ''}`}
                                    style={{ height: `${(totals[i] / top) * 100}%` }}
                                >
                                    {row.map((v, t) => (
                                        <div key={t} className={JOB_TYPES[t].bar} style={{ height: totals[i] ? `${(v / totals[i]) * 100}%` : 0 }} />
                                    ))}
                                </div>

                                {hover === i && (
                                    <div className="absolute bottom-full left-1/2 z-10 mb-2 w-40 -translate-x-1/2 rounded-lg bg-white p-3 text-xs shadow-lg ring-1 ring-gray-200">
                                        <p className="mb-1.5 font-semibold text-gray-900">
                                            {months[i]} · {totals[i]} งาน
                                        </p>
                                        {row.map((v, t) => (
                                            <p key={t} className="flex items-center justify-between gap-2 text-gray-600">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <span className={`h-2 w-2 rounded-sm ${JOB_TYPES[t].dot}`} />
                                                    {JOB_TYPES[t].label}
                                                </span>
                                                <span className="tabular-nums text-gray-900">{v}</span>
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="ms-9 mt-2 flex gap-1.5 sm:gap-2.5">
                {months.map((m) => (
                    <span key={m} className="flex-1 text-center text-[11px] text-gray-500">{m}</span>
                ))}
            </div>
        </div>
    );
}

// ---------- กราฟแท่งแนวนอน ----------
function HBar({ items, valueKey, labelKey, format = (v) => v, highlight }) {
    if (items.length === 0) return <p className="py-8 text-center text-sm text-gray-400">ยังไม่มีข้อมูล</p>;
    const max = Math.max(1, ...items.map((i) => i[valueKey]));
    return (
        <ul className="space-y-3">
            {items.map((item) => {
                const active = !highlight || highlight === item[labelKey];
                return (
                    <li key={item[labelKey]} className={`transition-opacity ${active ? '' : 'opacity-40'}`}>
                        <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                            <span className="truncate text-gray-700">{item[labelKey]}</span>
                            <span className="shrink-0 tabular-nums font-medium text-gray-900">{format(item[valueKey])}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(item[valueKey] / max) * 100}%` }} />
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

// ---------- รายการที่ต้องจัดการ ----------
const ATTENTION_TABS = [
    { key: 'overdue', label: 'ค้างนาน', tone: 'bg-rose-50 text-rose-700', empty: 'ไม่มีงานค้างนาน' },
    { key: 'waitingQc', label: 'รอ QC', tone: 'bg-amber-50 text-amber-700', empty: 'ไม่มีงานรอ QC' },
    { key: 'rejected', label: 'QC Reject', tone: 'bg-rose-50 text-rose-700', empty: 'ไม่มีงานที่ถูก Reject' },
    { key: 'incomplete', label: 'ข้อมูลไม่ครบ', tone: 'bg-gray-100 text-gray-600', empty: 'ข้อมูลครบทุกเครื่อง' },
];

function Attention({ data, overdueDays }) {
    const [tab, setTab] = useState('overdue');
    const list = data[tab];
    const meta = ATTENTION_TABS.find((t) => t.key === tab);

    return (
        <Card title="ต้องจัดการ" subtitle="งานที่ควรติดตามวันนี้" className="lg:col-span-2">
            <div role="tablist" className="-mt-1 mb-4 flex flex-wrap gap-1.5">
                {ATTENTION_TABS.map((t) => {
                    const active = tab === t.key;
                    const n = data.counts[t.key];
                    return (
                        <button
                            key={t.key}
                            role="tab"
                            type="button"
                            aria-selected={active}
                            onClick={() => setTab(t.key)}
                            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                                active ? 'bg-gray-100 text-gray-900 ring-1 ring-gray-200' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                            }`}
                        >
                            {t.key === 'overdue' ? `ค้างเกิน ${overdueDays} วัน` : t.label}
                            <span className={`rounded-full px-1.5 text-xs tabular-nums ${n ? t.tone : 'bg-gray-100 text-gray-400'}`}>{n.toLocaleString()}</span>
                        </button>
                    );
                })}
            </div>

            {list.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-400">{meta.empty} 🎉</p>
            ) : (
                <ul className="-mx-5 divide-y divide-gray-100">
                    {list.map((r) => (
                        <li key={`${tab}-${r.id}`}>
                            <Link
                                href={r.href}
                                className="flex items-center gap-4 px-5 py-3 transition hover:bg-gray-50"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="flex flex-wrap items-baseline gap-x-2">
                                        <span className="font-mono text-xs font-medium text-indigo-600">{r.code}</span>
                                        <span className="truncate text-sm text-gray-900">{r.name}</span>
                                    </p>
                                    <p className="mt-0.5 text-xs text-gray-500">
                                        <span className="font-mono">{r.job}</span>
                                        {r.site && <span> · {r.site}</span>}
                                    </p>
                                </div>
                                {r.days !== null && (
                                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums ${r.days >= 30 ? 'bg-rose-50 text-rose-700' : r.days >= overdueDays ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {r.days} วัน
                                    </span>
                                )}
                                <svg className="h-4 w-4 shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
            {data.counts[tab] > list.length && (
                <p className="mt-3 text-center text-xs text-gray-400">
                    แสดง {list.length} จาก {data.counts[tab].toLocaleString()} รายการ
                </p>
            )}
        </Card>
    );
}

// ---------- ขั้นตอนงานซ่อม ----------
function Pipeline({ data }) {
    const steps = [
        { label: 'ส่งเข้าซ่อม', value: data.received, color: 'bg-gray-400', note: 'ยังไม่ระบุสถานะ' },
        { label: 'รอซ่อม', value: data.waiting, color: 'bg-sky-500', note: 'มีช่างรับงานแล้ว' },
        { label: 'ซ่อมเสร็จ รอ QC', value: data.done, color: 'bg-amber-400', note: 'รอตรวจคุณภาพ' },
        { label: 'ผ่าน QC', value: data.accepted, color: 'bg-emerald-500', note: 'ช่วงเวลาที่เลือก' },
    ];
    const max = Math.max(1, ...steps.map((s) => s.value));

    return (
        <Card
            title="สถานะงานซ่อม"
            subtitle="จากหน้า Maintenance Status"
            action={
                <Link href={route('maintenance')} className="text-xs font-medium text-indigo-600 hover:underline">
                    ดูทั้งหมด
                </Link>
            }
        >
            <ol className="space-y-4">
                {steps.map((s, i) => (
                    <li key={s.label} className="flex items-center gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
                            {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-baseline justify-between gap-2">
                                <span className="text-sm text-gray-700">{s.label}</span>
                                <span className="text-lg font-semibold tabular-nums text-gray-900">{s.value}</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                                <div className={`h-full rounded-full ${s.color}`} style={{ width: `${(s.value / max) * 100}%` }} />
                            </div>
                            <p className="mt-1 text-[11px] text-gray-400">{s.note}</p>
                        </div>
                    </li>
                ))}
            </ol>
            {data.rejected > 0 && (
                <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    QC Reject {data.rejected} งาน ต้องส่งกลับไปซ่อมใหม่
                </p>
            )}
        </Card>
    );
}

// =====================================================================
export default function Dashboard({ stats, filters }) {
    const user = usePage().props.auth.user;
    const isReadOnly = user.permission5 == '1';

    const [loading, setLoading] = useState(false);
    const period = filters.period;
    const site = filters.site;

    const visit = (next) =>
        router.get(
            route('dashboard'),
            Object.fromEntries(Object.entries({ period, site, ...next }).filter(([, v]) => v)),
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setLoading(true),
                onFinish: () => setLoading(false),
            },
        );

    const p = PERIODS.find((x) => x.key === period);
    const k = stats.kpi;
    const groupTotal = stats.groups.reduce((a, g) => a + g.count, 0);
    const REPEAT_WARNING = stats.repeatWarning;

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">
                        Dashboard <span className="ms-2 text-sm font-normal text-gray-500">{stats.rangeLabel}</span>
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 print:hidden">
                        <div role="radiogroup" aria-label="ช่วงเวลา" className="inline-flex rounded-lg bg-gray-100 p-0.5">
                            {PERIODS.map((x) => (
                                <button
                                    key={x.key}
                                    type="button"
                                    role="radio"
                                    aria-checked={period === x.key}
                                    onClick={() => visit({ period: x.key })}
                                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                                        period === x.key ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-800'
                                    }`}
                                >
                                    {x.label}
                                </button>
                            ))}
                        </div>
                        <select
                            value={site}
                            onChange={(e) => visit({ site: e.target.value })}
                            aria-label="Site"
                            className="rounded-lg border border-gray-300 py-1.5 pl-3 pr-8 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="">ทุก Site</option>
                            {stats.sites.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                </div>
            }
        >
            <Head title="Dashboard" />

            <div className="py-8">
                <div className={`mx-auto max-w-7xl space-y-6 px-4 transition-opacity sm:px-6 lg:px-8 ${loading ? 'opacity-60' : ''}`}>
                    {/* ---------- 1. ตัวเลขสรุป ---------- */}
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <Kpi
                            label="ใบสั่งงานที่เปิดอยู่"
                            value={k.open}
                            unit="งาน"
                            tone="bg-indigo-50 text-indigo-600"
                            icon={<Icon d={ICONS.clipboard} />}
                            footer={<Delta now={k.open} prev={k.openPrev} compare={p.openCompare} />}
                        />
                        <Kpi
                            label={`ซ่อมเร่งด่วน (${p.label})`}
                            value={k.urgent}
                            unit="งาน"
                            tone="bg-red-50 text-red-600"
                            icon={<Icon d={ICONS.bolt} />}
                            footer={<Delta now={k.urgent} prev={k.urgentPrev} compare={p.compare} />}
                        />
                        <Kpi
                            label="เครื่องที่อยู่ระหว่างซ่อม"
                            value={k.inRepair}
                            unit="เครื่อง"
                            tone="bg-amber-50 text-amber-600"
                            icon={<Icon d={ICONS.wrench} />}
                            footer={
                                <span className="text-xs text-gray-500">
                                    ในนี้ <span className="font-medium text-amber-700">{k.waitingQc} เครื่อง</span> รอ QC
                                </span>
                            }
                        />
                        <Kpi
                            label={`ค่าอะไหล่ (${p.label})`}
                            value={baht(k.cost)}
                            unit="บาท"
                            tone="bg-emerald-50 text-emerald-600"
                            icon={<Icon d={ICONS.coins} />}
                            footer={<Delta now={k.cost} prev={k.costPrev} compare={p.compare} />}
                        />
                    </div>

                    {/* ---------- 2. ต้องจัดการ + ขั้นตอนงานซ่อม ---------- */}
                    {!isReadOnly && (
                        <div className="grid gap-6 lg:grid-cols-3">
                            <Attention data={stats.attention} overdueDays={stats.overdueDays} />
                            <Pipeline data={stats.pipeline} />
                        </div>
                    )}

                    {/* ---------- 3. แนวโน้ม ---------- */}
                    <div className="grid gap-6 lg:grid-cols-3">
                        <Card title="ใบสั่งงานรายเดือน" subtitle={`${period === 'year' ? stats.rangeLabel : '12 เดือนล่าสุด'} · แยกตามประเภทของงาน · ชี้ที่แท่งเพื่อดูรายละเอียด`} className="lg:col-span-2">
                            <MonthlyChart monthly={stats.monthly} />
                        </Card>

                        <Card title="สัดส่วนตามกลุ่มงาน" subtitle={`${stats.rangeLabel} · ทั้งหมด ${groupTotal.toLocaleString()} งาน`}>
                            <div className="flex h-3 overflow-hidden rounded-full">
                                {stats.groups.map((g, i) => (
                                    <div key={g.label} className={GROUP_COLORS[i]} style={{ width: groupTotal ? `${(g.count / groupTotal) * 100}%` : 0 }} title={`${g.label}: ${g.count}`} />
                                ))}
                            </div>
                            <ul className="mt-5 space-y-3">
                                {stats.groups.map((g, i) => (
                                    <li key={g.label} className="flex items-center justify-between text-sm">
                                        <span className="inline-flex items-center gap-2 text-gray-700">
                                            <span className={`h-2.5 w-2.5 rounded-sm ${GROUP_COLORS[i]}`} />
                                            {g.label}
                                        </span>
                                        <span className="tabular-nums text-gray-900">
                                            {g.count.toLocaleString()}
                                            <span className="ms-2 inline-block w-10 text-right text-xs text-gray-400">
                                                {groupTotal ? ((g.count / groupTotal) * 100).toFixed(0) : 0}%
                                            </span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    </div>

                    {/* ---------- 4. ค่าใช้จ่าย + เครื่องที่ซ่อมบ่อย ---------- */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        <Card title="ค่าอะไหล่ตาม Site" subtitle={`${stats.rangeLabel} (บาท)`}>
                            <HBar items={stats.costBySite} valueKey="cost" labelKey="site" format={baht} highlight={site} />
                        </Card>

                        <Card title="เครื่องที่ซ่อมบ่อยที่สุด" subtitle={`${stats.rangeLabel} · ซ่อมตั้งแต่ ${REPEAT_WARNING} ครั้งขึ้นไป ควรพิจารณาเปลี่ยนหรือปลดระวาง`}>
                            <div className="-mx-5 -my-5 overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            <th className="px-5 py-3">#</th>
                                            <th className="px-2 py-3">เครื่อง</th>
                                            <th className="px-2 py-3 text-center">ซ่อม</th>
                                            <th className="px-5 py-3 text-right">ค่าอะไหล่</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {stats.topTools.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-400">ยังไม่มีข้อมูล</td>
                                            </tr>
                                        )}
                                        {stats.topTools
                                            .map((t, i) => (
                                                <tr key={t.id} className="hover:bg-gray-50">
                                                    <td className="px-5 py-2.5 tabular-nums text-gray-400">{i + 1}</td>
                                                    <td className="px-2 py-2.5">
                                                        <Link href={route('record-tool', t.id)} className="font-mono text-xs font-medium text-indigo-600 hover:underline">
                                                            {t.code}
                                                        </Link>
                                                        <p className="text-xs text-gray-500">
                                                            {t.name}
                                                            {t.site ? ` · ${t.site}` : ''}
                                                        </p>
                                                    </td>
                                                    <td className="px-2 py-2.5 text-center">
                                                        <span className={`inline-flex min-w-[2rem] justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${t.count >= REPEAT_WARNING ? 'bg-rose-50 text-rose-700' : 'bg-gray-100 text-gray-600'}`}>
                                                            {t.count}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-2.5 text-right tabular-nums text-gray-700">{baht(t.cost)}</td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
