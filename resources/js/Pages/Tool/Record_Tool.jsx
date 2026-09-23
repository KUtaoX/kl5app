import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';

const FIELDS = [
    { key: 'name', label: 'ชื่อเครื่องจักร/ยี่ห้อ/รุ่น:' },
    { key: 'asset', label: 'รหัสทรัพย์สิน:' },
    { key: 'io_no', label: 'IO Preventive No.:' },
    { key: 'io_no2', label: 'IO Corective No.:' },
];

export default function RecordTool({ tool, jobOrders = [] }) {
    
    const canAdd = usePage().props.auth.user.permission2 === '1';
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Record Tool
                </h2>
            }
        >
            <Head title="Record Tool" />

            <div className="py-8">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">

                    <div className="max-w-2xl">
                        <table className="w-full overflow-hidden rounded-lg border border-indigo-200 text-sm">
                            <tbody>
                                {FIELDS.map((field) => (
                                    <tr key={field.key} className="border-b border-indigo-200 last:border-b-0">
                                        <td className="w-2/5 border-r border-indigo-200 bg-indigo-100 px-4 py-3 font-medium text-gray-700">
                                            {field.label}
                                        </td>
                                        <td className="bg-white px-4 py-3 text-gray-900">
                                            {tool?.[field.key] || ''}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="my-6">
                        {canAdd && (
                            <button
                                type="button"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
                            >
                                Get Job Order
                            </button>
                        )}
                    </div>

                    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50">
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">วันที่</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Job Order No.</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">รายการซ่อมบำรุง</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Site</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">PM App.</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Cost</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Record</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Print</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Edit</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Cancel</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {jobOrders.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="px-4 py-10 text-center text-gray-400">
                                                ยังไม่มีรายการ Job Order
                                            </td>
                                        </tr>
                                    ) : (
                                        jobOrders.map((jo) => (
                                            <tr key={jo.id} className="hover:bg-indigo-50/40">
                                                <td className="px-4 py-3 text-center text-gray-700">{jo.date}</td>
                                                <td className="px-4 py-3 text-center font-mono text-xs text-indigo-600">{jo.job_order_no}</td>
                                                <td className="px-4 py-3 text-center text-gray-900">{jo.description}</td>
                                                <td className="px-4 py-3 text-center text-gray-700">{jo.site}</td>
                                                <td className="px-4 py-3 text-center text-gray-700">{jo.pm_app}</td>
                                                <td className="px-4 py-3 text-center text-gray-700">{jo.cost}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <Link href={`/job-order/${jo.id}`} className="text-indigo-600 hover:underline">Record</Link>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <Link href={`/job-order/${jo.id}/print`} className="text-indigo-600 hover:underline">Print</Link>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <Link href={`/job-order/${jo.id}/edit`} className="text-indigo-600 hover:underline">Edit</Link>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button className="text-red-600 hover:underline">Cancel</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="mt-4">
                        <Link href="/machine-list" className="text-sm text-gray-600 hover:underline">
                            ← Back to Machine List
                        </Link>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}