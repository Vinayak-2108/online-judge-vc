export interface Question {
    id: number;
    name: string;
    difficulty: string;
    description: string;
}

export interface Submission {
    id: number;
    user: string;
    problem: string;
    verdict: string;
    submission_time: string;
    language: string;
}

export interface AuthResponse {
    tag: boolean;
    username?: string;
}
