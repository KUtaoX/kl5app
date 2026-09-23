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


// Route::get('/record-tool', [RecordController::class, 'index'])->name('record-tool.index');

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

Route ::middleware('auth')->group(function () {
    Route::get('/machine-list', [ToolController::class, 'index'])->name('machine-list');
    Route::get('/record-tool/{tool}', [ToolController::class, 'show']);
    Route::get('/add-tool', [ToolController::class, 'create']);
    Route::post('/add-tool', [ToolController::class, 'store']);
    Route::get('/edit-tool/{tool}', [ToolController::class, 'edit']);
    Route::put('/edit-tool/{tool}', [ToolController::class, 'update']);
    Route::post('/import-tools', [ToolController::class, 'import'])->name('tools.import');
    Route::get('/job-order/create/{tool}', [ToolController::class, 'createJobOrder'])->name('job-order.create');
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
