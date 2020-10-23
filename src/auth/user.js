"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
    login() {
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
        fetch("/src/authorize.php", requestOptions)
            .then(response => response.json())
            .then((result) => {
            if (result.success) {
                console.log(result);
                let user = User.mapToUser(result.data);
                setFeedback(result.reason, "green", "notice");
                user.setAsCurrentUser();
                let params = new URLSearchParams(location.search);
                if (params.has("ref"))
                    location.href = params.get("ref");
                else
                    location.href = "/account/" + user.username;
            }
            else {
                setFeedback(result.reason, "red", "error");
            }
        })
            .catch(error => {
            console.log('error', error);
        });
    }
}
exports.default = User;
