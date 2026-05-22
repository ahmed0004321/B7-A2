export interface Iuser{
    id: string;
    name: string;
    email: string;
    password: string;
    is_active?: boolean;
    role?: "contributor" | "maintainer"
}