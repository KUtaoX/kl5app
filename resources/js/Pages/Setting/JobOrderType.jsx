import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const TYPE_OPTIONS = [
    { value: 0, label: 'MT', active: 'bg-[#F4AE52] text-white' },
    { value: 1, label: 'TEMP', active: 'bg-[#D4621A] text-white' },
    { value: 2, label: 'LGT', active: 'bg-[#2A1A0E] text-white' },
];

/**
 * ช่องชื่อที่พิมพ์แก้ได้ในตาราง
 * บันทึกเมื่อกด Enter หรือคลิกออกจากช่อง, กด Esc เพื่อยกเลิก
 */
function EditableName({ item, canEdit, onSaved, onError }) {
    const [value, setValue] = useState(item.name ?? '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // ข้อมูลจาก server เปลี่ยน (เช่น บันทึกเสร็จ หรือหน้าโหลดใหม่) ให้ช่องแสดงค่าล่าสุด
    useEffect(() => {
        setValue(item.name ?? '');
    }, [item.name]);

    if (!canEdit) return <span className="text-gray-900">{item.name}</span>;

    const save = () => {
        const name = value.trim();
        if (name === (item.name ?? '').trim()) {
            setValue(item.name ?? '');
            setError('');
            return;
        }
        if (!name) {
            setError('กรุณาใส่ชื่อ');
            return;
        }
        setSaving(true);
        router.patch(
            route('job-order-types.update', item.id),
            { name },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setError('');
                    onSaved(`บันทึกชื่อ ${item.code} แล้ว`);
                },
                onError: (errors) => {
                    setError(errors.name || 'บันทึกไม่สำเร็จ');
                    onError();
                },
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <div>
            <input
                type="text"
                value={value}
                disabled={saving}
                onChange={(e) => {
                    setValue(e.target.value);
                    setError('');
                }}
                onBlur={save}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        e.currentTarget.blur(); // บันทึกผ่าน onBlur
                    } else if (e.key === 'Escape') {
                        setValue(item.name ?? '');
                        setError('');
                        e.currentTarget.blur();
                    }
                }}
                aria-label={`ชื่อของ ${item.code}`}
                title="พิมพ์แก้แล้วกด Enter เพื่อบันทึก"
                className={`w-full rounded-md border px-2 py-1 text-sm text-gray-900 transition focus:outline-none focus:ring-1 disabled:opacity-60 ${
                    error
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
                        : 'border-transparent bg-transparent hover:border-gray-300 focus:border-indigo-500 focus:bg-white focus:ring-indigo-500'
                }`}
            />
            {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
        </div>
    );
}

/**
 * ปุ่มสลับ MT / TEMP / LGT
 * disabled = แสดงค่าอย่างเดียว กดไม่ได้
 */
function TypeToggle({ value, onChange, disabled = false, saving = false, label = 'ประเภท' }) {
    return (
        <div
            role="radiogroup"
            aria-label={label}
            className={`inline-flex rounded-lg bg-gray-100 p-0.5 ${saving ? 'opacity-60' : ''}`}
        >
            {TYPE_OPTIONS.map((opt) => {
                const active = Number(value) === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        disabled={disabled || saving}
                        onClick={() => !active && onChange(opt.value)}
                        className={`min-w-[3.25rem] rounded-md px-3 py-1 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-default ${
                            active
                                ? `${opt.active} shadow-sm`
                                : `text-gray-500 ${disabled ? '' : 'hover:bg-gray-200 hover:text-gray-800'}`
                        }`}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

export default function JobOrderType({ items }) {
    const user = usePage().props.auth.user;
    // แก้ประเภทได้ต้องมีสิทธิ์ Can Edit และไม่เป็น Read Only (Admin ได้อัตโนมัติ)
    const canEdit = user.permission3 === '1' && user.permission5 !== '1';

    const createForm = useForm({ name: '', code: '', type_code: 0 });
    const [savingId, setSavingId] = useState(null);
    const [toast, setToast] = useState('');

    function handleCreate(e) {
        e.preventDefault();
        createForm.post(route('job-order-types.store'), {
            preserveScroll: true,
            onSuccess: () => createForm.reset('name', 'code', 'type_code'),
        });
    }

    function showToast(message) {
        setToast(message);
        setTimeout(() => setToast(''), 2500);
    }

    function handleChangeType(item, typeCode) {
        setSavingId(item.id);
        router.patch(
            route('job-order-types.update-type', item.id),
            { type_code: typeCode },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    const label = TYPE_OPTIONS.find((o) => o.value === typeCode)?.label;
                    setToast(`เปลี่ยน ${item.code} เป็น ${label} แล้ว`);
                    setTimeout(() => setToast(''), 2500);
                },
                onError: () => {
                    setToast('เปลี่ยนประเภทไม่สำเร็จ');
                    setTimeout(() => setToast(''), 2500);
                },
                onFinish: () => setSavingId(null),
            },
        );
    }

    function handleDelete(item) {
        if (!confirm(`ต้องการลบ "${item.name}" ใช่ไหม?`)) return;
        router.delete(route('job-order-types.destroy', item.id), { preserveScroll: true });
    }

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Job Order Type
                </h2>
            }
        >
            <Head title="Job Order Type" />

            <div className="py-8">
                <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6 lg:px-8">

                    {/* New List form */}
                    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
                        <div className="border-b border-gray-200 px-6 py-3">
                            <h3 className="text-sm font-semibold text-gray-700">New List</h3>
                        </div>
                        <form onSubmit={handleCreate} className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center">
                            <input
                                type="text"
                                placeholder="Name"
                                value={createForm.data.name}
                                onChange={(e) => createForm.setData('name', e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-1/3"
                            />
                            <input
                                type="text"
                                placeholder="Code"
                                value={createForm.data.code}
                                onChange={(e) => createForm.setData('code', e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-1/3"
                            />
                            <TypeToggle
                                label="ประเภทของรายการใหม่"
                                value={createForm.data.type_code}
                                onChange={(v) => createForm.setData('type_code', v)}
                            />
                            <button
                                type="submit"
                                disabled={createForm.processing}
                                className="shrink-0 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {createForm.processing ? 'Saving...' : 'Save'}
                            </button>
                        </form>
                        {(createForm.errors.name || createForm.errors.code || createForm.errors.type_code) && (
                            <p className="px-6 pb-4 text-xs text-red-500">
                                {createForm.errors.name || createForm.errors.code || createForm.errors.type_code}
                            </p>
                        )}
                    </div>

                    {/* List */}
                    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
                        <div className="border-b border-gray-200 px-6 py-3">
                            <h3 className="text-sm font-semibold text-gray-700">รายการประเภทงานบำรุงรักษา (Job Order Type)</h3>
                            {canEdit && (
                                <p className="mt-0.5 text-xs text-gray-500">
                                    คลิกที่ชื่อเพื่อพิมพ์แก้ (กด Enter บันทึก, Esc ยกเลิก) และกด MT / TEMP / LGT เพื่อเปลี่ยนประเภท
                                    ประเภทมีผลกับใบสั่งงานที่สร้างใหม่ ใบสั่งงานเดิมไม่เปลี่ยน
                                </p>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Name</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Code</th>
                                        <th className="px-4 py-3 text-center font-semibold text-gray-600">Type</th>
                                        <th className="px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {items.map((item) => (
                                        <tr key={item.id} className="transition hover:bg-gray-50">
                                            <td className="px-2 py-2">
                                                <EditableName
                                                    item={item}
                                                    canEdit={canEdit}
                                                    onSaved={showToast}
                                                    onError={() => {}}
                                                />
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.code}</td>
                                            <td className="px-4 py-3 text-center">
                                                <TypeToggle
                                                    label={`ประเภทของ ${item.code}`}
                                                    value={item.type_code}
                                                    disabled={!canEdit}
                                                    saving={savingId === item.id}
                                                    onChange={(v) => handleChangeType(item, v)}
                                                />
                                            </td>

                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(item)}
                                                    className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-red-700"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    {items.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                                                ยังไม่มีรายการ
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>

            {toast && (
                <div role="status" className="fixed bottom-6 right-6 z-50 rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-lg dark:bg-gray-100">
                    {toast}
                </div>
            )}
        </AuthenticatedLayout>
    );
}
