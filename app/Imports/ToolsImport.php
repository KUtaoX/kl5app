<?php

namespace App\Imports;

use App\Models\Tool;
use Carbon\Carbon;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\SkipsEmptyRows;

class ToolsImport implements ToModel, WithHeadingRow, SkipsEmptyRows
{
    public function headingRow(): int
    {
        // ไฟล์ export เดิมมี 3 แถวแรกเป็นหัวรายงาน/วันที่/บรรทัดเว้น
        // แถวหัวตารางจริง (Tag Number, Description, ...) อยู่แถวที่ 4
        return 4;
    }

    public function model(array $row)
    {
        return new Tool([
            'asset'        => $row['tag_number'] ?? null,
            'name'         => $row['description'] ?? null,
            'brand'        => $row['brand'] ?? null,
            'model'        => $row['model'] ?? null,
            'serial'       => $row['serial'] ?? null,
            'employee'     => $row['employee'] ?? null,
            'project_site' => $row['project_site'] ?? null,
            'asset_status' => $row['asset_status'] ?? null,
            'asset_in'     => $row['asset_in'] ?? null,
            'tran_date'    => $this->parseDate($row['transfer_date'] ?? null),
        ]);
    }

    private function parseDate($value)
    {
        if (!$value) {
            return null;
        }
        try {
            return Carbon::parse($value)->format('Y-m-d H:i:s');
        } catch (\Exception $e) {
            return null;
        }
    }
}