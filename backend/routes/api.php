<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\QuestionBankController;
use App\Http\Controllers\Api\ExamConfigController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\ResultController;
use App\Http\Controllers\Api\StudentExamController;
use App\Http\Controllers\Api\LiveMonitorController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ExamAssignmentController;

// ─── Public Auth ─────────────────────────────────────────────────────────────
Route::prefix('v1')->group(function () {

    Route::post('/auth/login',   [AuthController::class, 'portalLogin']);
    Route::post('/student/login',[AuthController::class, 'studentLogin']);

    // ─── Portal Routes (admin / atc / dlc) ───────────────────────────────────
    Route::middleware('auth:sanctum')->group(function () {

        Route::post('/auth/logout', [AuthController::class, 'logout']);

        // Question Banks
        Route::apiResource('question-banks', QuestionBankController::class);
        Route::get('question-banks/{id}/questions', [QuestionBankController::class, 'questions']);
        Route::post ('question-banks/{id}/assign',              [QuestionBankController::class, 'assign']);
        Route::post ('question-banks/{bankId}/questions',       [QuestionBankController::class, 'storeQuestion']);
        Route::post ('question-banks/{bankId}/import-questions',[QuestionBankController::class, 'importQuestions']);
        Route::put  ('question-banks/{bankId}/questions/{qId}', [QuestionBankController::class, 'updateQuestion']);
        Route::delete('question-banks/{bankId}/questions/{qId}',[QuestionBankController::class, 'destroyQuestion']);

        // Exam Configs
        Route::apiResource('exam-configs', ExamConfigController::class);
        Route::patch('exam-configs/{id}/toggle-active', [ExamConfigController::class, 'toggleActive']);

        // Admin/Staff Routes
        Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
        // Students
        Route::apiResource('students', StudentController::class);
        Route::post('students/import',      [StudentController::class, 'importCsv']);
        Route::get ('students/{id}/history',[StudentController::class, 'history']);

        // Results & Analytics
        Route::get('results',        [ResultController::class, 'index']);
        Route::get('results/export', [ResultController::class, 'export']);

        // Live Monitoring
        Route::get('live/active', [LiveMonitorController::class, 'active']);

        // Exam Assignments (ATC/DLC assign exams to students)
        Route::get ('assignments/students',                              [ExamAssignmentController::class, 'students']);
        Route::get ('assignments/exams',                                 [ExamAssignmentController::class, 'availableExams']);
        Route::post('assignments/assign',                                [ExamAssignmentController::class, 'assign']);
        Route::post('assignments/bulk-assign',                           [ExamAssignmentController::class, 'bulkAssign']);
        Route::put ('assignments/{studentId}/exams/{examId}/attempts',   [ExamAssignmentController::class, 'updateAttempts']);
        Route::delete('assignments/{studentId}/exams/{examId}',          [ExamAssignmentController::class, 'unassign']);
    });

    // ─── Student Portal Routes ────────────────────────────────────────────────
    Route::middleware('auth:sanctum')->prefix('student')->group(function () {
        Route::post('/logout',                          [AuthController::class, 'logout']);
        Route::get ('/exams',                           [StudentExamController::class, 'myExams']);
        Route::get ('/history',                         [StudentExamController::class, 'myHistory']);
        Route::get ('/exam/{examId}/questions',         [StudentExamController::class, 'getQuestions']);
        Route::post('/exam/{examId}/heartbeat',         [StudentExamController::class, 'heartbeat']);
        Route::post('/exam/{examId}/submit',            [StudentExamController::class, 'submit']);
        Route::get ('/result/{submissionId}',           [StudentExamController::class, 'submissionResult']);
    });
});
