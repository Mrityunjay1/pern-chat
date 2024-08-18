import { useContext, useState } from "react";
import axios from "axios";
import { UserContext } from "./UserContext";

const Register = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginOrRegister, setIsLoginOrRegister] = useState("register");
  const { setUsername: setLoggedInUsername, setId } = useContext(UserContext);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic Validation
    if (!username || !password) {
      alert("Username and password are required.");
      return;
    }

    if (username.length < 3) {
      alert("Username must be at least 3 characters long.");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters long.");
      return;
    }

    try {
      const url = isLoginOrRegister === "register" ? "/register" : "/login";
      const { data } = await axios.post(url, { username, password });

      setLoggedInUsername(username);
      setId(data.id);
    } catch (error) {
      if (error.response) {
        alert(`Error: ${error.response.data.message || "An error occurred"}`);
      } else if (error.request) {
        alert("Network error. Please try again.");
      } else {
        // Something happened in setting up the request
        alert("Error: " + error.message);
      }
    }
  };

  return (
    <div className="bg-blue-50 h-screen flex items-center">
      <form onSubmit={handleSubmit} className="w-64 mx-auto mb-12">
        <input
          type="text"
          placeholder="Username"
          className="block w-full rounded-lg p-2 mb-2 border "
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="password"
          className="block w-full rounded-lg p-2 mb-2 border"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="bg-red-500 text-white block w-full rounded-lg p-2">
          {isLoginOrRegister === "register" ? "Register" : "Login"}
        </button>
        <div className="text-center mt-2">
          {isLoginOrRegister === "register" && (
            <div>
              Already a User?
              <button onClick={() => setIsLoginOrRegister("login")}>
                Login
              </button>
            </div>
          )}
          {isLoginOrRegister === "login" && (
            <div>
              Do not have a account?
              <button onClick={() => setIsLoginOrRegister("register")}>
                Register
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
export default Register;
