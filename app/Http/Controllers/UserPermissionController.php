<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UserPermissionController extends Controller
{
    public function index()
    {
        $users = User::select(
            'id', 'name', 'email',
            'permission1', 'permission2', 'permission3', 'permission4', 'permission5',
            'permission6', 'permission7', 'permission8', 'permission9', 'permission10'
        )->orderBy('id')->get();

        return Inertia::render('Admin/UserPermission', [
            'users' => $users,
        ]);
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'permission1' => 'nullable|boolean',
            'permission2' => 'nullable|boolean',
            'permission3' => 'nullable|boolean',
            'permission4' => 'nullable|boolean',
            'permission5' => 'nullable|boolean',
            'permission6' => 'nullable|boolean',
            'permission7' => 'nullable|boolean',
            'permission8' => 'nullable|boolean',
            'permission9' => 'nullable|boolean',
            'permission10' => 'nullable|boolean',
        ]);

        foreach ($validated as $key => $value) {
            $validated[$key] = $value ? '1' : '0';
        }

        $user->update($validated);

        return back();
    }
}