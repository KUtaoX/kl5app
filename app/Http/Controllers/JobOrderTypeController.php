<?php

namespace App\Http\Controllers;


use App\Models\JobOrderType;
use Illuminate\Http\Request;
use Inertia\Inertia;

class JobOrderTypeController extends Controller
{
    public function index()
    {
        return Inertia::render('Setting/JobOrderType', [
            'items' => JobOrderType::orderBy('id')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50',
            'type_code' => 'required|integer|in:0,1,2',
        ]);

        JobOrderType::create($validated);

        return redirect()->route('job-order-types.index')->with('success', 'เพิ่มรายการสำเร็จ');
    }

    /**
     * PATCH /job-order-types/{jobOrderType}/type — สลับประเภท MT / TEMP / LGT ของรายการ
     * มีผลกับใบสั่งงานที่สร้างใหม่หลังจากนี้เท่านั้น ใบสั่งงานเดิมเก็บประเภทของตัวเองไว้แล้ว
     */
    public function updateType(Request $request, JobOrderType $jobOrderType)
    {
        $user = $request->user();
        abort_if($user->permission5 == '1' || $user->permission3 != '1', 403, 'คุณไม่มีสิทธิ์แก้ไขข้อมูล');

        $validated = $request->validate([
            'type_code' => 'required|integer|in:0,1,2',
        ]);

        $jobOrderType->update(['type_code' => (int) $validated['type_code']]);

        return back();
    }

    /**
     * PATCH /job-order-types/{jobOrderType} — แก้ชื่อรายการ (Name)
     */
    public function update(Request $request, JobOrderType $jobOrderType)
    {
        $user = $request->user();
        abort_if($user->permission5 == '1' || $user->permission3 != '1', 403, 'คุณไม่มีสิทธิ์แก้ไขข้อมูล');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ], [
            'name.required' => 'กรุณาใส่ชื่อ',
            'name.max'      => 'ชื่อยาวเกิน 255 ตัวอักษร',
        ]);

        $jobOrderType->update(['name' => trim($validated['name'])]);

        return back();
    }

    public function destroy(JobOrderType $jobOrderType)
    {
        $jobOrderType->delete();

        return redirect()->route('job-order-types.index')->with('success', 'ลบรายการสำเร็จ');
    }

}