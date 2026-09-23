<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
   public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('permission1')->nullable();
            $table->string('permission2')->nullable();
            $table->string('permission3')->nullable();
            $table->string('permission4')->nullable();
            $table->string('permission5')->nullable();
            $table->string('permission6')->nullable();
            $table->string('permission7')->nullable();
            $table->string('permission8')->nullable();
            $table->string('permission9')->nullable();
            $table->string('permission10')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['permission1','permission2','permission3','permission4','permission5','permission6','permission7','permission8','permission9','permission10']);
        });
    }
};
