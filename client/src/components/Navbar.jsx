import React, { useState } from "react";
import Logo from "../assets/logo-white.png";
import { Link } from "react-router-dom";

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <nav className="flex w-full items-center justify-between bg-[#C56E33] py-4 px-4">
            <div className="flex items-center">
                <Link to="/"><img src={Logo} alt="" className="w-32 h-8" /></Link>
            </div>

            <ul className="hidden md:flex md:items-center">
                <li className="ml-4">
                    <Link
                        to="/problems"
                        className="text-white hover:text-[#ffd6af]"
                    >
                        Register
                    </Link>
                </li>
                <li className="ml-4">
                    <Link
                        to="/problems"
                        className="text-white hover:text-[#ffd6af]"
                    >
                        Login
                    </Link>
                </li>
            </ul>
            <div className="md:hidden flex flex-col p-2">
                <div className="">
                    <button
                        className="text-gray-800 focus:outline-none"
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
