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
    * { box-sizing: border-box; }
    body { font-family: 'Sarabun', sans-serif; font-size: 12px; color: #111; }
    h1 { text-align: center; font-size: 16px; margin: 0 0 8px 0; }
    .refno { text-align: right; border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 6px; }
    .section-title { background: #cffafe; padding: 4px 8px; font-weight: bold; border-bottom: 1px solid #000; margin-top: 8px; }
    .row { display: table; width: 100%; margin-top: 5px; }
    .cell { display: table-cell; vertical-align: bottom; padding: 2px 4px; }
    .value { border-bottom: 1px solid #000; }
    .checkbox-row { text-align: center; margin: 8px 0; }
    .checkbox-row span { margin: 0 12px; white-space: nowrap; }
    .chk { display: inline-block; width: 9px; height: 9px; border: 1px solid #000; margin-right: 4px; vertical-align: middle; }
    .chk.on { background: #000; }
    table.grid { width: 100%; border-collapse: collapse; margin-top: 5px; }
    table.grid th, table.grid td { border: 1px solid #000; padding: 3px 6px; font-size: 11px; }
    table.grid th { background: #f3f4f6; text-align: center; }
    table.grid td.num { text-align: right; }
    .sign-table { width: 100%; margin-top: 6px; }
    .sign-table td { padding: 3px 4px; font-size: 11px; }
    .footer-note { margin-top: 10px; font-size: 10px; display: table; width: 100%; }
    .footer-note div { display: table-cell; }
</style>
</head>
<body>
    <div style="position: relative;">
        <img src="{{ public_path('images/logo2.jpg') }}" style="position:absolute; left:0; top:0; height:45px;">
        <h1>ใบสั่งงาน และรายงานการปฏิบัติงาน (JOB ORDER)</h1>
    </div>
    <div class="refno">Ref. No. : <strong>{{ $jobOrderNo }}</strong></div>

    {{-- ===== ประเภทของงาน และรายละเอียด ===== --}}
    <div class="section-title">ประเภทของงาน และรายละเอียด</div>
    <div class="checkbox-row">
        @php $jobTypes = ['ซ่อมเร่งด่วน', 'บำรุงรักษา', 'ติดตั้ง', 'Audit', 'ซ่อมภายใน']; @endphp
        @foreach ($jobTypes as $i => $label)
            <span><span class="chk {{ (int) $jobOrder->status1 === $i ? 'on' : '' }}"></span>{{ $label }}</span>
        @endforeach
    </div>

    <div class="row">
        <div class="cell" style="width:14%">โครงการ :</div>
        <div class="cell value" style="width:36%">{{ $jobOrder->site }}</div>
        <div class="cell" style="width:8%"></div>
        <div class="cell" style="width:14%; text-align:right">วันที่ :</div>
        <div class="cell value" style="width:28%">{{ $dateFrTh }}</div>
    </div>

    <div class="row">
        <div class="cell" style="width:22%">วัน-เวลาเข้า site งาน :</div>
        <div class="cell value" style="width:28%">{{ $date1Th }} &nbsp; {{ $time1 }}</div>
        <div class="cell" style="width:8%"></div>
        <div class="cell" style="width:22%; text-align:right">วัน-เวลาออก site งาน :</div>
        <div class="cell value" style="width:20%">{{ $date2Th }} &nbsp; {{ $time2 }}</div>
    </div>

    <div class="row">
        <div class="cell" style="width:22%">ชื่อ / รหัสเครื่องจักร :</div>
        <div class="cell value" style="width:48%">{{ $tool->name ?? '' }} {{ $tool->asset ? '| ' . $tool->asset : '' }}</div>
        <div class="cell" style="width:12%; text-align:right">ผู้รับผิดชอบ :</div>
        <div class="cell value" style="width:18%">{{ $jobOrder->name1 }}</div>
    </div>

    <div class="row">
        <div class="cell" style="width:22%">หมายเลขไมล์ :</div>
        <div class="cell value" style="width:20%">{{ $jobOrder->num_mi }} Km. (ถ้ามี)</div>
        <div class="cell" style="width:8%"></div>
        <div class="cell" style="width:22%; text-align:right">หมายเลข ชม. :</div>
        <div class="cell value" style="width:20%">{{ $jobOrder->time_work }} ชม. (ถ้ามี)</div>
    </div>

    {{-- ===== อาการเสียหายของเครื่องจักร ===== --}}
    <div class="section-title">อาการเสียหายของเครื่องจักร (รับแจ้งจากผู้ควบคุมเครื่องจักร)</div>
    <table class="sign-table">
        <tr>
            <td style="width:70%; border-bottom:1px solid #000;">
                วันที่เครื่องจักรหยุดทำงาน ({{ $stopDateTh }}) เวลา {{ str_pad((string) $jobOrder->stop_hour, 2, '0', STR_PAD_LEFT) }}:{{ str_pad((string) $jobOrder->stop_minute, 2, '0', STR_PAD_LEFT) }} น.
            </td>
            <td rowspan="3" style="width:30%; border:1px solid #000; text-align:center; vertical-align:middle;">
                ผู้รับแจ้ง / ผู้จัดทำ<br><br>( {{ $jobOrder->name2 }} )
            </td>
        </tr>
        <tr><td style="border-bottom:1px solid #000; height:20px;">{{ $jobOrder->cause }}</td></tr>
    </table>

    {{-- ===== ความเห็น ===== --}}
    <div class="section-title">ความเห็น</div>
    <table class="sign-table">
        <tr>
            <td style="width:70%; border-bottom:1px solid #000; height:20px;">{{ $jobOrder->des1 }}</td>
            <td rowspan="2" style="width:30%; border:1px solid #000; text-align:center; vertical-align:middle;">
                ผู้อนุมัติ<br><br>( {{ $jobOrder->pm }} )
            </td>
        </tr>
        <tr>
            <td style="border-bottom:1px solid #000; text-align:center;">
                <span class="chk {{ (int) $jobOrder->status2 === 0 ? 'on' : '' }}"></span> Outsource
                &nbsp;&nbsp;&nbsp;&nbsp;
                <span class="chk {{ (int) $jobOrder->status2 === 1 ? 'on' : '' }}"></span> ซ่อมเอง
            </td>
        </tr>
    </table>

    {{-- ===== การดำเนินการ ===== --}}
    <div class="section-title">การดำเนินการ</div>
    <p style="margin: 4px 0;">ข้อบกพร่องของเครื่องจักรที่ตรวจพบและวิธีการแก้ไข</p>
    <div style="border-bottom: 1px solid #000; min-height: 30px; padding: 2px 4px;">{{ $jobOrder->repair }}</div>

    <table class="grid">
        <thead>
            <tr>
                <th style="width:38%">อะไหล่ที่ใช้ (Spare Part)</th>
                <th style="width:12%">จำนวน (Pcs.)</th>
                <th style="width:25%">ใบเบิก/PO/เงินสด</th>
                <th style="width:25%">ราคา (บาท)</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($subs as $sub)
                <tr>
                    <td>{{ $sub->list1 }}</td>
                    <td style="text-align:center">{{ $sub->num1 }}</td>
                    <td>{{ $sub->po1 }}</td>
                    <td class="num">{{ $sub->price1 !== null ? number_format($sub->price1, 2) : '-' }}</td>
                </tr>
            @empty
                <tr><td colspan="4">&nbsp;</td></tr>
            @endforelse
        </tbody>
    </table>

    <table class="sign-table" style="margin-top:6px;">
        <tr>
            <td style="width:50%">พนักงานบริษัท (Staff) : {{ count($nameP1) }} คน</td>
            <td style="width:50%">พนักงานรายวัน : {{ count($nameP2) }} คน</td>
        </tr>
        @php $rowsCount = max(count($nameP1), count($nameP2), 4); @endphp
        @for ($i = 0; $i < $rowsCount; $i++)
            <tr>
                <td style="border-bottom:1px solid #000;">{{ $i + 1 }}. {{ $nameP1[$i] ?? '' }} &nbsp;&nbsp; ลายเซ็น ____________</td>
                <td style="border-bottom:1px solid #000;">{{ $i + 1 }}. {{ $nameP2[$i] ?? '' }} &nbsp;&nbsp; ลายเซ็น ____________</td>
            </tr>
        @endfor
    </table>

    {{-- ===== ข้อมูลเสนอแนะ ===== --}}
    <div class="section-title">ข้อมูลเสนอแนะ</div>
    <table class="sign-table">
        <tr>
            <td style="width:60%; border-bottom:1px solid #000;">
                วันที่ช่างซ่อมเสร็จ ({{ $finishDateTh }}) เวลา {{ str_pad((string) $jobOrder->finish_hour, 2, '0', STR_PAD_LEFT) }}:{{ str_pad((string) $jobOrder->finish_minute, 2, '0', STR_PAD_LEFT) }} น.
            </td>
            <td style="width:40%; border:1px solid #000; text-align:center;">
                การยอมรับ
                <span class="chk {{ (int) $jobOrder->status3 === 0 ? 'on' : '' }}"></span> ยอมรับ
                &nbsp;
                <span class="chk {{ (int) $jobOrder->status3 !== 0 ? 'on' : '' }}"></span> ไม่ยอมรับ
            </td>
        </tr>
        <tr>
            <td style="border-bottom:1px solid #000; height:20px;">{{ $jobOrder->des2 }}</td>
            <td style="border:1px solid #000; text-align:center;">
                ( {{ $jobOrder->fore_mt }} )<br>( {{ $jobOrder->name_qc }} )
            </td>
        </tr>
    </table>

    {{-- ===== ความเห็นจากผู้จัดการโครงการ / QC ===== --}}
    <div class="section-title">ความเห็นจากผู้จัดการโครงการ / QC</div>
    <table class="sign-table">
        <tr>
            <td style="width:70%; border-bottom:1px solid #000; height:20px;">{{ $jobOrder->qc }}</td>
            <td rowspan="2" style="width:30%; border:1px solid #000; text-align:center; vertical-align:middle;">
                ผู้อนุมัติ<br><br>( {{ $jobOrder->name_pm2 }} )
            </td>
        </tr>
        <tr><td style="border-bottom:1px solid #000;">&nbsp;</td></tr>
    </table>

    <div class="footer-note">
        <div>FORM NO. : FR-MNT-003-000-004</div>
        <div style="text-align:right;">Revision - 2 : Effective Date - January 20, 2023</div>
    </div>
</body>
</html>
