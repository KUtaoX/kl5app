<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
// use App\Http\Controllers\AdminController;
// use App\Http\Controllers\AddToolController;
use App\Http\Controllers\ToolController;
use App\Http\Controllers\UserPermissionController;
use App\Http\Controllers\RecordController;
use App\Http\Controllers\JobOrderTypeController;
use App\Http\Controllers\MaintenanceController;
use App\Http\Controllers\DashboardController;


// Route::get('/record-tool', [RecordController::class, 'index'])->name('record-tool.index');

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', [DashboardController::class, 'index'])->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

Route ::middleware('auth')->group(function () {
    Route::get('/machine-list', [ToolController::class, 'index'])->name('machine-list');
    Route::get('/record-tool/{tool}', [ToolController::class, 'show'])->name('record-tool');
    Route::get('/add-tool', [ToolController::class, 'create']);
    Route::post('/add-tool', [ToolController::class, 'store']);
    Route::get('/edit-tool/{tool}', [ToolController::class, 'edit']);
    Route::put('/edit-tool/{tool}', [ToolController::class, 'update']);
    Route::post('/import-tools', [ToolController::class, 'import'])->name('tools.import');
    Route::get('/job-order/create/{tool}', [ToolController::class, 'createJobOrder'])->name('job-order.create');
    Route::post('/job-order', [ToolController::class, 'storeJobOrder'])->name('job-order.store');
    Route::get('/record/{id}', [RecordController::class, 'show']);
    Route::post('/record/{id}', [RecordController::class, 'store']);
    Route::get('/record/{id}/edit', [RecordController::class, 'edit']);
    Route::get('/record/{id}/cancel', [RecordController::class, 'cancel'])->name('record.cancel');
    // Route::put('/record/{id}/cancel', [RecordController::class, 'cancel'])->name('record.cancel');
    Route::put('/record/{id}/cancel', [RecordController::class, 'cancelSave'])->name('record.cancel');
    Route::get('/record/{id}/print', [RecordController::class, 'print'])->name('record.print');
    Route ::get('/job-order-home',[RecordController::class, 'jobOrderHome'])->name('job-order-home');
    Route::get('/job-order-home/export', [RecordController::class, 'jobOrderHomeExport'])->name('job-order-home.export');
    Route::get('/maintenance', [MaintenanceController::class, 'index'])->name('maintenance');
    Route::post('/maintenance', [MaintenanceController::class, 'store'])->name('maintenance.store');
    Route::patch('/maintenance/{id}', [MaintenanceController::class, 'update'])->whereNumber('id')->name('maintenance.update');
    Route::delete('/maintenance/{id}', [MaintenanceController::class, 'destroy'])->whereNumber('id')->name('maintenance.destroy');
    Route::get('/maintenance/print', [MaintenanceController::class, 'print'])->name('maintenance.print');
});

Route::middleware('auth', 'permission:permission1')->group(function () {
    Route::get('/user-permissions', [UserPermissionController::class, 'index'])->name('user-permissions.index');
    Route::patch('/user-permissions/{user}', [UserPermissionController::class, 'update'])->name('user-permissions.update');   
});

Route::middleware('auth', 'readonly.block')->group(function () {
    Route::get('/job-order-types', [JobOrderTypeController::class, 'index'])->name('job-order-types.index');
    Route::post('/job-order-types', [JobOrderTypeController::class, 'store'])->name('job-order-types.store');
    Route::delete('/job-order-types/{jobOrderType}', [JobOrderTypeController::class, 'destroy'])->name('job-order-types.destroy');
});

require __DIR__.'/auth.php';
