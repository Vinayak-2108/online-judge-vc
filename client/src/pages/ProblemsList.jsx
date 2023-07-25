import React, {useState, useEffect} from "react";
import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";
import { get_all_questions } from "../controllers/QuestionRoutes";
const ProblemList = () => {
    const [problem, setProblem] = useState([]);

    useEffect(() => {
        get_all_questions().then((data)=>{
            setProblem(data);
        })
    },[])
    
    return (
        <>
            <Navbar />
            <div class="flex flex-col items-center justify-center h-full bg-[#f9f9f9] py-10">
                <div class="flex flex-col mt-6">
                    <div class="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                        <div class="py-2 align-middle inline-block">
                            <div class="shadow overflow-hidden sm:rounded-lg">
                                <table class="min-w-full text-xl text-gold">
                                    <thead class="bg-[#e2e2e2] text-xl uppercase font-medium">
                                        <tr>
                                            <th></th>
                                            <th
                                                scope="col"
                                                class="px-6 py-3 text-left tracking-wider"
                                            >
                                                Problem Name
                                            </th>
                                            <th
                                                scope="col"
                                                class="px-6 py-3 text-left tracking-wider"
                                            >
                                                Difficulty
                                            </th>
                                        </tr>
                                    </thead>
                                    {problem?.map((prob, index) => (
                                        <>
                                            <tbody
                                                key={index}
                                                class="bg-[#e2e2e2]"
                                            >
                                                <tr class="bg-black bg-opacity-20">
                                                    <td class="pl-4">
                                                        {index + 1}
                                                    </td>
                                                    <td class="flex px-6 py-4 whitespace-nowrap">
                                                        <Link
                                                            to={`/problems/${prob.id}`}
                                                            class="ml-2 font-medium hover:underline"
                                                        >
                                                            {prob.name}
                                                        </Link>
                                                    </td>
                                                    <td class="px-6 py-4 whitespace-nowrap">
                                                        {prob.difficulty}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </>
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
