import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/*
 * ช่องกรอกชื่อช่าง พร้อมรายชื่อแนะนำจากตาราง PROFILES (GET /maintenance/technicians?q=)
 * - พิมพ์แล้วรอ 250ms ค่อยค้นหา
 * - ลูกศรขึ้น/ลง เลือก, Enter ยืนยัน, Esc ปิด
 * - ยังพิมพ์ชื่อที่ไม่มีในรายชื่อได้ (เช่น ช่างภายนอก)
 * รายการแนะนำวาดลงที่ document.body (fixed) จะได้ไม่ถูกตารางที่ scroll ได้ตัดขอบ
 */

const MIN_CHARS = 1;

function highlight(text, query) {
    const q = query.replace(/\s+/g, '');
    if (!q) return text;
    // หาตำแหน่งโดยไม่สนช่องว่าง แล้วไฮไลต์ช่วงนั้นในข้อความจริง
    const chars = [...text];
    const compact = [];
    chars.forEach((c, i) => {
        if (!/\s/.test(c)) compact.push(i);
    });
    const idx = compact.map((i) => chars[i]).join('').toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) return text;
    const start = compact[idx];
    const end = compact[idx + q.length - 1] + 1;
    return (
        <>
            {chars.slice(0, start).join('')}
            <mark className="rounded bg-amber-100 px-0.5 text-inherit">{chars.slice(start, end).join('')}</mark>
            {chars.slice(end).join('')}
        </>
    );
}

export default function TechnicianInput({ value, onChange, className = '', ...props }) {
    const inputRef = useRef(null);
    const timer = useRef(null);
    const requestId = useRef(0);
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [active, setActive] = useState(-1);
    const [query, setQuery] = useState('');
    const [rect, setRect] = useState(null);

    const search = (text) => {
        clearTimeout(timer.current);
        const q = text.trim();
        setQuery(q);
        if (q.replace(/\s+/g, '').length < MIN_CHARS) {
            setItems([]);
            setOpen(false);
            return;
        }
        timer.current = setTimeout(async () => {
            const id = ++requestId.current;
            setLoading(true);
            try {
                const res = await window.axios.get(route('maintenance.technicians'), { params: { q } });
                if (id !== requestId.current) return; // มีคำค้นใหม่กว่าแล้ว
                setItems(res.data);
                setActive(res.data.length ? 0 : -1);
                setOpen(true);
            } catch {
                if (id === requestId.current) setItems([]);
            } finally {
                if (id === requestId.current) setLoading(false);
            }
        }, 250);
    };

    useEffect(() => () => clearTimeout(timer.current), []);

    // ตำแหน่งรายการให้ติดใต้ช่องกรอก (ขยับตามเมื่อเลื่อนหน้า / ตาราง)
    useLayoutEffect(() => {
        if (!open) return;
        const update = () => inputRef.current && setRect(inputRef.current.getBoundingClientRect());
        update();
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
        return () => {
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        };
    }, [open]);

    const choose = (item) => {
        onChange(item.name);
        setOpen(false);
        setItems([]);
    };

    const onKeyDown = (e) => {
        if (!open || items.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => (i + 1) % items.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => (i - 1 + items.length) % items.length);
        } else if (e.key === 'Enter' && active >= 0) {
            e.preventDefault();
            choose(items[active]);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    const dropdown =
        open && rect
            ? createPortal(
                  <ul
                      role="listbox"
                      className="fixed z-[60] max-h-72 overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-gray-200"
                      style={{ top: rect.bottom + 4, left: rect.left, minWidth: Math.max(rect.width, 280) }}
                      // กันไม่ให้ช่องกรอกเสีย focus ก่อนคลิกเลือก
                      onMouseDown={(e) => e.preventDefault()}
                  >
                      {items.length === 0 && (
                          <li className="px-3 py-2 text-gray-400">
                              {loading ? 'กำลังค้นหา…' : 'ไม่พบรายชื่อ — พิมพ์ชื่อเองได้'}
                          </li>
                      )}
                      {items.map((item, i) => (
                          <li
                              key={item.id}
                              role="option"
                              aria-selected={i === active}
                              onMouseEnter={() => setActive(i)}
                              onClick={() => choose(item)}
                              className={`cursor-pointer px-3 py-2 ${i === active ? 'bg-indigo-50' : ''}`}
                          >
                              <div className="text-gray-900">{highlight(item.name, query)}</div>
                              <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-gray-500">
                                  <span className="font-mono">{item.id}</span>
                                  {item.name_en && <span>{highlight(item.name_en, query)}</span>}
                                  {item.position && <span>· {item.position}</span>}
                                  {item.site && <span>· {item.site}</span>}
                              </div>
                          </li>
                      ))}
                  </ul>,
                  document.body,
              )
            : null;

    return (
        <>
            <input
                ref={inputRef}
                type="text"
                autoComplete="off"
                role="combobox"
                aria-expanded={open}
                aria-autocomplete="list"
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    search(e.target.value);
                }}
                onFocus={(e) => e.target.value && search(e.target.value)}
                onBlur={() => setOpen(false)}
                onKeyDown={onKeyDown}
                className={className}
                {...props}
            />
            {dropdown}
        </>
    );
}
