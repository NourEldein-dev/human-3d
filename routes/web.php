<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\PageController;
use App\Http\Controllers\StateController;
use Illuminate\Support\Facades\Route;

Route::get('/', [PageController::class, 'login'])->name('login');
Route::get('/login', [PageController::class, 'login']);
Route::get('/index.html', [AuthController::class, 'logout']); // تركتها كما هي لعدم كسر أي ملف خارجي يعتمد عليها للـ logout الصريح

Route::get('/lang/{locale}', function (string $locale) {
    abort_unless(in_array($locale, ['ar', 'en'], true), 404);
    session(['locale' => $locale]);

    return back();
})->name('lang.switch');

Route::post('/auth/login', [AuthController::class, 'login'])->name('auth.login');
Route::post('/auth/register', [AuthController::class, 'register'])->name('auth.register');
Route::post('/auth/guest', [AuthController::class, 'guest'])->name('auth.guest');
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
Route::get('/logout', [AuthController::class, 'logout']);

Route::get('/admin', [PageController::class, 'admin'])->name('admin');
Route::get('/admin-dashboard', [PageController::class, 'admin']);

Route::get('/model', fn () => app(PageController::class)->page(request(), 'model-selector'))->name('model');
Route::get('/model-selector.html', fn () => app(PageController::class)->page(request(), 'model-selector'));

Route::get('/chat', fn () => app(PageController::class)->page(request(), 'diagnosis-chat'))->name('chat');
Route::get('/diagnosis-chat.html', fn () => app(PageController::class)->page(request(), 'diagnosis-chat'));

Route::get('/diagnosis', fn () => app(PageController::class)->page(request(), 'diagnosis'))->name('diagnosis');
Route::get('/diagnosis.html', fn () => app(PageController::class)->page(request(), 'diagnosis'));

Route::get('/head-details', fn () => app(PageController::class)->page(request(), 'head-details'))->name('details.head');
Route::get('/head-details.html', fn () => app(PageController::class)->page(request(), 'head-details'));
Route::get('/chest-details', fn () => app(PageController::class)->page(request(), 'chest-details'))->name('details.chest');
Route::get('/chest-details.html', fn () => app(PageController::class)->page(request(), 'chest-details'));
Route::get('/belly-details', fn () => app(PageController::class)->page(request(), 'belly-details'))->name('details.belly');
Route::get('/belly-details.html', fn () => app(PageController::class)->page(request(), 'belly-details'));
Route::get('/right-arm-details', fn () => app(PageController::class)->page(request(), 'right-arm-details'))->name('details.right-arm');
Route::get('/right-arm-details.html', fn () => app(PageController::class)->page(request(), 'right-arm-details'));
Route::get('/left-arm-details', fn () => app(PageController::class)->page(request(), 'left-arm-details'))->name('details.left-arm');
Route::get('/left-arm-details.html', fn () => app(PageController::class)->page(request(), 'left-arm-details'));
Route::get('/right-leg-details', fn () => app(PageController::class)->page(request(), 'right-leg-details'))->name('details.right-leg');
Route::get('/right-leg-details.html', fn () => app(PageController::class)->page(request(), 'right-leg-details'));
Route::get('/left-leg-details', fn () => app(PageController::class)->page(request(), 'left-leg-details'))->name('details.left-leg');
Route::get('/left-leg-details.html', fn () => app(PageController::class)->page(request(), 'left-leg-details'));

Route::get('/api/bootstrap', [PageController::class, 'bootstrap'])->name('bootstrap');
Route::get('/api/state', [StateController::class, 'index'])->name('state.index');
Route::post('/api/state', [StateController::class, 'save'])->name('state.save');
Route::delete('/api/state', [StateController::class, 'delete'])->name('state.delete');