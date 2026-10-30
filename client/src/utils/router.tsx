import { BrowserRouter, Navigate, Routes, Route } from "react-router";

import AppShell from "../components/AppShell";
import NotFound from "../components/NotFound";
import { AuthProvider } from "../lib/auth";
import Home from "../pages/Home";
import ProblemsList from "../pages/ProblemsList";
import Workspace from "../pages/Workspace";
import Submissions from "../pages/Submissions";
import About from "../pages/About";
import SignIn from "../pages/SignIn";

export function AppRoutes() {
    return (
        <AuthProvider>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/signin" element={<SignIn />} />
                {/* the old address: /signup opens the sign-up form, anything else about it is the same page */}
                <Route path="/signup" element={<Navigate to="/signin?mode=signup" replace />} />
                <Route element={<AppShell />}>
                    <Route path="/problems" element={<ProblemsList />} />
                    <Route path="/problems/:slug" element={<Workspace />} />
                    <Route path="/submissions" element={<Submissions />} />
                    <Route path="*" element={<NotFound />} />
                </Route>
            </Routes>
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
