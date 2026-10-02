{{--
    แบบฟอร์ม FR-MNT-002-01 Maintenance Status Control (A4 แนวนอน, 21 แถวต่อหน้า)
    ช่องสถานะ / การดำเนินการซ่อม / QC แสดงเครื่องหมายถูกในช่องของค่าที่เลือก
--}}
<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<style>
    @font-face {
        font-family: 'Sarabun';
        src: url('{{ public_path("fonts/Sarabun-Regular.ttf") }}');
        font-weight: normal;
    }
    @font-face {
        font-family: 'Sarabun';
        src: url('{{ public_path("fonts/Sarabun-Bold.ttf") }}');
        font-weight: bold;
    }

    @page { margin: 10mm 10mm 8mm 10mm; }

    body { font-family: 'Sarabun', sans-serif; font-size: 9pt; color: #000; margin: 0; }

    .break { page-break-after: always; }

    h1 { text-align: center; font-size: 13pt; font-weight: bold; margin: 0 0 3mm 0; }

    table.form { border-collapse: collapse; }
    table.form th,
    table.form td { border: 0.6pt solid #000; padding: 0 1.2mm; vertical-align: middle; }
    table.form th { font-weight: normal; text-align: center; font-size: 9pt; height: 5.5mm; line-height: 1.2; }
    table.form td { height: 7.1mm; font-size: 8.5pt; line-height: 1.2; }

    /* ตัดข้อความที่ยาวเกินช่อง ไม่ให้แถวสูงจนล้นหน้า */
    .clip { overflow: hidden; white-space: nowrap; }
    .center { text-align: center; }
    .mono { font-family: 'DejaVu Sans Mono', monospace; font-size: 7pt; }
    .tick { height: 4.2mm; width: 4.2mm; vertical-align: middle; }

    .foot { width: 100%; margin-top: 2mm; font-size: 8.5pt; }
    .foot td { padding: 0; }
</style>
</head>
<body>
@php
    $thai = function (?string $date) {
        if (! $date) return '';
        [$y, $m, $d] = array_map('intval', explode('-', $date));
        return "{$d}/{$m}/" . ($y + 543);
    };
    // ค่าที่เลือก → เครื่องหมายถูก (public/images/check-mark.png)
    $tick = '<img class="tick" src="' . e(public_path('images/check-mark.png')) . '" alt="✓">';
    $mark = fn (string $value, string $expected) => $value === $expected ? $tick : '';

    // ความกว้างเนื้อหาของแต่ละคอลัมน์ (มม. ไม่รวม padding) — รวมทั้งตารางประมาณ 277 มม. เต็มหน้า A4 แนวนอน
    // DomPDF ไม่อ่าน <colgroup> จึงกำหนดที่หัวตารางและกล่องข้อความในแต่ละช่องแทน
    $w = ['date' => 15.6, 'code' => 25.6, 'asset_no' => 34.6, 'name' => 39.6, 'site' => 16.6, 'check' => 14.9];
@endphp

@foreach ($pages as $rows)
    <div class="{{ $loop->last ? '' : 'break' }}">
        <h1>Maintenance Status Control</h1>

        <table class="form">
            <thead>
                <tr>
                    <th rowspan="2" style="width: {{ $w['date'] }}mm">รับของวันที่</th>
                    <th rowspan="2" style="width: {{ $w['code'] }}mm">Asset Code</th>
                    <th rowspan="2" style="width: {{ $w['asset_no'] }}mm">Asset No.</th>
                    <th rowspan="2" style="width: {{ $w['name'] }}mm">รายการ</th>
                    <th rowspan="2" style="width: {{ $w['site'] }}mm">From Site</th>
                    <th colspan="2">สถานะ</th>
                    <th colspan="3">การดำเนินการซ่อม</th>
                    <th colspan="2">QC ตรวจสอบคุณภาพ</th>
                </tr>
                <tr>
                    <th style="width: {{ $w['check'] }}mm">ซ่อม</th>
                    <th style="width: {{ $w['check'] }}mm">ปลดระวาง</th>
                    <th style="width: {{ $w['check'] }}mm">รอซ่อม</th>
                    <th style="width: {{ $w['check'] }}mm">ปลดระวาง</th>
                    <th style="width: {{ $w['check'] }}mm">ซ่อมเสร็จแล้ว</th>
                    <th style="width: {{ $w['check'] }}mm">Accept</th>
                    <th style="width: {{ $w['check'] }}mm">Reject</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($rows as $r)
                    @if ($r === null)
                        {{-- แถวว่างให้เต็มแบบฟอร์ม --}}
                        <tr>@for ($i = 0; $i < 12; $i++)<td></td>@endfor</tr>
                    @else
                        <tr>
                            <td class="center"><div style="width: {{ $w['date'] }}mm" class="clip">{{ $thai($r['date']) }}</div></td>
                            <td><div style="width: {{ $w['code'] }}mm" class="clip mono">{{ $r['code'] }}</div></td>
                            <td><div style="width: {{ $w['asset_no'] }}mm" class="clip mono">{{ $r['asset_no'] }}</div></td>
                            <td><div style="width: {{ $w['name'] }}mm" class="clip">{{ $r['found'] ? $r['name'] : '' }}</div></td>
                            <td class="center"><div style="width: {{ $w['site'] }}mm" class="clip">{{ $r['site'] }}</div></td>

                            <td class="center">{!! $mark($r['status1'], '1') !!}</td>
                            <td class="center">{!! $mark($r['status1'], '2') !!}</td>

                            <td class="center">{!! $mark($r['status2'], '1') !!}</td>
                            <td class="center">{!! $mark($r['status2'], '2') !!}</td>
                            <td class="center">{!! $mark($r['status2'], '3') !!}</td>

                            <td class="center">{!! $mark($r['qc'], '1') !!}</td>
                            <td class="center">{!! $mark($r['qc'], '2') !!}</td>
                        </tr>
                    @endif
                @endforeach
            </tbody>
        </table>

        <table class="foot">
            <tr>
                <td>From No. FR-MNT-002-01</td>
                <td style="text-align: center; color: #555;">หน้า {{ $loop->iteration }} / {{ $loop->count }}</td>
                <td style="text-align: right;">Revision-0 : Effective Date - July 1,2014</td>
            </tr>
        </table>
    </div>
@endforeach
</body>
</html>
