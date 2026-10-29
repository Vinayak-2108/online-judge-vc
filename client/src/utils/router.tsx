import { BrowserRouter, Routes, Route } from "react-router";

import Home from "../pages/Home";
import ProblemsList from "../pages/ProblemsList";
import Problem from "../pages/Problem";
import Submissions from "../pages/Submissions";
import About from "../pages/About";
import Signup from "../pages/Signup";

export function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/problems" element={<ProblemsList />} />
            <Route path="/submissions" element={<Submissions />} />
            <Route path="/problems/:id" element={<Problem />} />
            <Route path="/about" element={<About />} />
            <Route path="/signup" element={<Signup />} />
        </Routes>
    );
}

export default function Router() {
    return (
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
    );
}
