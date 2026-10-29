import { Fragment, useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { Link } from "react-router";
import { get_all_questions } from "../controllers/QuestionRoutes";
import type { Question, Roast } from "../types";

const ROAST_LABEL: Record<Roast, string> = {
    light: "Light roast",
    medium: "Medium roast",
    dark: "Dark roast",
};
const ProblemList = () => {
    const [problem, setProblem] = useState<Question[]>([]);

    useEffect(() => {
        get_all_questions().then((data) => {
            setProblem(data);
        });
    }, []);

    return (
        <>
            <Navbar />
            <div className="flex flex-col items-center justify-center h-full bg-[#f9f9f9] py-10">
                <div className="flex flex-col mt-6">
                    <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                        <div className="py-2 align-middle inline-block">
                            <div className="shadow-sm overflow-hidden sm:rounded-lg">
                                <table className="min-w-full text-xl text-gold">
                                    <thead className="bg-[#e2e2e2] text-xl uppercase font-medium border-b-2 border-gray-500">
                                        <tr>
                                            <th></th>
                                            <th
                                                scope="col"
                                                className="px-6 py-3 text-left tracking-wider"
                                            >
                                                Problem Name
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-6 py-3 text-left tracking-wider"
                                            >
                                                Difficulty
                                            </th>
                                        </tr>
                                    </thead>
                                    {problem?.map((prob, index) => (
                                        <Fragment key={index}>
                                            <tbody
                                                className="bg-[#e2e2e2]"
                                            >
                                                <tr className="bg-gray">
                                                    <td className="pl-4">
                                                        {index + 1}
                                                    </td>
                                                    <td className="flex px-6 py-4 whitespace-nowrap">
                                                        <Link
                                                            to={`/problems/${prob.id}`}
                                                            className="ml-2 font-medium hover:underline"
                                                        >
                                                            {prob.name}
                                                        </Link>
                                                    </td>
                                                    <td
                                                        className={`px-6 py-4 whitespace-nowrap ${
                                                            prob.difficulty === "light"
                                                                ? "text-green-600"
                                                                : prob.difficulty === "medium"
                                                                  ? "text-yellow-600"
                                                                  : "text-red-600"
                                                        }`}
                                                    >
                                                        {ROAST_LABEL[prob.difficulty]}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </Fragment>
                                    ))}
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ProblemList;
