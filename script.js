// ==========================================
// GOOGLE SHEET API
// ==========================================

const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbxUJ7mPffKrCMBsJb5qsgsgfp3M8zs7OrhPNUaSqLStpdrvV2TMd0AOWmpXIXotUlX9kA/exec";

let students = [];

function normalize(value) {
    return String(value || "").trim().toLowerCase();
}

function getGrade(percentage) {
    if (percentage >= 90) return "A+";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B";
    if (percentage >= 60) return "C";
    if (percentage >= 40) return "D";
    return "F";
}

function loadStudents(data) {
    students = Array.isArray(data) ? data : [];
    console.log("Students loaded:", students.length);
}

const googleScript = document.createElement("script");
googleScript.src = GOOGLE_SHEET_URL + "?callback=loadStudents";
document.body.appendChild(googleScript);

// ==========================================
// SEARCH BUTTON
// ==========================================

document.getElementById("searchBtn").addEventListener("click", function () {
    const enteredRollNo = document.getElementById("rollNo").value.trim();
    const enteredName = document.getElementById("studentName").value.trim();
    const selectedInstitution = document.getElementById("institutionSelect").value.trim();
    const selectedClass = document.getElementById("classSelect").value.trim();

    if (!enteredRollNo || !enteredName) {
        alert("Please enter Roll No and Name.");
        return;
    }

    if (!students.length) {
        alert("Student data is still loading. Please wait a moment.");
        return;
    }

    const student = students.find(function (item) {
        const rowRoll = normalize(item["Student ID"] || item["Roll No"]);
        const rowName = normalize(item["Name"]);
        const rowInstitution = normalize(item.Institution);
        const rowClass = normalize(item.Class);

        return (
            rowRoll === normalize(enteredRollNo) &&
            rowName === normalize(enteredName) &&
            rowInstitution === normalize(selectedInstitution) &&
            rowClass === normalize(selectedClass)
        );
    });

    if (!student) {
        alert("Student not found with this Institution, Class, Roll No and Name.");
        return;
    }

    showResult(student);
});

// ==========================================
// SHOW RESULT
// ==========================================

function getSubjectEntries(student) {
    const skipKeys = new Set([
        "institution",
        "class",
        "session",
        "name",
        "student id",
        "roll no",
        "rollno",
        "father name",
        "class position",
        "position",
        "maxmarkspersubject",
        "total",
        "percentage",
        "grade",
        "status",
        "overall grade",
        "result",
        "obtained",
        "sortkey",
        "sort",
        "serial",
        "sno"
    ]);

    return Object.entries(student)
        .filter(([key, value]) => {
            const label = String(key || "").trim();
            if (!label) return false;

            const lower = label.toLowerCase();
            if (skipKeys.has(lower)) return false;

            if (
                lower.includes("total") ||
                lower.includes("position") ||
                lower.includes("roll") ||
                lower.includes("name") ||
                lower.includes("session") ||
                lower.includes("institute") ||
                lower.includes("institution") ||
                lower.includes("class") ||
                lower.includes("father") ||
                lower.includes("sort") ||
                lower.includes("serial") ||
                lower.includes("obtained")
            ) return false;

            return true;
        })
        .map(([label, value]) => {
            const normalizedValue = normalize(value);
            const numericValue = Number(value);
            const isAbsent =
                value === "" ||
                value === null ||
                value === undefined ||
                normalizedValue === "absent" ||
                normalizedValue === "-" ||
                Number.isNaN(numericValue);

            return [label, isAbsent ? null : numericValue];
        });
}

function showResult(student) {
    const resultCard = document.querySelector(".result-card");
    resultCard.style.display = "block";

    const maxMarks = Number(student.MaxMarksPerSubject) || 40;

    document.querySelector(".institution-name").textContent =
        (student.Institution || "AL-MUQADAS SCIENCE ACADEMY").toUpperCase();

    document.querySelector(".result-title").textContent = "Provisional Result Intimation";
    document.querySelector(".result-subtitle").textContent =
        `${student.Class || "11th"} | Monthly Test Report 2026`;

    document.getElementById("resultName").textContent = student["Name"] || "-";
    document.getElementById("resultRollNo").textContent = student["Student ID"] || student["Roll No"] || "-";
    document.getElementById("classPosition").textContent =
        student["Class Position"] || student["Position"] || student.Position || "-";
    document.getElementById("resultClass").textContent = student.Class || "11th";
    document.getElementById("institutionName").textContent = student.Institution || "Al-Muqadas Science Academy";
    document.getElementById("resultSession").textContent = student.Session || "2026";

    const subjectTable = document.getElementById("resultSubjects");
    subjectTable.innerHTML = "";

    const subjectEntries = getSubjectEntries(student);
    let totalObtained = 0;
    let totalMax = 0;
    const unsuccessfulSubjects = [];

    subjectEntries.forEach(([subject, numericMarks]) => {
        const isAbsent = numericMarks === null;
        const percentage = !isAbsent && maxMarks > 0 ? (numericMarks / maxMarks) * 100 : 0;
        const isBelowPassingPercentage = !isAbsent && percentage < 40;
        const resultMessage = isAbsent
            ? "Absent"
            : isBelowPassingPercentage
                ? "Less than 40%"
                : null;

        if (resultMessage) unsuccessfulSubjects.push(subject);

        if (!isAbsent) {
            totalObtained += numericMarks;
            totalMax += maxMarks;
        }

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${subject}</td>
            <td>${maxMarks}</td>
            <td>${isAbsent ? "Absent" : numericMarks}</td>
            <td>${isAbsent ? "Absent" : resultMessage || `${percentage.toFixed(2)}%`}</td>
            <td>${isAbsent ? "Absent" : resultMessage || getGrade(percentage)}</td>
        `;
        subjectTable.appendChild(row);
    });

    const overallPercentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
    const resultSummary = document.getElementById("resultSummary");

    if (unsuccessfulSubjects.length) {
        resultSummary.classList.add("subject-warning");
        resultSummary.innerHTML = `<div class="summary-subjects">${unsuccessfulSubjects.join(", ")}</div>`;
    } else {
        resultSummary.classList.remove("subject-warning");
        resultSummary.innerHTML = `
            <div class="summary-box">
                <span>Total Marks</span>
                <strong>${totalObtained} / ${totalMax}</strong>
            </div>
            <div class="summary-box">
                <span>Percentage</span>
                <strong>${overallPercentage.toFixed(2)}%</strong>
            </div>
            <div class="summary-box">
                <span>Overall Grade</span>
                <strong>${getGrade(overallPercentage)}</strong>
            </div>
            <div class="summary-box">
                <span>Status</span>
                <strong>${overallPercentage >= 40 ? "PASS" : "FAIL"}</strong>
            </div>
        `;
    }
}

// ==========================================
// PRINT RESULT
// ==========================================

document.getElementById("printBtn").addEventListener("click", function () {
    window.print();
});