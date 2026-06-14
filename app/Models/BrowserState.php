<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BrowserState extends Model
{
    protected $fillable = [
        'user_id',
        'session_id',
        'state_key',
        'state_value',
    ];

    protected function casts(): array
    {
        return [
            'state_value' => 'array',
        ];
    }
}
