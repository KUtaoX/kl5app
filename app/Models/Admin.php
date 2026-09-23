<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Admin extends Model
{
    protected $table = 'admin';   // ชื่อตารางเดิมของ KL5
    public $timestamps = false;   // ตารางเดิมไม่มี created_at/updated_at
    protected $guarded = [];      // อนุญาตให้เขียนได้ทุกฟิลด์ (ปรับทีหลังได้)
}
