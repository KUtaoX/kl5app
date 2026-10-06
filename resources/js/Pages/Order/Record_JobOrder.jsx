import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

const JOB_TYPES = [
    { value: 'urgent', label: 'ซ่อมเร่งด่วน' },
    { value: 'maintenance', label: 'บำรุงรักษา' },
    { value: 'install', label: 'ติดตั้ง' },
    { value: 'audit', label: 'Audit' },
    { value: 'internal', label: 'ซ่อมภายใน' },
];

// นามสกุลไฟล์ที่ยอมให้แนบในส่วน "เอกสาร" — เช็คฝั่ง client เพื่อ UX
// เซิร์ฟเวอร์ยังต้อง validate ซ้ำเสมอ (ห้ามพึ่งการเช็คฝั่งนี้อย่างเดียว)
const ALLOWED_DOC_EXT = ['jpg', 'jpeg', 'png', 'pdf', 'xlsx', 'xls', 'doc', 'docx'];
const MAX_DOC_SIZE_MB = 5;
const MAX_DOC_COUNT = 3;

function Field({ label, children }) {
    return (
        <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
            {children}
        </div>
    );
}

function ReadOnlyInput({ value }) {
    return (
        <input
            type="text"
            readOnly
            value={value ?? ''}
            className="w-full rounded-md border-gray-300 bg-gray-50 text-gray-600 shadow-sm sm:text-sm"
        />
    );
}

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

// ===== ตัวช่วย: สลับระหว่างโหมดอ่านอย่างเดียว / แก้ไขได้ ตาม prop `editable` =====

function TextInputOrReadOnly({ editable, value, onChange }) {
    if (!editable) return <ReadOnlyInput value={value} />;
    return (
        <input
            type="text"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
    );
}

function DateInputOrReadOnly({ editable, value, onChange }) {
    if (!editable) return <ReadOnlyInput value={value} />;
    return (
        <input
            type="date"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="max-w-[12rem] flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
    );
}

function TimeBoxOrReadOnly({ editable, h, m, onH, onM }) {
    if (!editable) {
        return (
            <div className="flex items-center gap-2">
                <span className="w-12 rounded-md border border-gray-300 bg-gray-50 px-2 py-1 text-center text-sm text-gray-600">
                    {h ?? '00'}
                </span>
                <span>:</span>
                <span className="w-12 rounded-md border border-gray-300 bg-gray-50 px-2 py-1 text-center text-sm text-gray-600">
                    {m ?? '00'}
                </span>
            </div>
        );
    }
    return (
        <div className="flex items-center gap-2">
            <TimeSelect value={h} onChange={onH} />
            <span>:</span>
            <TimeSelect value={m} onChange={onM} />
        </div>
    );
}

function TextAreaOrReadOnly({ editable, value, onChange, rows = 4 }) {
    return (
        <textarea
            rows={rows}
            readOnly={!editable}
            value={value ?? ''}
            onChange={editable ? (e) => onChange(e.target.value) : undefined}
            className={`w-full resize-y rounded-md shadow-sm sm:text-sm ${
                editable
                    ? 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                    : 'border-gray-300 bg-gray-50 text-gray-600'
            }`}
        />
    );
}

function RadioOption({ editable, checked, onChange, name, label }) {
    return (
        <label className={`flex items-center gap-2 text-sm ${editable ? 'text-gray-700' : 'text-gray-500'}`}>
            <input
                type="radio"
                name={name}
                checked={checked}
                disabled={!editable}
                onChange={editable ? onChange : undefined}
                className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            {label}
        </label>
    );
}

export default function Record({ tool, jobOrder, editable = false }) {
    const machineLabel = tool
        ? `${tool.name ?? ''}${tool.asset ? ` | ${tool.asset}` : ''}`
        : '';

    const { data, setData, post, processing, errors } = useForm({
        id_edit: jobOrder?.id ?? '',
        asset: tool?.asset ?? jobOrder?.asset ?? '',

        // ===== ส่วนบน (แก้ไขได้เฉพาะตอนเปิดจากปุ่ม Edit) =====
        job_type: jobOrder?.job_type ?? 'urgent',
        project: jobOrder?.project ?? '',
        date: jobOrder?.date ?? '',
        in_date: jobOrder?.in_date ?? '',
        in_time_h: jobOrder?.in_time_h ?? '00',
        in_time_m: jobOrder?.in_time_m ?? '00',
        out_date: jobOrder?.out_date ?? '',
        out_time_h: jobOrder?.out_time_h ?? '00',
        out_time_m: jobOrder?.out_time_m ?? '00',
        responsible_name: jobOrder?.responsible_name ?? '',
        mileage: jobOrder?.mileage ?? '',
        hour_meter: jobOrder?.hour_meter ?? '',
        stop_date: jobOrder?.stop_date ?? '',
        stop_time_h: jobOrder?.stop_time_h ?? '00',
        stop_time_m: jobOrder?.stop_time_m ?? '00',
        damage_description: jobOrder?.damage_description ?? '',
        reporter_name: jobOrder?.reporter_name ?? '',
        comment: jobOrder?.comment ?? '',
        repair_mode: jobOrder?.repair_mode ?? 'outsource',
        approver_name: jobOrder?.approver_name ?? '',

        // ===== ส่วนล่าง (แก้ไขได้เสมอ ไม่ว่าเปิดจาก Record หรือ Edit) =====
        repair: jobOrder?.repair ?? '',
        list1: jobOrder?.list1 ?? [''],
        num1: jobOrder?.num1 ?? [''],
        po1: jobOrder?.po1 ?? [''],
        price1: jobOrder?.price1 ?? [''],
        nameP1: jobOrder?.nameP1 ?? [],
        nameP2: jobOrder?.nameP2 ?? [],
        des2: jobOrder?.des2 ?? '',
        finish_date: jobOrder?.finish_date ?? '',
        finish_time_h: jobOrder?.finish_time_h ?? '00',
        finish_time_m: jobOrder?.finish_time_m ?? '00',
        fore_mt: jobOrder?.fore_mt ?? '',
        status3: jobOrder?.status3 ?? '0',
        name_qc: jobOrder?.name_qc ?? '',
        qc: jobOrder?.qc ?? '',
        name_pm2: jobOrder?.name_pm2 ?? '',

        file_job: [],
    });

    function updateRow(field, index, value) {
        setData((prev) => {
            const next = [...prev[field]];
            next[index] = value;
            return { ...prev, [field]: next };
        });
    }

    function addSparePart() {
        setData((prev) => ({
            ...prev,
            list1: [...prev.list1, ''],
            num1: [...prev.num1, ''],
            po1: [...prev.po1, ''],
            price1: [...prev.price1, ''],
        }));
    }

    function removeSparePart(index) {
        setData((prev) => ({
            ...prev,
            list1: prev.list1.filter((_, i) => i !== index),
            num1: prev.num1.filter((_, i) => i !== index),
            po1: prev.po1.filter((_, i) => i !== index),
            price1: prev.price1.filter((_, i) => i !== index),
        }));
    }

    function addStaff(field) {
        setData((prev) => ({ ...prev, [field]: [...prev[field], ''] }));
    }

    function removeStaff(field, index) {
        setData((prev) => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
    }

    function handleFileChange(e) {
        const files = Array.from(e.target.files ?? []);
        const valid = [];

        for (const file of files) {
            const ext = file.name.split('.').pop().toLowerCase();
            const sizeMb = file.size / (1024 * 1024);

            if (!ALLOWED_DOC_EXT.includes(ext)) {
                alert(`ไฟล์ "${file.name}" ไม่ใช่นามสกุลที่รองรับ`);
                continue;
            }
            if (sizeMb > MAX_DOC_SIZE_MB) {
                alert(`ไฟล์ "${file.name}" มีขนาดเกิน ${MAX_DOC_SIZE_MB}MB`);
                continue;
            }
            valid.push(file);
        }

        if (data.file_job.length + valid.length > MAX_DOC_COUNT) {
            alert(`แนบไฟล์ได้สูงสุด ${MAX_DOC_COUNT} ไฟล์`);
        }

        setData('file_job', [...data.file_job, ...valid].slice(0, MAX_DOC_COUNT));
        e.target.value = '';
    }

    function removeFile(index) {
        setData('file_job', data.file_job.filter((_, i) => i !== index));
    }

    function handleSubmit(e) {
        e.preventDefault();
        post(`/record/${jobOrder?.id}`, { forceFormData: true });
    }

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    {editable ? 'Edit Record' : 'Record'}
                </h2>
            }
        >
            <Head title={editable ? 'Edit Record' : 'Record'} />

            <div className="py-8">
                <div className="mx-auto max-w-[96rem] px-4 sm:px-6 lg:px-8">

                    <form onSubmit={handleSubmit}>
                        {/* ====== ส่วนบน: ข้อมูล Job Order (แก้ไขได้เฉพาะโหมด Edit) ====== */}
                        <div className="mb-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
                            <div className="bg-indigo-50 px-6 py-3">
                                <h3 className="text-sm font-semibold text-indigo-900">ประเภทของงาน และรายละเอียด</h3>
                            </div>

                            <div className="space-y-6 px-6 py-6">
                                <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
                                    {JOB_TYPES.map((jt) => (
                                        <RadioOption
                                            key={jt.value}
                                            editable={editable}
                                            name="job_type"
                                            checked={data.job_type === jt.value}
                                            onChange={() => setData('job_type', jt.value)}
                                            label={jt.label}
                                        />
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="โครงการ">
                                        <TextInputOrReadOnly editable={editable} value={data.project} onChange={(v) => setData('project', v)} />
                                    </Field>
                                    <Field label="วันที่">
                                        <DateInputOrReadOnly editable={editable} value={data.date} onChange={(v) => setData('date', v)} />
                                    </Field>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="วัน-เวลาเข้า site งาน">
                                        <div className="flex items-center gap-2">
                                            <DateInputOrReadOnly editable={editable} value={data.in_date} onChange={(v) => setData('in_date', v)} />
                                            <TimeBoxOrReadOnly
                                                editable={editable}
                                                h={data.in_time_h}
                                                m={data.in_time_m}
                                                onH={(v) => setData('in_time_h', v)}
                                                onM={(v) => setData('in_time_m', v)}
                                            />
                                        </div>
                                    </Field>
                                    <Field label="วัน-เวลาออก site งาน">
                                        <div className="flex items-center gap-2">
                                            <DateInputOrReadOnly editable={editable} value={data.out_date} onChange={(v) => setData('out_date', v)} />
                                            <TimeBoxOrReadOnly
                                                editable={editable}
                                                h={data.out_time_h}
                                                m={data.out_time_m}
                                                onH={(v) => setData('out_time_h', v)}
                                                onM={(v) => setData('out_time_m', v)}
                                            />
                                        </div>
                                    </Field>
                                </div>

                                <Field label="ชื่อ / รหัสเครื่องจักร">
                                    <ReadOnlyInput value={machineLabel} />
                                </Field>

                                <Field label="ชื่อผู้รับผิดชอบ">
                                    <TextInputOrReadOnly editable={editable} value={data.responsible_name} onChange={(v) => setData('responsible_name', v)} />
                                </Field>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <Field label="หมายเลขไมล์ (ถ้ามี)">
                                        <div className="flex items-center gap-2">
                                            <TextInputOrReadOnly editable={editable} value={data.mileage} onChange={(v) => setData('mileage', v)} />
                                            <span className="shrink-0 text-sm text-gray-500">Km.</span>
                                        </div>
                                    </Field>
                                    <Field label="หมายเลข ชม. (ถ้ามี)">
                                        <div className="flex items-center gap-2">
                                            <TextInputOrReadOnly editable={editable} value={data.hour_meter} onChange={(v) => setData('hour_meter', v)} />
                                            <span className="shrink-0 text-sm text-gray-500">ชม.</span>
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
                                <div className="space-y-4 lg:col-span-2">
                                    <Field label="วันที่เครื่องจักรหยุดทำงาน">
                                        <div className="flex items-center gap-2">
                                            <DateInputOrReadOnly editable={editable} value={data.stop_date} onChange={(v) => setData('stop_date', v)} />
                                            <TimeBoxOrReadOnly
                                                editable={editable}
                                                h={data.stop_time_h}
                                                m={data.stop_time_m}
                                                onH={(v) => setData('stop_time_h', v)}
                                                onM={(v) => setData('stop_time_m', v)}
                                            />
                                        </div>
                                    </Field>
                                    <TextAreaOrReadOnly editable={editable} value={data.damage_description} onChange={(v) => setData('damage_description', v)} />
                                </div>

                                <div className="rounded-lg border border-gray-200">
                                    <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-center text-xs font-semibold text-gray-600">
                                        ผู้รับแจ้ง / ผู้จัดทำ
                                    </div>
                                    <div className="p-3">
                                        <TextInputOrReadOnly editable={editable} value={data.reporter_name} onChange={(v) => setData('reporter_name', v)} />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-indigo-50 px-6 py-3">
                                <h3 className="text-sm font-semibold text-indigo-900">ความเห็น</h3>
                            </div>

                            <div className="grid grid-cols-1 gap-4 px-6 py-6 lg:grid-cols-3">
                                <div className="space-y-4 lg:col-span-2">
                                    <TextAreaOrReadOnly editable={editable} value={data.comment} onChange={(v) => setData('comment', v)} />
                                    <div className="flex gap-6">
                                        <RadioOption
                                            editable={editable}
                                            name="repair_mode"
                                            checked={data.repair_mode === 'outsource'}
                                            onChange={() => setData('repair_mode', 'outsource')}
                                            label="Outsource"
                                        />
                                        <RadioOption
                                            editable={editable}
                                            name="repair_mode"
                                            checked={data.repair_mode === 'self'}
                                            onChange={() => setData('repair_mode', 'self')}
                                            label="ซ่อมเอง"
                                        />
                                    </div>
                                </div>

                                <div className="rounded-lg border border-gray-200">
                                    <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-center text-xs font-semibold text-gray-600">
                                        ผู้อนุมัติ
                                    </div>
                                    <div className="p-3">
                                        <TextInputOrReadOnly editable={editable} value={data.approver_name} onChange={(v) => setData('approver_name', v)} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ====== ส่วนล่าง: รายงานผลการปฏิบัติงาน (แก้ไขได้เสมอ) ====== */}
                        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">

                            <div className="bg-indigo-50 px-6 py-3">
                                <h3 className="text-sm font-semibold text-indigo-900">การดำเนินการ</h3>
                            </div>

                            <div className="space-y-6 px-6 py-6">
                                <Field label="ข้อบกพร่องของเครื่องจักรที่ตรวจพบและวิธีการแก้ไข">
                                    <textarea
                                        rows={3}
                                        value={data.repair}
                                        onChange={(e) => setData('repair', e.target.value)}
                                        className="w-full resize-y rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    />
                                    {errors.repair && <p className="mt-1 text-xs text-red-500">{errors.repair}</p>}
                                </Field>

                                {/* ตารางอะไหล่ที่ใช้ */}
                                <div className="overflow-hidden rounded-lg border border-indigo-200">
                                    <div className="grid grid-cols-12 divide-x divide-indigo-200 bg-indigo-100 text-sm font-semibold text-indigo-900">
                                        <div className="col-span-5 flex items-center justify-center gap-2 px-3 py-2">
                                            อะไหล่ที่ใช้ (Spare Part)
                                            <button
                                                type="button"
                                                onClick={addSparePart}
                                                className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
                                                title="เพิ่มแถว"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <div className="col-span-2 px-3 py-2 text-center">จำนวน (Pcs.)</div>
                                        <div className="col-span-3 px-3 py-2 text-center">ใบเบิก/PO/เงินสด</div>
                                        <div className="col-span-2 px-3 py-2 text-center">ราคา (บาท)</div>
                                    </div>
                                    {data.list1.map((_, i) => (
                                        <div key={i} className="grid grid-cols-12 divide-x divide-indigo-100 border-t border-indigo-100">
                                            <div className="col-span-5 flex items-center gap-1 p-2">
                                                <input
                                                    type="text"
                                                    value={data.list1[i]}
                                                    onChange={(e) => updateRow('list1', i, e.target.value)}
                                                    className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                />
                                                {data.list1.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeSparePart(i)}
                                                        className="shrink-0 text-xs text-red-500 hover:underline"
                                                    >
                                                        ลบ
                                                    </button>
                                                )}
                                            </div>
                                            <div className="col-span-2 p-2">
                                                <input
                                                    type="text"
                                                    value={data.num1[i]}
                                                    onChange={(e) => updateRow('num1', i, e.target.value)}
                                                    className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div className="col-span-3 p-2">
                                                <input
                                                    type="text"
                                                    value={data.po1[i]}
                                                    onChange={(e) => updateRow('po1', i, e.target.value)}
                                                    className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div className="col-span-2 p-2">
                                                <input
                                                    type="text"
                                                    value={data.price1[i]}
                                                    onChange={(e) => updateRow('price1', i, e.target.value)}
                                                    className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* พนักงาน */}
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    <div>
                                        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                                            พนักงานบริษัท (Staff) {data.nameP1.length} คน
                                            <button
                                                type="button"
                                                onClick={() => addStaff('nameP1')}
                                                className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
                                                title="เพิ่มรายชื่อ"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {data.nameP1.map((name, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={name}
                                                        onChange={(e) => updateRow('nameP1', i, e.target.value)}
                                                        className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeStaff('nameP1', i)}
                                                        className="shrink-0 text-xs text-red-500 hover:underline"
                                                    >
                                                        ลบ
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                                            พนักงานรายวัน {data.nameP2.length} คน
                                            <button
                                                type="button"
                                                onClick={() => addStaff('nameP2')}
                                                className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
                                                title="เพิ่มรายชื่อ"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {data.nameP2.map((name, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={name}
                                                        onChange={(e) => updateRow('nameP2', i, e.target.value)}
                                                        className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeStaff('nameP2', i)}
                                                        className="shrink-0 text-xs text-red-500 hover:underline"
                                                    >
                                                        ลบ
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* ข้อเสนอแนะ */}
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">
                                        ข้อเสนอแนะ (KL5-PMT / KL5-TEMP)
                                    </label>
                                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                                        <div className="space-y-3 lg:col-span-2">
                                            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                                                <span>วันที่ช่างซ่อมเสร็จ :</span>
                                                <input
                                                    type="date"
                                                    value={data.finish_date}
                                                    onChange={(e) => setData('finish_date', e.target.value)}
                                                    className="max-w-[10rem] rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                />
                                                <TimeSelect value={data.finish_time_h} onChange={(v) => setData('finish_time_h', v)} />
                                                <span>:</span>
                                                <TimeSelect value={data.finish_time_m} onChange={(v) => setData('finish_time_m', v)} />
                                            </div>
                                            <textarea
                                                rows={3}
                                                value={data.des2}
                                                onChange={(e) => setData('des2', e.target.value)}
                                                className="w-full resize-y rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="rounded-lg border border-gray-200">
                                                <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-center text-xs font-semibold text-gray-600">
                                                    ผู้ดำเนินการ
                                                </div>
                                                <div className="p-3">
                                                    <input
                                                        type="text"
                                                        value={data.fore_mt}
                                                        onChange={(e) => setData('fore_mt', e.target.value)}
                                                        className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                    />
                                                </div>
                                            </div>

                                            <div className="rounded-lg border border-gray-200">
                                                <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-center text-xs font-semibold text-gray-600">
                                                    การยอมรับ
                                                </div>
                                                <div className="space-y-2 p-3">
                                                    <div className="flex items-center justify-center gap-4 text-sm text-gray-700">
                                                        <label className="flex items-center gap-1">
                                                            <input
                                                                type="radio"
                                                                name="status3"
                                                                checked={data.status3 === '0'}
                                                                onChange={() => setData('status3', '0')}
                                                                className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                            />
                                                            ยอมรับ
                                                        </label>
                                                        <label className="flex items-center gap-1">
                                                            <input
                                                                type="radio"
                                                                name="status3"
                                                                checked={data.status3 === '1'}
                                                                onChange={() => setData('status3', '1')}
                                                                className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                            />
                                                            ไม่ยอมรับ
                                                        </label>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={data.name_qc}
                                                        onChange={(e) => setData('name_qc', e.target.value)}
                                                        placeholder="ผู้จัดการโครงการ / QC"
                                                        className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-indigo-50 px-6 py-3">
                                <h3 className="text-sm font-semibold text-indigo-900">ความเห็นจากผู้จัดการโครงการ / QC</h3>
                            </div>

                            <div className="grid grid-cols-1 gap-4 px-6 py-6 lg:grid-cols-3">
                                <div className="lg:col-span-2">
                                    <textarea
                                        rows={4}
                                        value={data.qc}
                                        onChange={(e) => setData('qc', e.target.value)}
                                        className="w-full resize-y rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    />
                                </div>
                                <div className="rounded-lg border border-gray-200">
                                    <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-center text-xs font-semibold text-gray-600">
                                        ผู้อนุมัติ
                                    </div>
                                    <div className="p-3">
                                        <input
                                            type="text"
                                            value={data.name_pm2}
                                            onChange={(e) => setData('name_pm2', e.target.value)}
                                            className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-indigo-50 px-6 py-3">
                                <h3 className="text-sm font-semibold text-indigo-900">เอกสาร</h3>
                            </div>

                            <div className="space-y-3 px-6 py-6">
                                <input
                                    type="file"
                                    multiple
                                    accept=".jpg,.jpeg,.png,.pdf,.xlsx,.xls,.doc,.docx"
                                    onChange={handleFileChange}
                                    className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
                                />
                                <p className="text-xs text-gray-400">
                                    แนบได้สูงสุด {MAX_DOC_COUNT} ไฟล์ (.jpg .png .pdf .xlsx .xls .doc .docx) ไฟล์ละไม่เกิน {MAX_DOC_SIZE_MB}MB
                                </p>
                                {data.file_job.length > 0 && (
                                    <ul className="space-y-1 text-sm text-gray-700">
                                        {data.file_job.map((f, i) => (
                                            <li key={i} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-1.5">
                                                {f.name}
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile(i)}
                                                    className="text-xs text-red-500 hover:underline"
                                                >
                                                    ลบ
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {errors.file_job && <p className="text-xs text-red-500">{errors.file_job}</p>}
                            </div>

                            {/* แสดง error ทุกช่อง (บางช่อง เช่น ราคาอะไหล่ หรือไฟล์แต่ละไฟล์ ไม่มีที่แสดง error ของตัวเอง) */}
                            {Object.keys(errors).length > 0 && (
                                <div className="mx-6 mt-2 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">
                                    <p className="font-semibold">บันทึกไม่สำเร็จ กรุณาแก้ไขข้อมูลต่อไปนี้</p>
                                    <ul className="mt-1 list-disc space-y-0.5 pl-5">
                                        {Object.entries(errors).map(([key, message]) => (
                                            <li key={key}>{message}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="flex items-center justify-center gap-3 border-t border-gray-100 px-6 py-6">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {processing ? 'กำลังบันทึก...' : 'Save'}
                                </button>
                            </div>
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
