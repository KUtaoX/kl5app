<?php

namespace App\Http\Controllers;

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
        abort_if($request->user()->permission4 == '1', 403, 'คุณไม่มีสิทธิ์เพิ่มข้อมูล');
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
        abort_if($request->user()->permission4 == '1', 403, 'คุณไม่มีสิทธิ์เพิ่มข้อมูล');
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
        abort_if(auth()->user()->permission4 == '1', 403, 'คุณไม่มีสิทธิ์เพิ่มข้อมูล');

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

    

}