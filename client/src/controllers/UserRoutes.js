const base = 'http://localhost:8000/accounts';

export const register_user = async(obj) => {
    const res = await fetch(`${base}/signup`, {
        method: 'POST',
        body: JSON.stringify(obj),
        headers: {
            "Content-Type" : "application/json",
        },
    });
    const ans = await res.json();
    return ans;
}
export const login_user = async(obj) => {
    const res = await fetch(`${base}/login`, {
        method: 'POST',
        body: JSON.stringify(obj),
        headers: {
            "Content-Type" : "application/json",
        },
    });
    const ans = await res.json();
    return ans;
}
export const auth_user = async(obj) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${base}/test_token`, {
        method: 'POST',
        headers: {
            "Authorization": `Token ${token}`,
            "Content-Type" : "application/json",
        },
        body: JSON.stringify(obj),
    });
    const ans = await res.json();
    return ans;
}