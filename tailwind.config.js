import defaultTheme from 'tailwindcss/defaultTheme';
import colors from 'tailwindcss/colors';
import forms from '@tailwindcss/forms';
import plugin from 'tailwindcss/plugin';

/*
 * โหมด Day / Night
 * ------------------------------------------------------------------
 * แทนที่จะต้องไล่เติม dark:... ให้ทุก class ในทุกหน้า
 * เราให้สี gray และสีอ่อน (50/100/200) ของสีอื่น ๆ อ่านค่าจาก CSS variable
 * แล้วสลับค่าชุดนั้นเมื่อ <html> มี class "dark"
 * ผลคือ bg-white / bg-gray-50 / text-gray-900 / border-gray-200 / bg-indigo-50 ฯลฯ
 * ที่มีอยู่แล้วทั้งโปรเจกต์ เปลี่ยนเป็นโทนมืดให้เองอัตโนมัติ
 *
 * ถ้าบางจุดอยากกำหนดเองต่างหาก ยังใช้ dark:... ได้ตามปกติ
 */

const SURFACE = '#171b24'; // พื้นการ์ด / nav / header ในโหมด Night
const PAGE_DARK = '#0f1218'; // พื้นหลังหน้าในโหมด Night

// ไล่จากอ่อนสุด (50) ไปเข้มสุด (950) — ในโหมด Night จึงกลับด้าน
const GRAY_DARK = {
    50: '#1d212c',
    100: '#252b38',
    200: '#2e3442',
    300: '#414958',
    400: '#6f7787',
    500: '#959cab',
    600: '#b0b6c2',
    700: '#c9ced7',
    800: '#dfe2e8',
    900: '#f0f2f5',
    950: '#f8f9fb',
};

const ACCENTS = ['red', 'orange', 'amber', 'yellow', 'green', 'emerald', 'teal', 'sky', 'blue', 'indigo', 'violet', 'rose'];
const SOFT = { 50: 0.14, 100: 0.22, 200: 0.32 }; // สัดส่วนสี -500 ที่ผสมกับพื้นมืด
const TEXT_DARK = { 500: 400, 600: 400, 700: 300, 800: 200, 900: 200 }; // ตัวอักษรสีเข้ม → สว่างขึ้นบนพื้นมืด
const GRAY_SHADES = Object.keys(GRAY_DARK);

const rgb = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (hex, base, t) => {
    const a = rgb(hex);
    const b = rgb(base);
    return a.map((v, i) => Math.round(v * t + b[i] * (1 - t)));
};
const triplet = (arr) => arr.join(' ');
const cssVar = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

// ---------- ค่า variable ของโหมด Day และ Night ----------
const lightVars = { '--c-surface': triplet(rgb('#ffffff')), '--c-page': triplet(rgb(colors.gray[100])) };
const darkVars = { '--c-surface': triplet(rgb(SURFACE)), '--c-page': triplet(rgb(PAGE_DARK)) };

for (const shade of GRAY_SHADES) {
    lightVars[`--c-gray-${shade}`] = triplet(rgb(colors.gray[shade]));
    darkVars[`--c-gray-${shade}`] = triplet(rgb(GRAY_DARK[shade]));
}
for (const name of ACCENTS) {
    for (const [shade, t] of Object.entries(SOFT)) {
        lightVars[`--c-${name}-${shade}`] = triplet(rgb(colors[name][shade]));
        darkVars[`--c-${name}-${shade}`] = triplet(mix(colors[name][500], SURFACE, t));
    }
}

// ---------- palette ที่ Tailwind ใช้สร้าง class ----------
const themeColors = {
    page: cssVar('page'),
    gray: Object.fromEntries(GRAY_SHADES.map((s) => [s, cssVar(`gray-${s}`)])),
};
for (const name of ACCENTS) {
    themeColors[name] = {
        ...colors[name],
        ...Object.fromEntries(Object.keys(SOFT).map((s) => [s, cssVar(`${name}-${s}`)])),
    };
}

// ---------- override เฉพาะโหมด Night (แสดงบนจอเท่านั้น ตอนพิมพ์ยังเป็น Day) ----------
const nightOverrides = {
    '.dark': { ...darkVars, colorScheme: 'dark' },
    // bg-white เป็นพื้นการ์ด แต่ text-white บนปุ่มสีต้องยังขาวอยู่ จึงแยกจัดการเฉพาะ bg
    '.dark .bg-white': { backgroundColor: 'rgb(var(--c-surface) / var(--tw-bg-opacity, 1))' },
    '.dark .divide-white > :not([hidden]) ~ :not([hidden])': { borderColor: 'rgb(var(--c-gray-200))' },
};
for (const name of ACCENTS) {
    for (const [from, to] of Object.entries(TEXT_DARK)) {
        const color = colors[name][to];
        nightOverrides[`.dark .text-${name}-${from}`] = { color };
        nightOverrides[`.dark .hover\\:text-${name}-${from}:hover`] = { color };
    }
}

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',

    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Figtree', ...defaultTheme.fontFamily.sans],
            },
            colors: themeColors,
        },
    },

    plugins: [
        forms,
        plugin(({ addBase }) => {
            addBase({ ':root': lightVars });
            addBase({ '@media screen': nightOverrides });
        }),
    ],
};