import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { Link, useParams } from "react-router-dom";
import {
    get_all_questions,
    run_compiler,
    submit_compiler,
} from "../controllers/QuestionRoutes";
import ResultModal from "../components/ResultModal";
import { motion } from "framer-motion";
import { auth_user } from "../controllers/UserRoutes";
import CodeMirror from "@uiw/react-codemirror";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { python } from "@codemirror/lang-python";

const Problem = () => {
    const [problem, setProblem] = useState([]);
    const [codeLang, setCodeLang] = useState("cpp");
    var [code, setCode] = useState("");
    const [outputCode, setOutputCode] = useState("");
    const [userInput, setUserInput] = useState("");
    const [stateVerdict, setStateVerdict] = useState(false);
    const [outputVerdict, setOutputVerdict] = useState(false);
    const [openModal, setOpenModal] = useState(false);

    const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
    const [userName, setUserName] = useState("");

    const { id } = useParams();
    var valext = [cpp()];
    const probIndex = parseInt(id);

    useEffect(() => {
        if (localStorage.getItem("token")) {
            console.log("token exists");
            let obj = {
                token: localStorage.getItem("token"),
            };
            auth_user(obj).then((data) => {
                if (data.tag) {
                    console.log("HI");
                    setIsUserLoggedIn(true);
                    let user_obj = {
                        username: data.username,
                    };
                    setUserName(user_obj.username);
                    console.log(user_obj.username);
                } else {
                    setIsUserLoggedIn(false);
                }
            });
        }

        get_all_questions().then((data) => {
            // console.log(data);
            setProblem(data);
        });
        setStateVerdict(false);
        setOutputCode(false);
    }, []);

    const handleRun = () => {
        const payload = {
            lang: codeLang,
            code,
            input_data: userInput,
            problem_id: probIndex,
        };
        // console.log(payload);

        try {
            run_compiler(payload).then((data) => {
                console.log(data);
                setOutputCode(data.output);
            });
        } catch (error) {
            console.log(error);
        }
    };
    const handleSubmit = () => {
        const payload = {
            lang: codeLang,
            code,
            problem_id: probIndex,
            username: userName,
        };
        // console.log(payload);
        try {
            submit_compiler(payload).then((data) => {
                // console.log(data);
                console.log(data);
                console.log(data.verdict);
                setStateVerdict(true);
                setOutputVerdict(data.verdict);
                setOpenModal(true);
                scrollToTop();
            });
        } catch (error) {
            console.log(error);
        }
    };

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth", // Optionally, you can add smooth scrolling animation
        });
    };
    return (
        <>
            <Navbar />
            {isUserLoggedIn ? (
                <>
                    {problem
                        .filter((prob) => prob.id === probIndex)
                        .map((temp) => (
                            <>
                                <div className="grid grid-rows-2  md:grid-cols-2">
                                    <div className="bg-[#e2e2e2] rounded m-3 p-2">
                                        <h1 className="text-3xl m-3 uppercase font-semibold text-[#C56E33]">
                                            Problem:{" "}
                                            <span className="text-[#E6B17E] capitalize">
                                                {temp.name}
                                            </span>
                                        </h1>
                                        <br />
                                        <h3 className="text-2xl m-3 uppercase font-semibold text-[#C56E33]">
                                            Description: <br />
                                            <span className="text-[#E6B17E] normal-case font-medium">
                                                {temp.description}
                                            </span>
                                        </h3>
                                        <br></br>
                                        <h3 className="text-2xl m-3 uppercase font-semibold text-[#C56E33]">
                                            Difficulty:{" "}
                                            <span className="text-[#E6B17E] normal-case font-medium">
                                                {temp.difficulty}
                                            </span>
                                        </h3>
                                    </div>
                                    <div>
                                        <div className="flex flex-row">
                                            <select
                                                className="text-xl w-[40%] p-2 bg-[#e2e2e2] outline-none rounded-lg m-3"
                                                value={codeLang}
                                                onChange={(e) => {
                                                    setCodeLang(e.target.value);
                                                }}
                                            >
                                                <option value="cpp">C++</option>
                                                <option value="py">
                                                    Python
                                                </option>
                                            </select>
                                        </div>
                                        <CodeMirror
                                            value={code}
                                            options={{
                                                theme: "monokai",
                                                keyMap: "sublime",
                                                mode: "jsx",
                                            }}
                                            className="m-3 text-lg rounded-lg"
                                            onChange={(value) => setCode(value)}
                                            theme="dark"
                                            height="400px"
                                            extensions={valext}
                                        />
                                        <h1 className="text-3xl m-3 uppercase font-semibold">
                                            Input:
                                        </h1>
                                        <div>
                                            <textarea
                                                value={userInput}
                                                className="bg-[#e2e2e2] m-3 p-2 outline-none text-xl rounded-lg"
                                                onChange={(e) =>
                                                    setUserInput(e.target.value)
                                                }
                                                rows={4}
                                                cols={50}
                                                placeholder="Type your input here..."
                                            />
                                        </div>
                                        <div>
                                            <motion.button
                                                onClick={() => {
                                                    handleRun();
                                                }}
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                disabled={code === ""}
                                                className={`m-3 p-2 bg-[#e2e2e2] rounded-lg font-semibold  ${
                                                    code === ""
                                                        ? "bg-gray-200 text-gray-500"
                                                        : "hover:bg-[#E6B17E] bg-[#e2e2e2] hover:text-white"
                                                }  text-xl`}
                                            >
                                                Run
                                            </motion.button>
                                            <motion.button
                                                onClick={() => {
                                                    handleSubmit();
                                                }}
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                disabled={code === ""}
                                                className={`m-3 p-2 bg-[#e2e2e2] rounded-lg font-semibold  ${
                                                    code === ""
                                                        ? "bg-gray-200 text-gray-500"
                                                        : "hover:bg-[#E6B17E] bg-[#e2e2e2] hover:text-white"
                                                }  text-xl`}
                                            >
                                                Submit
                                            </motion.button>
                                        </div>
                                    </div>
                                    {outputCode && (
                                        <>
                                            <h1 className="text-3xl m-3 uppercase font-semibold">
                                                Output:
                                                <h3 className="text-xl font-monocode">
                                                    {outputCode}
                                                </h3>
                                            </h1>
                                        </>
                                    )}
                                    <ResultModal
                                        open={openModal}
                                        onClose={() => {
                                            setOpenModal(false);
                                        }}
                                        result={outputVerdict}
                                    />
                                </div>
                            </>
                        ))}
                </>
            ) : (
                <div className="m-3 p-5 text-center">
                    <h1 className="text-[5rem] font-bold text-[#C56E33]">Login to continue</h1>
                    <motion.button className={`m-3 p-2 bg-[#C56E33] hover:bg-[#fa840c] rounded-lg font-semibold text-xl`}>
                        <Link
                            to="/signup"
                            className="text-white"
                        >
                            Login
                        </Link>
                    </motion.button>
                </div>
            )}
        </>
    );
};

export default Problem;
