const base = 'http://localhost:8000/api'

export const get_all_questions = async(obj) => {
    const res = await fetch(`${base}/questions/`, {
        method: 'GET',
        body: JSON.stringify(obj),
        headers: {
            "Content-Type" : "application/json",
        },
    });
    const ans = await res.json();
    return ans;
}
export const get_question = async(obj,id) => {
    const res = await fetch(`${base}/questions/${id}`, {
        method: 'POST',
        body: JSON.stringify(obj),
        headers: {
            "Content-Type" : "application/json",
        },
    });
    const ans = await res.json();
    return ans;
}

export const run_compiler = async(obj) => {
    const res = await fetch(`${base}/questions/run`, {
        method: 'POST',
        body: JSON.stringify(obj),
        headers: {
            "Content-Type" : "application/json",
        },
    });
    const ans = await res.json();
    return ans;
}

export const submit_compiler = async(obj) => {
    const res = await fetch(`${base}/questions/submit`, {
        method: 'POST',
        body: JSON.stringify(obj),
        headers: {
            "Content-Type" : "application/json",
        },
    });
    const ans = await res.json();
    return ans;
}