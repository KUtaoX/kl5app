<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JobOrder extends Model
{
    protected $table = 'job_order';

    protected $guarded = [];

    protected $casts = [
        'date_fr' => 'date',
        'date1' => 'date',
        'date2' => 'date',
        'datetime1' => 'datetime',
        'datetime2' => 'datetime',
        'auto_date' => 'datetime',
        'cancel' => 'boolean',
    ];

    public $timestamps = false; // ตารางเดิมไม่มี created_at/updated_at

    public function tool()
    {
        return $this->belongsTo(Tool::class, 'id_tool');
    }
}