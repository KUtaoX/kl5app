import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

const FIELDS = [
    { key: 'asset', label: 'Asset', required: true },
    { key: 'io_no', label: 'IO Prev No.' },
    { key: 'io_no2', label: 'IO Cor No.' },
    { key: 'name', label: 'Name', required: true },
    { key: 'brand', label: 'Brand' },
    { key: 'model', label: 'Model' },
    { key: 'serial', label: 'Serial' },
    { key: 'project_site', label: 'Project Site' },
    { key: 'asset_in', label: 'Asset No.' },
];

export default function AddTool({tool}) {

    const isEdit = !!tool;
    const importForm = useForm({ file: null });

    const { data, setData, post, put, processing, errors } = useForm(
        FIELDS.reduce((acc, field) => ({ ...acc, [field.key]: tool?.[field.key] ?? '' }), {})
    );

    function handleImportSubmit(e) {
        e.preventDefault();
        importForm.post('/import-tools', {
            forceFormData: true,
            onSuccess: () => importForm.reset('file'),
        });
    }

    function handleSubmit(e) {
        e.preventDefault();
        if (isEdit) {
            put(`/edit-tool/${tool.id}`);
        } else {
            post('/add-tool');
        }
    }

    return (
         <AuthenticatedLayout
             header={
                 <h2 className="text-xl font-semibold leading-tight text-gray-800">
                     {isEdit ? 'Edit Tool' : 'Add Tool'}
                 </h2>
             }
         >
             <Head title={isEdit ? 'Edit Tool' : 'Add Tool'} />
 
             <div className="py-8">
                 <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    {!isEdit && (
                         <div className="mb-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
                             <form onSubmit={handleImportSubmit} className="p-6">
                                 <h3 className="text-sm font-semibold text-gray-700">Upload Tool File</h3>
                                 <p className="mt-1 text-xs text-gray-500">
                                     อัปโหลดไฟล์รายงานทรัพย์สิน (.xls/.xlsx/.csv) เพื่อเพิ่มเครื่องมือหลายรายการพร้อมกัน
                                 </p>
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
                         </div>
                     )}
                     <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 gap-5 p-6">
                                {FIELDS.map((field) => (
                                    <div key={field.key} >
                                        <label htmlFor={field.key} className="block text-sm font-medium text-gray-700">
                                            {field.label}
                                            {field.required && <span className="text-red-500">*</span>}
                                        </label>
                                        <input 
                                            id={field.key} 
                                            name={field.key} 
                                            type="text"
                                            value={data[field.key]}
                                            onChange={(e) => setData(field.key, e.target.value)}
                                            className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
                                                errors[field.key]
                                                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                                                    : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                                            }`} /> 
                                        {errors[field.key] && (
                                            <p className="mt-1 text-xs text-red-500">{errors[field.key]}</p>
                                        )}   
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
                                <Link
                                    href="/machine-list"
                                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
                                >
                                    Cancel
                                </Link>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {processing ? 'Saving...' : isEdit ? 'Update' : 'Save'}
                                </button>
                            </div>
                        </form>
                     </div>
                 </div>
             </div>
         </AuthenticatedLayout>
     );
}