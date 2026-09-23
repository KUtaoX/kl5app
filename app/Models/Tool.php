<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tool extends Model
{
    protected $table = 'tool';   // ชื่อตารางเดิมของ tool
    public $timestamps = false;   // ตารางเดิมไม่มี created_at/updated_at
    protected $guarded = [];      // อนุญาตให้เขียนได้ทุกฟิลด์ (ปรับทีหลังได้)
}
