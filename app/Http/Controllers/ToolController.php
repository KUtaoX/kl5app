<?php

namespace App\Http\Controllers;

use App\Models\JobOrder;
use App\Models\Tool;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Imports\ToolsImport;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\QueryException;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Reader\Csv;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

class ToolController extends Controller
{
     private const IMPORT_MAP = [
        0 => 'asset',         // A Tag Number (ใช้จับคู่)
        1 => 'name',          // B Description
        2 => 'brand',         // C Brand
        3 => 'model',         // D Model
        4 => 'serial',        // E Serial
        5 => 'employee',      // F Employee
        6 => 'project_site',  // G Project Site
        7 => 'asset_status',  // H Asset Status
        8 => 'asset_in',      // I Asset In
        9 => 'tran_date',     // J Transfer Date
    ];

    private const IMPORT_START_ROW = 5;

    /**
     * excel.php เดิมเขียนทับทุกช่อง (ช่องว่างในไฟล์ = ล้างค่าเดิม)
     * false = ช่องที่ว่างในไฟล์ไม่ไปลบค่าที่มีอยู่ในระบบ
     */
    private const IMPORT_OVERWRITE_WITH_BLANK = false;

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

    // ลบได้เฉพาะเครื่องที่ยังไม่มีประวัติใบสั่งงานหรืองานซ่อม เพื่อไม่ให้ประวัติเดิมกลายเป็น "ไม่พบเครื่อง"
    public function destroy(Request $request, Tool $tool)
    {
        $user = $request->user();
        abort_if($user->permission5 == '1' || $user->permission4 != '1', 403, 'คุณไม่มีสิทธิ์ลบข้อมูล');

        $jobOrders = DB::table('job_order')->where('id_tool', $tool->id)->count();
        $repairs = DB::table('form1')
            ->where(fn ($q) => $q->where('id_tool', $tool->id)->orWhere('asset', $tool->asset))
            ->count();

        if ($jobOrders > 0 || $repairs > 0) {
            $parts = array_filter([
                $jobOrders ? "ใบสั่งงาน {$jobOrders} ใบ" : null,
                $repairs ? "งานซ่อม {$repairs} รายการ" : null,
            ]);

            return back()->withErrors([
                'delete' => "ลบ {$tool->asset} ไม่ได้ เพราะมีประวัติ " . implode(' และ ', $parts) . ' ผูกอยู่',
            ]);
        }

        $tool->delete();

        return back()->with('success', "ลบ {$tool->asset} แล้ว");
    }

    public function import(Request $request)
    {
        abort_if(auth()->user()->permission5 == '1', 403, 'คุณไม่มีสิทธิ์เพิ่มข้อมูล');

        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv,txt|max:10240',
        ], [
            'file.required' => 'กรุณาเลือกไฟล์',
            'file.file'     => 'อัปโหลดไฟล์ไม่สำเร็จ',
            'file.mimes'    => 'รองรับเฉพาะไฟล์ .xls, .xlsx หรือ .csv',
            'file.max'      => 'ไฟล์ใหญ่เกิน 10 MB',
        ]);

        try {
            $rows = $this->importReadRows($request->file('file'));
        } catch (\Throwable $e) {
            report($e);
            throw ValidationException::withMessages([
                'file' => 'อ่านไฟล์ไม่ได้ ไฟล์อาจเสียหายหรือไม่ใช่ไฟล์ Excel'
                    . (config('app.debug') ? ' (' . $e->getMessage() . ')' : ''),
            ]);
        }

        $start = $this->importStartIndex($rows);

        // ---------- แปลงแถวในไฟล์ ----------
        $records = [];   // asset => ['data' => [...], 'line' => เลขแถวใน Excel]
        $skipped = [];
        for ($i = $start, $n = count($rows); $i < $n; $i++) {
            $line = $i + 1;
            $data = $this->importMapRow($rows[$i] ?? []);

            if ($data['asset'] === '') {
                if ($this->importHasValue($data)) {
                    $skipped[] = "แถว {$line}: ไม่มี Tag Number";
                }
                continue; // แถวว่างทั้งแถว ข้ามเงียบ ๆ
            }
            if (isset($records[$data['asset']])) {
                $skipped[] = "แถว {$records[$data['asset']]['line']}: Tag Number {$data['asset']} ซ้ำกับแถว {$line} (ใช้แถว {$line})";
            }
            $records[$data['asset']] = ['data' => $data, 'line' => $line];
        }

        if (!$records) {
            throw ValidationException::withMessages([
                'file' => 'ไม่พบข้อมูลในไฟล์ — ข้อมูลต้องอยู่ใน Sheet แรก เริ่มแถว ' . self::IMPORT_START_ROW . ' และคอลัมน์ A เป็น Tag Number',
            ]);
        }

        $model = new Tool;
        $table = $model->getTable();
        $stamp = $model->usesTimestamps();

        // asset ที่มีอยู่แล้ว — query ครั้งเดียว ไม่ query ทีละแถวแบบเดิม
        $existing = collect(array_keys($records))
            ->chunk(1000)
            ->flatMap(fn ($chunk) => DB::table($table)->whereIn('asset', $chunk->all())->pluck('asset'))
            ->flip();

        // ---------- บันทึก: ทั้งไฟล์สำเร็จ หรือไม่บันทึกเลย ----------
        $created = 0;
        $updated = 0;
        $currentLine = null;

        try {
            DB::transaction(function () use ($records, $existing, $table, $stamp, &$created, &$updated, &$currentLine) {
                $now = now();

                foreach ($records as $asset => $r) {
                    $currentLine = $r['line'];
                    $data = $r['data'];

                    if (isset($existing[$asset])) {
                        $set = self::IMPORT_OVERWRITE_WITH_BLANK
                            ? $data
                            : array_filter($data, fn ($v) => $v !== '' && $v !== null);
                        unset($set['asset']);

                        if ($set) {
                            if ($stamp) {
                                $set['updated_at'] = $now;
                            }
                            DB::table($table)->where('asset', $asset)->update($set);
                        }
                        $updated++;
                    } else {
                        // io_no เป็นช่องบังคับในฟอร์ม แต่ไม่มีในไฟล์ RITTA → ใส่ค่าว่างไว้ก่อน แก้ทีหลังในหน้า Edit
                        $insert = $data + ['io_no' => '', 'io_no2' => ''];
                        if ($stamp) {
                            $insert['created_at'] = $now;
                            $insert['updated_at'] = $now;
                        }
                        DB::table($table)->insert($insert);
                        $created++;
                    }
                }
            });
        } catch (QueryException $e) {
            report($e);
            throw ValidationException::withMessages([
                'file' => "บันทึกไม่สำเร็จที่แถว {$currentLine} ของไฟล์ — ยังไม่มีข้อมูลใดถูกบันทึก ({$e->errorInfo[2]})",
            ]);
        }

        return back()
            ->with('success', "Import ข้อมูลสำเร็จ เพิ่มใหม่ {$created} รายการ อัปเดต {$updated} รายการ")
            ->with('importResult', [
                'total'   => count($records),
                'created' => $created,
                'updated' => $updated,
                'skipped' => $skipped,
            ]);
    }

    /**
     * อ่าน Sheet แรกด้วย PhpSpreadsheet โดยตรง (ติดตั้งมากับ Laravel Excel อยู่แล้ว)
     * ดูชนิดไฟล์จากเนื้อไฟล์ก่อน ไม่ได้ค่อยดูจากนามสกุล — ค่าที่ได้เป็นค่าดิบ (วันที่ = ตัวเลข Excel)
     */
    private function importReadRows(\Illuminate\Http\UploadedFile $file): array
    {
        $path = $file->getRealPath();

        try {
            $type = IOFactory::identify($path);
        } catch (\Throwable $e) {
            $type = match (strtolower($file->getClientOriginalExtension())) {
                'xlsx'  => 'Xlsx',
                'xls'   => 'Xls',
                default => 'Csv',
            };
        }

        $reader = IOFactory::createReader($type);
        $reader->setReadDataOnly(true);
        if ($reader instanceof Csv) {
            // CSV จากระบบ Windows ภาษาไทยมักเป็น CP874 (ถ้ามี BOM UTF-8 จะอ่านเป็น UTF-8 เอง)
            $reader->setInputEncoding(Csv::GUESS_ENCODING);
            $reader->setFallbackEncoding('CP874');
        }

        return $reader->load($path)->getSheet(0)->toArray(null, false, false, false);
    }

    /** หาแถวหัวคอลัมน์ "Tag Number" ใน 15 แถวแรก ข้อมูลเริ่มแถวถัดไป ไม่เจอใช้แถว 5 */
    private function importStartIndex(array $rows): int
    {
        foreach (array_slice($rows, 0, 15, true) as $i => $row) {
            $a = strtolower(trim((string) ($row[0] ?? '')));
            if (in_array($a, ['tag number', 'tag no', 'tag no.', 'asset'], true)) {
                return $i + 1;
            }
        }
        return self::IMPORT_START_ROW - 1;
    }

    private function importMapRow(array $row): array
    {
        $out = [];
        foreach (self::IMPORT_MAP as $col => $field) {
            $value = $row[$col] ?? null;
            $out[$field] = $field === 'tran_date' ? $this->importDate($value) : $this->importText($value);
        }
        return $out;
    }

    private function importHasValue(array $data): bool
    {
        foreach ($data as $v) {
            if ($v !== '' && $v !== null) {
                return true;
            }
        }
        return false;
    }

    /** ตัวเลขจาก Excel เช่น Serial 853275.0 → "853275" */
    private function importText($v): string
    {
        if ($v === null) {
            return '';
        }
        if ((is_float($v) || is_int($v)) && floor($v) == $v && abs($v) < 1e15) {
            return (string) (int) $v;
        }
        return trim((string) $v);
    }

    /** Transfer Date: เลขวันที่ของ Excel (42142.47) หรือข้อความวันที่ → "YYYY-MM-DD" */
    private function importDate($v): ?string
    {
        if ($v === null || $v === '') {
            return null;
        }
        if (is_numeric($v)) {
            return ExcelDate::excelToDateTimeObject((float) $v)->format('Y-m-d');
        }

        $s = trim((string) $v);
        foreach (['Y-m-d H:i:s', 'Y-m-d', 'd/m/Y H:i:s', 'd/m/Y H:i', 'd/m/Y', 'd-m-Y', 'd-M-Y'] as $format) {
            $d = \DateTime::createFromFormat('!' . $format, $s);
            if ($d && $d->format($format) === $s) {
                return $d->format('Y-m-d');
            }
        }
        return null;
    }

    public function show(Tool $tool)
    {
        $jobOrders = JobOrder::where('id_tool', $tool->id)
            ->orderByDesc('date_fr')
            ->get()
            ->map(function ($jo) {
                $cost = DB::table('job_order_sub')
                    ->where('job_id', $jo->id)
                    ->sum('price1');

                return [
                    'id' => $jo->id,
                    'date' => optional($jo->date_fr)->format('Y-m-d'),
                    'job_order_no' => $this->formatJobOrderNo($jo->type_code, $jo->job_id, $jo->date_fr),
                    // 'description' => $jo->cause,
                    'description' => $jo->cancel ? $jo->cancel_des : $jo->cause,
                    'site' => $jo->site,
                    'pm_app' => $jo->pm,
                    'cost' => $cost,
                    'cancel' => (bool) $jo->cancel,
                    'cancel_des' => $jo->cancel_des,
                ];
            });

        return Inertia::render('Tool/Record_Tool', [
            'tool' => $tool,
            'jobOrders' => $jobOrders,
        ]);
    }

    private function formatJobOrderNo($typeCode, $jobId, $dateFr): string
    {
        $jobId = (int) $jobId;

        if ($jobId < 10) {
            $padded = '00' . $jobId;
        } elseif ($jobId < 100) {
            $padded = '0' . $jobId;
        } else {
            $padded = (string) $jobId;
        }

        $prefix = match ((int) $typeCode) {
            2 => 'LGT',
            0 => 'MT',
            default => 'TEMP',
        };

        $year = $dateFr ? $dateFr->format('Y') : now()->year;

        return "{$prefix}/JOB-{$padded}-{$year}";
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
            'job_type' => 'required|string',
            'project' => 'nullable|string',
            'date' => 'nullable|date',
            'in_date' => 'nullable|date',
            'in_time' => 'nullable|string',
            'out_date' => 'nullable|date',
            'out_time' => 'nullable|string',
            'responsible_name' => 'nullable|string',
            'mileage' => 'nullable|string',
            'hour_meter' => 'nullable|string',
            'stop_date' => 'nullable|date',
            'stop_time' => 'nullable|string',
            'damage_description' => 'nullable|string',
            'reporter_name' => 'nullable|string',
            'comment' => 'nullable|string',
            'repair_mode' => 'nullable|string',
            'approver_name' => 'nullable|string',
        ]);

        $tool = Tool::where('asset', $validated['asset'])->firstOrFail();

        $jobTypeMap = [
            'urgent' => 0,
            'maintenance' => 1,
            'install' => 2,
            'audit' => 3,
            'internal' => 4,
        ];

        $typeCode = $this->resolveEquipmentTypeCode($tool->asset);
        $nextRunningNumber = (JobOrder::max('job_id') ?? 0) + 1;

        JobOrder::create([
            'id_tool' => $tool->id,
            'job_id' => $nextRunningNumber,
            'type_code' => $typeCode,
            'site' => $validated['project'] ?? null,
            'date_fr' => $validated['date'] ?? null,
            'date1' => $validated['in_date'] ?? null,
            'time1' => $validated['in_time'] ?? null,
            'date2' => $validated['out_date'] ?? null,
            'time2' => $validated['out_time'] ?? null,
            // 'datetime1' => $this->combineDateTime($validated['in_date'] ?? null, $validated['in_time'] ?? null),
            // 'datetime2' => $this->combineDateTime($validated['out_date'] ?? null, $validated['out_time'] ?? null),
            'name1' => $validated['responsible_name'] ?? null,
            'num_mi' => $validated['mileage'] ?? null,
            'time_work' => $validated['hour_meter'] ?? null,
            'cause' => $validated['damage_description'] ?? null,
            'name2' => $validated['reporter_name'] ?? null,
            // 'repair' => $validated['comment'] ?? null,
            'des1' => $validated['comment'] ?? null,
            'status1' => $jobTypeMap[$validated['job_type']],
            'status2' => $validated['repair_mode'] === 'outsource' ? 0 : 1,
            'pm' => $validated['approver_name'] ?? null,
            'cancel' => 0,
        ]);

        return redirect()->route('record-tool', $tool)->with('success', 'บันทึก Job Order สำเร็จ');
    }

    private function resolveEquipmentTypeCode(?string $asset): int
    {
        if (! $asset) {
            return 0;
        }

        $prefix = substr($asset, 0, 7);
        $code = DB::table('code')->where('code', $prefix)->first();

        return $code->type_code ?? 0;
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