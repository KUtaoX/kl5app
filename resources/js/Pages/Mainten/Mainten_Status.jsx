import Modal from '@/Components/Modal';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

/*
 * Maintenance Status — frontend อย่างเดียว (ยังไม่ต่อ backend)
 * ------------------------------------------------------------------
 * ตอนนี้ใช้ข้อมูลตัวอย่าง MOCK_ITEMS และเก็บการแก้ไขไว้ใน state ของหน้า
 * เมื่อทำ backend แล้ว:
 *   1. ส่ง prop `items` มาจาก controller (รูปแบบเดียวกับ MOCK_ITEMS)
 *   2. แทนที่จุดที่มีคอมเมนต์ "TODO backend" ด้วย router.post / patch / delete
 */

// ---------- ข้อมูลตัวอย่าง ----------
const MOCK_ITEMS = [
    { id: 1, date: '2026-09-27', code: 'RT-SDBX-10-0075', asset_no: 'GI 4901510137', name: '', from_site: 'DCPH', status: null, technician: '', progress: null, qc: null },
    { id: 2, date: '2026-09-27', code: 'RT-SDBX-09-0203', asset_no: 'GI 4901510137', name: 'ตู้ไฟฟ้า ชั่วคราวสำเร็จรูป', from_site: 'DCPH', status: 'repair', technician: 'สมชาย', progress: 'waiting', qc: null },
    { id: 3, date: '2026-09-27', code: 'RT-MDBX-07-0835', asset_no: 'GI 4901510137', name: 'ตู้ไฟฟ้า ชั่วคราวสำเร็จรูป', from_site: 'DCPH', status: 'repair', technician: 'สมชาย', progress: 'done', qc: null },
    { id: 4, date: '2026-09-21', code: 'RT-SCPX-08-0001', asset_no: 'TMC/CIVIL/AST020/13_15', name: 'รถปั๊มยิงคอนกรีต', from_site: 'NEO1', status: 'repair', technician: 'วิชัย', progress: 'done', qc: 'accept' },
    { id: 5, date: '2026-09-20', code: 'RT-MDBX-YY-0480', asset_no: 'GI 4901514820', name: 'ตู้ไฟฟ้า ชั่วคราวสำเร็จรูป', from_site: 'VMS1', status: 'retire', technician: '', progress: 'retired', qc: 'accept' },
    { id: 6, date: '2026-09-13', code: 'RT-AIRC-18-0123', asset_no: 'GI 4901522692', name: 'เครื่องปรับอากาศ', from_site: 'MTG2', status: 'repair', technician: 'อนันต์', progress: 'done', qc: 'reject' },
    { id: 7, date: '2026-09-11', code: 'RT-SDBX-13-0100', asset_no: 'GI 4901526187', name: '', from_site: 'DCPH', status: null, technician: '', progress: null, qc: null },
    { id: 8, date: '2026-09-11', code: 'RT-SDBX-11-0184', asset_no: 'GI 4901526187', name: '', from_site: 'DCPH', status: null, technician: '', progress: null, qc: null },
    { id: 9, date: '2026-09-11', code: 'RT-SDBX-11-0170', asset_no: 'GI 4901526187', name: 'ตู้ไฟฟ้า ชั่วคราวสำเร็จรูป', from_site: 'DCPH', status: 'repair', technician: '', progress: 'waiting', qc: null },
    { id: 10, date: '2026-09-11', code: 'RT-SDBX-11-0003', asset_no: '', name: '', from_site: 'DCPH', status: null, technician: '', progress: null, qc: null },
    { id: 11, date: '2026-09-08', code: 'RT-MDBX-10-0098', asset_no: 'GI 4901526190', name: 'ตู้ไฟฟ้า ชั่วคราวสำเร็จรูป', from_site: 'KL5-TEMP', status: 'repair', technician: 'วิชัย', progress: 'done', qc: 'accept' },
    { id: 12, date: '2026-09-05', code: 'RT-SDBX-18-0103', asset_no: 'GI 4901526201', name: 'ตู้ไฟฟ้า ชั่วคราวสำเร็จรูป', from_site: 'KL5-TEMP', status: 'repair', technician: 'อนันต์', progress: 'waiting', qc: null },
];

// ---------- ตัวเลือกของแต่ละช่อง ----------
const STATUS_OPTIONS = [
    { value: 'repair', label: 'ซ่อม', tone: 'amber' },
    { value: 'retire', label: 'ปลดระวาง', tone: 'gray' },
];
const PROGRESS_OPTIONS = [
    { value: 'waiting', label: 'รอซ่อม', tone: 'sky' },
    { value: 'retired', label: 'ปลดระวาง', tone: 'gray' },
    { value: 'done', label: 'ซ่อมเสร็จ', tone: 'emerald' },
];
const QC_OPTIONS = [
    { value: 'accept', label: 'Accept', tone: 'emerald' },
    { value: 'reject', label: 'Reject', tone: 'rose' },
];

const TONE_ACTIVE = {
    amber: 'bg-amber-500 text-white',
    gray: 'bg-gray-500 text-white dark:bg-gray-300', // gray กลับด้านในโหมด Night จึงกำหนดเอง
    sky: 'bg-sky-500 text-white',
    emerald: 'bg-emerald-600 text-white',
    rose: 'bg-rose-600 text-white',
};

// งานถือว่า "Complete" เมื่อดำเนินการจบแล้ว (ซ่อมเสร็จ / ปลดระวาง) และ QC Accept
const isComplete = (r) => (r.progress === 'done' || r.progress === 'retired') && r.qc === 'accept';

const VIEWS = [
    { key: 'working', label: 'Working' },
    { key: 'all', label: 'All' },
    { key: 'complete', label: 'Complete' },
];

const PAGE_SIZE = 10;
const EDITABLE = ['asset_no', 'status', 'technician', 'progress', 'qc'];

const inputClass =
    'rounded-lg border border-gray-300 py-2 px-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';
const cellInputClass =
    'w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

// วันที่แบบระบบเดิม: 27/9/2569
function formatThaiDate(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-').map(Number);
    return `${d}/${m}/${y + 543}`;
}

function todayIso() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const pick = (r) => Object.fromEntries(EDITABLE.map((k) => [k, r[k]]));
const isDirty = (row, saved) => EDITABLE.some((k) => (row[k] ?? '') !== (saved?.[k] ?? ''));

// ---------- ปุ่มเลือกแบบแถบ (แทน radio เดิม) ----------
function Segmented({ value, options, onChange, label }) {
    return (
        <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-gray-100 p-0.5">
            {options.map((opt) => {
                const active = value === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        // กดตัวที่เลือกอยู่ซ้ำ = ยกเลิกการเลือก
                        onClick={() => onChange(active ? null : opt.value)}
                        className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                            active ? `${TONE_ACTIVE[opt.tone]} shadow-sm` : 'text-gray-500 hover:bg-gray-200 hover:text-gray-800'
                        }`}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

// ---------- แจ้งเตือนมุมจอ ----------
function Toast({ toast, onDone }) {
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(onDone, 2600);
        return () => clearTimeout(t);
    }, [toast, onDone]);

    if (!toast) return null;
    const tone = toast.type === 'error' ? 'bg-rose-600' : 'bg-gray-900 dark:bg-gray-100';
    return (
        <div role="status" className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg print:hidden ${tone}`}>
            {toast.message}
        </div>
    );
}

// =====================================================================
// แท็บ Repair — รายการเครื่องที่ส่งเข้าซ่อม
// =====================================================================
function RepairList({ rows, setRows, saved, setSaved, notify }) {
    const [view, setView] = useState('working');
    const [form, setForm] = useState({ search: '', site: '', from: '', to: '' });
    const [applied, setApplied] = useState(form);
    const [page, setPage] = useState(1);
    const [confirmDelete, setConfirmDelete] = useState(null);

    const counts = useMemo(
        () => ({
            all: rows.length,
            complete: rows.filter(isComplete).length,
            working: rows.filter((r) => !isComplete(r)).length,
        }),
        [rows],
    );

    const filtered = useMemo(() => {
        const q = applied.search.trim().toLowerCase();
        const site = applied.site.trim().toLowerCase();
        return rows.filter((r) => {
            if (view === 'working' && isComplete(r)) return false;
            if (view === 'complete' && !isComplete(r)) return false;
            if (q && ![r.code, r.asset_no, r.name, r.technician].some((v) => (v || '').toLowerCase().includes(q))) return false;
            if (site && !(r.from_site || '').toLowerCase().includes(site)) return false;
            if (applied.from && r.date < applied.from) return false;
            if (applied.to && r.date > applied.to) return false;
            return true;
        });
    }, [rows, view, applied]);

    const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const current = Math.min(page, pages);
    const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

    const updateRow = (id, key, value) =>
        setRows((list) => list.map((r) => (r.id === id ? { ...r, [key]: value } : r)));

    const saveRow = (row) => {
        // TODO backend: router.patch(route('maintenance.update', row.id), pick(row), { preserveScroll: true })
        setSaved((s) => ({ ...s, [row.id]: pick(row) }));
        notify(`บันทึก ${row.code} แล้ว`);
    };

    const resetRow = (row) =>
        setRows((list) => list.map((r) => (r.id === row.id ? { ...r, ...saved[row.id] } : r)));

    const deleteRow = () => {
        const row = confirmDelete;
        // TODO backend: router.delete(route('maintenance.destroy', row.id), { preserveScroll: true })
        setRows((list) => list.filter((r) => r.id !== row.id));
        setConfirmDelete(null);
        notify(`ลบ ${row.code} แล้ว`);
    };

    const submit = (e) => {
        e.preventDefault();
        setApplied(form);
        setPage(1);
    };

    const clear = () => {
        const empty = { search: '', site: '', from: '', to: '' };
        setForm(empty);
        setApplied(empty);
        setPage(1);
    };

    const dirtyCount = rows.filter((r) => isDirty(r, saved[r.id])).length;

    return (
        <>
            {/* ---------- แท็บสถานะ + ตัวกรอง ---------- */}
            <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
                <div className="inline-flex rounded-lg bg-white p-1 shadow-sm ring-1 ring-gray-200">
                    {VIEWS.map((v) => {
                        const active = view === v.key;
                        return (
                            <button
                                key={v.key}
                                type="button"
                                onClick={() => {
                                    setView(v.key);
                                    setPage(1);
                                }}
                                className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                                    active ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                {v.label}
                                <span className={`rounded-full px-1.5 text-xs tabular-nums ${active ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
                                    {counts[v.key]}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <form onSubmit={submit} className="flex flex-1 flex-wrap items-center gap-3">
                    <div className="relative w-full sm:w-72">
                        <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
                        </svg>
                        <input
                            type="text"
                            value={form.search}
                            onChange={(e) => setForm({ ...form, search: e.target.value })}
                            placeholder="ค้นหา Asset Code / Asset No. / ช่างซ่อม..."
                            className={`${inputClass} w-full pl-9`}
                        />
                    </div>
                    <input
                        value={form.site}
                        onChange={(e) => setForm({ ...form, site: e.target.value })}
                        placeholder="Site"
                        className={`${inputClass} w-32`}
                    />
                    <div className="flex items-center gap-2">
                        <input type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} aria-label="ตั้งแต่วันที่" className={inputClass} />
                        <span className="text-sm text-gray-400">ถึง</span>
                        <input type="date" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} aria-label="ถึงวันที่" className={inputClass} />
                    </div>
                    <button type="submit" className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-200">
                        Search
                    </button>
                    <button type="button" onClick={clear} className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-200">
                        ล้าง
                    </button>

                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="ms-auto inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V3h12v6M6 18H4a1 1 0 01-1-1v-6a2 2 0 012-2h14a2 2 0 012 2v6a1 1 0 01-1 1h-2M6 14h12v7H6z" />
                        </svg>
                        Print
                    </button>
                </form>
            </div>

            {dirtyCount > 0 && (
                <p className="mb-3 text-sm text-amber-700 print:hidden">
                    มี {dirtyCount} รายการที่แก้ไขแล้วยังไม่ได้กด Save
                </p>
            )}

            {/* ---------- ตาราง ---------- */}
            <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 print:shadow-none print:ring-0">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                <th className="px-3 py-4 text-left">Date</th>
                                <th className="px-3 py-4 text-left">Asset Code</th>
                                <th className="px-3 py-4 text-left">Asset No.</th>
                                <th className="px-3 py-4 text-left">รายการ</th>
                                <th className="px-3 py-4 text-center">From Site</th>
                                <th className="px-3 py-4 text-center">สถานะ</th>
                                <th className="px-3 py-4 text-left">ช่างซ่อม</th>
                                <th className="px-3 py-4 text-center">การดำเนินงาน</th>
                                <th className="px-3 py-4 text-center">QC ตรวจสอบ</th>
                                <th className="px-3 py-4 text-right print:hidden">
                                    <span className="sr-only">จัดการ</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {visible.map((row, idx) => {
                                const dirty = isDirty(row, saved[row.id]);
                                const done = isComplete(row);
                                return (
                                    <tr
                                        key={row.id}
                                        className={`transition ${dirty ? 'bg-amber-50' : idx % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}`}
                                    >
                                        <td className="whitespace-nowrap px-3 py-3 tabular-nums text-gray-600">{formatThaiDate(row.date)}</td>
                                        <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-medium text-indigo-600">{row.code}</td>
                                        <td className="px-3 py-3">
                                            <input
                                                value={row.asset_no}
                                                onChange={(e) => updateRow(row.id, 'asset_no', e.target.value)}
                                                aria-label={`Asset No. ของ ${row.code}`}
                                                placeholder="ระบุ Asset No."
                                                className={`${cellInputClass} min-w-[11rem] font-mono ${row.asset_no ? '' : 'border-rose-300'}`}
                                            />
                                        </td>
                                        <td className="px-3 py-3">
                                            {row.name ? (
                                                <span className="text-gray-900">{row.name}</span>
                                            ) : row.asset_no ? (
                                                <span className="text-gray-400">—</span>
                                            ) : (
                                                <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700">
                                                    ไม่พบ Asset No.
                                                </span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-3 text-center">
                                            <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                                                {row.from_site || '—'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <Segmented label="สถานะ" value={row.status} options={STATUS_OPTIONS} onChange={(v) => updateRow(row.id, 'status', v)} />
                                        </td>
                                        <td className="px-3 py-3">
                                            <input
                                                value={row.technician}
                                                onChange={(e) => updateRow(row.id, 'technician', e.target.value)}
                                                aria-label={`ช่างซ่อมของ ${row.code}`}
                                                placeholder="ชื่อช่าง"
                                                className={`${cellInputClass} min-w-[8rem]`}
                                            />
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <Segmented label="การดำเนินงาน" value={row.progress} options={PROGRESS_OPTIONS} onChange={(v) => updateRow(row.id, 'progress', v)} />
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <Segmented label="QC" value={row.qc} options={QC_OPTIONS} onChange={(v) => updateRow(row.id, 'qc', v)} />
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-3 text-right print:hidden">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {done && !dirty && (
                                                    <span className="me-1 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                                        Complete
                                                    </span>
                                                )}
                                                {dirty && (
                                                    <button
                                                        type="button"
                                                        onClick={() => resetRow(row)}
                                                        className="rounded-md px-2 py-1.5 text-xs font-medium text-gray-500 transition hover:bg-gray-100"
                                                        title="ยกเลิกการแก้ไขแถวนี้"
                                                    >
                                                        คืนค่า
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    disabled={!dirty}
                                                    onClick={() => saveRow(row)}
                                                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmDelete(row)}
                                                    className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}

                            {visible.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="px-4 py-10 text-center text-gray-400">
                                        ไม่พบรายการซ่อมที่ตรงกับเงื่อนไข
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col gap-2 border-t border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-gray-500">
                        ทั้งหมด <span className="font-medium text-gray-700">{filtered.length.toLocaleString()}</span> รายการ
                    </p>
                    {pages > 1 && (
                        <div className="flex flex-wrap gap-1 print:hidden">
                            <button
                                type="button"
                                disabled={current === 1}
                                onClick={() => setPage(current - 1)}
                                className="rounded-md px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
                            >
                                « Previous
                            </button>
                            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPage(p)}
                                    aria-current={p === current ? 'page' : undefined}
                                    className={`min-w-[2.25rem] rounded-md px-3 py-1.5 text-sm transition ${
                                        p === current ? 'bg-indigo-600 font-medium text-white' : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                            <button
                                type="button"
                                disabled={current === pages}
                                onClick={() => setPage(current + 1)}
                                className="rounded-md px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
                            >
                                Next »
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ---------- ยืนยันการลบ ---------- */}
            <Modal show={Boolean(confirmDelete)} maxWidth="md" onClose={() => setConfirmDelete(null)}>
                {confirmDelete && (
                    <div className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900">ลบรายการซ่อมนี้?</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            <span className="font-mono text-indigo-600">{confirmDelete.code}</span>
                            {confirmDelete.name ? ` · ${confirmDelete.name}` : ''} จะถูกลบออกจากรายการซ่อม และกู้คืนไม่ได้
                        </p>
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setConfirmDelete(null)}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={deleteRow}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700"
                            >
                                ลบรายการ
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
}

// =====================================================================
// แท็บ Add Tool — ส่งเครื่องเข้าซ่อม (เพิ่มได้หลายเครื่องในครั้งเดียว)
// =====================================================================
let nextKey = 1;
const newAsset = () => ({ key: nextKey++, code: '', asset_no: '' });

function AddTool({ onAdded, onCancel }) {
    const [site, setSite] = useState('');
    const [date, setDate] = useState(todayIso);
    const [assets, setAssets] = useState(() => [newAsset()]);
    const [errors, setErrors] = useState({});

    const updateAsset = (key, field, value) =>
        setAssets((list) => list.map((a) => (a.key === key ? { ...a, [field]: value } : a)));

    const removeAsset = (key) => setAssets((list) => (list.length > 1 ? list.filter((a) => a.key !== key) : list));

    const reset = () => {
        setSite('');
        setDate(todayIso());
        setAssets([newAsset()]);
        setErrors({});
    };

    const submit = (e) => {
        e.preventDefault();
        const filled = assets.filter((a) => a.code.trim());
        const codes = filled.map((a) => a.code.trim().toUpperCase());
        const next = {};
        if (!site.trim()) next.site = 'กรุณาระบุ Site';
        if (!date) next.date = 'กรุณาเลือกวันที่';
        if (filled.length === 0) next.assets = 'กรุณาระบุ Asset Code อย่างน้อย 1 รายการ';
        else if (new Set(codes).size !== codes.length) next.assets = 'มี Asset Code ซ้ำกันในรายการ';
        setErrors(next);
        if (Object.keys(next).length) return;

        // TODO backend: router.post(route('maintenance.store'), { site, date, assets: filled.map(({ code, asset_no }) => ({ code, asset_no })) })
        onAdded(
            filled.map((a) => ({
                code: a.code.trim().toUpperCase(),
                asset_no: a.asset_no.trim(),
                from_site: site.trim().toUpperCase(),
                date,
            })),
        );
        reset();
    };

    return (
        <form onSubmit={submit} className="mx-auto max-w-2xl overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <div className="border-b border-gray-200 px-6 py-4">
                <h3 className="text-base font-semibold text-gray-900">ส่งเครื่องเข้าซ่อม</h3>
                <p className="mt-0.5 text-sm text-gray-500">เพิ่มได้หลายเครื่องในครั้งเดียว เครื่องทั้งหมดจะใช้ Site และวันที่เดียวกัน</p>
            </div>

            <div className="space-y-5 px-6 py-5">
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-gray-700">Site</span>
                        <input
                            value={site}
                            onChange={(e) => setSite(e.target.value)}
                            placeholder="เช่น DCPH"
                            className={`${inputClass} w-full ${errors.site ? 'border-rose-400' : ''}`}
                        />
                        {errors.site && <span className="mt-1 block text-xs text-rose-600">{errors.site}</span>}
                    </label>
                    <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-gray-700">Date</span>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className={`${inputClass} w-full ${errors.date ? 'border-rose-400' : ''}`}
                        />
                        <span className="mt-1 block text-xs text-gray-400">{date ? `พ.ศ. ${formatThaiDate(date)}` : ''}</span>
                        {errors.date && <span className="block text-xs text-rose-600">{errors.date}</span>}
                    </label>
                </div>

                <div>
                    <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                            เครื่องที่ส่งซ่อม <span className="font-normal text-gray-400">({assets.length})</span>
                        </span>
                    </div>

                    <div className="space-y-2">
                        <div className="grid grid-cols-[1fr_1fr_2rem] gap-2 px-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">
                            <span>Asset Code</span>
                            <span>Asset No.</span>
                            <span />
                        </div>
                        {assets.map((a, i) => (
                            <div key={a.key} className="grid grid-cols-[1fr_1fr_2rem] items-center gap-2">
                                <input
                                    value={a.code}
                                    onChange={(e) => updateAsset(a.key, 'code', e.target.value)}
                                    placeholder="RT-SDBX-10-0075"
                                    aria-label={`Asset Code รายการที่ ${i + 1}`}
                                    className={`${inputClass} w-full font-mono uppercase`}
                                />
                                <input
                                    value={a.asset_no}
                                    onChange={(e) => updateAsset(a.key, 'asset_no', e.target.value)}
                                    placeholder="GI 4901510137"
                                    aria-label={`Asset No. รายการที่ ${i + 1}`}
                                    className={`${inputClass} w-full font-mono`}
                                />
                                <button
                                    type="button"
                                    onClick={() => removeAsset(a.key)}
                                    disabled={assets.length === 1}
                                    aria-label={`ลบรายการที่ ${i + 1}`}
                                    className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>

                    {errors.assets && <p className="mt-2 text-xs text-rose-600">{errors.assets}</p>}

                    <button
                        type="button"
                        onClick={() => setAssets((list) => [...list, newAsset()])}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                        </svg>
                        เพิ่มเครื่อง
                    </button>
                </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-6 py-4">
                <button
                    type="button"
                    onClick={() => {
                        reset();
                        onCancel();
                    }}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
                >
                    Cancel
                </button>
                <button type="submit" className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700">
                    Save
                </button>
            </div>
        </form>
    );
}

// =====================================================================
// หน้า Maintenance Status
// =====================================================================
const SECTIONS = [
    { key: 'add', label: 'Add Tool' },
    { key: 'repair', label: 'Repair' },
];

export default function Mainten_Status({ items = MOCK_ITEMS }) {
    const [section, setSection] = useState('add');
    const [rows, setRows] = useState(items);
    const [saved, setSaved] = useState(() => Object.fromEntries(items.map((r) => [r.id, pick(r)])));
    const [toast, setToast] = useState(null);

    const notify = (message, type = 'success') => setToast({ message, type, at: Date.now() });

    const handleAdded = (newItems) => {
        const maxId = rows.reduce((m, r) => Math.max(m, r.id), 0);
        const created = newItems.map((n, i) => ({
            id: maxId + i + 1,
            name: '',
            status: null,
            technician: '',
            progress: null,
            qc: null,
            ...n,
        }));
        setRows((list) => [...created, ...list]);
        setSaved((s) => ({ ...s, ...Object.fromEntries(created.map((r) => [r.id, pick(r)])) }));
        setSection('repair');
        notify(`ส่งเข้าซ่อม ${created.length} เครื่องแล้ว`);
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">Maintenance Status</h2>
                    <div role="tablist" className="inline-flex border-b border-gray-200 print:hidden">
                        {SECTIONS.map((s) => {
                            const active = section === s.key;
                            return (
                                <button
                                    key={s.key}
                                    role="tab"
                                    type="button"
                                    aria-selected={active}
                                    onClick={() => setSection(s.key)}
                                    className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
                                        active ? 'border-indigo-500 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-800'
                                    }`}
                                >
                                    {s.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            }
        >
            <Head title="Maintenance Status" />

            <div className="py-8">
                <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8">
                    {section === 'repair' ? (
                        <RepairList rows={rows} setRows={setRows} saved={saved} setSaved={setSaved} notify={notify} />
                    ) : (
                        <AddTool onAdded={handleAdded} onCancel={() => setSection('repair')} />
                    )}
                </div>
            </div>

            <Toast toast={toast} onDone={() => setToast(null)} />
        </AuthenticatedLayout>
    );
}
