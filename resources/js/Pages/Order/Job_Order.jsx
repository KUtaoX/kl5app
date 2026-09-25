import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

const JOB_TYPES = [
    { value: 'urgent', label: 'ซ่อมเร่งด่วน' },
    { value: 'maintenance', label: 'บำรุงรักษา' },
    { value: 'install', label: 'ติดตั้ง' },
    { value: 'audit', label: 'Audit' },
    { value: 'internal', label: 'ซ่อมภายใน' },
];

function TimeSelect({ value, onChange }) {
    return (
        <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
            className="w-12 rounded-md border-gray-300 text-center text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
    );
}

export default function JobOrder({ tool }) {
    const { data, setData, post, transform, processing, errors } = useForm({
        asset: tool?.asset ?? '',
        job_type: 'urgent',
        project: '',
        date: '',
        in_date: '',
        in_time_h: '00',
        in_time_m: '00',
        out_date: '',
        out_time_h: '00',
        out_time_m: '00',
        responsible_name: '',
        mileage: '',
        hour_meter: '',
        stop_date: '',
        stop_time_h: '00',
        stop_time_m: '00',
        damage_description: '',
        reporter_name: '',
        comment: '',
        repair_mode: 'outsource',
        approver_name: '',
    });

    const machineLabel = tool
        ? `${tool.name ?? ''}${tool.asset ? ` | ${tool.asset}` : ''}`
        : '';

    function handleSubmit(e) {
        e.preventDefault();
        transform((data) => ({
            ...data,
            in_time: `${data.in_time_h}:${data.in_time_m}`,
            out_time: `${data.out_time_h}:${data.out_time_m}`,
            stop_time: `${data.stop_time_h}:${data.stop_time_m}`,
        }));
        post('/job-order');
    }

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
                <div className="mx-auto max-w-[96rem] px-4 sm:px-6 lg:px-8">
                    <form onSubmit={handleSubmit} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">

                        <div className="bg-indigo-50 px-6 py-3">
                            <h3 className="text-sm font-semibold text-indigo-900">ประเภทของงาน และรายละเอียด</h3>
                        </div>

                        <div className="space-y-6 px-6 py-6">
                            <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
                                {JOB_TYPES.map((jt) => (
                                    <label key={jt.value} className="flex items-center gap-2 text-sm text-gray-700">
                                        <input
                                            type="radio"
                                            name="job_type"
                                            value={jt.value}
                                            checked={data.job_type === jt.value}
                                            onChange={() => setData('job_type', jt.value)}
                                            className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        {jt.label}
                                    </label>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Field label="โครงการ">
                                    <input
                                        type="text"
                                        value={data.project}
                                        onChange={(e) => setData('project', e.target.value)}
                                        className="w-full max-w-[10rem] rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        placeholder="เช่น KL-5"
                                    />
                                </Field>
                                <Field label="วันที่">
                                    <input
                                        type="date"
                                        value={data.date}
                                        onChange={(e) => setData('date', e.target.value)}
                                        className="w-full max-w-[12rem] rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    />
                                </Field>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Field label="วัน-เวลาเข้า site งาน">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="date"
                                            value={data.in_date}
                                            onChange={(e) => setData('in_date', e.target.value)}
                                            className="max-w-[12rem] flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        />
                                        <TimeSelect value={data.in_time_h} onChange={(v) => setData('in_time_h', v)} />
                                        <span>:</span>
                                        <TimeSelect value={data.in_time_m} onChange={(v) => setData('in_time_m', v)} />
                                    </div>
                                </Field>
                                <Field label="วัน-เวลาออก site งาน">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="date"
                                            value={data.out_date}
                                            onChange={(e) => setData('out_date', e.target.value)}
                                            className="max-w-[12rem] flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        />
                                        <TimeSelect value={data.out_time_h} onChange={(v) => setData('out_time_h', v)} />
                                        <span>:</span>
                                        <TimeSelect value={data.out_time_m} onChange={(v) => setData('out_time_m', v)} />
                                    </div>
                                </Field>
                            </div>

                            <Field label="ชื่อ / รหัสเครื่องจักร">
                                <input
                                    type="text"
                                    readOnly
                                    value={machineLabel}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-gray-50 text-gray-600"
                                />
                            </Field>

                            <Field label="ชื่อผู้รับผิดชอบ">
                                <input
                                    type="text"
                                    value={data.responsible_name}
                                    onChange={(e) => setData('responsible_name', e.target.value)}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                />
                            </Field>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="หมายเลขไมล์ (ถ้ามี)">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={data.mileage}
                                            onChange={(e) => setData('mileage', e.target.value)}
                                            className="w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        />
                                        <span className="text-sm text-gray-500">Km.</span>
                                    </div>
                                </Field>
                                <Field label="หมายเลข ชม. (ถ้ามี)">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={data.hour_meter}
                                            onChange={(e) => setData('hour_meter', e.target.value)}
                                            className="w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        />
                                        <span className="text-sm text-gray-500">ชม.</span>
                                    </div>
                                </Field>
                            </div>
                        </div>

                        <div className="bg-indigo-50 px-6 py-3">
                            <h3 className="text-sm font-semibold text-indigo-900">
                                อาการเสียหายของเครื่องจักร (รับแจ้งจากผู้ควบคุมเครื่องจักร)
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 gap-4 px-6 py-6 lg:grid-cols-3">
                            <div className="lg:col-span-2 space-y-4">
                                <Field label="วันที่เครื่องจักรหยุดทำงาน">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="date"
                                            value={data.stop_date}
                                            onChange={(e) => setData('stop_date', e.target.value)}
                                            className="max-w-[12rem] flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        />
                                        <TimeSelect value={data.stop_time_h} onChange={(v) => setData('stop_time_h', v)} />
                                        <span>:</span>
                                        <TimeSelect value={data.stop_time_m} onChange={(v) => setData('stop_time_m', v)} />
                                    </div>
                                </Field>
                                <textarea
                                    rows={4}
                                    value={data.damage_description}
                                    onChange={(e) => setData('damage_description', e.target.value)}
                                    className="w-full resize-y rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    placeholder="รายละเอียดอาการเสียหาย"
                                />
                            </div>

                            <div className="rounded-lg border border-gray-200">
                                <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-center text-xs font-semibold text-gray-600">
                                    ผู้รับแจ้ง / ผู้จัดทำ
                                </div>
                                <div className="p-3">
                                    <input
                                        type="text"
                                        value={data.reporter_name}
                                        onChange={(e) => setData('reporter_name', e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-indigo-50 px-6 py-3">
                            <h3 className="text-sm font-semibold text-indigo-900">ความเห็น</h3>
                        </div>

                        <div className="grid grid-cols-1 gap-4 px-6 py-6 lg:grid-cols-3">
                            <div className="lg:col-span-2 space-y-4">
                                <textarea
                                    rows={4}
                                    value={data.comment}
                                    onChange={(e) => setData('comment', e.target.value)}
                                    className="w-full resize-y rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                />

                                <div className="flex gap-6">
                                    <label className="flex items-center gap-2 text-sm text-gray-700">
                                        <input
                                            type="radio"
                                            name="repair_mode"
                                            checked={data.repair_mode === 'outsource'}
                                            onChange={() => setData('repair_mode', 'outsource')}
                                            className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        Outsource
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-gray-700">
                                        <input
                                            type="radio"
                                            name="repair_mode"
                                            checked={data.repair_mode === 'self'}
                                            onChange={() => setData('repair_mode', 'self')}
                                            className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        ซ่อมเอง
                                    </label>
                                </div>
                            </div>

                            <div className="rounded-lg border border-gray-200">
                                <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-center text-xs font-semibold text-gray-600">
                                    ผู้อนุมัติ
                                </div>
                                <div className="p-3">
                                    <input
                                        type="text"
                                        value={data.approver_name}
                                        onChange={(e) => setData('approver_name', e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-center gap-3 border-t border-gray-100 px-6 py-6">
                            <button
                                type="submit"
                                disabled={processing}
                                className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {processing ? 'กำลังบันทึก...' : 'Save'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-4 flex justify-center">
                        <Link
                            href="/machine-list"
                            className="rounded-lg bg-red-600 px-6 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700"
                        >
                            Back
                        </Link>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
            {children}
        </div>
    );
}