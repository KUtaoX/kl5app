import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

// สี badge Site — ใช้วิธีเดียวกับหน้า Machine List ไซต์เดียวกันได้สีเดิมเสมอ
const SITE_COLORS = [
    'bg-indigo-50 text-indigo-700',
    'bg-emerald-50 text-emerald-700',
    'bg-amber-50 text-amber-700',
    'bg-rose-50 text-rose-700',
    'bg-sky-50 text-sky-700',
    'bg-violet-50 text-violet-700',
    'bg-teal-50 text-teal-700',
    'bg-orange-50 text-orange-700',
];

function siteColor(site) {
    if (!site) return 'bg-gray-100 text-gray-500';
    let hash = 0;
    for (let i = 0; i < site.length; i++) {
        hash = (hash * 31 + site.charCodeAt(i)) >>> 0;
    }
    return SITE_COLORS[hash % SITE_COLORS.length];
}

// index = job_order.status1
const TYPE_COLORS = [
    'bg-red-50 text-red-700',         // ซ่อมเร่งด่วน
    'bg-emerald-50 text-emerald-700', // บำรุงรักษา
    'bg-sky-50 text-sky-700',         // ติดตั้ง
    'bg-amber-50 text-amber-700',     // Audit
    'bg-violet-50 text-violet-700',   // ซ่อมภายใน
];

const COLUMNS = [
    { key: 'code', label: 'Code' },
    { key: 'job_order', label: 'Job Order' },
    { key: 'type', label: 'ประเภทของงาน' },
    { key: 'name', label: 'Name' },
    { key: 'site', label: 'Site' },
    { key: 'date', label: 'Date' },
    { key: 'cost', label: 'Cost', align: 'text-right' },
    { key: 'total', label: 'Total' },
];

const inputClass =
    'rounded-lg border border-gray-300 py-2 px-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

function cleanQuery(params) {
    return Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined),
    );
}

function formatCost(n) {
    return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Job_Order_Home({ jobs, filters, jobTypes, groups, machineTypes = [] }) {
    const [form, setForm] = useState(filters);
    const [showMore, setShowMore] = useState(
        Boolean(filters.site || filters.part || filters.from || filters.to),
    );

    useEffect(() => setForm(filters), [filters]);

    const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

    const visit = (next = {}) => {
        router.get(route('job-order-home'), cleanQuery({ ...form, ...next }), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleSearch = (e) => {
        e.preventDefault();
        visit();
    };

    const sortBy = (key) =>
        visit({ sort: key, dir: filters.sort === key && filters.dir === 'asc' ? 'desc' : 'asc' });

    const clearFilters = () =>
        visit({ group: '', machine: '', search: '', type: '', site: '', part: '', from: '', to: '' });

    // ค่าในช่องเลือก: "g:1" = กลุ่ม TEMP, "m:Mobile Crane" = ชนิดเครื่องจักรตาม Name
    const groupMachineValue = filters.machine
        ? `m:${filters.machine}`
        : filters.group !== '' && filters.group != null
        ? `g:${filters.group}`
        : '';

    const changeGroupMachine = (value) => {
        if (value.startsWith('m:')) visit({ machine: value.slice(2), group: '' });
        else if (value.startsWith('g:')) visit({ group: value.slice(2), machine: '' });
        else visit({ group: '', machine: '' });
    };

    const exportUrl = route('job-order-home.export', cleanQuery(filters));

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Job Order
                </h2>
            }
        >
            <Head title="Job Order" />

            <div className="py-8">
                <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8">
                    {/* ---------- ตัวกรอง ---------- */}
                    <form onSubmit={handleSearch} className="mb-4 print:hidden">
                        <div className="flex flex-wrap items-center gap-3">
                            {/* MT / TEMP / LGT ตามด้วย Name จากหน้า Job Order Type */}
                            <select
                                value={groupMachineValue}
                                onChange={(e) => changeGroupMachine(e.target.value)}
                                className={`${inputClass} max-w-[16rem] pr-8`}
                                aria-label="กลุ่มงาน / ชนิดเครื่องจักร"
                            >
                                <option value="">ทั้งหมด</option>
                                {Object.entries(groups).map(([value, label]) => (
                                    <option key={`g${value}`} value={`g:${value}`}>{label}</option>
                                ))}
                                {machineTypes.map((name) => (
                                    <option key={`m${name}`} value={`m:${name}`}>{name}</option>
                                ))}
                            </select>

                            <select
                                value={form.type}
                                onChange={(e) => visit({ type: e.target.value })}
                                className={`${inputClass} pr-8`}
                                aria-label="ประเภทของงาน"
                            >
                                <option value="">ประเภทของงาน: ทั้งหมด</option>
                                {jobTypes.map((label, i) => (
                                    <option key={i} value={String(i)}>{label}</option>
                                ))}
                            </select>

                            <div className="relative w-full sm:w-80">
                                <svg
                                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
                                </svg>
                                <input
                                    type="text"
                                    value={form.search}
                                    onChange={(e) => set('search', e.target.value)}
                                    placeholder="ค้นหา Code / ชื่อ / เลข Job Order..."
                                    className={`${inputClass} w-full pl-9`}
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowMore((v) => !v)}
                                aria-expanded={showMore}
                                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-200"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" d="M4 6h16M7 12h10M10 18h4" />
                                </svg>
                                ตัวกรองเพิ่มเติม
                            </button>

                            <button
                                type="submit"
                                className="shrink-0 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-200"
                            >
                                Search
                            </button>

                            <div className="ms-auto flex gap-2">
                               <a
                                    href={route('job-order-home.print', cleanQuery(filters))}
                                    target="_blank"
                                    rel="noopener"
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V3h12v6M6 18H4a1 1 0 01-1-1v-6a2 2 0 012-2h14a2 2 0 012 2v6a1 1 0 01-1 1h-2M6 14h12v7H6z" />
                                    </svg>
                                    Print
                                </a>

                                {/* <a> ธรรมดา เพราะเป็นการดาวน์โหลดไฟล์ ไม่ใช่ Inertia visit */}
                                <a
                                    href={exportUrl}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v3h16v-3" />
                                    </svg>
                                    Export Excel
                                </a>
                            </div>
                        </div>

                        {showMore && (
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                                <input
                                    value={form.site}
                                    onChange={(e) => set('site', e.target.value)}
                                    placeholder="Site"
                                    className={`${inputClass} w-40`}
                                />
                                <input
                                    value={form.part}
                                    onChange={(e) => set('part', e.target.value)}
                                    placeholder="อะไหล่ที่ใช้"
                                    className={`${inputClass} w-56`}
                                />
                                <div className="flex items-center gap-2">
                                    <input
                                        type="date"
                                        value={form.from}
                                        onChange={(e) => set('from', e.target.value)}
                                        aria-label="ตั้งแต่วันที่"
                                        className={inputClass}
                                    />
                                    <span className="text-sm text-gray-400">ถึง</span>
                                    <input
                                        type="date"
                                        value={form.to}
                                        onChange={(e) => set('to', e.target.value)}
                                        aria-label="ถึงวันที่"
                                        className={inputClass}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-200"
                                >
                                    ล้างตัวกรอง
                                </button>
                            </div>
                        )}
                    </form>

                    {/* ---------- ตาราง ---------- */}
                    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 print:shadow-none print:ring-0">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50">
                                        {COLUMNS.map((col) => {
                                            const active = filters.sort === col.key;
                                            return (
                                                <th
                                                    key={col.key}
                                                    aria-sort={active ? (filters.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                                                    className={`px-4 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500 ${col.align ?? 'text-center'}`}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => sortBy(col.key)}
                                                        className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-gray-900"
                                                    >
                                                        {col.label}
                                                        <span className={`text-[10px] ${active ? 'text-indigo-600' : 'text-gray-300'}`}>
                                                            {active ? (filters.dir === 'asc' ? '↑' : '↓') : '↕'}
                                                        </span>
                                                    </button>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {jobs.data.map((job, idx) => (
                                        <tr
                                            key={job.id}
                                            onClick={() => router.visit(`/record/${job.id}`)}
                                            className={`cursor-pointer transition hover:bg-indigo-50/40 ${idx % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'} ${job.cancel ? 'opacity-60' : ''}`}
                                        >
                                            <td className="whitespace-nowrap px-4 py-3 text-center font-mono text-xs font-medium">
                                                <Link
                                                    href={route('record-tool', job.tool_id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="text-indigo-600 hover:underline"
                                                >
                                                    {job.code}
                                                </Link>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-center font-mono text-xs text-gray-600">
                                                {job.job_order}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-center">
                                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLORS[job.type_index] ?? 'bg-gray-100 text-gray-600'}`}>
                                                    {job.type}
                                                </span>
                                                {job.cancel && (
                                                    <span className="ms-1.5 inline-flex rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                                                        ยกเลิก
                                                    </span>
                                                )}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-center text-gray-900">{job.name}</td>
                                            <td className="whitespace-nowrap px-4 py-3 text-center">
                                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${siteColor(job.site)}`}>
                                                    {job.site || '—'}
                                                </span>
                                                {job.from_site && (
                                                    <span className="ms-1.5 text-xs text-gray-400">จาก {job.from_site}</span>
                                                )}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-center tabular-nums text-gray-600">{job.date || '—'}</td>
                                            <td className={`whitespace-nowrap px-4 py-3 text-right tabular-nums ${job.cost ? 'text-gray-900' : 'text-gray-400'}`}>
                                                {formatCost(job.cost)}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-center tabular-nums text-gray-700">{job.total}</td>
                                        </tr>
                                    ))}

                                    {jobs.data.length === 0 && (
                                        <tr>
                                            <td colSpan={COLUMNS.length} className="px-4 py-10 text-center text-gray-400">
                                                ไม่พบใบสั่งงานที่ตรงกับตัวกรอง ลองลดเงื่อนไข หรือกด "ล้างตัวกรอง"
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col gap-2 border-t border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-gray-500">
                                ทั้งหมด <span className="font-medium text-gray-700">{jobs.total.toLocaleString()}</span> รายการ
                            </p>
                            <div className="flex flex-wrap gap-1 print:hidden">
                                {jobs.links.map((link, i) => (
                                    <Link
                                        key={i}
                                        href={link.url || '#'}
                                        preserveState
                                        preserveScroll
                                        onClick={(e) => !link.url && e.preventDefault()}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`min-w-[2.25rem] rounded-md px-3 py-1.5 text-center text-sm transition ${
                                            link.active
                                                ? 'bg-indigo-600 font-medium text-white'
                                                : link.url
                                                ? 'text-gray-600 hover:bg-gray-100'
                                                : 'cursor-not-allowed text-gray-300'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
