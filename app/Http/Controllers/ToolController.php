<?php

namespace App\Http\Controllers;

use App\Models\JobOrder;
use App\Models\Tool;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Imports\ToolsImport;
use Maatwebsite\Excel\Facades\Excel;

class ToolController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');
        $searchColumn = $request->input('search_column', 'all');

        $allowedColumns = ['asset', 'asset_in', 'io_no', 'io_no2', 'name', 'model', 'serial', 'project_site'];

        $tools = Tool::query()
            ->when($search, function ($query, $search) use ($searchColumn, $allowedColumns) {
                if ($searchColumn !== 'all' && in_array($searchColumn, $allowedColumns)) {
                    $query->where($searchColumn, 'like', "%{$search}%");
                } else {
                    $query->where(function ($q) use ($search, $allowedColumns) {
                        foreach ($allowedColumns as $column) {
                            $q->orWhere($column, 'like', "%{$search}%");
                        }
                    });
                }
            })
            ->orderBy('id', 'desc')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Tool/Machine_List', [
            'tools' => $tools,
            'filters' => [
                'search' => $search,
                'search_column' => $searchColumn,
            ],
        ]);
    }

    public function create()
    {
        return Inertia::render('Tool/Add_Tool');
    }

    public function store(Request $request)
    {
        abort_if($request->user()->permission5 == '1', 403, 'คุณไม่มีสิทธิ์เพิ่มข้อมูล');
        $validatedData = $request->validate([
            'asset' => 'required|string|max:255',
            'asset_in' => 'required|string|max:255',
            'io_no' => 'required|string|max:255',
            'io_no2' => 'nullable|string|max:255',
            'name' => 'required|string|max:255',
            'model' => 'nullable|string|max:255',
            'serial' => 'nullable|string|max:255',
            'project_site' => 'nullable|string|max:255',
        ]);

        Tool::create($validatedData);

        return redirect()->route('machine-list')->with('success', 'Tool added successfully.');
    }

    public function edit(Tool $tool)
    {
        return Inertia::render('Tool/Add_Tool', [
            'tool' => $tool,
        ]);
    }

    public function update(Request $request, Tool $tool)
    {
        abort_if($request->user()->permission5 == '1', 403, 'คุณไม่มีสิทธิ์เพิ่มข้อมูล');
        $validatedData = $request->validate([
            'asset' => 'required|string|max:255',
            'asset_in' => 'required|string|max:255',
            'io_no' => 'required|string|max:255',
            'io_no2' => 'nullable|string|max:255',
            'name' => 'required|string|max:255',
            'model' => 'nullable|string|max:255',
            'serial' => 'nullable|string|max:255',
            'project_site' => 'nullable|string|max:255',
        ]);

        $tool->update($validatedData);

        return redirect()->route('machine-list')->with('success', 'Tool updated successfully.');
    }

    public function import(Request $request)
    {
        abort_if(auth()->user()->permission5 == '1', 403, 'คุณไม่มีสิทธิ์เพิ่มข้อมูล');

        $request->validate([
            'file' => 'required|mimes:xlsx,xls,csv|max:10240',
        ]);

        Excel::import(new ToolsImport, $request->file('file'));

        return redirect()->route('machine-list')->with('success', 'Import ข้อมูลสำเร็จ');
    }

    public function show(Tool $tool)
    {
        return Inertia::render('Tool/Record_Tool', [
            'tool' => $tool,
            'jobOrders' => [], // ยังไม่มีตาราง job_orders จริง ส่งเป็น array เปล่าไปก่อน
        ]);
    }

    public function createJobOrder(Tool $tool)
    {
        return Inertia::render('Order/Job_Order', ['tool' => $tool]);
    }

    // ส่วนของ jobOder
    public function storeJobOrder(Request $request)
    {
        $validated = $request->validate([
            'asset' => 'required|string',
            'job_type' => 'required|in:urgent,maintenance,install,audit,internal',
            'project' => 'nullable|string|max:255',
            'date' => 'nullable|date',
            'in_date' => 'nullable|date',
            'in_time' => 'nullable|string',
            'out_date' => 'nullable|date',
            'out_time' => 'nullable|string',
            'responsible_name' => 'nullable|string|max:255',
            'mileage' => 'nullable|string|max:50',
            'hour_meter' => 'nullable|string|max:50',
            'stop_date' => 'nullable|date',
            'stop_time' => 'nullable|string',
            'damage_description' => 'nullable|string',
            'reporter_name' => 'nullable|string|max:255',
            'comment' => 'nullable|string',
            'repair_mode' => 'required|in:outsource,self',
            'approver_name' => 'nullable|string|max:255',
        ]);

        $tool = Tool::where('asset', $validated['asset'])->firstOrFail();

        $jobTypeMap = [
            'urgent' => 0,
            'maintenance' => 1,
            'install' => 2,
            'audit' => 3,
            'internal' => 4,
        ];

        JobOrder::create([
            'id_tool' => $tool->id,
            'site' => $validated['project'] ?? null,
            'date_fr' => $validated['date'] ?? null,
            'datetime1' => $this->combineDateTime($validated['in_date'] ?? null, $validated['in_time'] ?? null),
            'datetime2' => $this->combineDateTime($validated['out_date'] ?? null, $validated['out_time'] ?? null),
            'name1' => $validated['responsible_name'] ?? null,
            'num_mi' => $validated['mileage'] ?? null,
            'time_work' => $validated['hour_meter'] ?? null,
            'cause' => $validated['damage_description'] ?? null,
            'name2' => $validated['reporter_name'] ?? null,
            'repair' => $validated['comment'] ?? null,
            'status1' => $jobTypeMap[$validated['job_type']],
            'status2' => $validated['repair_mode'] === 'outsource' ? 0 : 1,
            'pm' => $validated['approver_name'] ?? null,
            'cancel' => 0,
        ]);

        return redirect()->route('record-tool', $tool)->with('success', 'บันทึก Job Order สำเร็จ');
    }

    private function combineDateTime(?string $date, ?string $time): ?string
    {
        if (! $date) {
            return null;
        }

        $time = $time ?: '00:00';

        return "{$date} {$time}:00";
    }

}