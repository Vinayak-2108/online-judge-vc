export type Roast = "light" | "medium" | "dark";
export type ProblemStatus = "solved" | "attempted" | "new";

export interface QuestionExample {
    input: string;
    output: string;
    explanation: string;
}

export interface Question {
    id: number;
    name: string;
    slug: string;
    difficulty: Roast;
    description: string;
    input_format: string;
    output_format: string;
    constraints: string;
    examples: QuestionExample[];
    /** Only on the list endpoint. */
    status?: ProblemStatus;
    acceptance_rate?: number | null;
    best_runtime_ms?: number | null;
}

export interface SubmitResponse {
    id?: number;
    verdict?: string;
    passed?: number;
    total?: number;
    runtime_ms?: number;
    error?: string;
}

export interface RoastCounts {
    solved: number;
    attempted: number;
    total: number;
}

export interface Me {
    username: string;
    submissions: number;
    solved: number;
    attempted: number;
    total: number;
    by_roast: Record<Roast, RoastCounts>;
}

export interface Submission {
    id: number;
    user: string;
    problem: string;
    problem_slug: string | null;
    question: number | null;
    verdict: string;
    submission_time: string;
    language: string;
    passed: number | null;
    total: number | null;
    runtime_ms: number | null;
}

export interface AuthResponse {
    tag: boolean;
    username?: string;
}
