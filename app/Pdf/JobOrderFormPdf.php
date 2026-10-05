<?php

namespace App\Pdf;

use RuntimeException;
use setasign\Fpdi\Tcpdf\Fpdi;
use TCPDF_FONTS;

/**
 * เขียนข้อมูลใบสั่งงานลงบนแบบฟอร์มจริง FR-MNT-003-000-004 (PDF ต้นฉบับ)
 *
 * ใช้ FPDI นำหน้า PDF ต้นฉบับมาเป็นพื้นหลัง แล้วใช้ TCPDF เขียนข้อความทับตามตำแหน่ง
 * หน่วยพิกัดทั้งหมดเป็น pt (1/72 นิ้ว) วัดจากมุมซ้ายบนของหน้า A4 (595 x 842)
 * ถ้าข้อความเลื่อน ปรับได้ที่ค่าตัวเลขในแต่ละเมธอด หรือเปิด DEBUG_GRID ดูเส้นตาราง
 */
class JobOrderFormPdf
{
    public const DEBUG_GRID = false;

    private Fpdi $pdf;

    private string $font;

    public function __construct(
        private string $templatePath,
        private string $fontRegular,
        private string $fontBold,
        private string $fontCacheDir,
        private string $checkImage,
    ) {
    }

    /**
     * @param array $d ข้อมูลจาก RecordController::loadJobOrderForPrint()
     */
    public function render(array $d): string
    {
        $this->pdf = new Fpdi('P', 'pt', 'A4', true, 'UTF-8');
        $this->pdf->setPrintHeader(false);
        $this->pdf->setPrintFooter(false);
        $this->pdf->SetMargins(0, 0, 0);
        $this->pdf->SetAutoPageBreak(false);
        $this->pdf->setCellPaddings(0, 0, 0, 0);
        $this->pdf->SetCreator('KL5 App');
        $this->pdf->SetTitle('Job Order ' . $d['jobOrderNo']);

        $this->font = $this->registerFonts();

        $this->pdf->setSourceFile($this->templatePath);
        $tpl = $this->pdf->importPage(1);
        $this->pdf->AddPage();
        $this->pdf->useTemplate($tpl, 0, 0, 595.28, 841.89);

        if (self::DEBUG_GRID) {
            $this->grid();
        }

        $jo = $d['jobOrder'];
        $tool = $d['tool'];

        // ---------- หัวกระดาษ ----------
        $this->text(432, 70, $d['jobOrderNo'], 10, 'B');

        // ---------- ประเภทของงาน (status1: 0–4) ----------
        $typeBoxes = [[89.5, 114.5], [176.5, 114.5], [279.5, 114.5], [359.0, 114.5], [433.5, 114.5]];
        if (isset($typeBoxes[(int) $jo->status1]) && $jo->status1 !== null && $jo->status1 !== '') {
            $this->check(...$typeBoxes[(int) $jo->status1]);
        }

        // ---------- รายละเอียด ----------
        $this->text(80, 133, (string) $jo->site, 10, '', 220);
        $this->text(448, 133, $d['dateFrTh'], 10, '', 110);

        // ช่องวัน-เวลามีขีดคั่น: วันที่อยู่หน้าขีด เวลาอยู่หลังขีด
        if ($d['date1Th']) {
            $this->text(126, 159, $d['date1Th'], 9, '', 47, 'C');
            $this->text(177, 159, $this->timeText($d['time1']), 9, '', 24, 'C');
        }
        if ($d['date2Th']) {
            $this->text(472, 159, $d['date2Th'], 9, '', 69, 'C');
            $this->text(546, 159, $this->timeText($d['time2']), 9, '', 22, 'L');
        }

        // ชื่อเครื่องอยู่หน้าขีด รหัสอยู่หลังขีด (ถ้าชื่อยาวเกิน รหัสจะเลื่อนไปทางขวา)
        $nameWidth = $this->text(121, 180, (string) ($tool->name ?? ''), 9, '', 52, 'L', 8);
        $this->text(max(178, 121 + $nameWidth + 6), 180, (string) ($tool->asset ?? ''), 9, '', 200);
        $this->text(472, 180, (string) $jo->name1, 10, '', 92);

        $this->text(98, 203, (string) $jo->num_mi, 10, '', 98, 'C');
        $this->text(472, 203, (string) $jo->time_work, 10, '', 36, 'C');

        // ---------- อาการเสียหาย ----------
        $stop = '';
        if ($d['stopDateTh']) {
            $stop = 'วันที่เครื่องจักรหยุดทำงาน ' . $d['stopDateTh'] . ' เวลา '
                . str_pad((string) $jo->stop_hour, 2, '0', STR_PAD_LEFT) . ':'
                . str_pad((string) $jo->stop_minute, 2, '0', STR_PAD_LEFT) . ' น.';
        }
        $this->lines(40, [250, 270, 290], array_values(array_filter([$stop, ...$this->wrap((string) $jo->cause, 395, 9.5)])), 9.5, 395);
        $this->text(452, 287, (string) $jo->name2, 9.5, '', 76, 'C');

        // ---------- ความเห็น ----------
        $this->lines(40, [328, 349], $this->wrap((string) $jo->des1, 395, 9.5), 9.5, 395);
        if ($jo->status2 !== null && $jo->status2 !== '') {
            (int) $jo->status2 === 0 ? $this->check(140.5, 369.5) : $this->check(236.5, 369.5);
        }
        $this->text(448, 350, (string) $jo->pm, 9.5, '', 92, 'C');

        // ---------- การดำเนินการ ----------
        $this->lines(40, [421, 441], $this->wrap((string) $jo->repair, 515, 9.5), 9.5, 515);

        // ---------- อะไหล่ ----------
        // ฟอร์มมี 5 แถว ถ้าเกิน: แสดง 4 รายการแรก แถวที่ 5 สรุป "อื่น ๆ อีก N รายการ" พร้อมราคารวม
        // แล้วพิมพ์รายการทั้งหมดในหน้าแนบท้าย
        $subs = array_values($d['subs']->all());
        $overflow = count($subs) > self::FORM_PART_ROWS;
        $shown = $overflow ? array_slice($subs, 0, self::FORM_PART_ROWS - 1) : $subs;

        foreach ($shown as $i => $sub) {
            $this->partRow(self::FORM_PART_Y[$i], $sub);
        }
        if ($overflow) {
            $rest = array_slice($subs, self::FORM_PART_ROWS - 1);
            $y = self::FORM_PART_Y[self::FORM_PART_ROWS - 1];
            $this->text(90, $y, 'อื่น ๆ อีก ' . count($rest) . ' รายการ (ดูรายละเอียดในใบแนบท้าย)', 9, '', 200);
            $this->text(428, $y, number_format($this->sumPrice($rest), 2), 9, '', 74, 'R');
        }

        // ---------- พนักงาน ----------
        $this->text(131, 569, (string) count($d['nameP1']), 10, '', 42, 'C');
        $this->text(368, 569, (string) count($d['nameP2']), 10, '', 32, 'C');
        foreach ([587, 605, 623, 641] as $i => $y) {
            $this->text(86, $y, (string) ($d['nameP1'][$i] ?? ''), 9.5, '', 92);
            $this->text(346, $y, (string) ($d['nameP2'][$i] ?? ''), 9.5, '', 82);
        }

        // ---------- ข้อเสนอแนะ ----------
        $finish = '';
        if ($d['finishDateTh']) {
            $finish = 'ซ่อมเสร็จ ' . $d['finishDateTh'] . ' เวลา '
                . str_pad((string) $jo->finish_hour, 2, '0', STR_PAD_LEFT) . ':'
                . str_pad((string) $jo->finish_minute, 2, '0', STR_PAD_LEFT) . ' น.';
        }
        $this->lines(40, [681, 701, 721], array_values(array_filter([$finish, ...$this->wrap((string) $jo->des2, 228, 9)])), 9, 228);
        $this->text(282, 699, (string) $jo->fore_mt, 9.5, '', 92, 'C');

        if ($jo->status3 !== null && $jo->status3 !== '') {
            (int) $jo->status3 === 0 ? $this->check(447.5, 680.5) : $this->check(500.0, 680.5);
        }
        $this->text(408, 699, (string) $jo->name_qc, 9.5, '', 140, 'C');

        // ---------- ความเห็นจากผู้จัดการโครงการ / QC ----------
        $this->lines(40, [750, 771], $this->wrap((string) $jo->qc, 395, 9.5), 9.5, 395);
        $this->text(448, 772, (string) $jo->name_pm2, 9.5, '', 92, 'C');

        if ($overflow) {
            $this->attachmentPages($d, $subs);
        }

        return $this->pdf->Output('', 'S');
    }

    // ==============================================================
    // อะไหล่
    // ==============================================================
    private const FORM_PART_ROWS = 5;

    /** ขอบบนของข้อความในแต่ละแถวของตารางอะไหล่บนฟอร์ม (pt) */
    private const FORM_PART_Y = [482, 497.4, 512.7, 528.1, 543.4];

    private function partRow(float $y, object $sub): void
    {
        $this->text(90, $y, (string) $sub->list1, 9, '', 200);
        $this->text(292, $y, (string) $sub->num1, 9, '', 50, 'C');
        $this->text(346, $y, (string) $sub->po1, 9, '', 74, 'C');
        $this->text(428, $y, $this->priceText($sub->price1), 9, '', 74, 'R');
    }

    private function priceValue($price): ?float
    {
        $clean = str_replace([',', ' '], '', trim((string) $price));

        return is_numeric($clean) ? (float) $clean : null;
    }

    private function priceText($price): string
    {
        $value = $this->priceValue($price);

        return $value === null ? (string) $price : number_format($value, 2);
    }

    private function sumPrice(array $subs): float
    {
        return array_sum(array_map(fn ($s) => $this->priceValue($s->price1) ?? 0, $subs));
    }

    /** ใบแนบท้าย: รายการอะไหล่ทั้งหมด (ขึ้นหน้าใหม่อัตโนมัติถ้ายาว) */
    private function attachmentPages(array $d, array $subs): void
    {
        $tool = $d['tool'];
        $cols = [
            ['label' => 'ลำดับ', 'w' => 34, 'align' => 'C'],
            ['label' => 'อะไหล่ที่ใช้ (Spare Part)', 'w' => 221, 'align' => 'L'],
            ['label' => 'จำนวน (Pcs.)', 'w' => 60, 'align' => 'C'],
            ['label' => 'ใบเบิก/PO/เงินสด', 'w' => 90, 'align' => 'C'],
            ['label' => 'ราคา (บาท)', 'w' => 90, 'align' => 'R'],
        ];
        $x0 = 50;
        $rowH = 18;
        $bottom = 780;
        $pdf = $this->pdf;

        $header = function () use ($d, $tool, $cols, $x0, $rowH, $pdf) {
            $pdf->AddPage();
            $this->text(0, 40, 'ใบแนบท้าย — รายการอะไหล่ที่ใช้', 14, 'B', 595, 'C');
            $this->text($x0, 70, 'Ref. No. : ' . $d['jobOrderNo'], 10, 'B', 250);
            $this->text(345, 70, 'วันที่ : ' . $d['dateFrTh'], 10, '', 200, 'R');
            $toolText = trim(($tool->name ?? '') . (($tool->asset ?? '') !== '' ? ' | ' . $tool->asset : ''));
            $this->text($x0, 88, 'ชื่อ / รหัส เครื่องจักร : ' . $toolText, 10, '', 495);

            $pdf->SetFont($this->font, 'B', 9.5);
            $pdf->SetFillColor(204, 255, 255);
            $pdf->SetXY($x0, 110);
            foreach ($cols as $c) {
                $pdf->Cell($c['w'], $rowH, $c['label'], 1, 0, 'C', true, '', 0, false, 'T', 'M');
            }

            return 110 + $rowH;
        };

        $y = $header();
        $pdf->SetFont($this->font, '', 9.5);
        foreach ($subs as $i => $sub) {
            if ($y + $rowH > $bottom) {
                $y = $header();
                $pdf->SetFont($this->font, '', 9.5);
            }
            $cells = [(string) ($i + 1), (string) $sub->list1, (string) $sub->num1, (string) $sub->po1, $this->priceText($sub->price1)];
            $pdf->SetXY($x0, $y);
            foreach ($cols as $k => $c) {
                // ย่อข้อความที่ยาวเกินช่อง (stretch = 1 บีบเฉพาะเมื่อจำเป็น)
                $pdf->Cell($c['w'], $rowH, ' ' . $cells[$k] . ' ', 1, 0, $c['align'], false, '', 1, false, 'T', 'M');
            }
            $y += $rowH;
        }

        if ($y + $rowH > $bottom) {
            $y = $header();
        }
        $labelW = array_sum(array_column(array_slice($cols, 0, 4), 'w'));
        $pdf->SetFont($this->font, 'B', 9.5);
        $pdf->SetXY($x0, $y);
        $pdf->Cell($labelW, $rowH, 'รวม ' . count($subs) . ' รายการ ', 1, 0, 'R', false, '', 0, false, 'T', 'M');
        $pdf->Cell($cols[4]['w'], $rowH, ' ' . number_format($this->sumPrice($subs), 2) . ' ', 1, 0, 'R', false, '', 0, false, 'T', 'M');

        $this->text($x0, 812, 'แนบท้าย FORM NO. : FR-MNT-003-000-004', 7.5, '', 300);
    }

    // ==============================================================
    /** แปลง TTF เป็นฟอนต์ของ TCPDF (ครั้งแรกครั้งเดียว เก็บไว้ใน $fontCacheDir) แล้วลงทะเบียนเป็นตระกูลเดียวกัน */
    private function registerFonts(): string
    {
        $dir = rtrim($this->fontCacheDir, '/') . '/';
        if (! is_dir($dir) && ! @mkdir($dir, 0775, true) && ! is_dir($dir)) {
            throw new RuntimeException("สร้างโฟลเดอร์เก็บฟอนต์ไม่ได้: {$dir}");
        }
        if (! is_writable($dir)) {
            throw new RuntimeException("โฟลเดอร์เก็บฟอนต์เขียนไม่ได้ (ตรวจสิทธิ์ของโฟลเดอร์): {$dir}");
        }

        $regular = $this->convertFont($this->fontRegular, $dir);
        $bold = $this->convertFont($this->fontBold, $dir);

        $this->pdf->AddFont($regular, '', $dir . $regular . '.php');
        $this->pdf->AddFont($regular, 'B', $dir . $bold . '.php');

        return $regular;
    }

    private function convertFont(string $ttf, string $dir): string
    {
        if (! is_file($ttf)) {
            throw new RuntimeException("ไม่พบไฟล์ฟอนต์: {$ttf}");
        }
        $name = TCPDF_FONTS::addTTFfont($ttf, 'TrueTypeUnicode', '', 96, $dir);
        if (! $name) {
            throw new RuntimeException("แปลงฟอนต์ไม่สำเร็จ: {$ttf}");
        }

        return $name;
    }

    /**
     * เวลาเป็นรูปแบบ HH:MM เสมอ
     * ข้อมูลจากระบบเดิมบางแถวเก็บเวลาแบบไม่เติมศูนย์ เช่น "8:0" หรือ "18:0" หรือมีวินาที "08:00:00"
     */
    private function timeText(?string $time): string
    {
        if (! preg_match('/(\d{1,2})\D+(\d{1,2})/', (string) $time, $m)) {
            return trim((string) $time);
        }

        return sprintf('%02d:%02d', (int) $m[1], (int) $m[2]);
    }

    /** คืนไฟล์แรกที่มีอยู่จริงจากรายการ (รองรับ wildcard เช่น storage/fonts/sarabun_normal_*.ttf) */
    public static function firstExisting(array $candidates): string
    {
        foreach ($candidates as $path) {
            foreach (str_contains($path, '*') ? (glob($path) ?: []) : [$path] as $file) {
                if (is_file($file)) {
                    return $file;
                }
            }
        }

        return (string) ($candidates[0] ?? '');
    }

    /** เขียนข้อความบรรทัดเดียว (ย่อขนาดอัตโนมัติถ้ายาวเกิน $width) โดย $y คือขอบบนของบรรทัด */
    private function text(float $x, float $y, string $text, float $size = 10, string $style = '', ?float $width = null, string $align = 'L', float $minSize = 6.5): float
    {
        $lineHeight = $size * 1.3;
        $text = trim(preg_replace('/\s+/u', ' ', $text));
        if ($text === '') {
            return 0;
        }
        $this->pdf->SetFont($this->font, $style, $size);
        if ($width !== null) {
            while ($size > $minSize && $this->pdf->GetStringWidth($text) > $width) {
                $size -= 0.5;
                $this->pdf->SetFont($this->font, $style, $size);
            }
        }
        $actual = $this->pdf->GetStringWidth($text);
        $this->pdf->SetXY($x, $y);
        // ข้อความที่ย่อถึงขนาดเล็กสุดแล้วยังยาวเกิน จะเขียนเต็มความยาว (ไม่ตัดทิ้ง)
        // ความสูงช่องคงที่ตามขนาดตั้งต้น และชิดล่าง ข้อความที่ถูกย่อจึงยังวางบนเส้นเดิม
        $this->pdf->Cell(max($width ?? 0, $actual), $lineHeight, $text, 0, 0, $align, false, '', 0, false, 'T', 'B');

        return $actual;
    }

    private function lines(float $x, array $ys, array $lines, float $size, float $width): void
    {
        foreach ($ys as $i => $y) {
            if (isset($lines[$i])) {
                $this->text($x, $y, $lines[$i], $size, '', $width);
            }
        }
    }

    /** ตัดข้อความยาวเป็นหลายบรรทัดตามความกว้าง (ตัดที่ช่องว่าง หรือทีละตัวอักษรสำหรับภาษาไทยที่ไม่มีช่องว่าง) */
    private function wrap(string $text, float $width, float $size): array
    {
        $text = trim(str_replace("\r", '', $text));
        if ($text === '') {
            return [];
        }
        $this->pdf->SetFont($this->font, '', $size);
        $out = [];
        foreach (explode("\n", $text) as $para) {
            $line = '';
            foreach (preg_split('/(\s+)/u', $para, -1, PREG_SPLIT_DELIM_CAPTURE) as $token) {
                if ($this->pdf->GetStringWidth($line . $token) <= $width) {
                    $line .= $token;
                    continue;
                }
                if (trim($line) !== '') {
                    $out[] = trim($line);
                    $line = '';
                }
                // คำเดียวยาวเกินบรรทัด: ตัดทีละตัวอักษร
                foreach (preg_split('//u', ltrim($token), -1, PREG_SPLIT_NO_EMPTY) as $ch) {
                    if ($this->pdf->GetStringWidth($line . $ch) > $width && $line !== '') {
                        $out[] = $line;
                        $line = '';
                    }
                    $line .= $ch;
                }
            }
            if (trim($line) !== '') {
                $out[] = trim($line);
            }
        }

        return $out;
    }

    private function check(float $x, float $y): void
    {
        $this->pdf->Image($this->checkImage, $x, $y - 3, 11, 11, 'PNG');
    }

    private function grid(): void
    {
        $this->pdf->SetDrawColor(255, 0, 0);
        $this->pdf->SetLineWidth(0.2);
        $this->pdf->SetFont($this->font, '', 5);
        $this->pdf->SetTextColor(255, 0, 0);
        for ($x = 0; $x <= 595; $x += 10) {
            $this->pdf->SetAlpha($x % 50 === 0 ? 0.5 : 0.15);
            $this->pdf->Line($x, 0, $x, 842);
        }
        for ($y = 0; $y <= 842; $y += 10) {
            $this->pdf->SetAlpha($y % 50 === 0 ? 0.5 : 0.15);
            $this->pdf->Line(0, $y, 595, $y);
            if ($y % 50 === 0) {
                $this->pdf->Text(1, $y, (string) $y);
            }
        }
        $this->pdf->SetAlpha(1);
        $this->pdf->SetTextColor(0, 0, 0);
    }
}
