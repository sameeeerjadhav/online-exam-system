<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\Submission;
use App\Models\QuestionBank;
use App\Models\ExamConfig;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class DashboardController extends Controller
{
    /**
     * Get high-level summary stats for the admin dashboard.
     * Replaces multiple heavy API calls with one fast summary.
     */
    public function stats(Request $request)
    {
        $user = $request->user();
        $centreId = $user->centre_id;

        // 1. Basic counts (fast indexed queries)
        $studentCount = Student::when($centreId, fn($q) => $q->where('centre_name', $centreId))->count();
        $bankCount    = QuestionBank::visibleTo($centreId, $user->username)->count();
        $examCount    = ExamConfig::where('active', true)->count();

        // 2. Submission stats
        $submissionQuery = Submission::forCentre($centreId);
        $totalSubmissions = $submissionQuery->count();
        
        $stats = [
            'total'  => $totalSubmissions,
            'passed' => (clone $submissionQuery)->where('result', 'pass')->count(),
            'failed' => (clone $submissionQuery)->where('result', 'fail')->count(),
            'avg'    => $totalSubmissions ? round((clone $submissionQuery)->avg('score')) : 0,
        ];

        // 3. Recent Submissions (limited to 10 for dashboard speed)
        $recentSubmissions = Submission::with(['student', 'exam'])
            ->forCentre($centreId)
            ->latest('submitted_at')
            ->limit(10)
            ->get();

        // 4. Live Sessions (retrieve count from cache index)
        $liveIndex = Cache::get('live_session_index', []);
        $activeLiveCount = 0;
        foreach ($liveIndex as $key) {
            if (Cache::has($key)) $activeLiveCount++;
        }

        return response()->json([
            'counts' => [
                'students'        => $studentCount,
                'question_banks'  => $bankCount,
                'exam_configs'    => $examCount,
                'submissions'     => $totalSubmissions,
                'live_now'        => $activeLiveCount,
            ],
            'stats'       => $stats,
            'recent'      => $recentSubmissions,
            'server_time' => now()->toIso8601String(),
        ]);
    }
}
