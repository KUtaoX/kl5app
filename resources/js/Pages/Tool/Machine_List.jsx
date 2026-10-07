import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import Modal from '@/Components/Modal';

// สีสำหรับ badge Project Site — hash ชื่อไซต์เป็น index คงที่
// ไซต์เดียวกันจะได้สีเดิมเสมอ ช่วยให้กวาดตาแยกกลุ่มได้ง่ายขึ้น
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

// พิมพ์แล้วรอเท่านี้ (มิลลิวินาที) ค่อยค้นหา จะได้ไม่ยิงคำขอทุกตัวอักษร
const SEARCH_DELAY = 400;

function siteColor(site) {
    if (!site) return 'bg-gray-100 text-gray-500';
    let hash = 0;
    for (let i = 0; i < site.length; i++) {
        hash = (hash * 31 + site.charCodeAt(i)) >>> 0;
    }
    return SITE_COLORS[hash % SITE_COLORS.length];
}

export default function Index({ tools, filters }) {
    const [search, setSearch] = useState(filters.search || '');
    const [searching, setSearching] = useState(false);
    const lastSearched = useRef(filters.search || '');
    const canAdd = usePage().props.auth.user.permission2 === '1';
    const canEdit = usePage().props.auth.user.permission3 === '1';
    const canDelete = usePage().props.auth.user.permission4 === '1';
    const columnCount = 8 + (canEdit ? 1 : 0) + (canDelete ? 1 : 0);

    // ---------- ค้นหาอัตโนมัติ ----------
    // ค้นหาทุกคอลัมน์ (Asset Code, Asset No., IO, Name, Model, Serial, Project Site) เหมือนตัวเลือก "Select Filter" เดิม
    useEffect(() => {
        const query = search.trim();
        if (query === lastSearched.current) return;

        const timer = setTimeout(() => {
            lastSearched.current = query;
            router.get(
                '/machine-list',
                query ? { search: query } : {},
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    onStart: () => setSearching(true),
                    onFinish: () => setSearching(false),
                },
            );
        }, SEARCH_DELAY);

        return () => clearTimeout(timer);
    }, [search]);

    // ---------- ลบเครื่อง ----------
    const [confirmTool, setConfirmTool] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const [toast, setToast] = useState('');

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(''), 2600);
        return () => clearTimeout(t);
    }, [toast]);

    function openDelete(tool) {
        setDeleteError('');
        setConfirmTool(tool);
    }

    function closeDelete() {
        if (deleting) return;
        setConfirmTool(null);
        setDeleteError('');
    }

    function handleDelete() {
        const tool = confirmTool;
        setDeleting(true);
        router.delete(route('machine-list.destroy', tool.id), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setConfirmTool(null);
                setToast(`ลบ ${tool.asset} แล้ว`);
            },
            onError: (errors) => setDeleteError(errors.delete || 'ลบไม่สำเร็จ'),
            onFinish: () => setDeleting(false),
        });
    }

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Machine List
                </h2>
            }
        >
            <Head title="Machine List" />

            <div className="py-8">
                <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8">

                    <div className="mb-4 grid grid-cols-1 items-center gap-3 sm:grid-cols-3">
                        <div className="hidden sm:block" />

                        <div className="flex justify-center">
                            <div className="relative w-full max-w-md">
                                {searching ? (
                                    <svg
                                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-indigo-500"
                                        fill="none" viewBox="0 0 24 24" aria-hidden="true"
                                    >
                                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                                        <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                    </svg>
                                ) : (
                                    <svg
                                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
                                    </svg>
                                )}
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Escape' && setSearch('')}
                                    placeholder="ค้นหา Asset Code / ชื่อ / Model / Serial / Site..."
                                    aria-label="ค้นหาเครื่องจักร"
                                    className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-9 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch('')}
                                        aria-label="ล้างคำค้นหา"
                                        title="ล้างคำค้นหา (Esc)"
                                        className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                                    >
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end">
                            {canAdd && (
                                <button
                                    type="button"
                                    onClick={() => router.visit('/add-tool')}
                                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                    Add Tool
                                </button>
                            )}
                        </div>
                    </div>

                    <div className={`overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition-opacity ${searching ? 'opacity-70' : ''}`}>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <colgroup>
                                    <col className="w-32" />
                                    <col className="w-40" />
                                    <col className="w-24" />
                                    <col className="w-24" />
                                    <col className="w-56" />
                                    <col className="w-28" />
                                    <col className="w-44" />
                                    <col className="w-24" />
                                    {canEdit && <col className="w-16" />}
                                    {canDelete && <col className="w-16" />}
                                </colgroup>
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50">
                                        <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Asset Code</th>
                                        <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Asset No.</th>
                                        <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">IO Pre.</th>
                                        <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">IO Cor.</th>
                                        <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Name</th>
                                        <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Model</th>
                                        <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Serial</th>
                                        <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Project Site</th>
                                        {canEdit && (
                                            <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Edit</th>
                                        )}
                                        {canDelete && (
                                            <th className="px-4 py-4 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Delete</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {tools.data.map((tool, idx) => (
                                        <tr
                                            key={tool.id}
                                            onClick={() => router.visit(`/record-tool/${tool.id}`)}
                                            className={`cursor-pointer transition hover:bg-indigo-50/40 ${idx % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}`}
                                        >
                                            <td className="px-4 py-3 text-center align-top font-mono text-xs font-medium text-indigo-600">
                                                {tool.asset}
                                            </td>
                                            <td className="px-4 py-4 text-center align-top font-mono text-xs text-gray-600">{tool.asset_in || '—'}</td>
                                            <td className="px-4 py-4 text-center align-top font-mono text-xs tabular-nums text-gray-500">{tool.io_no || '—'}</td>
                                            <td className="px-4 py-4 text-center align-top font-mono text-xs tabular-nums text-gray-500">{tool.io_no2 || '—'}</td>
                                            <td className="px-4 py-4 text-center align-top text-gray-900">{tool.name}</td>
                                            <td className="px-4 py-4 text-center align-top text-gray-700">{tool.model}</td>
                                            <td className="px-4 py-4 text-center align-top font-mono text-xs text-gray-500">{tool.serial || '—'}</td>
                                            <td className="px-4 py-4 text-center align-top">
                                                <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${siteColor(tool.project_site)}`}>
                                                    {tool.project_site}
                                                </span>
                                            </td>
                                            {canEdit && (
                                                <td className="px-4 py-4 text-center align-top">
                                                    <Link href={`/edit-tool/${tool.id}`} className="text-indigo-600 hover:text-indigo-900 hover:underline" onClick={(e) => e.stopPropagation()}>
                                                        Edit
                                                    </Link>
                                                </td>
                                            )}
                                            {canDelete && (
                                                <td className="px-4 py-4 text-center align-top">
                                                    <button
                                                        type="button"
                                                        className="text-red-600 hover:text-red-900 hover:underline"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openDelete(tool);
                                                        }}
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}

                                    {tools.data.length === 0 && (
                                        <tr>
                                            <td colSpan={columnCount} className="px-4 py-10 text-center text-gray-400">
                                                {search.trim() ? `ไม่พบเครื่องที่ตรงกับ "${search.trim()}"` : 'ไม่พบข้อมูล'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col gap-2 border-t border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-gray-500">
                                ทั้งหมด <span className="font-medium text-gray-700">{tools.total}</span> รายการ
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {tools.links.map((link, i) => (
                                    <Link
                                        key={i}
                                        href={link.url || '#'}
                                        preserveState
                                        preserveScroll
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

            {/* ---------- ยืนยันการลบ ---------- */}
            <Modal show={Boolean(confirmTool)} maxWidth="md" onClose={closeDelete}>
                {confirmTool && (
                    <div className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900">ลบเครื่องนี้ออกจาก Machine List?</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            <span className="font-mono text-indigo-600">{confirmTool.asset}</span>
                            {confirmTool.name ? ` · ${confirmTool.name}` : ''} จะถูกลบถาวร และกู้คืนไม่ได้
                        </p>
                        {deleteError && (
                            <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{deleteError}</p>
                        )}
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={closeDelete}
                                disabled={deleting}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
                            >
                                {deleteError ? 'ปิด' : 'ยกเลิก'}
                            </button>
                            {!deleteError && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
                                >
                                    {deleting ? 'กำลังลบ…' : 'ลบเครื่อง'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {toast && (
                <div role="status" className="fixed bottom-6 right-6 z-50 rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-lg dark:bg-gray-100">
                    {toast}
                </div>
            )}
        </AuthenticatedLayout>
    );
}
