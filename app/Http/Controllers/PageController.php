<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PageController extends Controller
{
    public function login()
    {
        if ($this->currentUser(request())) {
            return redirect()->route('model');
        }

        return view('pages.index', $this->viewData());
    }

    public function page(Request $request, string $view)
    {
        if (!$this->currentUser($request)) {
            return redirect()->route('login');
        }

        return view("pages.$view", $this->viewData());
    }

    public function admin(Request $request)
    {
        $user = $this->currentUser($request);

        if (!$user) {
            return redirect()->route('login');
        }

        if (($user['role'] ?? '') !== 'admin') {
            return redirect()->route('model');
        }

        return view('pages.admin-dashboard', $this->viewData());
    }

    public function bootstrap(Request $request)
    {
        return response()->json($this->bootstrapPayload($request));
    }

    private function viewData(): array
    {
        $locale = app()->getLocale();

        return [
            'ddsBootstrap' => $this->bootstrapPayload(request()),
            'locale' => $locale,
            'direction' => $locale === 'ar' ? 'rtl' : 'ltr',
            'switchLocale' => $locale === 'ar' ? 'en' : 'ar',
            'switchLocaleLabel' => $locale === 'ar' ? 'English' : 'العربية',
        ];
    }

    private function bootstrapPayload(Request $request): array
    {
        return [
            'auth' => $this->currentUser($request),
            'routes' => [
                'login' => route('login'),
                'model' => route('model'),
                'chat' => route('chat'),
                'admin' => route('admin'),
                'logout' => route('logout'),
                'state' => route('state.save'),
                'stateDelete' => route('state.delete'),
            ],
            'state' => app(StateController::class)->stateMap($request),
        ];
    }

    private function currentUser(Request $request): ?array
    {
        $user = Auth::user();
        if ($user) {
            return [
                'id' => $user->id,
                'username' => $user->username,
                'role' => $user->role,
                'isGuest' => false,
            ];
        }

        return $request->session()->get('guest_user');
    }
}