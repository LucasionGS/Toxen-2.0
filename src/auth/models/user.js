"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const toxenCore_1 = require("../../toxenCore");
class User {
    constructor(id, username, email, accessToken) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.accessToken = accessToken;
    }
    static mapToUser(data) {
        return new User(data.id, data.username, data.email, data.accessToken);
    }
    /**
     * Sets this user as the currently logged in user.
     */
    setAsCurrentUser() {
        User.setCurrentUser(this);
    }
    /**
     * Sets the passed user as the currently logged in user.
     */
    static setCurrentUser(user) {
        localStorage.setItem("user", JSON.stringify(user));
    }
    /**
     * Get or set the current user.
     */
    static get currentUser() {
        return localStorage.getItem("user") != null ? User.mapToUser(JSON.parse(localStorage.getItem("user"))) : null;
    }
    static set currentUser(user) {
        User.setCurrentUser(user);
    }
    static login() {
        var resolve;
        var reject;
        let promise = new Promise((res, rej) => { resolve = res; reject = rej; });
        setFeedback("Logging in...");
        let user = document.querySelector("#userInput").value;
        let pass = document.querySelector("#passwordInput").value;
        var formdata = new FormData();
        formdata.append("username", user);
        formdata.append("password", pass);
        var requestOptions = {
            method: 'POST',
            body: formdata
        };
        fetch("https://toxen.net/src/authorize.php", requestOptions)
            .then(response => response.json())
            .then((result) => {
            if (result.success) {
                console.log(result);
                let user = User.mapToUser(result.data);
                resolve(user);
                setFeedback(result.reason, "green");
                user.setAsCurrentUser();
            }
            else {
                resolve(null);
                setFeedback(result.reason, "red");
            }
        })
            .catch(error => {
            resolve(null);
            setFeedback(error, "red");
            console.log('error', error);
        });
        return promise;
    }
    static loginWithToken(token) {
        var resolve;
        var reject;
        let promise = new Promise((res, rej) => { resolve = res; reject = rej; });
        var formdata = new FormData();
        formdata.append("token", token);
        var requestOptions = {
            method: 'POST',
            body: formdata
        };
        fetch("https://toxen.net/src/authorize.php", requestOptions)
            .then(response => response.json())
            .then((result) => {
            if (result.success) {
                let user = User.mapToUser(result.data);
                user.setAsCurrentUser();
                result.data = user;
            }
            else {
            }
            resolve(result);
        })
            .catch(error => {
            resolve(null);
            setFeedback(error, "red");
            console.log('error', error);
        });
        return promise;
    }
    static loginPrompt() {
        return __awaiter(this, void 0, void 0, function* () {
            var resolve;
            var reject;
            let promise = new Promise((res, rej) => { resolve = res; reject = rej; });
            let feedback = document.createElement("p");
            feedback.style.textAlign = "center";
            feedback.id = "feedback";
            let p = new toxenCore_1.Prompt("Log in", [
                feedback,
                (function () {
                    let form = document.createElement("form");
                    let h3u = document.createElement("h3");
                    h3u.style.margin = "auto";
                    h3u.style.textAlign = "center";
                    h3u.innerText = "Username";
                    let userInput = toxenCore_1.Toxen.generate.input({ placeholder: "Username" });
                    userInput.style.margin = "auto";
                    userInput.type = "text";
                    userInput.name = "username";
                    userInput.id = "userInput";
                    userInput.required = true;
                    userInput.style.textAlign = "center";
                    let h3p = document.createElement("h3");
                    h3p.style.margin = "auto";
                    h3p.style.textAlign = "center";
                    h3p.innerText = "Password";
                    let passwordInput = toxenCore_1.Toxen.generate.input({ placeholder: "Password" });
                    passwordInput.style.margin = "auto";
                    passwordInput.type = "password";
                    passwordInput.name = "password";
                    passwordInput.id = "passwordInput";
                    passwordInput.required = true;
                    passwordInput.style.textAlign = "center";
                    let submit = toxenCore_1.Toxen.generate.button();
                    submit.style.margin = "auto";
                    submit.type = "submit";
                    submit.innerText = "Log in";
                    submit.addEventListener("click", (e) => __awaiter(this, void 0, void 0, function* () {
                        e.preventDefault();
                        let user = yield User.login();
                        if (user instanceof User)
                            resolve(user);
                    }));
                    [
                        h3u,
                        userInput,
                        h3p,
                        passwordInput,
                        submit,
                    ].forEach((v) => form.appendChild(v));
                    return form;
                })()
            ]);
            let close = p.addButtons("Close", "fancybutton", true);
            close.addEventListener("click", () => {
                reject();
            });
            return promise;
        });
    }
}
function setFeedback(message, color = "white") {
    var feedback = document.querySelector("#feedback");
    if (feedback == null || message == null)
        return;
    feedback.style.color = color;
    feedback.innerText = message;
}
exports.default = User;
