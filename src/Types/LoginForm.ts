export interface LoginForm {
    email: string;
    password: string;
}



export interface RegisterForm {
    name: string;
    last_name: string;
    username: string;
    display_name: string;
    email: string;
    password: string;
    birth_date: string;
    gender: "male" | "female" | "";
}