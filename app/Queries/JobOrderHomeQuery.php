<?php

namespace App\Queries;

use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Query กลางของหน้า Job Order Home
 * ใช้ร่วมกันระหว่างหน้าเว็บ (RecordController@jobOrderHome) และการ Export Excel
 */
class JobOrderHomeQuery
{
    /** index = ค่าใน job_order.status1 (ลำดับเดียวกับ RecordController::JOB_TYPES) */
    public const JOB_TYPES = ['ซ่อมเร่งด่วน', 'บำรุงรักษา', 'ติดตั้ง', 'Audit', 'ซ่อมภายใน'];

    /** ค่าใน job_order.type_code → prefix ของเลข Job Order */
    public const GROUPS = [0 => 'MT', 1 => 'TEMP', 2 => 'LGT'];

    /** key ที่ส่งมาจากหน้าเว็บ → คอลัมน์จริงใน SQL (whitelist กันการส่งชื่อคอลัมน์แปลก ๆ) */
    private const SORTS = [
        'code'      => 't.asset',
        'job_order' => 'jo.job_id',
        'type'      => 'jo.status1',
        'name'      => 't.name',
        'site'      => 'jo.site',
        'date'      => 'jo.date_fr',
        'cost'      => 'cost',
        'total'     => 'items',
    ];

    private const DEFAULTS = [
        'group'  => '',
        'search' => '',
        'type'   => '',
        'site'   => '',
        'part'   => '',
        'from'   => '',
        'to'     => '',
        'sort'   => 'date',
        'dir'    => 'desc',
    ];

    public static function filters(Request $request): array
    {
        $validated = $request->validate([
            'group'  => ['nullable', Rule::in(array_map('strval', array_keys(self::GROUPS)))],
            'search' => ['nullable', 'string', 'max:100'],
            'type'   => ['nullable', Rule::in(array_map('strval', array_keys(self::JOB_TYPES)))],
            'site'   => ['nullable', 'string', 'max:100'],
            'part'   => ['nullable', 'string', 'max:100'],
            'from'   => ['nullable', 'date'],
            'to'     => ['nullable', 'date', 'after_or_equal:from'],
            'sort'   => ['nullable', Rule::in(array_keys(self::SORTS))],
            'dir'    => ['nullable', Rule::in(['asc', 'desc'])],
        ]);

        return array_merge(self::DEFAULTS, array_filter($validated, fn ($v) => $v !== null));
    }

    public static function build(array $f): Builder
    {
        // ค่าอะไหล่รวม และจำนวนรายการอะไหล่ ต่อ 1 ใบสั่งงาน
        $subs = DB::table('job_order_sub')
            ->selectRaw('job_id, SUM(price1) as cost, COUNT(*) as items')
            ->groupBy('job_id');

        return DB::table('job_order as jo')
            ->leftJoin('tool as t', 't.id', '=', 'jo.id_tool')
            ->leftJoinSub($subs, 's', 's.job_id', '=', 'jo.id')
            ->select([
                'jo.id', 'jo.id_tool', 'jo.job_id', 'jo.type_code', 'jo.status1',
                'jo.site', 'jo.date_fr', 'jo.cancel',
                't.asset', 't.name', 't.project_site',
            ])
            ->selectRaw('COALESCE(s.cost, 0) as cost')
            ->selectRaw('COALESCE(s.items, 0) as items')

            // ใช้ !== '' เพราะค่า '0' (MT / ซ่อมเร่งด่วน) เป็นค่าที่ถูกต้อง
            ->when($f['group'] !== '', fn (Builder $q) => $q->where('jo.type_code', (int) $f['group']))
            ->when($f['type'] !== '', fn (Builder $q) => $q->where('jo.status1', (int) $f['type']))

            ->when($f['search'] !== '', function (Builder $q) use ($f) {
                $s = $f['search'];
                $q->where(function (Builder $q) use ($s) {
                    $q->where('t.asset', 'like', "%{$s}%")
                        ->orWhere('t.name', 'like', "%{$s}%");

                    // ค้นด้วยเลข Job Order ได้ เช่น "1036" หรือ "JOB-1036"
                    if (preg_match('/^(?:.*JOB-?)?0*(\d+)(?:-\d{2,4})?$/i', trim($s), $m)) {
                        $q->orWhere('jo.job_id', (int) $m[1]);
                    }
                });
            })
            ->when($f['site'] !== '', fn (Builder $q) => $q->where(fn (Builder $q) => $q
                ->where('jo.site', 'like', "%{$f['site']}%")
                ->orWhere('t.project_site', 'like', "%{$f['site']}%")))
            ->when($f['part'] !== '', fn (Builder $q) => $q->whereExists(fn (Builder $q) => $q
                ->select(DB::raw(1))
                ->from('job_order_sub as p')
                ->whereColumn('p.job_id', 'jo.id')
                ->where('p.list1', 'like', "%{$f['part']}%")))
            ->when($f['from'] !== '', fn (Builder $q) => $q->whereDate('jo.date_fr', '>=', $f['from']))
            ->when($f['to'] !== '', fn (Builder $q) => $q->whereDate('jo.date_fr', '<=', $f['to']))

            ->orderBy(self::SORTS[$f['sort']], $f['dir'])
            ->orderByDesc('jo.id');
    }

    public static function row(object $r): array
    {
        $site = $r->site ?: $r->project_site;

        return [
            'id'          => $r->id,
            'tool_id'     => $r->id_tool,
            'code'        => $r->asset,
            'job_order'   => self::jobOrderNo($r->type_code, $r->job_id, $r->date_fr),
            'type'        => self::JOB_TYPES[$r->status1] ?? '-',
            'type_index'  => (int) $r->status1,
            'name'        => $r->name,
            'site'        => $site,
            // งานที่ทำนอกไซต์ประจำของเครื่อง (เดิมแสดงเป็น "esr4 From :: KL5-TEMP")
            'from_site'   => ($r->project_site && $r->site && $r->project_site !== $r->site) ? $r->project_site : null,
            'date'        => $r->date_fr ? date('j-n-Y', strtotime($r->date_fr)) : null,
            'cost'        => (float) $r->cost,
            'total'       => (int) $r->items,
            'cancel'      => (bool) $r->cancel,
        ];
    }

    /** รูปแบบเดียวกับ ToolController::formatJobOrderNo() */
    public static function jobOrderNo($typeCode, $jobId, $dateFr): string
    {
        $prefix = match ((int) $typeCode) {
            2 => 'LGT',
            0 => 'MT',
            default => 'TEMP',
        };

        $padded = str_pad((string) (int) $jobId, 3, '0', STR_PAD_LEFT);
        $year = $dateFr ? date('Y', strtotime($dateFr)) : now()->year;

        return "{$prefix}/JOB-{$padded}-{$year}";
    }
}
