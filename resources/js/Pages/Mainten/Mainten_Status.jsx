import Modal from '@/Components/Modal';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';

/*
 * ข้อมูลมาจาก MaintenanceController (ตาราง form1)
 *
 * props
 *   items    paginator ของรายการซ่อม
 *   filters  { view, search, site, from, to }
 *   counts   จำนวนรายการของแต่ละแท็บ
 *   can      { add, edit, delete } — permission2 / 3 / 4 (Read Only = permission5 ปิดทั้งหมด)
 */

// ---------- ค่าในตาราง form1 ----------
const STATUS_OPTIONS = [
    { value: '1', label: 'ซ่อม', tone: 'amber' },
    { value: '2', label: 'ปลดระวาง', tone: 'gray' },
];
const PROGRESS_OPTIONS = [
    { value: '1', label: 'รอซ่อม', tone: 'sky' },
    { value: '2', label: 'ปลดระวาง', tone: 'gray' },
    { value: '3', label: 'ซ่อมเสร็จ', tone: 'emerald' },
];
const QC_OPTIONS = [
    { value: '1', label: 'Accept', tone: 'emerald' },
    { value: '2', label: 'Reject', tone: 'rose' },
];

const TONE_ACTIVE = {
    amber: 'bg-amber-500 text-white',
    gray: 'bg-gray-500 text-white dark:bg-gray-300', // gray กลับด้านในโหมด Night จึงกำหนดเอง
    sky: 'bg-sky-500 text-white',
    emerald: 'bg-emerald-600 text-white',
    rose: 'bg-rose-600 text-white',
};

// เงื่อนไขเดียวกับแท็บ Complete ของ repair.php
const isComplete = (r) => r.status1 === '2' || r.status2 === '2' || r.qc === '1';

const VIEW_LABELS = { working: 'Working', complete: 'Complete', all: 'All' };
const VIEW_ORDER = ['working', 'complete', 'all'];

const EDITABLE = ['asset_no', 'technician', 'status1', 'status2', 'qc'];

const inputClass =
    'rounded-lg border border-gray-300 py-2 px-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';
const cellInputClass =
    'w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

// วันที่แบบระบบเดิม: 27/9/2569
function formatThaiDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    return `${d}/${m}/${y + 543}`;
}

function todayIso() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const cleanQuery = (params) =>
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined));

// ---------- ปุ่มเลือกแบบแถบ (แทน radio เดิม) ----------
function Segmented({ value, options, onChange, label, disabled, date }) {
    if (disabled) {
        const opt = options.find((o) => o.value === value);
        return opt ? (
            <div className="inline-flex flex-col items-center">
                <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${TONE_ACTIVE[opt.tone]}`}>{opt.label}</span>
                {date && <span className="mt-1 text-[11px] tabular-nums text-gray-400">{formatThaiDate(date)}</span>}
            </div>
        ) : (
            <span className="text-xs text-gray-300">—</span>
        );
    }

    return (
        <div className="inline-flex flex-col items-center">
            <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-gray-100 p-0.5">
                {options.map((opt) => {
                    const active = value === opt.value;
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => onChange(opt.value)}
                            className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                                active ? `${TONE_ACTIVE[opt.tone]} shadow-sm` : 'text-gray-500 hover:bg-gray-200 hover:text-gray-800'
                            }`}
                        >
                            {opt.label}
                        </button>
                    );
                })}
            </div>
            {date && <span className="mt-1 text-[11px] tabular-nums text-gray-400">{formatThaiDate(date)}</span>}
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
// แท็บ Repair
// =====================================================================
function RepairList({ items, filters, counts, can, notify }) {
    const [form, setForm] = useState({ search: filters.search, site: filters.site, from: filters.from, to: filters.to });
    const [edits, setEdits] = useState({}); // { [id]: { field: value } } เฉพาะแถวที่แก้แล้วยังไม่ Save
    const [savingId, setSavingId] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);

    useEffect(() => {
        setForm({ search: filters.search, site: filters.site, from: filters.from, to: filters.to });
    }, [filters]);

    const merged = (row) => ({ ...row, ...(edits[row.id] || {}) });
    const isDirty = (row) => {
        const e = edits[row.id];
        return Boolean(e) && EDITABLE.some((k) => k in e && (e[k] ?? '') !== (row[k] ?? ''));
    };
    const dirtyCount = items.data.filter(isDirty).length;

    // กันการเปลี่ยนหน้า / ตัวกรอง ทั้งที่ยังมีแถวที่ยังไม่ Save
    const guard = () => dirtyCount === 0 || window.confirm(`มี ${dirtyCount} รายการที่ยังไม่ได้ Save ต้องการออกจากหน้านี้หรือไม่?`);

    const visit = (next = {}) => {
        if (!guard()) return;
        setEdits({});
        router.get(route('maintenance'), cleanQuery({ ...filters, ...form, ...next }), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const setField = (id, key, value) => setEdits((all) => ({ ...all, [id]: { ...(all[id] || {}), [key]: value } }));

    const resetRow = (id) =>
        setEdits((all) => {
            const { [id]: _removed, ...rest } = all;
            return rest;
        });

    const saveRow = (row) => {
        const data = merged(row);
        const payload = {
            asset_no: data.asset_no,
            technician: data.technician,
            status1: data.status1,
            status2: data.status2,
            qc: data.qc,
        };

        setSavingId(row.id);
        router.patch(route('maintenance.update', row.id), payload, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                resetRow(row.id);
                notify(`บันทึก ${row.code} แล้ว`);
            },
            onError: (errors) => notify(Object.values(errors)[0] || 'บันทึกไม่สำเร็จ', 'error'),
            onFinish: () => setSavingId(null),
        });
    };

    const deleteRow = () => {
        const row = confirmDelete;
        router.delete(route('maintenance.destroy', row.id), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                resetRow(row.id);
                notify(`ลบ ${row.code} แล้ว`);
            },
            onError: () => notify('ลบไม่สำเร็จ', 'error'),
            onFinish: () => setConfirmDelete(null),
        });
    };

    const submit = (e) => {
        e.preventDefault();
        visit();
    };

    const clear = () => {
        setForm({ search: '', site: '', from: '', to: '' });
        visit({ search: '', site: '', from: '', to: '' });
    };

    const views = VIEW_ORDER.filter((v) => v in counts);
    const colCount = 9 + (can.edit || can.delete ? 1 : 0);

    return (
        <>
            {/* ---------- แท็บสถานะ + ตัวกรอง ---------- */}
            <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
                <div className="inline-flex rounded-lg bg-white p-1 shadow-sm ring-1 ring-gray-200">
                    {views.map((v) => {
                        const active = filters.view === v;
                        return (
                            <button
                                key={v}
                                type="button"
                                onClick={() => visit({ view: v })}
                                className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                                    active ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                {VIEW_LABELS[v]}
                                <span className={`rounded-full px-1.5 text-xs tabular-nums ${active ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>
                                    {counts[v].toLocaleString()}
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
                        type="text"
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
                        onClick={() => window.open(route('maintenance.print', cleanQuery(filters)), '_blank')}
                        title="พิมพ์ลงแบบฟอร์ม FR-MNT-002-01 ตามแท็บและตัวกรองที่ใช้อยู่ (ทุกหน้า)"
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
                <p className="mb-3 text-sm text-amber-700 print:hidden">มี {dirtyCount} รายการที่แก้ไขแล้วยังไม่ได้กด Save</p>
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
                                {colCount > 9 && (
                                    <th className="px-3 py-4 text-right print:hidden">
                                        <span className="sr-only">จัดการ</span>
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {items.data.map((original, idx) => {
                                const row = merged(original);
                                const dirty = isDirty(original);
                                const done = isComplete(original);
                                return (
                                    <tr key={row.id} className={`transition ${dirty ? 'bg-amber-50' : idx % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}`}>
                                        <td className="whitespace-nowrap px-3 py-3 tabular-nums text-gray-600">{formatThaiDate(row.date) || '—'}</td>
                                        <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-medium">
                                            {row.tool_id ? (
                                                <Link href={route('record-tool', row.tool_id)} className="text-indigo-600 hover:underline">
                                                    {row.code}
                                                </Link>
                                            ) : (
                                                <span className="text-indigo-600">{row.code}</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3">
                                            {can.edit ? (
                                                <input
                                                    type="text"
                                                    value={row.asset_no}
                                                    onChange={(e) => setField(row.id, 'asset_no', e.target.value)}
                                                    aria-label={`Asset No. ของ ${row.code}`}
                                                    placeholder="ระบุ Asset No."
                                                    className={`${cellInputClass} min-w-[11rem] font-mono ${row.asset_no ? '' : 'border-rose-300'}`}
                                                />
                                            ) : (
                                                <span className="font-mono text-xs text-gray-700">{row.asset_no || '—'}</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3">
                                            {row.found ? (
                                                <span className="text-gray-900">{row.name}</span>
                                            ) : (
                                                <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700">
                                                    ไม่พบรายการใน Machine List
                                                </span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-3 text-center">
                                            <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                                                {row.site || '—'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <Segmented
                                                label="สถานะ"
                                                value={row.status1}
                                                options={STATUS_OPTIONS}
                                                disabled={!can.edit}
                                                date={row.status1 === original.status1 ? original.date_status1 : null}
                                                onChange={(v) => setField(row.id, 'status1', v)}
                                            />
                                        </td>
                                        <td className="px-3 py-3">
                                            {can.edit ? (
                                                <input
                                                    type="text"
                                                    value={row.technician}
                                                    onChange={(e) => setField(row.id, 'technician', e.target.value)}
                                                    aria-label={`ช่างซ่อมของ ${row.code}`}
                                                    placeholder="ชื่อช่าง"
                                                    className={`${cellInputClass} min-w-[8rem]`}
                                                />
                                            ) : (
                                                <span className="text-gray-700">{row.technician || '—'}</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <Segmented
                                                label="การดำเนินงาน"
                                                value={row.status2}
                                                options={PROGRESS_OPTIONS}
                                                disabled={!can.edit}
                                                date={row.status2 === original.status2 ? original.date_status2 : null}
                                                onChange={(v) => setField(row.id, 'status2', v)}
                                            />
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <Segmented
                                                label="QC"
                                                value={row.qc}
                                                options={QC_OPTIONS}
                                                disabled={!can.edit}
                                                date={row.qc === original.qc ? original.date_qc : null}
                                                onChange={(v) => setField(row.id, 'qc', v)}
                                            />
                                        </td>
                                        {colCount > 9 && (
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
                                                            onClick={() => resetRow(row.id)}
                                                            className="rounded-md px-2 py-1.5 text-xs font-medium text-gray-500 transition hover:bg-gray-100"
                                                            title="ยกเลิกการแก้ไขแถวนี้"
                                                        >
                                                            คืนค่า
                                                        </button>
                                                    )}
                                                    {can.edit && (
                                                        <button
                                                            type="button"
                                                            disabled={!dirty || savingId === row.id}
                                                            onClick={() => saveRow(original)}
                                                            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
                                                        >
                                                            {savingId === row.id ? 'กำลังบันทึก…' : 'Save'}
                                                        </button>
                                                    )}
                                                    {can.delete && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setConfirmDelete(row)}
                                                            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}

                            {items.data.length === 0 && (
                                <tr>
                                    <td colSpan={colCount} className="px-4 py-10 text-center text-gray-400">
                                        ไม่พบรายการซ่อมที่ตรงกับเงื่อนไข
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col gap-2 border-t border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-gray-500">
                        ทั้งหมด <span className="font-medium text-gray-700">{items.total.toLocaleString()}</span> รายการ
                    </p>
                    <div className="flex flex-wrap gap-1 print:hidden">
                        {items.links.map((link, i) => (
                            <Link
                                key={i}
                                href={link.url || '#'}
                                preserveState
                                preserveScroll
                                onClick={(e) => {
                                    if (!link.url || !guard()) e.preventDefault();
                                    else setEdits({});
                                }}
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
// แท็บ Add Tool — ส่งเครื่องเข้าซ่อม (หลายเครื่องในครั้งเดียว)
// =====================================================================
const emptyAsset = () => ({ code: '', asset_no: '' });

function AddTool({ onAdded, onCancel }) {
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        site: '',
        date: todayIso(),
        assets: [emptyAsset()],
    });

    const updateAsset = (i, field, value) =>
        setData('assets', data.assets.map((a, j) => (j === i ? { ...a, [field]: value } : a)));

    const removeAsset = (i) => data.assets.length > 1 && setData('assets', data.assets.filter((_, j) => j !== i));

    const submit = (e) => {
        e.preventDefault();
        const count = data.assets.filter((a) => a.code.trim()).length;
        post(route('maintenance.store'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onAdded(count);
            },
        });
    };

    const assetError = (i) => errors[`assets.${i}.code`];

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
                            value={data.site}
                            onChange={(e) => setData('site', e.target.value)}
                            placeholder="เช่น DCPH"
                            className={`${inputClass} w-full ${errors.site ? 'border-rose-400' : ''}`}
                        />
                        {errors.site && <span className="mt-1 block text-xs text-rose-600">{errors.site}</span>}
                    </label>
                    <label className="block">
                        <span className="mb-1.5 block text-sm font-medium text-gray-700">Date</span>
                        <input
                            type="date"
                            value={data.date}
                            onChange={(e) => setData('date', e.target.value)}
                            className={`${inputClass} w-full ${errors.date ? 'border-rose-400' : ''}`}
                        />
                        {data.date && <span className="mt-1 block text-xs text-gray-400">พ.ศ. {formatThaiDate(data.date)}</span>}
                        {errors.date && <span className="block text-xs text-rose-600">{errors.date}</span>}
                    </label>
                </div>

                <div>
                    <span className="mb-1.5 block text-sm font-medium text-gray-700">
                        เครื่องที่ส่งซ่อม <span className="font-normal text-gray-400">({data.assets.length})</span>
                    </span>

                    <div className="space-y-2">
                        <div className="grid grid-cols-[1fr_1fr_2rem] gap-2 px-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">
                            <span>Asset Code</span>
                            <span>Asset No.</span>
                            <span />
                        </div>
                        {data.assets.map((a, i) => (
                            <div key={i}>
                                <div className="grid grid-cols-[1fr_1fr_2rem] items-center gap-2">
                                    <input
                                        value={a.code}
                                        onChange={(e) => {
                                            updateAsset(i, 'code', e.target.value);
                                            clearErrors(`assets.${i}.code`);
                                        }}
                                        placeholder="RT-SDBX-10-0075"
                                        aria-label={`Asset Code รายการที่ ${i + 1}`}
                                        className={`${inputClass} w-full font-mono uppercase ${assetError(i) ? 'border-rose-400' : ''}`}
                                    />
                                    <input
                                        value={a.asset_no}
                                        onChange={(e) => updateAsset(i, 'asset_no', e.target.value)}
                                        placeholder="GI 4901510137"
                                        aria-label={`Asset No. รายการที่ ${i + 1}`}
                                        className={`${inputClass} w-full font-mono`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeAsset(i)}
                                        disabled={data.assets.length === 1}
                                        aria-label={`ลบรายการที่ ${i + 1}`}
                                        className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                                        </svg>
                                    </button>
                                </div>
                                {assetError(i) && <p className="mt-1 text-xs text-rose-600">{assetError(i)}</p>}
                            </div>
                        ))}
                    </div>

                    {errors.assets && <p className="mt-2 text-xs text-rose-600">{errors.assets}</p>}

                    <button
                        type="button"
                        onClick={() => setData('assets', [...data.assets, emptyAsset()])}
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
                        clearErrors();
                        onCancel();
                    }}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={processing}
                    className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
                >
                    {processing ? 'กำลังบันทึก…' : 'Save'}
                </button>
            </div>
        </form>
    );
}

// =====================================================================
// หน้า Maintenance Status
// =====================================================================
export default function Mainten_Status({ items, filters, counts, can }) {
    const [section, setSection] = useState('Add Tool');
    const [toast, setToast] = useState(null);

    const notify = (message, type = 'success') => setToast({ message, type, at: Date.now() });
    const clearToast = useCallback(() => setToast(null), []);

    const sections = [...(can.add ? [{ key: 'add', label: 'Add Tool' }] : []), { key: 'repair', label: 'Repair' }];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">Maintenance Status</h2>
                    {sections.length > 1 && (
                        <div role="tablist" className="inline-flex border-b border-gray-200 print:hidden">
                            {sections.map((s) => {
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
                    )}
                </div>
            }
        >
            <Head title="Maintenance Status" />

            <div className="py-8">
                <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8">
                    {section === 'repair' ? (
                        <RepairList items={items} filters={filters} counts={counts} can={can} notify={notify} />
                    ) : (
                        <AddTool
                            onAdded={(n) => {
                                setSection('repair');
                                notify(`ส่งเข้าซ่อม ${n} เครื่องแล้ว`);
                            }}
                            onCancel={() => setSection('repair')}
                        />
                    )}
                </div>
            </div>

            <Toast toast={toast} onDone={clearToast} />
        </AuthenticatedLayout>
    );
}
