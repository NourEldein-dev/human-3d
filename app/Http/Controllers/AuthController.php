<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private const ADMIN_REGISTRATION_KEY = 'DDS-ADMIN-KEY-2026';

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'username' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('username', $credentials['username'])->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'username' => ['بيانات الدخول غير صحيحة.'],
            ]);
        }

        Auth::login($user, $request->boolean('remember'));
        $request->session()->regenerate();
        $request->session()->forget('guest_user');

        return $this->authResponse($request, $user);
    }

    public function register(Request $request)
    {
        $data = $request->validate([
            'username' => ['required', 'string', 'max:255', 'unique:users,username'],
            'password' => ['required', 'string', 'min:4', 'confirmed'],
            'admin_key' => ['nullable', 'string'],
        ]);

        $role = ($data['admin_key'] ?? null) === self::ADMIN_REGISTRATION_KEY ? 'admin' : 'user';

        $user = User::create([
            'name' => $data['username'],
            'username' => $data['username'],
            'password' => $data['password'],
            'role' => $role,
        ]);

        Auth::login($user);
        $request->session()->regenerate();
        $request->session()->forget('guest_user');

        return $this->authResponse($request, $user);
    }

    public function guest(Request $request)
    {
        Auth::logout();
        $request->session()->regenerate();
        $request->session()->put('guest_user', [
            'id' => null,
            'username' => 'زائر',
            'role' => 'user',
            'isGuest' => true,
        ]);

        return $this->authResponse($request);
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->forget('guest_user');
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }

    private function authResponse(Request $request, ?User $user = null)
    {
        $payload = $user ? [
            'id' => $user->id,
            'username' => $user->username,
            'role' => $user->role,
            'isGuest' => false,
        ] : $request->session()->get('guest_user');

        if ($request->expectsJson()) {
            return response()->json([
                'ok' => true,
                'user' => $payload,
                'redirect' => route('model'),
            ]);
        }

        return redirect()->route('model');
    }
}
