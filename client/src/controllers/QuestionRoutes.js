const base = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api`

const authHeaders = () => ({
    "Content-Type" : "application/json",
    "Authorization": `Token ${localStorage.getItem('token')}`,
});

export const get_all_questions = async() => {
    const res = await fetch(`${base}/questions/`);
    const ans = await res.json();
    return ans;
}
export const get_question = async(id) => {
    const res = await fetch(`${base}/questions/${id}/`);
    const ans = await res.json();
    return ans;
}

export const run_compiler = async(obj) => {
    const res = await fetch(`${base}/questions/run`, {
        method: 'POST',
        body: JSON.stringify(obj),
        headers: authHeaders(),
    });
    const ans = await res.json();
    return ans;
}

export const submit_compiler = async(obj) => {
    const res = await fetch(`${base}/questions/submit`, {
        method: 'POST',
        body: JSON.stringify(obj),
        headers: authHeaders(),
    });
    const ans = await res.json();
    return ans;
}
