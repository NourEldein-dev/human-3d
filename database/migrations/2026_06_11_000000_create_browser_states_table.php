<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('browser_states', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('session_id')->nullable()->index();
            $table->string('state_key');
            $table->json('state_value')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'state_key']);
            $table->unique(['session_id', 'state_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('browser_states');
    }
};
