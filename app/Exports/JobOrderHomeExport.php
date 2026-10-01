<?php

namespace App\Exports;

use App\Queries\JobOrderHomeQuery;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class JobOrderHomeExport implements FromQuery, WithHeadings, WithMapping, ShouldAutoSize
{
    public function __construct(private array $filters)
    {
    }

    public function query()
    {
        return JobOrderHomeQuery::build($this->filters);
    }

    public function headings(): array
    {
        return ['Code', 'Job Order', 'ประเภทของงาน', 'Name', 'Site', 'From', 'Date', 'Cost', 'Total', 'สถานะ'];
    }

    public function map($row): array
    {
        $r = JobOrderHomeQuery::row($row);

        return [
            $r['code'],
            $r['job_order'],
            $r['type'],
            $r['name'],
            $r['site'],
            $r['from_site'],
            $r['date'],
            $r['cost'],
            $r['total'],
            $r['cancel'] ? 'ยกเลิก' : '',
        ];
    }
}
