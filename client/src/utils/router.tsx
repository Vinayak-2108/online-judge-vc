import { BrowserRouter, Routes, Route } from "react-router";

import AppShell from "../components/AppShell";
import { AuthProvider } from "../lib/auth";
import Home from "../pages/Home";
import ProblemsList from "../pages/ProblemsList";
import Problem from "../pages/Problem";
import Submissions from "../pages/Submissions";
import About from "../pages/About";
import Signup from "../pages/Signup";

export function AppRoutes() {
    return (
        <AuthProvider>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/signup" element={<Signup />} />
                <Route element={<AppShell />}>
                    <Route path="/problems" element={<ProblemsList />} />
                    <Route path="/problems/:slug" element={<Problem />} />
                    <Route path="/submissions" element={<Submissions />} />
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
