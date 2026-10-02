<?php

namespace App\Http\Controllers;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 *
 * ความหมายของค่าในตาราง form1 (เหมือนระบบเดิม):
 *   status1  สถานะ         '1' = ซ่อม,   '2' = ปลดระวาง            (+ date_status1)
 *   status2  การดำเนินงาน  '1' = รอซ่อม, '2' = ปลดระวาง, '3' = ซ่อมเสร็จแล้ว (+ date_status2)
 *   qc       QC             '1' = Accept, '2' = Reject             (+ date_qc)
 *   ค่าว่าง '' หรือ NULL = ยังไม่ได้เลือก
 *
 * สิทธิ์ ใช้ชุดเดียวกับหน้า Machine List / Record Tool:
 *   permission2 = Can Add    → ส่งเครื่องเข้าซ่อม (Add Tool)
 *   permission3 = Can Edit   → แก้ Asset No., สถานะ, ช่างซ่อม, การดำเนินงาน, QC
 *   permission4 = Can Delete → ลบรายการ
 *   permission5 = Read Only  → ดูได้อย่างเดียว (มีผลเหนือสิทธิ์อื่น)
 * ผู้ใช้ที่ login ทุกคนเปิดดูหน้านี้ได้
 */
class MaintenanceController extends Controller
{
    private const VIEWS = ['working', 'complete', 'all'];

    private const PER_PAGE = 10;

    // แบบฟอร์ม FR-MNT-002-01 มี 21 แถวต่อหน้า
    private const PRINT_ROWS_PER_PAGE = 21;

    // กันพิมพ์ทีละหลายพันแถวจนเซิร์ฟเวอร์ค้าง
    private const PRINT_MAX_ROWS = 1050;

    // ---------------------------------------------------------------
    // GET /maintenance
    // ---------------------------------------------------------------
    public function index(Request $request): Response
    {
        $can = $this->abilities($request);

        $filters = $this->filters($request);

        $counts = [];
        foreach (self::VIEWS as $view) {
            $counts[$view] = $this->applyView($this->base($filters), $view)->count();
        }

        $items = $this->listQuery($filters)
            ->paginate(self::PER_PAGE)
            ->withQueryString()
            ->through(fn ($row) => $this->row($row));

        return Inertia::render('Mainten/Mainten_Status', [
            'items'   => $items,
            'filters' => $filters,
            'counts'  => $counts,
            'can'     => $can,
        ]);
    }

    // ---------------------------------------------------------------
    // GET /maintenance/print — พิมพ์ลงแบบฟอร์ม FR-MNT-002-01 ตามตัวกรองเดียวกับหน้าจอ
    // ---------------------------------------------------------------
    public function print(Request $request)
    {
        $filters = $this->filters($request);

        $rows = $this->listQuery($filters)
            ->limit(self::PRINT_MAX_ROWS)
            ->get()
            ->map(fn ($row) => $this->row($row))
            ->all();

        // แบ่งหน้าละ 21 แถว และเติมแถวว่างให้หน้าสุดท้ายเต็มแบบฟอร์ม
        $pages = array_chunk($rows, self::PRINT_ROWS_PER_PAGE) ?: [[]];
        $last = count($pages) - 1;
        $pages[$last] = array_pad($pages[$last], self::PRINT_ROWS_PER_PAGE, null);

        $pdf = Pdf::loadView('pdf.maintenance-status', ['pages' => $pages])
            ->setPaper('a4', 'landscape');

        return $pdf->stream('maintenance-status-' . now()->format('Ymd-His') . '.pdf');
    }

    // ---------------------------------------------------------------
    // POST /maintenance — Add Tool (ส่งเครื่องเข้าซ่อมได้หลายเครื่องในครั้งเดียว)
    // ---------------------------------------------------------------
    public function store(Request $request): RedirectResponse
    {
        $can = $this->abilities($request);
        abort_unless($can['add'], 403, 'คุณไม่มีสิทธิ์ส่งเครื่องเข้าซ่อม');

        $data = $request->validate([
            'site'              => ['required', 'string', 'max:100'],
            'date'              => ['required', 'date'],
            'assets'            => ['required', 'array', 'min:1', 'max:50'],
            'assets.*.code'     => ['required', 'string', 'max:100', 'distinct:ignore_case'],
            'assets.*.asset_no' => ['nullable', 'string', 'max:100'],
        ], [
            'site.required'          => 'กรุณาระบุ Site',
            'date.required'          => 'กรุณาเลือกวันที่',
            'assets.required'        => 'กรุณาระบุ Asset Code อย่างน้อย 1 รายการ',
            'assets.*.code.required' => 'กรุณาระบุ Asset Code',
            'assets.*.code.distinct' => 'Asset Code ซ้ำกันในรายการ',
        ]);

        $codes = collect($data['assets'])->pluck('code')->map(fn ($c) => trim($c));
        $tools = DB::table('tool')->whereIn('asset', $codes)->get(['id', 'asset', 'name'])->keyBy(fn ($t) => strtoupper($t->asset));

        // ต้องเป็นเครื่องที่มีอยู่ใน Machine List เท่านั้น (ระบบเดิมเลือกจาก list_tool)
        $missing = [];
        foreach ($data['assets'] as $i => $asset) {
            if (! $tools->has(strtoupper(trim($asset['code'])))) {
                $missing["assets.{$i}.code"] = 'ไม่พบ Asset Code นี้ใน Machine List';
            }
        }
        if ($missing) {
            throw ValidationException::withMessages($missing);
        }

        DB::transaction(function () use ($data, $tools) {
            foreach ($data['assets'] as $asset) {
                $tool = $tools[strtoupper(trim($asset['code']))];
                $assetNo = trim((string) ($asset['asset_no'] ?? ''));

                DB::table('form1')->insert([
                    'date'     => $data['date'],
                    'id_tool'  => $tool->id,
                    'name'     => $tool->name,
                    'asset'    => $tool->asset,
                    'site'     => strtoupper(trim($data['site'])),
                    'asset_no' => $assetNo,
                    'name_tec' => '',
                    'status1'  => '',
                    'status2'  => '',
                    'qc'       => '',
                ]);

                if ($assetNo !== '') {
                    DB::table('tool')->where('id', $tool->id)->update(['asset_in' => $assetNo]);
                }
            }
        });

        return back()->with('success', 'ส่งเข้าซ่อม ' . count($data['assets']) . ' เครื่องแล้ว');
    }

    // ---------------------------------------------------------------
    // PATCH /maintenance/{id} — บันทึกทีละแถว (บันทึกได้เฉพาะช่องที่มีสิทธิ์)
    // ---------------------------------------------------------------
    public function update(Request $request, int $id): RedirectResponse
    {
        $can = $this->abilities($request);
        abort_unless($can['edit'], 403, 'คุณไม่มีสิทธิ์แก้ไขข้อมูล');

        $current = DB::table('form1')->where('id', $id)->first();
        abort_if(! $current, 404);

        $input = $request->validate([
            'asset_no'   => ['nullable', 'string', 'max:100'],
            'technician' => ['nullable', 'string', 'max:100'],
            'status1'    => ['nullable', Rule::in(['', '1', '2'])],
            'status2'    => ['nullable', Rule::in(['', '1', '2', '3'])],
            'qc'         => ['nullable', Rule::in(['', '1', '2'])],
        ]);

        $today = now()->toDateString();
        $changes = [];

        if ($request->has('asset_no')) {
            $changes['asset_no'] = trim((string) $input['asset_no']);
        }
        if ($request->has('technician')) {
            $changes['name_tec'] = trim((string) $input['technician']);
        }

        $statusFields = ['status1' => 'date_status1', 'status2' => 'date_status2', 'qc' => 'date_qc'];
        foreach ($statusFields as $field => $dateField) {
            if (! $request->has($field)) {
                continue;
            }
            $value = (string) ($input[$field] ?? '');
            // เหมือนระบบเดิม: บันทึกวันที่เฉพาะตอนที่ค่าเปลี่ยน และไม่ให้ลบค่าที่เลือกไปแล้ว
            if ($value !== '' && $value !== (string) ($current->{$field} ?? '')) {
                $changes[$field] = $value;
                $changes[$dateField] = $today;
            }
        }

        if ($changes) {
            DB::transaction(function () use ($id, $changes, $current) {
                DB::table('form1')->where('id', $id)->update($changes);

                if (array_key_exists('asset_no', $changes) && $current->id_tool) {
                    DB::table('tool')->where('id', $current->id_tool)->update(['asset_in' => $changes['asset_no']]);
                }
            });
        }

        return back()->with('success', "บันทึก {$current->asset} แล้ว");
    }

    // ---------------------------------------------------------------
    // DELETE /maintenance/{id}
    // ---------------------------------------------------------------
    public function destroy(Request $request, int $id): RedirectResponse
    {
        abort_unless($this->abilities($request)['delete'], 403, 'คุณไม่มีสิทธิ์ลบรายการ');

        $row = DB::table('form1')->where('id', $id)->first();
        abort_if(! $row, 404);

        DB::table('form1')->where('id', $id)->delete();

        return back()->with('success', "ลบ {$row->asset} แล้ว");
    }

    // ===============================================================
    // helpers
    // ===============================================================
    private function abilities(Request $request): array
    {
        $user = $request->user();
        $has = fn (int $n) => (string) ($user->{"permission{$n}"} ?? '') === '1';
        $readOnly = $has(5);

        return [
            'add'    => ! $readOnly && $has(2),
            'edit'   => ! $readOnly && $has(3),
            'delete' => ! $readOnly && $has(4),
        ];
    }

    private function filters(Request $request): array
    {
        $filters = $request->validate([
            'view'   => ['nullable', Rule::in(self::VIEWS)],
            'search' => ['nullable', 'string', 'max:100'],
            'site'   => ['nullable', 'string', 'max:100'],
            'from'   => ['nullable', 'date'],
            'to'     => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        return array_merge(
            ['view' => 'working', 'search' => '', 'site' => '', 'from' => '', 'to' => ''],
            array_filter($filters, fn ($v) => $v !== null)
        );
    }

    /** รายการตามแท็บและตัวกรอง เรียงวันที่ล่าสุดก่อน (ใช้ทั้งหน้าจอและตอนพิมพ์) */
    private function listQuery(array $filters): Builder
    {
        return $this->applyView($this->base($filters), $filters['view'])
            ->select('f.*')
            ->selectSub(
                DB::table('tool')->select('name')->whereColumn('tool.asset', 'f.asset')->limit(1),
                'tool_name'
            )
            ->orderByDesc('f.date')
            ->orderByDesc('f.id');
    }

    private function base(array $f): Builder
    {
        // ค้นหาโดยไม่สนช่องว่าง: "GI000001" กับ "GI 000001" เจอเหมือนกัน
        // ตัดช่องว่างออกทั้งคำค้นและค่าในฐานข้อมูลก่อนเทียบ
        $term = preg_replace('/\s+/u', '', $f['search']);
        $like = '%' . addcslashes($term, '\\%_') . '%';
        $columns = ['f.asset', 'f.asset_no', 'f.name', 'f.name_tec'];

        return DB::table('form1 as f')
            ->when($term !== '', fn (Builder $q) => $q->where(function (Builder $q) use ($columns, $like) {
                foreach ($columns as $column) {
                    $q->orWhereRaw("REPLACE(COALESCE({$column}, ''), ' ', '') LIKE ?", [$like]);
                }
            }))
            ->when($f['site'] !== '', fn (Builder $q) => $q->where('f.site', 'like', "%{$f['site']}%"))
            ->when($f['from'] !== '', fn (Builder $q) => $q->whereDate('f.date', '>=', $f['from']))
            ->when($f['to'] !== '', fn (Builder $q) => $q->whereDate('f.date', '<=', $f['to']));
    }

    /** working / complete / all ใช้เงื่อนไขเดียวกับ repair.php */
    private function applyView(Builder $q, string $view): Builder
    {
        $s1 = "COALESCE(f.status1, '')";
        $s2 = "COALESCE(f.status2, '')";
        $qc = "COALESCE(f.qc, '')";

        return match ($view) {
            'complete' => $q->whereRaw("({$s1} = '2' OR {$s2} = '2' OR {$qc} = '1')"),
            'working'  => $q->whereRaw("{$s1} <> '2' AND {$s2} <> '2' AND {$qc} <> '1'"),
            default => $q,
        };
    }

    private function row(object $r): array
    {
        return [
            'id'           => $r->id,
            'tool_id'      => $r->id_tool,
            'date'         => $this->ymd($r->date),
            'code'         => $r->asset,
            'asset_no'     => (string) ($r->asset_no ?? ''),
            'name'         => $r->tool_name,
            'found'        => $r->tool_name !== null,
            'site'         => $r->site,
            'technician'   => (string) ($r->name_tec ?? ''),
            'status1'      => (string) ($r->status1 ?? ''),
            'status2'      => (string) ($r->status2 ?? ''),
            'qc'           => (string) ($r->qc ?? ''),
            'date_status1' => $this->ymd($r->date_status1 ?? null),
            'date_status2' => $this->ymd($r->date_status2 ?? null),
            'date_qc'      => $this->ymd($r->date_qc ?? null),
        ];
    }

    private function ymd($value): ?string
    {
        if (! $value || str_starts_with((string) $value, '0000')) {
            return null;
        }

        return substr((string) $value, 0, 10);
    }
}
