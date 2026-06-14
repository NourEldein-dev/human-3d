<?php

namespace App\Http\Controllers;

use App\Models\BrowserState;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class StateController extends Controller
{
    public function index(Request $request)
    {
        return response()->json([
            'state' => $this->stateMap($request),
        ]);
    }

    public function save(Request $request)
    {
        $data = $request->validate([
            'key' => ['required', 'string', 'max:255'],
            'value' => ['nullable'],
        ]);

        $owner = $this->owner($request);

        BrowserState::updateOrCreate(
            [
                $owner['column'] => $owner['value'],
                'state_key' => $data['key'],
            ],
            [
                'user_id' => $owner['column'] === 'user_id' ? $owner['value'] : null,
                'session_id' => $owner['column'] === 'session_id' ? $owner['value'] : null,
                'state_value' => $data['value'],
            ]
        );

        return response()->json(['ok' => true]);
    }

    public function delete(Request $request)
    {
        $data = $request->validate([
            'key' => ['nullable', 'string', 'max:255'],
            'prefixes' => ['nullable', 'array'],
            'prefixes.*' => ['string', 'max:255'],
        ]);

        $query = $this->ownedQuery($request);

        if (!empty($data['key'])) {
            $query->where('state_key', $data['key']);
        } elseif (!empty($data['prefixes'])) {
            $query->where(function ($q) use ($data) {
                foreach ($data['prefixes'] as $prefix) {
                    $q->orWhere('state_key', 'like', $prefix.'%');
                }
            });
        }

        $query->delete();

        return response()->json(['ok' => true]);
    }

    public function stateMap(Request $request): array
    {
        return $this->ownedQuery($request)
            ->get()
            ->mapWithKeys(fn (BrowserState $state) => [$state->state_key => $state->state_value])
            ->all();
    }

    private function ownedQuery(Request $request)
    {
        $owner = $this->owner($request);

        return BrowserState::query()->where($owner['column'], $owner['value']);
    }

    private function owner(Request $request): array
    {
        if (Auth::id()) {
            return ['column' => 'user_id', 'value' => Auth::id()];
        }

        return ['column' => 'session_id', 'value' => $request->session()->getId()];
    }
}
