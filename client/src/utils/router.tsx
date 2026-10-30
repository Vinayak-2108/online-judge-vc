import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Routes, Route } from "react-router";

import AppShell from "../components/AppShell";
import NotFound from "../components/NotFound";
import { AuthProvider } from "../lib/auth";

// Each screen is its own chunk: the landing page does not ship the editor, and the app does not ship the landing page.
const Landing = lazy(() => import("../pages/Landing"));
const SignIn = lazy(() => import("../pages/SignIn"));
const ProblemsList = lazy(() => import("../pages/ProblemsList"));
const Workspace = lazy(() => import("../pages/Workspace"));
const Submissions = lazy(() => import("../pages/Submissions"));

export function AppRoutes() {
    return (
        <AuthProvider>
            <Suspense fallback={null}>
                <Routes>
                    <Route path="/" element={<Landing />} />
                    {/* the landing page holds what About used to say */}
                    <Route path="/about" element={<Navigate to="/#how" replace />} />
                    <Route path="/signin" element={<SignIn />} />
                    {/* the old address: /signup opens the sign-up form */}
                    <Route path="/signup" element={<Navigate to="/signin?mode=signup" replace />} />
                    <Route element={<AppShell />}>
                        <Route path="/problems" element={<ProblemsList />} />
                        <Route path="/problems/:slug" element={<Workspace />} />
                        <Route path="/submissions" element={<Submissions />} />
                        <Route path="*" element={<NotFound />} />
                    </Route>
                </Routes>
            </Suspense>
        </AuthProvider>
    );
}

export default function Router() {
    return (
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
    );
}
