import { Head } from '@inertiajs/react';
import { useEffect } from 'react';

// โลโก้ — คัดลอก pic/logo2.jpg จากระบบเดิมไปไว้ที่ public/images/logo2.jpg
const LOGO_SRC = '/images/logo2.jpg';

// สัดส่วนความกว้างคอลัมน์ (อิง $size1..$size17 ใน print2.php แต่ขยายช่องราคาให้พอกับตัวอักษรที่ใหญ่ขึ้น) รวม 408
const COLUMNS = [
    { label: 'วันที่แจ้งซ่อม', w: 14 },
    { label: 'Job Order No.', w: 18 },
    { label: 'ชนิดเครื่องจักร', w: 18 },
    { label: 'RT-Code', w: 21 },
    { label: 'Site', w: 14 },
    { label: 'สถานะงานซ่อม', w: 14 },
    { label: 'วันที่เข้าซ่อม', w: 14 },
    { label: 'วันที่ซ่อมแล้วเสร็จ', w: 18 },
    { label: 'ชั่วโมงทำงาน(กม.)', w: 14 },
    { label: 'สาเหตุ - อาการ', w: 50 },
    { label: 'การแก้ไข', w: 80 },
    { label: 'รายการ', w: 32 },
    { label: 'ราคา (บาท)', w: 20 },
    { label: 'รวมราคา (บาท)', w: 20 },
    { label: 'PO No./ใบเบิก/DVS./เงินสด', w: 25 },
    { label: 'ผู้รับผิดชอบงานซ่อม', w: 23 },
    { label: 'PM.App', w: 13 },
];

const money = (n) =>
    Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ข้อมูลเก่าบางแถวเก็บ <br/> ไว้ในข้อความ
const text = (s) => (s ?? '').replace(/<br\s*\/?>/gi, '\n').trim();

const TOTAL_W = COLUMNS.reduce((s, c) => s + c.w, 0);

const CSS = `
:root {
  --fs-body: 9.5pt;   /* ขนาดตัวอักษรในตาราง — ปรับตรงนี้ที่เดียว */
  --fs-head: 9pt;     /* หัวคอลัมน์ */
  --fs-title: 16pt;   /* ชื่อรายงาน */
  --fs-footer: 8pt;
}
@page { size: A3 landscape; margin: 8mm 6mm 12mm 6mm; }
.jp { font-family: "TH Sarabun New", Sarabun, "Leelawadee UI", Tahoma, sans-serif; color: #000; background: #fff; }
.jp-toolbar { display: flex; gap: 8px; align-items: center; padding: 12px 16px; border-bottom: 1px solid #ddd; font-size: 14px; }
.jp-toolbar button { border: 1px solid #bbb; background: #fff; border-radius: 6px; padding: 6px 14px; cursor: pointer; }
.jp-toolbar button.primary { background: #4f46e5; border-color: #4f46e5; color: #fff; }
.jp-sheet { padding: 12px 6mm; overflow-x: auto; }
.jp table { width: 100%; min-width: 1100px; table-layout: fixed; border-collapse: collapse; font-size: var(--fs-body); line-height: 1.3; }
.jp th, .jp td { border: 0.6pt solid #000; padding: 1.2mm 1.5mm; vertical-align: top; overflow-wrap: anywhere; }
.jp thead th { font-size: var(--fs-head); font-weight: 700; text-align: center; vertical-align: middle; background: #f2f2f2; }
.jp .title-row th { border: 0; background: none; padding: 0 0 3mm; }
.jp .title { position: relative; height: 16mm; }
.jp .title img { position: absolute; left: 0; top: 0; height: 14mm; }
.jp .title h1 { margin: 0; font-size: var(--fs-title); font-weight: 700; text-align: center; line-height: 14mm; }
.jp .c { text-align: center; }
.jp .r { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.jp .pre { white-space: pre-line; }
.jp .total { vertical-align: bottom; font-weight: 700; }
.jp .cancel { font-weight: 700; }
.jp tbody.job { break-inside: avoid; }
.jp .empty td { height: 6mm; }
.jp-footer { display: flex; justify-content: space-between; width: 100%; font-size: var(--fs-footer); font-weight: 700; padding-top: 2mm; }
@media print {
  .jp-toolbar { display: none; }
  .jp-sheet { padding: 0; overflow: visible; }
  .jp table { min-width: 0; }
  .jp thead th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .jp-footer { position: fixed; bottom: -8mm; left: 0; }
}
`;

function JobRows({ r }) {
    const n = Math.max(r.parts.length, 1);
    return (
        <tbody className="job">
            {Array.from({ length: n }, (_, i) => {
                const p = r.parts[i];
                return (
                    <tr key={i}>
                        {i === 0 && (
                            <>
                                <td rowSpan={n} className="c">{r.date_fr}</td>
                                <td rowSpan={n}>{r.job_order}</td>
                                <td rowSpan={n}>{r.machine_type}</td>
                                <td rowSpan={n}>{r.asset}</td>
                                <td rowSpan={n}>{r.site}</td>
                                <td rowSpan={n}>
                                    {r.status}
                                    {r.cancel && <div className="cancel">(ยกเลิก)</div>}
                                </td>
                                <td rowSpan={n} className="c">{r.date1}</td>
                                <td rowSpan={n} className="c">{r.date2}</td>
                                <td rowSpan={n}>{r.time_work}</td>
                                <td rowSpan={n} className="pre">{text(r.cause)}</td>
                                <td rowSpan={n} className="pre">{text(r.repair)}</td>
                            </>
                        )}
                        <td>{p?.item}</td>
                        <td className="r">{money(p?.price)}</td>
                        {i === 0 && <td rowSpan={n} className="r total">{money(r.total)}</td>}
                        <td>{p?.po}</td>
                        {i === 0 && (
                            <>
                                <td rowSpan={n}>{r.responsible}</td>
                                <td rowSpan={n}>{r.pm}</td>
                            </>
                        )}
                    </tr>
                );
            })}
        </tbody>
    );
}

export default function Job_Order_Print({ rows, printedAt }) {
    useEffect(() => {
        // เปิดกล่องพิมพ์อัตโนมัติหลังหน้าแสดงผล
        const t = setTimeout(() => window.print(), 400);
        return () => clearTimeout(t);
    }, []);

    // เติมแถวว่างให้หน้าแรกดูเป็นฟอร์มเต็ม เมื่อข้อมูลน้อย (ตัวอักษรใหญ่ขึ้น จึงเติมถึง 25 บรรทัดให้พอดี 1 หน้า A3)
    const usedLines = rows.reduce((sum, r) => sum + Math.max(r.parts.length, 1), 0);
    const blankLines = Math.max(0, 25 - usedLines);

    return (
        <div className="jp">
            <Head title="ประวัติการบำรุงรักษาเครื่องจักร" />
            <style>{CSS}</style>

            <div className="jp-toolbar">
                <button type="button" className="primary" onClick={() => window.print()}>พิมพ์</button>
                <button type="button" onClick={() => window.close()}>ปิด</button>
                <span style={{ color: '#666' }}>
                    {rows.length.toLocaleString()} ใบงาน · ตั้งค่ากระดาษ A3 แนวนอน
                </span>
            </div>

            <div className="jp-sheet">
                <table>
                    <colgroup>
                        {COLUMNS.map((c) => (
                            <col key={c.label} style={{ width: `${(c.w / TOTAL_W) * 100}%` }} />
                        ))}
                    </colgroup>
                    {/* thead ซ้ำทุกหน้าอัตโนมัติเวลาพิมพ์ */}
                    <thead>
                        <tr className="title-row">
                            <th colSpan={COLUMNS.length}>
                                <div className="title">
                                    <img src={LOGO_SRC} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
                                    <h1>ประวัติการบำรุงรักษาเครื่องจักร</h1>
                                </div>
                            </th>
                        </tr>
                        <tr>
                            {COLUMNS.map((c) => (
                                <th key={c.label}>{c.label}</th>
                            ))}
                        </tr>
                    </thead>

                    {rows.map((r) => (
                        <JobRows key={r.id} r={r} />
                    ))}

                    {blankLines > 0 && (
                        <tbody>
                            {Array.from({ length: blankLines }, (_, i) => (
                                <tr key={i} className="empty">
                                    {COLUMNS.map((c) => <td key={c.label} />)}
                                </tr>
                            ))}
                        </tbody>
                    )}
                </table>

                <div className="jp-footer">
                    <span>FORM NO. : FR-MNT-003-000-005</span>
                    <span>พิมพ์เมื่อ {printedAt}</span>
                    <span>Revision - 1 : Effective Date - February 14, 2017</span>
                </div>
            </div>
        </div>
    );
}
