import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { Link, useParams } from "react-router-dom";
import { get_all_questions } from "../controllers/QuestionRoutes";
import CodeMirror from "@uiw/react-codemirror";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { python } from "@codemirror/lang-python";

const Problem = () => {
    const [problem, setProblem] = useState([]);
    const [codeLang, setCodeLang] = useState("");
    var [code, setCode] = useState("");
    const [outputCode, setOutputCode] = useState("");
    const [userInput, setUserInput] = useState("");

    const { id } = useParams();
    var valext = [cpp()];
    const probIndex = parseInt(id);
    console.log(probIndex);
    useEffect(() => {
        // const obj = { id: id };
        // console.log(obj);
        get_all_questions().then((data) => {
            console.log(data);
            setProblem(data);
        });
    }, [id]);

    const handleSubmit = () => {
        
    }

    return (
        <>
            <Navbar />

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
                                        <option value="python">Python</option>
                                        {/* <option value="java">Java</option> */}
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
                                    <button
                                        onClick={() => {
                                            handleSubmit();
                                        }}
                                        className="m-3 p-2 bg-[#e2e2e2] rounded-lg font-semibold hover:bg-[#e4e4e4] text-xl"
                                    >
                                        Submit
                                    </button>
                                </div>
                            </div>
                        </div>
                        ;
                    </>
                ))}
        </>
    );
};

export default Problem;
