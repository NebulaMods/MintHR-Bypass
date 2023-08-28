const readline = require("readline");
const axios = require("axios").default;

const { loginUrl } = require("./vars");

const rl = setupReadline();

function setupReadline() {
  const readlineInterface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  readlineInterface.on("SIGINT", () => {
    readlineInterface.close();
    process.exit(0);
  });

  return readlineInterface;
}

async function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function login(username, password) {
  const data = formatLoginData(username, password);

  try {
    const response = await axios.post(
      `${loginUrl}/DoLogin`,
      data,
      getLoginHeaders()
    );

    if (isLoginSuccessful(response)) {
      return extractCookies(response.headers["set-cookie"]);
    } else {
      throw new Error(response.data.msg);
    }
  } catch (error) {
    throw error;
  }
}

function formatLoginData(username, password) {
  return `User%5Buser_name%5D=${encodeURIComponent(
    username
  )}&User%5Buser_password%5D=${encodeURIComponent(password)}`;
}

function getLoginHeaders() {
  return {
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "X-Requested-With": "XMLHttpRequest",
  };
}

function isLoginSuccessful(response) {
  return (
    response.data.code === "200" && response.data.msg === "Login successful."
  );
}

function extractCookies(cookiesArray) {
  const cookiesObj = {};

  cookiesArray.forEach((cookie) => {
    const [nameValue] = cookie.split(";");
    const [name, value] = nameValue.split("=");
    cookiesObj[name] = value;
  });

  return Object.entries(cookiesObj)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

module.exports = {
  question,
  login,
};
