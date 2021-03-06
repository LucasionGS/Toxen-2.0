import Result from "./result";
export interface UserSQL {
    id: number;
    username: string;
    email: string;
    accessToken: string;
}
declare class User {
    id: number;
    username: string;
    email: string;
    accessToken: string;
    constructor(id: number, username: string, email: string, accessToken: string);
    static mapToUser(data: UserSQL): User;
    /**
     * Sets this user as the currently logged in user.
     */
    setAsCurrentUser(): void;
    /**
     * Sets the passed user as the currently logged in user.
     */
    static setCurrentUser(user: User): void;
    /**
     * Get or set the current user.
     */
    static get currentUser(): User;
    static set currentUser(user: User);
    static login(): Promise<User>;
    static loginWithToken(token: string): Promise<Result<User>>;
    static loginPrompt(): Promise<User>;
}
export default User;
