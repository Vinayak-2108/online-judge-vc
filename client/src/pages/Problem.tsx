import { Fragment, useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
    get_all_questions,
    run_compiler,
    submit_compiler,
} from "../controllers/QuestionRoutes";
import type { Question } from "../types";
import ResultModal from "../components/ResultModal";
import { motion } from "motion/react";
import { auth_user } from "../controllers/UserRoutes";
import CodeMirror from "@uiw/react-codemirror";
import { cpp } from "@codemirror/lang-cpp";
import { python } from "@codemirror/lang-python";
import { useEditorTheme } from "../lib/editorTheme";

const Problem = () => {
    const [problem, setProblem] = useState<Question[]>([]);
    const [codeLang, setCodeLang] = useState("cpp");
    const [code, setCode] = useState("");
    const [outputCode, setOutputCode] = useState("");
    const [userInput, setUserInput] = useState("");
    const [outputVerdict, setOutputVerdict] = useState<string | boolean>(false);
    const [openModal, setOpenModal] = useState(false);

    const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
    const [userName, setUserName] = useState("");

    const { slug } = useParams();
    const navigate = useNavigate();
    const editorTheme = useEditorTheme();
    const valext = [codeLang === "py" ? python() : cpp()];
    // /problems/:slug, with the old numeric /problems/:id still resolving.
    const current = problem.find((p) => p.slug === slug) ?? problem.find((p) => String(p.id) === slug);
    const probIndex = current?.id ?? NaN;

    useEffect(() => {
        if (current && current.slug !== slug) navigate(`/problems/${current.slug}`, { replace: true });
    }, [current, slug, navigate]);

    useEffect(() => {
        if (localStorage.getItem("token")) {
            console.log("token exists");
            auth_user().then((data) => {
                if (data.tag) {
                    console.log("HI");
                    setIsUserLoggedIn(true);
                    const user_obj = {
                        username: data.username,
                    };
                    setUserName(user_obj.username ?? "");
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
                setOutputCode(data.error || data.output || "(no output)");
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
                setOutputVerdict(data.verdict || data.error);
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
            {isUserLoggedIn ? (
                <>
                    {problem
                        .filter((prob) => prob.id === current?.id)
                        .map((temp) => (
                            <Fragment key={temp.id}>
                                <div className="grid grid-rows-2  md:grid-cols-2">
                                    <div className="bg-raised rounded-sm m-3 p-2">
                                        <h1 className="text-3xl m-3 uppercase font-semibold text-brand">
                                            Problem:{" "}
                                            <span className="text-foreground capitalize">
                                                {temp.name}
                                            </span>
                                        </h1>
                                        <br />
                                        <h3 className="text-2xl m-3 uppercase font-semibold text-brand">
                                            Description: <br />
                                            <span className="text-foreground normal-case font-medium">
                                                {temp.description}
                                            </span>
                                        </h3>
                                        <br></br>
                                        <h3 className="text-2xl m-3 uppercase font-semibold text-brand">
                                            Difficulty:{" "}
                                            <span className="text-foreground normal-case font-medium">
                                                {temp.difficulty} roast
                                            </span>
                                        </h3>
                                    </div>
                                    <div>
                                        <div className="flex flex-row">
                                            <select
                                                className="text-xl w-[40%] p-2 bg-raised outline-hidden rounded-lg m-3"
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
                                            className="m-3 text-lg rounded-lg"
                                            onChange={(value) => setCode(value)}
                                            theme={editorTheme}
                                            height="400px"
                                            extensions={valext}
                                        />
                                        <h1 className="text-3xl m-3 uppercase font-semibold">
                                            Input:
                                        </h1>
                                        <div>
                                            <textarea
                                                value={userInput}
                                                className="bg-raised m-3 p-2 outline-hidden text-xl rounded-lg"
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
                                                className={`m-3 p-2 bg-raised rounded-lg font-semibold  ${
                                                    code === ""
                                                        ? "bg-raised text-muted-foreground"
                                                        : "hover:bg-raised bg-raised hover:text-foreground"
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
                                                className={`m-3 p-2 bg-raised rounded-lg font-semibold  ${
                                                    code === ""
                                                        ? "bg-raised text-muted-foreground"
                                                        : "hover:bg-raised bg-raised hover:text-foreground"
                                                }  text-xl`}
                                            >
                                                Submit
                                            </motion.button>
                                        </div>
                                    </div>
                                    {outputCode && (
                                        <>
                                            <div className="text-3xl m-3 uppercase font-semibold">
                                                Output:
                                                <h3 className="text-xl font-monocode">
                                                    {outputCode}
                                                </h3>
                                            </div>
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
                            </Fragment>
                        ))}
                </>
            ) : (
                <div className="m-3 p-5 text-center">
                    <h1 className="text-[5rem] font-bold text-brand">Login to continue</h1>
                    <motion.button className={`m-3 p-2 bg-primary hover:bg-brand-fill rounded-lg font-semibold text-xl`}>
                        <Link
                            to="/signup"
                            className="text-primary-foreground"
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
