const axios = require("axios").default;
const readline = require("readline");
const fs = require("fs");
const { exit } = require("process");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let userName = "";
let password = "";
const logFilePath = "attendance-log.txt";
const configFilePath = "config.json";
const url = "https://[REPLACE_ME].minthrm.com";

const config = loadConfig();
if (config) {
  rl.question(
    "Configuration found. Do you want to load it? (yes/no) ",
    (answer) => {
      if (answer.toLowerCase() === "yes") {
        userName = config.userName;
        password = config.password;
        console.log("Configuration loaded.");
        askTime();
      } else {
        askCredentials();
      }
    }
  );
} else {
  askCredentials();
}

function loadConfig() {
  if (fs.existsSync(configFilePath)) {
    return JSON.parse(fs.readFileSync(configFilePath, "utf-8"));
  }
  return null;
}

function saveConfig(config) {
  fs.writeFileSync(configFilePath, JSON.stringify(config));
}

function askCredentials() {
  rl.question("Please enter your username: ", (user) => {
    userName = user;
    rl.question("Please enter your password: ", async (pass) => {
      password = pass;
      const cookies = await login();
      if (!cookies) {
        console.log("Login failed. Exiting...");
        exit(0);
      }
      rl.question(
        "Do you want to save these credentials? (yes/no) ",
        (answer) => {
          if (answer.toLowerCase() === "yes") {
            saveConfig({ userName, password });
            console.log("Credentials saved.");
          }
          askTime();
        }
      );
    });
  });
}

function askTime() {
  rl.question(
    "What time would you like to run the app? (e.g., 8:00 AM) ",
    async (answer) => {
      let [hour, rest] = answer.split(":");
      let [minute, ampm] = rest.split(" ");
      hour = parseInt(hour);
      minute = parseInt(minute);

      if (ampm.toLowerCase() === "pm" && hour < 12) hour += 12;
      if (ampm.toLowerCase() === "am" && hour === 12) hour = 0;

      let targetHour = hour;
      let targetMinute = minute;

      const now = new Date();
      const targetTime = new Date(now);
      targetTime.setHours(targetHour);
      targetTime.setMinutes(targetMinute);
      targetTime.setSeconds(0);

      const dayOfWeek = now.getDay();

      if (
        (dayOfWeek === 5 && now > targetTime) ||
        dayOfWeek === 6 ||
        dayOfWeek === 0
      ) {
        let addHours = dayOfWeek === 5 ? 72 : dayOfWeek === 6 ? 48 : 24;
        targetTime.setHours(targetTime.getHours() + addHours);
      }

      let delay = targetTime - now;

      console.log(`Scheduled to run at ${targetTime}`);

      setTimeout(async () => {
        if (isAttendanceMarked()) {
          console.log("Attendance already marked for today. Skipping...");
          return;
        }
        const cookies = await login();
        if (!cookies) {
          console.log("Login failed. Exiting...");
          exit(0);
        }
        axios({
          method: "get",
          url: `${url}/site/MarkAttendance`,
          headers: {
            accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "accept-language": "en-US,en;q=0.9",
            "cache-control": "no-cache",
            pragma: "no-cache",
            "sec-ch-ua":
              '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "none",
            "sec-fetch-user": "?1",
            "upgrade-insecure-requests": "1",
            cookie: cookies,
          },
        })
          .then((response) => {
            if (
              response.data.code === "200" &&
              response.data.msg === "Attendance marked successfully."
            ) {
              console.log("HTTP request successful. Attendance marked.");
              markAttendanceInLog();
            } else {
              console.error("Attendance marking failed:", response.data.msg);
            }
          })
          .catch((error) => {
            console.log("HTTP request failed.");
            console.error(error);
          });
      }, delay);
    }
  );
}

async function login() {
  try {
    const data = `User%5Buser_name%5D=${encodeURIComponent(
      userName
    )}&User%5Buser_password%5D=${encodeURIComponent(password)}`;
    const response = await axios.post(`${url}/Site/DoLogin`, data, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
      },
    });

    if (
      response.data.code === "200" &&
      response.data.msg === "Login successful."
    ) {
      const cookiesArray = response.headers["set-cookie"];
      const cookiesObj = {};
      cookiesArray.forEach((cookie) => {
        const [nameValue] = cookie.split(";");
        const [name, value] = nameValue.split("=");
        cookiesObj[name] = value;
      });

      let cookies = "";
      for (const [name, value] of Object.entries(cookiesObj)) {
        cookies += `${name}=${value}; `;
      }

      return cookies;
    } else {
      console.error("Login failed:", response.data.msg);
      return null;
    }
  } catch (error) {
    console.error("Login failed:", error);
    return null;
  }
}

function isAttendanceMarked() {
  if (fs.existsSync(logFilePath)) {
    const logData = fs.readFileSync(logFilePath, "utf-8");
    const lines = logData.split("\n");
    const lastLog = lines[lines.length - 1];
    const [loggedDate] = lastLog.split(" ");

    const now = new Date();
    const today = now.toISOString().split("T")[0];

    return loggedDate === today;
  }
  return false;
}

function markAttendanceInLog() {
  const now = new Date();
  const logEntry = `${now.toISOString().split("T")[0]} ${now.toTimeString()}\n`;
  fs.appendFileSync(logFilePath, logEntry);
}
