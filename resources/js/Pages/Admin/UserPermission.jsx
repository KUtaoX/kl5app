import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, Link } from '@inertiajs/react';
import { useState } from 'react';

function UserRow({ user }) {
    const permissionKeys = Array.from({ length: 5 }, (_, i) => `permission${i + 1}`);

    const [permissions, setPermissions] = useState(
        permissionKeys.reduce((acc, key) => {
            acc[key] = user[key] === '1' || user[key] === 1;
            return acc;
        }, {})
    );
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Admin ได้ Add / Edit / Delete ทั้งหมด และไม่เป็น Read Only (ช่องอื่นล็อกไว้ตอนติ๊ก Admin)
    const isAdmin = permissions.permission1;
    const ADMIN_VALUES = { permission2: true, permission3: true, permission4: true, permission5: false };
    const shown = isAdmin ? { ...permissions, ...ADMIN_VALUES } : permissions;

    function toggle(key) {
        setPermissions((prev) => {
            const next = { ...prev, [key]: !prev[key] };
            // ติ๊ก Admin = ให้สิทธิ์ครบทันที, เอา Admin ออก = ยังคงสิทธิ์ที่เห็นอยู่ไว้ให้ปรับต่อเอง
            return key === 'permission1' ? { ...next, ...ADMIN_VALUES } : next;
        });
        setSaved(false);
    }

    function handleSave() {
        setSaving(true);
        router.patch(route('user-permissions.update', user.id), shown, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setSaved(true);
                setSaving(false);
            },
            onError: () => setSaving(false),
        });
    }

    return (
        <tr className="transition hover:bg-gray-50">
            <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                {user.name}
                <div className="text-xs text-gray-400">{user.email}</div>
            </td>
            {permissionKeys.map((key) => (
                <td key={key} className="px-2 py-3 text-center">
                    <input
                        type="checkbox"
                        checked={shown[key]}
                        onChange={() => toggle(key)}
                        disabled={isAdmin && key !== 'permission1'}
                        title={isAdmin && key !== 'permission1' ? 'Admin มีสิทธิ์นี้อัตโนมัติ' : undefined}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </td>
            ))}
            <td className="whitespace-nowrap px-4 py-3 text-right">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                    {saving ? 'กำลังบันทึก...' : saved ? 'บันทึกแล้ว ✓' : 'Save'}
                </button>
            </td>
        </tr>
    );
}

export default function Index({ users }) {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    User Permissions
                </h2>
            }
        >
            <Head title="User Permissions" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <p className="mb-3 text-sm text-gray-500">
                        ผู้ใช้ที่เป็น <span className="font-medium text-gray-700">Admin</span> ได้สิทธิ์ Add, Edit และ Delete ทุกหน้าโดยอัตโนมัติ และไม่ถูกจำกัดเป็น Read Only
                    </p>
                    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-600">User</th>
                                            <th> Admin </th>
                                            <th> Can Add</th>
                                            <th> Can Edit </th>
                                            <th> Can Delete </th>
                                            <th> Read Only </th>
                                        <th className="px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {users.map((user) => (
                                        <UserRow key={user.id} user={user} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}