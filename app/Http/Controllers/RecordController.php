<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Exports\JobOrderHomeExport;
use App\Queries\JobOrderHomeQuery;
use Maatwebsite\Excel\Facades\Excel;

class RecordController extends Controller
{
    private const JOB_TYPES = ['urgent', 'maintenance', 'install', 'audit', 'internal'];
    private const ALLOWED_DOC_EXT = ['jpg', 'jpeg', 'png', 'pdf', 'xlsx', 'xls', 'doc', 'docx'];
    private const MAX_DOC_COUNT = 3;

    /**
     * GET /record/{id} — เปิดหน้า Record แบบส่วนบนอ่านอย่างเดียว (ปุ่ม "Record")
     */
    public function show(Request $request, int $id)
    {
        return $this->renderRecordPage($id, false);
    }

    /**
     * GET /record/{id}/edit — เปิดหน้าเดียวกัน แต่ส่วนบนแก้ไขได้ด้วย (ปุ่ม "Edit")
     */
    public function edit(Request $request, int $id)
    {
        return $this->renderRecordPage($id, true);
    }

    public function jobOrderHome(Request $request)
    {
        $filters = JobOrderHomeQuery::filters($request);

        $jobs = JobOrderHomeQuery::build($filters)
            ->paginate(10)
            ->withQueryString()
            ->through(fn ($row) => JobOrderHomeQuery::row($row));

        return Inertia::render('Order/Job_Order_Home', [
            'jobs'     => $jobs,
            'filters'  => $filters,
            'jobTypes' => JobOrderHomeQuery::JOB_TYPES,
            'groups'   => JobOrderHomeQuery::GROUPS,
        ]);
    }

    /**
     * GET /job-order-home/export — Export ตามตัวกรองเดียวกับหน้าจอ
     */
    public function jobOrderHomeExport(Request $request)
    {
        $filters = JobOrderHomeQuery::filters($request);

        return Excel::download(
            new JobOrderHomeExport($filters),
            'job-orders-' . now()->format('Ymd-His') . '.xlsx'
        );
    }


    public function cancel(Request $request, int $id)
    {
        $jobOrder = DB::table('job_order')->where('id', $id)->first();
        abort_if(!$jobOrder, 404, 'ไม่พบใบสั่งงานนี้');

        $tool = !empty($jobOrder->id_tool)
            ? DB::table('tool')->where('id', $jobOrder->id_tool)->first()
            : null;

        $monthShow2 = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        $thaiDate = function ($date) use ($monthShow2) {
            if (empty($date) || $date === '0000-00-00') {
                return '';
            }
            $p = explode('-', $date);
            return ((int) $p[2]) . ' ' . $monthShow2[((int) $p[1]) - 1] . ' ' . ((int) $p[0] + 543);
        };

        return Inertia::render('Order/Cancel_JobOrder', [
            'jobOrder' => $jobOrder,
            'tool' => $tool,
            'dateFrTh' => $thaiDate($jobOrder->date_fr ?? null),
            'date1Th' => $thaiDate($jobOrder->date1 ?? null),
            'date2Th' => $thaiDate($jobOrder->date2 ?? null),
            'stopDateTh' => $thaiDate($jobOrder->stop_date ?? null),
        ]);
    }

    public function cancelSave(Request $request, int $id)
    {
        $jobOrder = DB::table('job_order')->where('id', $id)->first();
        abort_if(!$jobOrder, 404, 'ไม่พบใบสั่งงานนี้');

        $data = $request->validate([
            'remark' => 'nullable|string',
        ]);

        DB::table('job_order')->where('id', $id)->update([
            'cancel' => 1,
            'cancel_des' => '***ยกเลิกJOB เนื่องจาก' . ($data['remark'] ?? ''),
        ]);

        return redirect()
            ->route('record-tool', $jobOrder->id_tool)
            ->with('success', 'ยกเลิกใบสั่งงานเรียบร้อยแล้ว');
    }

    private function renderRecordPage(int $id, bool $editable)
    {
        $jobOrder = DB::table('job_order')
            ->selectRaw('*,
                DATE_FORMAT(datetime1, "%Y-%m-%d") as stop_date,
                HOUR(datetime1) as stop_hour,
                MINUTE(datetime1) as stop_minute,
                DATE_FORMAT(datetime2, "%Y-%m-%d") as finish_date_raw,
                HOUR(datetime2) as finish_hour,
                MINUTE(datetime2) as finish_minute
            ')
            ->where('id', $id)
            ->first();

        abort_if(!$jobOrder, 404, 'ไม่พบใบสั่งงานนี้');

        $tool = DB::table('tool')->where('id', $jobOrder->id_tool)->first();

        $subs = DB::table('job_order_sub')
            ->where('job_id', $jobOrder->id)
            ->orderBy('id')
            ->get();

        $list1  = $subs->pluck('list1')->values()->all();
        $num1   = $subs->pluck('num1')->values()->all();
        $po1    = $subs->pluck('po1')->values()->all();
        $price1 = $subs->pluck('price1')->values()->all();

        if (empty($list1)) {
            $list1 = [''];
            $num1 = [''];
            $po1 = [''];
            $price1 = [''];
        }

        $nameP1 = DB::table('job_order_who1')->where('job_id', $jobOrder->id)->orderBy('id')->pluck('name')->all();
        $nameP2 = DB::table('job_order_who2')->where('job_id', $jobOrder->id)->orderBy('id')->pluck('name')->all();

        $time1parts = $jobOrder->time1 ? explode(':', $jobOrder->time1) : ['00', '00'];
        $time2parts = $jobOrder->time2 ? explode(':', $jobOrder->time2) : ['00', '00'];

        return Inertia::render('Order/Record_JobOrder', [
            'editable' => $editable,
            'tool' => $tool ? [
                'id'    => $tool->id,
                'name'  => $tool->name,
                'asset' => $tool->asset,
            ] : null,
            'jobOrder' => [
                'id'    => $jobOrder->id,
                'asset' => $tool?->asset ?? '',

                // ===== ส่วนบน (อ่านอย่างเดียวในโหมด Record / แก้ไขได้ในโหมด Edit) =====
                'job_type'           => self::JOB_TYPES[$jobOrder->status1] ?? self::JOB_TYPES[0],
                'project'            => $jobOrder->site,
                'date'               => $jobOrder->date_fr,
                'in_date'            => $jobOrder->date1,
                'in_time_h'          => $time1parts[0] ?? '00',
                'in_time_m'          => $time1parts[1] ?? '00',
                'out_date'           => $jobOrder->date2,
                'out_time_h'         => $time2parts[0] ?? '00',
                'out_time_m'         => $time2parts[1] ?? '00',
                'responsible_name'   => $jobOrder->name1,
                'mileage'            => $jobOrder->num_mi,
                'hour_meter'         => $jobOrder->time_work,
                'stop_date'          => $jobOrder->stop_date,
                'stop_time_h'        => str_pad((string) $jobOrder->stop_hour, 2, '0', STR_PAD_LEFT),
                'stop_time_m'        => str_pad((string) $jobOrder->stop_minute, 2, '0', STR_PAD_LEFT),
                'damage_description' => $jobOrder->cause,
                'reporter_name'      => $jobOrder->name2,
                'comment'            => $jobOrder->des1,
                'repair_mode'        => $jobOrder->status2 == 0 ? 'outsource' : 'self',
                'approver_name'      => $jobOrder->pm,

                // ===== ส่วนล่าง (แก้ไขได้เสมอ) =====
                'repair'        => $jobOrder->repair,
                'list1'         => $list1,
                'num1'          => $num1,
                'po1'           => $po1,
                'price1'        => $price1,
                'nameP1'        => $nameP1,
                'nameP2'        => $nameP2,
                'des2'          => $jobOrder->des2,
                'finish_date'   => $jobOrder->finish_date_raw,
                'finish_time_h' => str_pad((string) $jobOrder->finish_hour, 2, '0', STR_PAD_LEFT),
                'finish_time_m' => str_pad((string) $jobOrder->finish_minute, 2, '0', STR_PAD_LEFT),
                'fore_mt'       => $jobOrder->fore_mt,
                'status3'       => (string) ($jobOrder->status3 ?? '0'),
                'name_qc'       => $jobOrder->name_qc,
                'qc'            => $jobOrder->qc,
                'name_pm2'      => $jobOrder->name_pm2,
            ],
        ]);
    }

    /**
     * POST /record/{id}
     * บันทึกทั้งข้อมูล Job Order เดิม (ถ้าถูกส่งมาจากโหมด Edit) และรายงานผลการซ่อม (เสมอ)
     */
    public function store(Request $request, int $id)
    {
        $jobOrder = DB::table('job_order')->where('id', $id)->first();
        abort_if(!$jobOrder, 404, 'ไม่พบใบสั่งงานนี้');

        $data = $request->validate([
            // ส่วนบน (Job Order เดิม) — ไม่บังคับ เพราะโหมด Record จะไม่ได้ถูกแก้ แต่ยังส่งค่าเดิมมาด้วย
            'job_type'           => 'nullable|in:urgent,maintenance,install,audit,internal',
            'project'            => 'nullable|string|max:255',
            'date'               => 'nullable|date',
            'in_date'            => 'nullable|date',
            'in_time_h'          => 'nullable|string|max:2',
            'in_time_m'          => 'nullable|string|max:2',
            'out_date'           => 'nullable|date',
            'out_time_h'         => 'nullable|string|max:2',
            'out_time_m'         => 'nullable|string|max:2',
            'responsible_name'   => 'nullable|string|max:255',
            'mileage'            => 'nullable|string|max:50',
            'hour_meter'         => 'nullable|string|max:50',
            'stop_date'          => 'nullable|date',
            'stop_time_h'        => 'nullable|string|max:2',
            'stop_time_m'        => 'nullable|string|max:2',
            'damage_description' => 'nullable|string',
            'reporter_name'      => 'nullable|string|max:255',
            'comment'            => 'nullable|string',
            'repair_mode'        => 'nullable|in:outsource,self',
            'approver_name'      => 'nullable|string|max:255',

            // ส่วนล่าง (รายงานผลการซ่อม)
            'repair'         => 'nullable|string',
            'list1'          => 'nullable|array',
            'list1.*'        => 'nullable|string|max:255',
            'num1'           => 'nullable|array',
            'num1.*'         => 'nullable|string|max:50',
            'po1'            => 'nullable|array',
            'po1.*'          => 'nullable|string|max:100',
            'price1'         => 'nullable|array',
            'price1.*'       => 'nullable|numeric',
            'nameP1'         => 'nullable|array',
            'nameP1.*'       => 'nullable|string|max:255',
            'nameP2'         => 'nullable|array',
            'nameP2.*'       => 'nullable|string|max:255',
            'des2'           => 'nullable|string',
            'finish_date'    => 'nullable|date',
            'finish_time_h'  => 'nullable|string|max:2',
            'finish_time_m'  => 'nullable|string|max:2',
            'fore_mt'        => 'nullable|string|max:255',
            'status3'        => 'nullable|in:0,1',
            'name_qc'        => 'nullable|string|max:255',
            'qc'             => 'nullable|string',
            'name_pm2'       => 'nullable|string|max:255',
            'file_job'       => 'nullable|array|max:' . self::MAX_DOC_COUNT,
            'file_job.*'     => 'file|max:5120|mimes:' . implode(',', self::ALLOWED_DOC_EXT), // max:5120 = 5MB
        ]);

        DB::transaction(function () use ($request, $data, $jobOrder) {
            // --- รวมวันที่ + เวลา เป็น string เดียวสำหรับคอลัมน์ time1/time2 ---
            $time1 = isset($data['in_time_h'])
                ? str_pad($data['in_time_h'], 2, '0', STR_PAD_LEFT) . ':' . str_pad($data['in_time_m'] ?? '00', 2, '0', STR_PAD_LEFT)
                : $jobOrder->time1;
            $time2 = isset($data['out_time_h'])
                ? str_pad($data['out_time_h'], 2, '0', STR_PAD_LEFT) . ':' . str_pad($data['out_time_m'] ?? '00', 2, '0', STR_PAD_LEFT)
                : $jobOrder->time2;

            // --- รวมวันที่เครื่องจักรหยุดทำงาน + เวลา เป็น datetime1 ---
            $datetime1 = $jobOrder->datetime1;
            if (!empty($data['stop_date'])) {
                $h = str_pad($data['stop_time_h'] ?? '00', 2, '0', STR_PAD_LEFT);
                $m = str_pad($data['stop_time_m'] ?? '00', 2, '0', STR_PAD_LEFT);
                $datetime1 = $data['stop_date'] . " {$h}:{$m}:00";
            }

            // --- รวมวันที่ช่างซ่อมเสร็จ + เวลา เป็น datetime2 ---
            $datetime2 = $jobOrder->datetime2;
            if (!empty($data['finish_date'])) {
                $h = str_pad($data['finish_time_h'] ?? '00', 2, '0', STR_PAD_LEFT);
                $m = str_pad($data['finish_time_m'] ?? '00', 2, '0', STR_PAD_LEFT);
                $datetime2 = $data['finish_date'] . " {$h}:{$m}:00";
            }

            $jobTypeIndex = array_search($data['job_type'] ?? null, self::JOB_TYPES, true);

            DB::table('job_order')->where('id', $jobOrder->id)->update([
                // ส่วนบน (Job Order เดิม)
                'status1'   => $jobTypeIndex !== false ? $jobTypeIndex : $jobOrder->status1,
                'site'      => $data['project'] ?? $jobOrder->site,
                'date_fr'   => $data['date'] ?? $jobOrder->date_fr,
                'date1'     => $data['in_date'] ?? $jobOrder->date1,
                'time1'     => $time1,
                'date2'     => $data['out_date'] ?? $jobOrder->date2,
                'time2'     => $time2,
                'name1'     => $data['responsible_name'] ?? $jobOrder->name1,
                'num_mi'    => $data['mileage'] ?? $jobOrder->num_mi,
                'time_work' => $data['hour_meter'] ?? $jobOrder->time_work,
                'datetime1' => $datetime1,
                'cause'     => $data['damage_description'] ?? $jobOrder->cause,
                'name2'     => $data['reporter_name'] ?? $jobOrder->name2,
                'des1'      => $data['comment'] ?? $jobOrder->des1,
                'status2'   => isset($data['repair_mode']) ? ($data['repair_mode'] === 'outsource' ? 0 : 1) : $jobOrder->status2,
                'pm'        => $data['approver_name'] ?? $jobOrder->pm,

                // ส่วนล่าง (รายงานผลการซ่อม)
                'repair'    => $data['repair'] ?? '',
                'des2'      => $data['des2'] ?? '',
                'datetime2' => $datetime2,
                'fore_mt'   => $data['fore_mt'] ?? '',
                'status3'   => $data['status3'] ?? '0',
                'name_qc'   => $data['name_qc'] ?? '',
                'qc'        => $data['qc'] ?? '',
                'name_pm2'  => $data['name_pm2'] ?? '',
            ]);

            // แทนที่รายการอะไหล่ทั้งหมดด้วยชุดที่ส่งมาใหม่
            DB::table('job_order_sub')->where('job_id', $jobOrder->id)->delete();

            foreach (($data['list1'] ?? []) as $i => $list) {
                $list = trim(strip_tags((string) $list));
                if ($list === '') {
                    continue;
                }

                DB::table('job_order_sub')->insert([
                    'job_id' => $jobOrder->id,
                    'list1'  => $list,
                    'num1'   => $data['num1'][$i] ?? '',
                    'po1'    => $data['po1'][$i] ?? '',
                    'price1' => $data['price1'][$i] ?? null,
                ]);

                $exists = DB::table('auto_list')->where('list', $list)->exists();
                if (!$exists) {
                    DB::table('auto_list')->insert(['list' => $list]);
                }
            }

            // แทนที่รายชื่อพนักงานทั้งสองกลุ่มด้วยชุดใหม่
            DB::table('job_order_who1')->where('job_id', $jobOrder->id)->delete();
            foreach (($data['nameP1'] ?? []) as $name) {
                $name = trim((string) $name);
                if ($name !== '') {
                    DB::table('job_order_who1')->insert(['job_id' => $jobOrder->id, 'name' => $name]);
                }
            }

            DB::table('job_order_who2')->where('job_id', $jobOrder->id)->delete();
            foreach (($data['nameP2'] ?? []) as $name) {
                $name = trim((string) $name);
                if ($name !== '') {
                    DB::table('job_order_who2')->insert(['job_id' => $jobOrder->id, 'name' => $name]);
                }
            }

            // ไฟล์แนบ — จำกัดจำนวนรวม (เดิม + ใหม่) ไม่เกิน MAX_DOC_COUNT
            if ($request->hasFile('file_job')) {
                $existingCount = DB::table('job_order_file')->where('id_job', $jobOrder->id)->count();
                $slotsLeft = self::MAX_DOC_COUNT - $existingCount;
                $files = array_slice($request->file('file_job'), 0, max($slotsLeft, 0));

                foreach ($files as $file) {
                    $ext = strtolower($file->getClientOriginalExtension());
                    $originalName = $file->getClientOriginalName();

                    $fileId = DB::table('job_order_file')->insertGetId([
                        'id_job' => $jobOrder->id,
                        'name'   => $originalName,
                    ]);

                    $storedName = base64_encode((string) $fileId) . '.' . $ext;
                    // ต้องรัน `php artisan storage:link` ไว้ก่อน ถ้าต้องการเข้าถึงไฟล์ผ่าน URL สาธารณะ
                    $file->storeAs('job_order_files', $storedName, 'public');
                }
            }
        });

        // return redirect()->back()->with('success', 'บันทึกข้อมูลเรียบร้อยแล้ว');
        return redirect()
        ->route('record-tool', $jobOrder->id_tool)
        ->with('success', 'บันทึกข้อมูลเรียบร้อยแล้ว');
    }
    public function print(int $id)
    {
        $data = $this->loadJobOrderForPrint($id);

        $pdf = Pdf::loadView('pdf.job-order', $data)->setPaper('a4', 'portrait');

        return $pdf->stream('job-order-' . str_replace('/', '-', $data['jobOrderNo']) . '.pdf');
    }

    private function loadJobOrderForPrint(int $id): array
    {
        $jobOrder = DB::table('job_order')
            ->selectRaw('*,
                DATE_FORMAT(datetime1, "%Y-%m-%d") as stop_date,
                HOUR(datetime1) as stop_hour,
                MINUTE(datetime1) as stop_minute,
                DATE_FORMAT(datetime2, "%Y-%m-%d") as finish_date_raw,
                HOUR(datetime2) as finish_hour,
                MINUTE(datetime2) as finish_minute
            ')
            ->where('id', $id)
            ->first();

        abort_if(!$jobOrder, 404, 'ไม่พบใบสั่งงานนี้');

        $tool  = DB::table('tool')->where('id', $jobOrder->id_tool)->first();
        $subs  = DB::table('job_order_sub')->where('job_id', $jobOrder->id)->orderBy('id')->get();
        $nameP1 = DB::table('job_order_who1')->where('job_id', $jobOrder->id)->orderBy('id')->pluck('name')->all();
        $nameP2 = DB::table('job_order_who2')->where('job_id', $jobOrder->id)->orderBy('id')->pluck('name')->all();

        $time1parts = $jobOrder->time1 ? explode(':', $jobOrder->time1) : ['00', '00'];
        $time2parts = $jobOrder->time2 ? explode(':', $jobOrder->time2) : ['00', '00'];

        $prefix = match ((int) $jobOrder->type_code) {
            2 => 'LGT',
            0 => 'MT',
            default => 'TEMP',
        };
        $jobOrderNo = $prefix . '/JOB-' . str_pad((string) $jobOrder->job_id, 3, '0', STR_PAD_LEFT)
            . '/' . substr((string) date('Y', strtotime($jobOrder->date_fr)), 2, 2);

        $monthShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        $thaiDate = function (?string $date) use ($monthShort) {
            if (!$date) {
                return '';
            }
            [$y, $m, $d] = explode('-', $date);
            return ((int) $d) . ' ' . $monthShort[((int) $m) - 1] . ' ' . ((int) $y + 543);
        };

        return [
            'jobOrder'    => $jobOrder,
            'tool'        => $tool,
            'subs'        => $subs,
            'nameP1'      => $nameP1,
            'nameP2'      => $nameP2,
            'jobOrderNo'  => $jobOrderNo,
            'dateFrTh'    => $thaiDate($jobOrder->date_fr),
            'date1Th'     => $thaiDate($jobOrder->date1),
            'date2Th'     => $thaiDate($jobOrder->date2),
            'stopDateTh'  => $thaiDate($jobOrder->stop_date),
            'finishDateTh'=> $thaiDate($jobOrder->finish_date_raw),
            'time1'       => $time1parts[0] . ':' . $time1parts[1],
            'time2'       => $time2parts[0] . ':' . $time2parts[1],
        ];
    }
}
