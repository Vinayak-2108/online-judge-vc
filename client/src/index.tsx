import "./styles/index.css";
import ReactDOM from 'react-dom/client';
import { followSystem } from "./lib/theme";
import Router from "./utils/router"
import { Toaster } from "@/components/ui/sonner";

followSystem();
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
    <>
    <Router />
    <Toaster />
    </>
);
