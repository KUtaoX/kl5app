<?php

namespace App\Exports;

use App\Queries\JobOrderHomeQuery;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Export ประวัติการบำรุงรักษาเครื่องจักร ลงแบบฟอร์ม FR-MNT-003-000-005 (resources/excel/FR-MNT-003-000-005.xlsx)
 *
 * ใบสั่งงาน 1 ใบ = 1 กลุ่มแถว (จำนวนแถว = จำนวนรายการอะไหล่ อย่างน้อย 1 แถว)
 *   - ข้อมูลใบสั่งงาน (A–K, P, Q) และยอดรวม (N) ผสานเซลล์แนวตั้งตลอดกลุ่ม
 *   - รายการอะไหล่ (L, M, O) แถวละ 1 รายการ
 *   - N = สูตร SUM ของราคาในกลุ่ม
 */
class JobOrderExport
{
    private const FIRST_ROW = 5;

    private const MAX_JOBS = 10000;

    private const FONT = 'Franklin Gothic Medium';

    // ฟอนต์ในฟอร์มไม่มีตัวไทย Excel จะใช้ฟอนต์ไทยแทนซึ่งสูงกว่า จึงเผื่อความสูงต่อบรรทัดไว้
    private const LINE_HEIGHT = 13.5;   // pt ต่อ 1 บรรทัด

    private const MIN_ROW_HEIGHT = 18;

    private const ROW_PADDING = 5;

    /** คอลัมน์ที่ข้อความยาวได้ => จำนวนตัวอักษรต่อบรรทัดโดยประมาณ (ใช้คำนวณความสูงแถว ตั้งไว้ต่ำกว่าจริงเล็กน้อยเพื่อเผื่อ) */
    private const WRAP_COLUMNS = ['C' => 18, 'E' => 10, 'F' => 15, 'I' => 15, 'J' => 42, 'K' => 42];

    /** ปรับความกว้างบางคอลัมน์จากฟอร์มเดิมให้ข้อความไม่ต้องขึ้นหลายบรรทัด */
    private const COLUMN_WIDTHS = ['C' => 18, 'E' => 12, 'F' => 15, 'I' => 15];

    public function __construct(private string $templatePath)
    {
    }

    // ==============================================================
    // Laravel
    // ==============================================================
    public function download(array $filters, string $filename): StreamedResponse
    {
        $spreadsheet = $this->spreadsheet($this->jobs($filters));

        return new StreamedResponse(function () use ($spreadsheet) {
            (new Xlsx($spreadsheet))->save('php://output');
            $spreadsheet->disconnectWorksheets();
        }, 200, [
            'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Cache-Control'       => 'max-age=0',
        ]);
    }

    /** ใบสั่งงานตามตัวกรองเดียวกับหน้า Job Order Home พร้อมรายการอะไหล่ */
    public function jobs(array $filters): array
    {
        $rows = JobOrderHomeQuery::build($filters)
            ->addSelect('jo.date1', 'jo.date2', 'jo.time_work', 'jo.num_mi', 'jo.cause', 'jo.repair', 'jo.name1', 'jo.pm')
            ->limit(self::MAX_JOBS)
            ->get();

        $parts = collect();
        foreach ($rows->pluck('id')->chunk(1000) as $ids) {
            $parts = $parts->concat(
                DB::table('job_order_sub')->whereIn('job_id', $ids->all())->orderBy('id')->get()
            );
        }
        $parts = $parts->groupBy('job_id');

        return $rows->map(function ($r) use ($parts) {
            $base = JobOrderHomeQuery::row($r);

            return [
                'date_fr'   => $r->date_fr,
                'job_order' => $base['job_order'],
                'tool_name' => $r->name,
                'code'      => $r->asset,
                'site'      => $base['site'],
                'from_site' => $base['from_site'],
                'type'      => $base['type'],
                'cancel'    => $base['cancel'],
                'date1'     => $r->date1,
                'date2'     => $r->date2,
                'time_work' => $r->time_work,
                'num_mi'    => $r->num_mi,
                'cause'     => $r->cause,
                'repair'    => $r->repair,
                'name1'     => $r->name1,
                'pm'        => $r->pm,
                'parts'     => ($parts[$r->id] ?? collect())->map(fn ($p) => [
                    'list'  => $p->list1,
                    'num'   => $p->num1,
                    'po'    => $p->po1,
                    'price' => $p->price1,
                ])->values()->all(),
            ];
        })->all();
    }

    // ==============================================================
    // เขียนลงแบบฟอร์ม (ไม่ขึ้นกับ Laravel)
    // ==============================================================
    public function spreadsheet(array $jobs): Spreadsheet
    {
        $spreadsheet = IOFactory::load($this->templatePath);
        $sheet = $spreadsheet->getActiveSheet();

        $row = self::FIRST_ROW;
        foreach ($jobs as $job) {
            $parts = $job['parts'] ?: [null];
            $start = $row;
            $end = $row + count($parts) - 1;

            $this->date($sheet, "A{$start}", $job['date_fr']);
            $sheet->setCellValue("B{$start}", $job['job_order']);
            $sheet->setCellValue("C{$start}", $this->clean($job['tool_name']));
            $sheet->setCellValue("D{$start}", $this->clean($job['code']));
            $sheet->setCellValue("E{$start}", $this->siteText($job['site'], $job['from_site']));
            $sheet->setCellValue("F{$start}", $this->typeText($job));
            $this->date($sheet, "G{$start}", $job['date1']);
            $this->date($sheet, "H{$start}", $job['date2']);
            $sheet->setCellValueExplicit("I{$start}", $this->usageText($job['time_work'], $job['num_mi']), DataType::TYPE_STRING);
            $sheet->setCellValue("J{$start}", $this->clean($job['cause'], true));
            $sheet->setCellValue("K{$start}", $this->clean($job['repair'], true));
            $sheet->setCellValue("P{$start}", $this->clean($job['name1']));
            $sheet->setCellValue("Q{$start}", $this->clean($job['pm']));

            $hasPart = false;
            foreach ($parts as $i => $part) {
                if ($part === null) {
                    continue;
                }
                $hasPart = true;
                $r = $start + $i;
                $sheet->setCellValue("L{$r}", trim($this->clean($part['list']) . ' ' . $this->clean($part['num'])));
                $price = $this->number($part['price']);
                if ($price !== null) {
                    $sheet->setCellValue("M{$r}", $price);
                } elseif (trim((string) $part['price']) !== '') {
                    $sheet->setCellValueExplicit("M{$r}", trim((string) $part['price']), DataType::TYPE_STRING);
                }
                // PO / เลขใบเบิกเป็นข้อความ กัน Excel แปลงเลขยาวเป็น 4.1E+09
                $sheet->setCellValueExplicit("O{$r}", $this->clean($part['po']), DataType::TYPE_STRING);
            }
            if ($hasPart) {
                $sheet->setCellValue("N{$start}", "=SUM(M{$start}:M{$end})");
            }

            if ($end > $start) {
                foreach (['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'N', 'P', 'Q'] as $col) {
                    $sheet->mergeCells("{$col}{$start}:{$col}{$end}");
                }
            }

            $this->fitHeight($sheet, $job, $start, $end);
            $row = $end + 1;
        }

        $last = max(self::FIRST_ROW, $row - 1);
        $this->style($sheet, $last, $row > self::FIRST_ROW);

        foreach (self::COLUMN_WIDTHS as $col => $width) {
            $sheet->getColumnDimension($col)->setWidth($width);
        }

        $sheet->getPageSetup()->setPrintArea("A1:Q{$last}");
        $sheet->getPageSetup()->setRowsToRepeatAtTopByStartAndEnd(1, 4);
        $sheet->freezePane('A' . self::FIRST_ROW);
        $sheet->setSelectedCell('A' . self::FIRST_ROW);

        return $spreadsheet;
    }

    // ==============================================================
    private function style($sheet, int $last, bool $hasData): void
    {
        if (! $hasData) {
            return;
        }
        $range = 'A' . self::FIRST_ROW . ":Q{$last}";

        $sheet->getStyle($range)->applyFromArray([
            'font'      => ['name' => self::FONT, 'size' => 8],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '000000']]],
            'alignment' => ['vertical' => Alignment::VERTICAL_CENTER, 'horizontal' => Alignment::HORIZONTAL_CENTER, 'wrapText' => true],
        ]);

        foreach (['J', 'K', 'L'] as $col) {
            $sheet->getStyle("{$col}" . self::FIRST_ROW . ":{$col}{$last}")->getAlignment()
                ->setHorizontal(Alignment::HORIZONTAL_LEFT)->setVertical($col === 'L' ? Alignment::VERTICAL_CENTER : Alignment::VERTICAL_TOP);
        }
        foreach (['M', 'N'] as $col) {
            $sheet->getStyle("{$col}" . self::FIRST_ROW . ":{$col}{$last}")->applyFromArray([
                'alignment'    => ['horizontal' => Alignment::HORIZONTAL_RIGHT],
                'numberFormat' => ['formatCode' => '#,##0.00'],
            ]);
        }
        foreach (['A', 'G', 'H'] as $col) {
            $sheet->getStyle("{$col}" . self::FIRST_ROW . ":{$col}{$last}")->getNumberFormat()->setFormatCode('dd-mm-yyyy');
        }
    }

    /** ความสูงแถวให้พอกับข้อความยาว (Excel ไม่ปรับความสูงของเซลล์ที่ผสานให้เอง) */
    private function fitHeight($sheet, array $job, int $start, int $end): void
    {
        $values = [
            'C' => $job['tool_name'],
            'E' => $this->siteText($job['site'], $job['from_site']),
            'F' => $this->typeText($job),
            'I' => $this->usageText($job['time_work'], $job['num_mi']),
            'J' => $job['cause'],
            'K' => $job['repair'],
        ];
        $lines = 1;
        foreach (self::WRAP_COLUMNS as $col => $perLine) {
            $lines = max($lines, $this->lineCount((string) ($values[$col] ?? ''), $perLine));
        }
        $rows = $end - $start + 1;
        $height = max(self::MIN_ROW_HEIGHT, ($lines * self::LINE_HEIGHT + self::ROW_PADDING) / $rows);
        for ($r = $start; $r <= $end; $r++) {
            $sheet->getRowDimension($r)->setRowHeight(round($height, 2));
        }
    }

    private function lineCount(string $text, int $perLine): int
    {
        $text = trim(str_replace("\r", '', $text));
        if ($text === '') {
            return 1;
        }
        $count = 0;
        foreach (explode("\n", $text) as $line) {
            // ไม่นับสระบน/ล่างและวรรณยุกต์ของภาษาไทย เพราะไม่กินความกว้าง
            $width = mb_strlen(preg_replace('/\p{Mn}/u', '', $line));
            $count += max(1, (int) ceil($width / $perLine));
        }

        return $count;
    }

    private function date($sheet, string $cell, $value): void
    {
        $value = trim((string) $value);
        if ($value === '' || str_starts_with($value, '0000')) {
            return;
        }
        $ts = strtotime($value);
        if ($ts === false) {
            return;
        }
        $sheet->setCellValue($cell, ExcelDate::PHPToExcel(mktime(0, 0, 0, (int) date('n', $ts), (int) date('j', $ts), (int) date('Y', $ts))));
    }

    /** ไซต์ที่ทำงาน และไซต์ประจำของเครื่องในบรรทัดถัดไป */
    private function siteText(?string $site, ?string $from): string
    {
        $site = trim((string) $site);
        $from = trim((string) $from);

        return $from !== '' ? trim("{$site}\n(จาก {$from})") : $site;
    }

    private function typeText(array $job): string
    {
        return $job['type'] . ($job['cancel'] ? "\n(ยกเลิก)" : '');
    }

    /** ชั่วโมงทำงาน / เลขไมล์ ข้ามค่าที่ไม่มีความหมาย เช่น "-" หรือ "0" */
    private function usageText($hours, $km): string
    {
        $out = [];
        foreach ([[$hours, 'ชม.'], [$km, 'กม.']] as [$value, $unit]) {
            $value = trim((string) $value);
            if ($value === '' || in_array($value, ['-', '0', '0.00'], true)) {
                continue;
            }
            $number = $this->number($value);
            $out[] = ($number !== null ? number_format($number, floor($number) == $number ? 0 : 2) : $value) . ' ' . $unit;
        }

        return implode("\n", $out);
    }

    private function number($value): ?float
    {
        $clean = str_replace([',', ' '], '', trim((string) $value));

        return is_numeric($clean) ? (float) $clean : null;
    }

    private function clean($value, bool $multiline = false): string
    {
        $text = str_replace("\r", '', (string) $value);
        $text = $multiline ? preg_replace("/\n{3,}/", "\n\n", $text) : preg_replace('/\s+/u', ' ', $text);

        return trim((string) $text);
    }
}
