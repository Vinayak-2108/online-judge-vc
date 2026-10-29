import { useState, useEffect } from "react";
import Logo from "../assets/logo-white.png";
import { Link } from "react-router";
import { auth_user, logout_user } from "../controllers/UserRoutes";
import ThemeToggle from "./ThemeToggle";

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [userName, setUserName] = useState("");
    const [logout, setLogout] = useState(false);
    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    useEffect(() => {
        if(localStorage.getItem("token")){
            auth_user().then((data) => {
                if(data.tag){
                    setUserName(data.username ?? "");
                } else {
                    // token revoked or expired
                    localStorage.removeItem("token");
                }
            });
        }
    }, [logout]);
    return (
        <nav className="flex w-full items-center justify-between bg-[#fa840c] py-4 px-4">
            <div className="flex items-center">
                <Link to="/">
                    <img src={Logo} alt="" className="w-32 h-8" />
                </Link>
            </div>

            <ul className="hidden md:flex md:items-center">
                {localStorage.getItem("token") ? (
                    <>
                        <li className="ml-4 text-white">
                            {userName}
                        </li>
                        <li className="ml-4">
                            <Link
                                to="/problems"
                                className="text-white hover:text-[#ffd6af]"
                                
                            >
                                Problems
                            </Link>
                        </li>
                        <li className="ml-4">
                            <Link
                                to="/submissions"
                                className="text-white hover:text-[#ffd6af]"
                                
                            >
                                Submissions
                            </Link>
                        </li>
                        <li className="ml-4">
                            <Link
                                to="/signup"
                                className="text-white hover:text-[#ffd6af]"
                                onClick={async () => {
                                    setLogout(true);
                                    await logout_user();
                                    window.location.reload();
                                }}
                            >
                                Logout
                            </Link>
                        </li>
                    </>
                ) : (
                    <>
                        <li className="ml-4">
                            <Link
                                to="/signup"
                                className="text-white hover:text-[#ffd6af]"
                            >
                                Login/Register
                            </Link>
                        </li>
                    </>
                )}
                <li className="ml-4 text-white">
                    <ThemeToggle />
                </li>
            </ul>
            <div className="md:hidden flex flex-col p-2">
                <div className="">
                    <button
                        className="text-gray-800 focus:outline-hidden"
                        onClick={toggleMenu}
                    >
                        <svg
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 6h16M4 12h16M4 18h16"
                            />
                        </svg>
                    </button>
                </div>

                {isMenuOpen && (
                    <ul className="md:hidden">
                        <li className="my-2 text-gray-800">
                            <ThemeToggle />
                        </li>
                        <li className="my-2">
                            <a
                                href="#"
                                className="text-gray-800 hover:text-gray-600"
                            >
                                Register
                            </a>
                        </li>
                        <li className="my-2">
                            <a
                                href="#"
                                className="text-gray-800 hover:text-gray-600"
                            >
                                Login
                            </a>
                        </li>
                    </ul>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
