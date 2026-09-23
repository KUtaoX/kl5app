import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';

const TYPE_LABELS = { 0: 'MT', 1: 'TEMP', 2: 'LGT' };

const TYPE_OPTIONS = [
    { value: 0, label: 'MT' },
    { value: 1, label: 'TEMP' },
    { value: 2, label: 'LGT' },
];

const TYPE_BADGE = {
    0: 'bg-emerald-100 text-emerald-700', // MT
    1: 'bg-amber-100 text-amber-700',     // TEMP
    2: 'bg-rose-100 text-rose-700',       // LGT
};
export default function JobOrderType({ items }) {
    // const importForm = useForm({ file: null });
    const createForm = useForm({ name: '', code: '', type_code: 0 });

    // function handleImport(e) {
    //     e.preventDefault();
    //     importForm.post(route('job-order-types.import'), {
    //         forceFormData: true,
    //         preserveScroll: true,
    //         onSuccess: () => importForm.reset('file'),
    //     });
    // }

    function handleCreate(e) {
        e.preventDefault();
        createForm.post(route('job-order-types.store'), {
            preserveScroll: true,
            onSuccess: () => createForm.reset('name', 'code', 'type_code'),
        });
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
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-6">

                    {/* Upload section */}
                    {/* <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
                        <form onSubmit={handleImport} className="p-6">
                            <h3 className="text-sm font-semibold text-gray-700">Upload Tool File</h3>
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={(e) => importForm.setData('file', e.target.files[0] ?? null)}
                                    className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
                                />
                                <button
                                    type="submit"
                                    disabled={!importForm.data.file || importForm.processing}
                                    className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {importForm.processing ? 'กำลัง Upload...' : 'Upload'}
                                </button>
                            </div>
                            {importForm.errors.file && (
                                <p className="mt-2 text-xs text-red-500">{importForm.errors.file}</p>
                            )}
                        </form>
                    </div> */}

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
                            <div className="flex items-center gap-4">
                                {TYPE_OPTIONS.map((opt) => (
                                    <label key={opt.value} className="flex items-center gap-1.5 text-sm text-gray-700">
                                        <input
                                            type="radio"
                                            name="type_code"
                                            value={opt.value}
                                            checked={createForm.data.type_code === opt.value}
                                            onChange={() => createForm.setData('type_code', opt.value)}
                                            className="text-indigo-600 focus:ring-indigo-500"
                                        />
                                        {opt.label}
                                    </label>
                                ))}
                            </div>
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
                                            <td className="px-4 py-3 text-gray-900">{item.name}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.code}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_BADGE[item.type_code] ?? 'bg-gray-100 text-gray-600'}`}>
                                                    {TYPE_LABELS[item.type_code] ?? item.type_code}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
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
        </AuthenticatedLayout>
    );
}