<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::table('job_order', function (Blueprint $table) {
            $table->string('status3', 100)->nullable()->after('qc');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down()
    {
        Schema::table('job_order', function (Blueprint $table) {
            $table->dropColumn('status3');
        });
    }
};
