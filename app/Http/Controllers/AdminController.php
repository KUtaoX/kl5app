<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Admin;
use Inertia\Inertia;

class AdminController extends Controller
{
    public function index()
    {
        $admins = Admin::select(
            'id', 'username', 'password', 'permission1', 'permission2', 'permission3', "permission4",
            'permission5', 'permission6', 'permission7', 'permission8', 'permission9', 'permission10',
        )->get();
        return Inertia::render('Admin/Index', [
            'admins' => $admins
        ]);
    }
}
