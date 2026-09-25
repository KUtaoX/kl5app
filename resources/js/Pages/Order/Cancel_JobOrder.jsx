import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';

const JOB_TYPE_LABELS = ['ซ่อมเร่งด่วน', 'บำรุงรักษา', 'ติดตั้ง', 'Audit', 'ซ่อมภายใน'];

function Field({ label, value }) {
    return (
        <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
            <div className="w-full rounded-md border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 shadow-sm">
                {value || '-'}
            </div>
        </div>
    );
}

export default function Cancel_JobOrder({ jobOrder, tool, dateFrTh, date1Th, date2Th, stopDateTh }) {
    const { data, setData, put, processing } = useForm({
        remark: '',
    });

    const machineLabel = tool
        ? `${tool.name ?? ''}${tool.asset ? ` | ${tool.asset}` : ''}`
        : '';

    function handleSave(e) {
        e.preventDefault();
        put(`/record/${jobOrder.id}/cancel`);
    }

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Cancel Job Order
                </h2>
            }
        >
            <Head title="ยกเลิกใบสั่งงาน" />

            <div className="py-8">
                <div className="mx-auto max-w-[96rem] px-4 sm:px-6 lg:px-8">

                    <div className="mb-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
                        <div className="px-6 py-6">
                            <h1 className="mb-4 text-center text-lg font-semibold">
                                ใบสั่งงาน และรายงานการปฏิบัติงาน (JOB ORDER)
                            </h1>

                            <form onSubmit={handleSave}>
                                <label className="mb-2 block font-medium">หมายเหตุการยกเลิก :</label>
                                <textarea
                                    value={data.remark}
                                    onChange={(e) => setData('remark', e.target.value)}
                                    rows={5}
                                    className="mb-4 w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />

                                <div className="flex justify-center gap-3">
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        Save
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => window.history.back()}
                                        className="rounded-lg bg-red-600 px-6 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700"
                                    >
                                        Back
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
                        <div className="bg-indigo-50 px-6 py-3">
                            <h3 className="text-sm font-semibold text-indigo-900">ประเภทของงาน และรายละเอียด</h3>
                        </div>

                        <div className="space-y-6 px-6 py-6">
                            <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-gray-700">
                                {JOB_TYPE_LABELS.map((label, i) => (
                                    <label key={label} className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            checked={Number(jobOrder.status1) === i}
                                            readOnly
                                            className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        {label}
                                    </label>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Field label="โครงการ" value={jobOrder.site} />
                                <Field label="วันที่" value={dateFrTh} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Field label="วัน-เวลาเข้า site งาน" value={`${date1Th} ${jobOrder.time1 ?? ''}`} />
                                <Field label="วัน-เวลาออก site งาน" value={`${date2Th} ${jobOrder.time2 ?? ''}`} />
                            </div>

                            <Field label="ชื่อ / รหัสเครื่องจักร" value={machineLabel} />
                            <Field label="ชื่อผู้รับผิดชอบ" value={jobOrder.name1} />

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="หมายเลขไมล์ (ถ้ามี)" value={jobOrder.num_mi ? `${jobOrder.num_mi} Km.` : ''} />
                                <Field label="หมายเลข ชม. (ถ้ามี)" value={jobOrder.time_work ? `${jobOrder.time_work} ชม.` : ''} />
                            </div>

                            <div className="bg-indigo-50 px-6 py-3">
                                <h3 className="text-sm font-semibold text-indigo-900">
                                    อาการเสียหายของเครื่องจักร (รับแจ้งจากผู้ควบคุมเครื่องจักร)
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label=" " value={jobOrder.cause || '-'} />
                                <Field label="ผู้รับแจ้ง / ผู้จัดทำ" value={jobOrder.name2 || '-'} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}