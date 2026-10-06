import ApplicationLogo from '@/Components/ApplicationLogo';
import ThemeToggle from '@/Components/ThemeToggle';
import { Head, Link } from '@inertiajs/react';

/*
 * หน้าแรก (ก่อน login) — ใช้สีจากโลโก้ RITTA: น้ำเงิน + แดง
 * ซ้าย: แผงสีน้ำเงินพร้อมชื่อระบบ มีแถบแดงด้านล่างล้อกับโลโก้
 * ขวา: ปุ่มเข้าสู่ระบบ และสิ่งที่ทำได้ในระบบ
 */

const BRAND_BLUE = '#17357E';
const BRAND_RED = '#D7192E';

const TASKS = [
    {
        title: 'ดูประวัติเครื่องจักร',
        text: 'ค้นหาเครื่องจาก Asset Code แล้วดูใบสั่งงานและค่าอะไหล่ย้อนหลัง',
        icon: 'M4 6h16M4 12h16M4 18h10',
    },
    {
        title: 'เปิดและบันทึกใบสั่งงาน',
        text: 'แจ้งซ่อม บันทึกอะไหล่ที่ใช้ และพิมพ์ลงแบบฟอร์ม FR-MNT-003',
        icon: 'M9 5h6m-6 0a2 2 0 002 2h2a2 2 0 002-2m-6 0a2 2 0 012-2h2a2 2 0 012 2M7 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1M9 13h6m-6 4h4',
    },
    {
        title: 'ติดตามงานซ่อม',
        text: 'ส่งเครื่องเข้าซ่อม อัปเดตสถานะ และให้ QC ตรวจรับ',
        icon: 'M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.5 2.5-2.8-.7-.7-2.8 2.5-2.5z',
    },
    {
        title: 'ดูภาพรวม',
        text: 'งานค้าง ค่าอะไหล่แต่ละไซต์ และเครื่องที่เสียบ่อย ในหน้า Dashboard',
        icon: 'M4 19V9m6 10V5m6 14v-7m4 7H3',
    },
];

export default function Welcome({ auth, canRegister }) {
    const user = auth?.user;

    return (
        <>
            <Head title="ระบบซ่อมบำรุงเครื่องจักร KL5">
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
                <link
                    href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap"
                    rel="stylesheet"
                />
            </Head>

            <div
                className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] dark:bg-page"
                style={{ fontFamily: "'IBM Plex Sans Thai', Figtree, system-ui, sans-serif" }}
            >
                {/* ---------- ซ้าย: แผงแบรนด์ ---------- */}
                <section
                    className="relative flex flex-col justify-between overflow-hidden px-8 pb-14 pt-8 text-white sm:px-12 lg:px-16 lg:pb-20"
                    style={{ backgroundColor: BRAND_BLUE }}
                >
                    <div className="flex items-center justify-between">
                        <ApplicationLogo className="h-12 w-auto rounded-sm ring-1 ring-white/20" />
                        <ThemeToggle compact className="lg:hidden" />
                    </div>

                    <div className="mt-16 max-w-xl lg:mt-0">
                        {/* <p className="text-base text-blue-100/80">ฝ่ายซ่อมบำรุงเครื่องจักร</p> */}
                        <h1 className="mt-3 text-4xl font-bold leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl">
                            ระบบซ่อมบำรุง
                            <br />
                            เครื่องจักร 
                        </h1>
                        <p className="mt-6 max-w-md text-lg leading-relaxed text-blue-100/90">
                            ใบสั่งงาน งานซ่อม และประวัติเครื่องจักรของทุกไซต์ ในที่เดียว
                        </p>
                    </div>

                    <p className="mt-16 text-sm text-blue-100/60 lg:mt-0">สำหรับพนักงานภายในเท่านั้น</p>

                    {/* แถบแดงล้อกับโลโก้ */}
                    <div className="absolute inset-x-0 bottom-0 h-3" style={{ backgroundColor: BRAND_RED }} aria-hidden="true" />
                </section>

                {/* ---------- ขวา: เข้าสู่ระบบ ---------- */}
                <section className="flex flex-col px-8 py-8 sm:px-12 lg:px-16">
                    <div className="hidden justify-end lg:flex">
                        <ThemeToggle compact />
                    </div>

                    <div className="my-auto w-full max-w-md py-12">
                        {user ? (
                            <>
                                <h2 className="text-2xl font-semibold text-gray-900">สวัสดี {user.name}</h2>
                                <p className="mt-2 text-gray-600">คุณเข้าสู่ระบบอยู่แล้ว</p>
                                <Link
                                    href={route('dashboard')}
                                    className="mt-8 inline-flex w-full items-center justify-center rounded-lg px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                                    style={{ backgroundColor: BRAND_BLUE }}
                                >
                                    ไปที่ Dashboard
                                </Link>
                            </>
                        ) : (
                            <>
                                <h2 className="text-2xl font-semibold text-gray-900">เข้าสู่ระบบ</h2>
                                <p className="mt-2 text-gray-600">ใช้บัญชีที่ได้รับจากฝ่ายซ่อมบำรุง</p>
                                <Link
                                    href={route('login')}
                                    className="mt-8 inline-flex w-full items-center justify-center rounded-lg px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                                    style={{ backgroundColor: BRAND_BLUE }}
                                >
                                    เข้าสู่ระบบ
                                </Link>
                                {canRegister && (
                                    <p className="mt-4 text-center text-sm text-gray-600">
                                        ยังไม่มีบัญชี?{' '}
                                        <Link href={route('register')} className="font-medium underline underline-offset-4 hover:text-gray-900">
                                            สมัครใช้งาน
                                        </Link>
                                    </p>
                                )}
                            </>
                        )}

                        <ul className="mt-14 space-y-6 border-t border-gray-200 pt-10">
                            {TASKS.map((t) => (
                                <li key={t.title} className="flex gap-4">
                                    <span
                                        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-100"
                                        style={{ color: BRAND_RED }}
                                    >
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                                        </svg>
                                    </span>
                                    <div>
                                        <p className="font-semibold text-gray-900">{t.title}</p>
                                        <p className="mt-0.5 text-sm leading-relaxed text-gray-600">{t.text}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            </div>
        </>
    );
}
