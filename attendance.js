const axios = require("axios").default;
const fs = require("fs");

const { login } = require("./utils");
const { url, logFilePath } = require("./vars");
const { exit } = require("process");

module.exports = function ({ configService, loggerService }) {
  async function tryMarkAttendance(timeStr, cookies) {
    const targetTimeMessage = `The next time this app will run is on ${getNextTargetTime(
      timeStr
    )}`;

    try {
      const response = await axios({
        method: "get",
        url: `${url}/SiteMain/MarkAttendance`,
        headers: getHeaders(cookies),
      });

      if (response.data.code === "200") {
        loggerService.log(response.data.msg, false);
        markAttendanceInLog();
        loggerService.log(
          `Your attendance was marked successfully. ${targetTimeMessage}`,
          true,
          "Attendance Marked Successfully"
        );
      } else {
        throw new Error(response.data.msg);
      }
    } catch (error) {
      loggerService.handleError(
        new Error(
          `Attendance marking failed. ${targetTimeMessage}\n${error.message}`
        ),
        true,
        "Attendance Marking Failed"
      );
    }
  }

  function getHeaders(cookies) {
    return {
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
    };
  }

  function markAttendanceAtPreferredTime(timeStr) {
    const delay = getDelayForTargetTime(timeStr);
    setTimeout(async () => {
      if (isAttendanceMarked()) {
        reschedule(timeStr);
        return;
      }

      const config = configService.getConfig();
      const cookies = await login(config.userName, config.password);
      if (!cookies) {
        loggerService.handleError(
          new Error(
            `Login failed. Please check your credentials. ${reschedule(
              timeStr
            )}`
          ),
          true,
          "Login Failed"
        );
      } else {
        await tryMarkAttendance(timeStr, cookies);
      }

      markAttendanceAtPreferredTime(timeStr);
    }, delay);
  }

  function reschedule(timeStr) {
    const targetTime = getNextTargetTime(timeStr);
    return `Attendance already marked, skipping for today. The next time this app will run is on ${targetTime}`;
  }

  function getDelayForTargetTime(timeStr) {
    const now = new Date();
    const targetTime = getNextTargetTime(timeStr);
    return targetTime - now;
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
    const logEntry = `${
      now.toISOString().split("T")[0]
    } ${now.toTimeString()}\n`;
    fs.appendFileSync(logFilePath, logEntry);
  }

  function getNextTargetTime(timeStr) {
    if (
      typeof timeStr !== "string" ||
      !/^(\d{1,2}:\d{2} (AM|PM))$/i.test(timeStr)
    ) {
      console.error("Received invalid timeStr:", timeStr);
      throw new Error(
        "Invalid time format passed to getNextTargetTime. Expected format: HH:mm AM/PM"
      );
    }

    let [hour, rest] = timeStr.split(":");
    let [minute, ampm] = rest.split(" ");
    hour = parseInt(hour);
    minute = parseInt(minute);

    if (ampm.toLowerCase() === "pm" && hour < 12) hour += 12;
    if (ampm.toLowerCase() === "am" && hour === 12) hour = 0;

    const now = new Date();
    const targetTime = new Date(now);
    targetTime.setHours(hour);
    targetTime.setMinutes(minute);
    targetTime.setSeconds(0);

    if (now > targetTime) {
      targetTime.setDate(targetTime.getDate() + 1);
    }

    while (true) {
      const dayOfWeek = targetTime.getDay();
      if (dayOfWeek === 6) {
        // If it's Saturday, skip to Monday
        targetTime.setDate(targetTime.getDate() + 2);
      } else if (dayOfWeek === 0) {
        // If it's Sunday, skip to Monday
        targetTime.setDate(targetTime.getDate() + 1);
      } else {
        break; // If it's not Saturday or Sunday, break out of the loop
      }
    }

    return targetTime;
  }

  return {
    markAttendanceAtPreferredTime,
    getNextTargetTime,
    isAttendanceMarked,
    markAttendanceInLog,
  };
};
