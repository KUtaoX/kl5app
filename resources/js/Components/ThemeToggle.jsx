import { useEffect, useState } from 'react';

const STORAGE_KEY = 'theme';

function currentTheme() {
    if (typeof document === 'undefined') return 'light';
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function applyTheme(theme) {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
        localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
        // เบราว์เซอร์ปิด localStorage — ยังสลับได้ แค่จำค่าไม่ได้
    }
}

export function useTheme() {
    const [theme, setTheme] = useState(currentTheme);

    // เปลี่ยนโหมดในแท็บหนึ่ง แท็บอื่นเปลี่ยนตามด้วย
    useEffect(() => {
        const onStorage = (e) => {
            if (e.key !== STORAGE_KEY) return;
            const next = e.newValue === 'dark' ? 'dark' : 'light';
            document.documentElement.classList.toggle('dark', next === 'dark');
            setTheme(next);
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    const change = (next) => {
        applyTheme(next);
        setTheme(next);
    };

    return [theme, change];
}

const SunIcon = () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="4" />
        <path strokeLinecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
);

const MoonIcon = () => (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
);

const OPTIONS = [
    { value: 'light', label: 'Day', Icon: SunIcon },
    { value: 'dark', label: 'Night', Icon: MoonIcon },
];

/**
 * ปุ่มเลือกโหมดหน้าจอ Day / Night
 * compact = แสดงแค่ไอคอน (ใช้ในแถบเมนูบนจอกว้าง)
 */
export default function ThemeToggle({ compact = false, className = '' }) {
    const [theme, setTheme] = useTheme();

    return (
        <div
            role="radiogroup"
            aria-label="โหมดหน้าจอ"
            className={`inline-flex rounded-lg bg-gray-100 p-0.5 ${className}`}
        >
            {OPTIONS.map(({ value, label, Icon }) => {
                const active = theme === value;
                return (
                    <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        title={label}
                        onClick={() => setTheme(value)}
                        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                            active
                                ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                                : 'text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        <Icon />
                        <span className={compact ? 'sr-only' : ''}>{label}</span>
                    </button>
                );
            })}
        </div>
    );
}
