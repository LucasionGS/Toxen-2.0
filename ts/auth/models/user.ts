import { rejects } from "assert";
import { Prompt, Toxen } from "../../toxenCore";
import Result from "./result";

export interface UserSQL {
  id: number,
  username: string,
  email: string,
  accessToken: string,
}

class User {
  constructor(
    public id: number,
    public username: string,
    public email: string,
    public accessToken: string,
  ) { }

  public static mapToUser(data: UserSQL) {
    return new User(
      data.id,
      data.username,
      data.email,
      data.accessToken,
    );
  }

  /**
   * Sets this user as the currently logged in user.
   */
  public setAsCurrentUser() {
    User.setCurrentUser(this);
  }

  /**
   * Sets the passed user as the currently logged in user.
   */
  public static setCurrentUser(user: User) {
    localStorage.setItem("user", JSON.stringify(user));
  }

  /**
   * Get or set the current user.
   */
  public static get currentUser(): User {
    return localStorage.getItem("user") != null ? User.mapToUser(JSON.parse(localStorage.getItem("user"))) : null;
  }
  public static set currentUser(user) {
    User.setCurrentUser(user);
  }

  
  public static login(): Promise<User> {
    var resolve: (value?: User | PromiseLike<User>) => void;
    var reject: (reason?: any) => void;
    let promise = new Promise<User>((res, rej) => {resolve = res; reject = rej;});
    setFeedback("Logging in...");
    let user = document.querySelector<HTMLInputElement>("#userInput").value;
    let pass = document.querySelector<HTMLInputElement>("#passwordInput").value;

    var formdata = new FormData();
    formdata.append("username", user);
    formdata.append("password", pass);

    var requestOptions = {
      method: 'POST',
      body: formdata
    };

    fetch("https://toxen.net/src/authorize.php", requestOptions)
    .then(response => response.json())
    .then((result: Result<UserSQL>) => {
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

  public static loginWithToken(token: string): Promise<Result<User>> {
    var resolve: (value?: Result<User> | PromiseLike<Result<User>>) => void;
    var reject: (reason?: any) => void;
    let promise = new Promise<Result<User>>((res, rej) => {resolve = res; reject = rej;});

    var formdata = new FormData();
    formdata.append("token", token);

    var requestOptions = {
      method: 'POST',
      body: formdata
    };

    fetch("https://toxen.net/src/authorize.php", requestOptions)
    .then(response => response.json())
    .then((result: Result<UserSQL | User>) => {
      if (result.success) {
        let user = User.mapToUser(result.data);
        user.setAsCurrentUser();
        result.data = user;
      }
      else {
      }
      resolve(result as Result<User>);
    })
    .catch(error => {
      resolve(null);
      setFeedback(error, "red");
      console.log('error', error);
    });

    return promise;
  }

  public static async loginPrompt(): Promise<User> {
    var resolve: (value?: User | PromiseLike<User>) => void;
    var reject: (reason?: any) => void;
    let promise = new Promise<User>((res, rej) => {resolve = res; reject = rej;});
    
    let feedback = document.createElement("p");
    feedback.style.textAlign = "center";
    feedback.id = "feedback";
    let p = new Prompt(
      "Log in",
      [
        feedback,
        (function() {
          let form = document.createElement("form");
          
          let h3u = document.createElement("h3");
          h3u.style.margin = "auto";
          h3u.style.textAlign = "center";
          h3u.innerText = "Username";
          let userInput = Toxen.generate.input({placeholder: "Username"});
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
          let passwordInput = Toxen.generate.input({placeholder: "Password"});
          passwordInput.style.margin = "auto";
          passwordInput.type = "password";
          passwordInput.name = "password";
          passwordInput.id = "passwordInput";
          passwordInput.required = true;
          passwordInput.style.textAlign = "center";
          let submit = Toxen.generate.button();
          submit.style.margin = "auto";
          submit.type = "submit";
          submit.innerText = "Log in";
          submit.addEventListener("click", async (e) => {
            e.preventDefault();
            let user = await User.login();
            if (user instanceof User) resolve(user);
          });

          [
            h3u,
            userInput,
            h3p,
            passwordInput,
            submit,
          ].forEach((v) => form.appendChild(v));

          return form;
        })()
      ]
    );

    let close = p.addButtons("Close", "fancybutton", true);
    close.addEventListener("click", () => {
      reject();
    });

    return promise;
  }
}

function setFeedback(message: string, color: string = "white") {
  var feedback = document.querySelector<HTMLParagraphElement>("#feedback");
  if (feedback == null || message == null) return;
  feedback.style.color = color;
  feedback.innerText = message;
}

export default User;