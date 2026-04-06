<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Portal login: admin / atc / dlc
     */
    public function portalLogin(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::where('username', $request->username)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'username' => ['Invalid credentials.'],
            ]);
        }

        $token = $user->createToken('portal-token', ['role:' . $user->role])->plainTextToken;

        return response()->json([
            'token'     => $token,
            'user'      => [
                'id'        => $user->id,
                'username'  => $user->username,
                'name'      => $user->name,
                'role'      => $user->role,
                'centre_id' => $user->centre_id,
            ],
        ]);
    }

    /**
     * Student login: identifier only (no password required by default)
     */
    public function studentLogin(Request $request)
    {
        $request->validate(['identifier' => 'required|string']);

        $student = Student::where('identifier', $request->identifier)->first();

        if (!$student) {
            throw ValidationException::withMessages([
                'identifier' => ['Student not found.'],
            ]);
        }

        // If a password is set on the student, verify it
        if ($student->password && !Hash::check($request->input('password', ''), $student->password)) {
            throw ValidationException::withMessages([
                'password' => ['Invalid credentials.'],
            ]);
        }

        $token = $student->createToken('student-token')->plainTextToken;

        return response()->json([
            'token'   => $token,
            'user'    => [
                'id'          => $student->id,
                'identifier'  => $student->identifier,
                'name'        => $student->name,
                'centre_name' => $student->centre_name,
                'exam_slot'   => $student->exam_slot,
                'role'        => 'student',
            ],
        ]);
    }

    /**
     * Logout portal user or student
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out']);
    }
}
