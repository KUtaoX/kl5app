<?php

namespace App\Http\Controllers;

use App\Queries\JobOrderHomeQuery;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Dashboard — สรุปจากตาราง job_order, job_order_sub, tool และ form1 (Maintenance)
 *
 * นิยามที่ใช้
 *   ใบสั่งงานที่เปิดอยู่  = ไม่ถูกยกเลิก (cancel <> 1) และยังไม่มีวันที่เสร็จ (datetime2)
 *   ค่าอะไหล่            = SUM(job_order_sub.price1) ของใบสั่งงานในช่วงเวลา (ตาม date_fr)
 *   งานซ่อม (form1)       = นิยามเดียวกับหน้า Maintenance Status
 *
 * ช่วงเวลา (ตัวกรอง period)
 *   month   = ต้นเดือนนี้ – วันนี้
 *   quarter = ต้นเดือนเมื่อ 2 เดือนก่อน – วันนี้
 *   year    = 1 ม.ค. – 31 ธ.ค. ของปีปัจจุบันเท่านั้น
 * ตัวเลขในการ์ดเทียบกับช่วงก่อนหน้าที่ยาวเท่ากัน เช่น 1 ม.ค.–2 ต.ค. ปีนี้ เทียบ 1 ม.ค.–2 ต.ค. ปีก่อน
 */
class DashboardController extends Controller
{
    private const PERIODS = ['month', 'quarter', 'year'];

    private const OVERDUE_DAYS = 7;

    private const LIST_LIMIT = 10;

    private const THAI_MONTHS = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    public function index(Request $request): Response
    {
        $input = $request->validate([
            'period' => ['nullable', Rule::in(self::PERIODS)],
            'site'   => ['nullable', 'string', 'max:100'],
        ]);
        $period = $input['period'] ?? 'month';
        $site = trim((string) ($input['site'] ?? ''));

        $now = CarbonImmutable::now();
        [$from, $to, $prevFrom, $prevTo] = $this->range($period, $now);

        return Inertia::render('Dashboard', [
            'filters' => ['period' => $period, 'site' => $site],
            'stats'   => [
                'rangeLabel'      => $this->rangeLabel($period, $from, $to),
                'sites'           => $this->sites(),
                'kpi'             => $this->kpi($site, $from, $to, $prevFrom, $prevTo),
                'attention'       => $this->attention($site, $now),
                'pipeline'        => $this->pipeline($site, $from, $to),
                'monthly'         => $this->monthly($site, $period, $now),
                'groups'          => $this->groups($site, $from, $to),
                'costBySite'      => $this->costBySite($from, $to),
                'topTools'        => $this->topTools($site, $from, $to),
                'repeatWarning'   => 5,
                'overdueDays'     => self::OVERDUE_DAYS,
            ],
        ]);
    }

    // ==============================================================
    // ช่วงเวลา
    // ==============================================================
    /** @return array{0: CarbonImmutable, 1: CarbonImmutable, 2: CarbonImmutable, 3: CarbonImmutable} [เริ่ม, สิ้นสุด, เริ่มช่วงก่อน, สิ้นสุดช่วงก่อน] */
    private function range(string $period, CarbonImmutable $now): array
    {
        if ($period === 'year') {
            // เฉพาะปีปัจจุบัน 1 ม.ค. – 31 ธ.ค.
            // ตัวเทียบใช้ 1 ม.ค. – วันเดียวกันของปีก่อน เพื่อให้เทียบช่วงที่ยาวเท่ากัน
            $lastYear = $now->subYearNoOverflow();

            return [$now->startOfYear(), $now->endOfYear(), $lastYear->startOfYear(), $lastYear];
        }

        $from = $period === 'quarter' ? $now->startOfMonth()->subMonths(2) : $now->startOfMonth();
        $shift = fn (CarbonImmutable $d) => $period === 'quarter' ? $d->subMonthsNoOverflow(3) : $d->subMonthNoOverflow();

        return [$from, $now, $shift($from), $shift($now)];
    }

    private function rangeLabel(string $period, CarbonImmutable $from, CarbonImmutable $to): string
    {
        $my = fn (CarbonImmutable $d) => self::THAI_MONTHS[$d->month] . ' ' . ($d->year + 543);

        return match ($period) {
            'year'    => 'ปี ' . ($from->year + 543),
            'quarter' => self::THAI_MONTHS[$from->month] . ($from->year !== $to->year ? ' ' . ($from->year + 543) : '') . ' – ' . $my($to),
            default   => $my($from),
        };
    }

    // ==============================================================
    // query พื้นฐาน
    // ==============================================================
    private function jobOrders(string $site = ''): Builder
    {
        return DB::table('job_order as jo')
            ->whereRaw('COALESCE(jo.cancel, 0) <> 1')
            ->when($site !== '', fn (Builder $q) => $q->where('jo.site', $site));
    }

    /** ยังไม่มีวันที่เสร็จ (รองรับทั้ง NULL และ 0000-00-00 ของระบบเดิม) */
    private function whereOpen(Builder $q): Builder
    {
        return $q->where(fn (Builder $q) => $q->whereNull('jo.datetime2')->orWhere('jo.datetime2', '<', '1971-01-01'));
    }

    private function repairs(string $site = ''): Builder
    {
        return DB::table('form1 as f')
            ->when($site !== '', fn (Builder $q) => $q->where('f.site', $site));
    }

    /**
     * ค่าอะไหล่รวมต่อใบสั่งงาน
     * ข้อมูลจากระบบเดิมบางแถวเก็บ price1 เป็นข้อความ เช่น "1,490.50" ถ้า SUM ตรง ๆ
     * MySQL จะอ่านได้แค่ 1 (หยุดที่เครื่องหมายจุลภาค) จึงตัด , และช่องว่างออกก่อนแปลงเป็นตัวเลข
     */
    private function costSub(): Builder
    {
        return DB::table('job_order_sub')
            ->selectRaw("job_id, SUM(CAST(NULLIF(REPLACE(REPLACE(TRIM(price1), ',', ''), ' ', ''), '') AS DECIMAL(15,2))) as cost")
            ->groupBy('job_id');
    }

    /** date_fr อยู่ในช่วง [$a, $b] ทั้งวัน (รองรับทั้งคอลัมน์ DATE และ DATETIME) */
    private function whereDateIn(Builder $q, CarbonImmutable $a, CarbonImmutable $b): Builder
    {
        return $q->where('jo.date_fr', '>=', $a->startOfDay()->toDateTimeString())
            ->where('jo.date_fr', '<', $b->addDay()->startOfDay()->toDateTimeString());
    }

    // ==============================================================
    // ส่วนต่าง ๆ ของหน้า
    // ==============================================================
    private function sites(): array
    {
        return DB::table('job_order')
            ->whereRaw('COALESCE(cancel, 0) <> 1')
            ->whereNotNull('site')
            ->where('site', '<>', '')
            ->select('site')
            ->selectRaw('COUNT(*) as n')
            ->groupBy('site')
            ->orderByDesc('n')
            ->limit(50)
            ->get()
            ->pluck('site')
            ->all();
    }

    private function kpi(string $site, CarbonImmutable $from, CarbonImmutable $to, CarbonImmutable $prevFrom, CarbonImmutable $prevTo): array
    {
        $open = $this->whereOpen($this->jobOrders($site))->count();

        // งานที่ "เปิดอยู่" ณ วันเริ่มต้นช่วงเวลา ใช้เป็นตัวเทียบ
        $openPrev = $this->jobOrders($site)
            ->where('jo.date_fr', '<', $from->toDateString())
            ->where(fn (Builder $q) => $q
                ->whereNull('jo.datetime2')
                ->orWhere('jo.datetime2', '<', '1971-01-01')
                ->orWhere('jo.datetime2', '>=', $from->toDateTimeString()))
            ->count();

        $urgent = fn (CarbonImmutable $a, CarbonImmutable $b) => $this->whereDateIn(
            $this->jobOrders($site)->where('jo.status1', 0), $a, $b
        )->count();

        $cost = fn (CarbonImmutable $a, CarbonImmutable $b) => round((float) $this->whereDateIn(
            $this->jobOrders($site)->joinSub($this->costSub(), 's', 's.job_id', '=', 'jo.id'), $a, $b
        )->sum('s.cost'), 2);

        $working = "COALESCE(f.status1, '') <> '2' AND COALESCE(f.status2, '') <> '2' AND COALESCE(f.qc, '') <> '1'";

        return [
            'open'       => $open,
            'openPrev'   => $openPrev,
            'urgent'     => $urgent($from, $to),
            'urgentPrev' => $urgent($prevFrom, $prevTo),
            'inRepair'   => $this->repairs($site)->whereRaw($working)->count(),
            'waitingQc'  => $this->repairs($site)->whereRaw($working)->where('f.status2', '3')->count(),
            'cost'       => $cost($from, $to),
            'costPrev'   => $cost($prevFrom, $prevTo),
        ];
    }

    private function attention(string $site, CarbonImmutable $now): array
    {
        $today = $now->startOfDay();
        $days = fn ($date) => $date && ! str_starts_with((string) $date, '0000')
            ? (int) CarbonImmutable::parse($date)->startOfDay()->diffInDays($today)
            : null;

        // ---- ใบสั่งงานค้างนาน ----
        $overdueQuery = $this->whereOpen($this->jobOrders($site))
            ->where('jo.date_fr', '<=', $today->subDays(self::OVERDUE_DAYS)->toDateString());

        $overdue = (clone $overdueQuery)
            ->leftJoin('tool as t', 't.id', '=', 'jo.id_tool')
            ->select('jo.id', 'jo.job_id', 'jo.type_code', 'jo.date_fr', 'jo.site', 't.asset', 't.name')
            ->orderBy('jo.date_fr')
            ->limit(self::LIST_LIMIT)
            ->get()
            ->map(fn ($r) => [
                'id'   => $r->id,
                'href' => "/record/{$r->id}",
                'code' => $r->asset ?: '—',
                'job'  => JobOrderHomeQuery::jobOrderNo($r->type_code, $r->job_id, $r->date_fr),
                'name' => $r->name ?: '—',
                'site' => $r->site,
                'days' => $days($r->date_fr),
            ]);

        // ---- งานซ่อม (form1) ----
        $toolName = DB::table('tool')->select('name')->whereColumn('tool.asset', 'f.asset')->limit(1);
        $notDone = "COALESCE(f.status1, '') <> '2' AND COALESCE(f.status2, '') <> '2'";

        $repairRow = function ($r, string $label, ?string $dateField) use ($days) {
            return [
                'id'   => $r->id,
                'href' => route('maintenance', ['view' => 'working', 'search' => $r->asset]),
                'code' => $r->asset,
                'job'  => $label,
                'name' => $r->tool_name ?: '—',
                'site' => $r->site,
                'days' => $dateField ? $days($r->{$dateField} ?? null) : null,
            ];
        };

        $waitingQuery = $this->repairs($site)->whereRaw($notDone)->where('f.status2', '3')
            ->whereRaw("COALESCE(f.qc, '') = ''");
        $rejectedQuery = $this->repairs($site)->whereRaw($notDone)->where('f.qc', '2');
        $incompleteQuery = $this->repairs($site)->whereRaw($notDone)->whereRaw("COALESCE(f.qc, '') <> '1'")
            ->where(fn (Builder $q) => $q
                ->whereRaw("COALESCE(f.asset_no, '') = ''")
                ->orWhereNotExists(fn (Builder $q) => $q->select(DB::raw(1))->from('tool')->whereColumn('tool.asset', 'f.asset')));

        $list = fn (Builder $q, string $orderBy) => (clone $q)
            ->select('f.id', 'f.asset', 'f.asset_no', 'f.site', 'f.date', 'f.date_status2', 'f.date_qc')
            ->selectSub($toolName, 'tool_name')
            ->orderBy($orderBy)
            ->limit(self::LIST_LIMIT)
            ->get();

        return [
            'counts' => [
                'overdue'    => $overdueQuery->count(),
                'waitingQc'  => $waitingQuery->count(),
                'rejected'   => $rejectedQuery->count(),
                'incomplete' => $incompleteQuery->count(),
            ],
            'overdue'    => $overdue,
            'waitingQc'  => $list($waitingQuery, 'f.date_status2')->map(fn ($r) => $repairRow($r, 'ซ่อมเสร็จ รอ QC', 'date_status2')),
            'rejected'   => $list($rejectedQuery, 'f.date_qc')->map(fn ($r) => $repairRow($r, 'QC Reject', 'date_qc')),
            'incomplete' => $list($incompleteQuery, 'f.date')->map(fn ($r) => $repairRow(
                $r,
                $r->tool_name === null ? 'ไม่พบใน Machine List' : 'ไม่มี Asset No.',
                null
            )),
        ];
    }

    private function pipeline(string $site, CarbonImmutable $from, CarbonImmutable $to): array
    {
        $s1 = "COALESCE(f.status1, '')";
        $s2 = "COALESCE(f.status2, '')";
        $qc = "COALESCE(f.qc, '')";

        return [
            'received' => $this->repairs($site)->whereRaw("{$s1} = '' AND {$s2} <> '2' AND {$qc} <> '1'")->count(),
            'waiting'  => $this->repairs($site)->whereRaw("{$s1} = '1' AND {$s2} IN ('', '1')")->count(),
            'done'     => $this->repairs($site)->whereRaw("{$s1} <> '2' AND {$s2} = '3' AND {$qc} = ''")->count(),
            'accepted' => $this->repairs($site)->whereRaw("{$qc} = '1'")
                ->where('f.date_qc', '>=', $from->startOfDay()->toDateTimeString())
                ->where('f.date_qc', '<', $to->addDay()->startOfDay()->toDateTimeString())
                ->count(),
            'rejected' => $this->repairs($site)->whereRaw("{$s1} <> '2' AND {$s2} <> '2' AND {$qc} = '2'")->count(),
        ];
    }

    /** ใบสั่งงานรายเดือนแยกตามประเภท (status1): ปีนี้ = ม.ค.–ธ.ค. ของปีปัจจุบัน, อื่น ๆ = 12 เดือนล่าสุด */
    private function monthly(string $site, string $period, CarbonImmutable $now): array
    {
        $start = $period === 'year' ? $now->startOfYear() : $now->startOfMonth()->subMonths(11);

        $rows = $this->whereDateIn($this->jobOrders($site), $start, $start->addMonths(11)->endOfMonth())
            ->selectRaw("DATE_FORMAT(jo.date_fr, '%Y-%m') as ym, jo.status1, COUNT(*) as n")
            ->groupBy('ym', 'jo.status1')
            ->get();

        $types = count(JobOrderHomeQuery::JOB_TYPES);
        $months = [];
        for ($i = 0; $i < 12; $i++) {
            $m = $start->addMonths($i);
            $months[$m->format('Y-m')] = [
                'label'  => self::THAI_MONTHS[$m->month] . ' ' . substr((string) ($m->year + 543), 2),
                'counts' => array_fill(0, $types, 0),
            ];
        }
        foreach ($rows as $r) {
            if ($r->status1 === null) continue;
            $t = (int) $r->status1;
            if (isset($months[$r->ym]) && $t >= 0 && $t < $types) {
                $months[$r->ym]['counts'][$t] = (int) $r->n;
            }
        }

        return array_values($months);
    }

    private function groups(string $site, CarbonImmutable $from, CarbonImmutable $to): array
    {
        $rows = $this->whereDateIn($this->jobOrders($site), $from, $to)
            ->selectRaw('jo.type_code, COUNT(*) as n')
            ->groupBy('jo.type_code')
            ->get()
            ->pluck('n', 'type_code');

        $out = [];
        foreach ([1 => 'TEMP', 0 => 'MT', 2 => 'LGT'] as $code => $label) {
            $out[] = ['label' => $label, 'count' => (int) ($rows[$code] ?? 0)];
        }

        return $out;
    }

    /** ไม่กรองตาม Site เพื่อให้เห็นภาพรวมทุกไซต์ (หน้าเว็บจะไฮไลต์ไซต์ที่เลือกแทน) */
    private function costBySite(CarbonImmutable $from, CarbonImmutable $to): array
    {
        return $this->whereDateIn($this->jobOrders(), $from, $to)
            ->joinSub($this->costSub(), 's', 's.job_id', '=', 'jo.id')
            ->whereNotNull('jo.site')
            ->where('jo.site', '<>', '')
            ->selectRaw('jo.site, SUM(s.cost) as cost')
            ->groupBy('jo.site')
            ->orderByDesc('cost')
            ->limit(8)
            ->get()
            ->map(fn ($r) => ['site' => $r->site, 'cost' => (float) $r->cost])
            ->filter(fn ($r) => $r['cost'] > 0)
            ->values()
            ->all();
    }

    private function topTools(string $site, CarbonImmutable $from, CarbonImmutable $to): array
    {
        return $this->whereDateIn($this->jobOrders($site), $from, $to)
            ->join('tool as t', 't.id', '=', 'jo.id_tool')
            ->leftJoinSub($this->costSub(), 's', 's.job_id', '=', 'jo.id')
            ->selectRaw('t.id, t.asset, t.name, t.project_site, COUNT(*) as n, COALESCE(SUM(s.cost), 0) as cost')
            ->groupBy('t.id', 't.asset', 't.name', 't.project_site')
            ->orderByDesc('n')
            ->orderByDesc('cost')
            ->limit(10)
            ->get()
            ->map(fn ($r) => [
                'id'    => $r->id,
                'code'  => $r->asset,
                'name'  => $r->name,
                'site'  => $r->project_site,
                'count' => (int) $r->n,
                'cost'  => (float) $r->cost,
            ])
            ->all();
    }
}
