<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\AddTool;
use Inertia\Inertia;

class RecordController extends Controller
{
    public function index()
    {
        return Inertia::render('Tool/Record_Tool');
    }
}