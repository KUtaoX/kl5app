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

    public function destroy(JobOrderType $jobOrderType)
    {
        $jobOrderType->delete();

        return redirect()->route('job-order-types.index')->with('success', 'ลบรายการสำเร็จ');
    }

}