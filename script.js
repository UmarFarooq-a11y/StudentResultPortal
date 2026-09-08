// ==========================================
// GOOGLE SHEET API
// ==========================================

const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbxUJ7mPffKrCMBsJb5qsgsgfp3M8zs7OrhPNUaSqLStpdrvV2TMd0AOWmpXIXotUlX9kA/exec";

let students = [];
let sheetMetadata = {};
let mathAnswer = 0;
let loadedSheetKey = "";
let activeRequestId = 0;

const SHEET_BY_SELECTION = {
    "Al-Muqadas Science Academy": {
        "9th": "ACA_9",
        "10th": "ACA_10",
        "11th": "ACA_11",
        "12th": "ACA_12"
    },
    "Pakistan English Grammar High School": {
        "9th": "PEGHS_9",
        "10th": "PEGHS_10"
    }
};

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

function loadStudents(data, requestId = activeRequestId, sheetKey = loadedSheetKey) {
    if (requestId !== activeRequestId || sheetKey !== getSelectedSheetKey()) {
        return;
    }

    if (data && data.error) {
        students = [];
        sheetMetadata = {};
        loadedSheetKey = "";
        alert(data.error);
        return;
    }

    const response = Array.isArray(data) ? { students: data } : (data || {});
    students = Array.isArray(response.students) ? response.students : [];
    sheetMetadata = {
        institution: response.institution || "",
        info: response.info || "",
        className: response.className || "",
        maxMarks: response.maxMarks || ""
    };
    loadedSheetKey = response.sheet || sheetKey;
    console.log("Students loaded:", students.length);

    const pendingSearch = sessionStorage.getItem("pendingResultSearch");
    if (pendingSearch) {
        sessionStorage.removeItem("pendingResultSearch");
        showResultForSearch(JSON.parse(pendingSearch));
    }
}

function generateMathVerification() {
    const firstNumber = Math.floor(Math.random() * 9) + 1;
    const secondNumber = Math.floor(Math.random() * 9) + 1;
    const isAddition = Math.random() >= 0.5;
    const largerNumber = Math.max(firstNumber, secondNumber);
    const smallerNumber = Math.min(firstNumber, secondNumber);
    const leftNumber = isAddition ? firstNumber : largerNumber;
    const rightNumber = isAddition ? secondNumber : smallerNumber;

    mathAnswer = isAddition ? leftNumber + rightNumber : leftNumber - rightNumber;
    document.getElementById("mathQuestion").textContent = `${leftNumber} ${isAddition ? "+" : "-"} ${rightNumber} = ?`;
}

generateMathVerification();

function getSelectedSheetKey() {
    const institution = normalize(document.getElementById("institutionSelect").value);
    const className = normalize(document.getElementById("classSelect").value);
    const institutionKey = Object.keys(SHEET_BY_SELECTION).find(function (key) {
        return normalize(key) === institution;
    });
    const classKey = institutionKey && Object.keys(SHEET_BY_SELECTION[institutionKey]).find(function (key) {
        return normalize(key) === className;
    });

    return institutionKey && classKey ? SHEET_BY_SELECTION[institutionKey][classKey] : "";
}

function requestStudents(institution, className) {
    const normalizedInstitution = normalize(institution);
    const normalizedClass = normalize(className);
    const institutionKey = Object.keys(SHEET_BY_SELECTION).find(function (key) {
        return normalize(key) === normalizedInstitution;
    });
    const classKey = institutionKey && Object.keys(SHEET_BY_SELECTION[institutionKey]).find(function (key) {
        return normalize(key) === normalizedClass;
    });
    const sheetKey = institutionKey && classKey
        ? SHEET_BY_SELECTION[institutionKey][classKey]
        : "";

    const requestId = ++activeRequestId;

    students = [];
    sheetMetadata = {};
    loadedSheetKey = "";

    if (!sheetKey) {
        return;
    }

    const callbackName = `loadStudents_${requestId}`;
    const googleScript = document.createElement("script");
    window[callbackName] = function (data) {
        loadStudents(data, requestId, sheetKey);
        delete window[callbackName];
        googleScript.remove();
    };
    googleScript.src = `${GOOGLE_SHEET_URL}?sheet=${encodeURIComponent(sheetKey)}&callback=${callbackName}`;
    googleScript.onerror = function () {
        if (requestId === activeRequestId) {
            students = [];
            loadedSheetKey = "";
            alert("Unable to load result data. Please try again.");
        }
        delete window[callbackName];
        googleScript.remove();
    };
    document.body.appendChild(googleScript);
}

const institutionSelect = document.getElementById("institutionSelect");
const classSelect = document.getElementById("classSelect");

function getSelectionKey(value, options) {
    const normalizedValue = normalize(value);
    return Object.keys(options).find(function (key) {
        return normalize(key) === normalizedValue;
    }) || "";
}

function updateClassOptions() {
    const institutionKey = getSelectionKey(institutionSelect.value, SHEET_BY_SELECTION);
    const availableClasses = institutionKey ? Object.keys(SHEET_BY_SELECTION[institutionKey]) : [];
    const currentClass = getSelectionKey(classSelect.value, SHEET_BY_SELECTION[institutionKey] || {});
    const preferredClass = currentClass || getSelectionKey("10th", SHEET_BY_SELECTION[institutionKey] || {}) || availableClasses[0] || "";

    classSelect.innerHTML = availableClasses.map(function (className) {
        return `<option value="${className}">${className}</option>`;
    }).join("");
    classSelect.value = preferredClass;
}

function requestSelectedStudents() {
    requestStudents(institutionSelect.value.trim(), classSelect.value.trim());
}

function restorePendingSelection() {
    const pendingSearch = sessionStorage.getItem("pendingResultSearch");
    if (!pendingSearch) return;

    try {
        const searchDetails = JSON.parse(pendingSearch);
        const institutionOption = Array.from(institutionSelect.options).find(function (option) {
            return normalize(option.value) === normalize(searchDetails.institution);
        });

        if (institutionOption) institutionSelect.value = institutionOption.value;
        updateClassOptions();

        const classOption = Array.from(classSelect.options).find(function (option) {
            return normalize(option.value) === normalize(searchDetails.className);
        });
        if (classOption) classSelect.value = classOption.value;
    } catch (error) {
        sessionStorage.removeItem("pendingResultSearch");
    }
}

institutionSelect.addEventListener("change", function () {
    updateClassOptions();
    requestSelectedStudents();
});
classSelect.addEventListener("change", requestSelectedStudents);
restorePendingSelection();
updateClassOptions();
document.getElementById("rollNo").value = "";
document.getElementById("mathAnswer").value = "";
requestSelectedStudents();

function findStudent(searchDetails) {
    return students.find(function (item) {
        const rowRoll = normalize(item["Student ID"] || item["Roll No"]);
        const rowInstitution = normalize(item.Institution);
        const rowClass = normalize(item.Class);

        return (
            rowRoll === normalize(searchDetails.rollNo) &&
            rowInstitution === normalize(searchDetails.institution) &&
            rowClass === normalize(searchDetails.className)
        );
    });
}

function showResultForSearch(searchDetails) {
    const student = findStudent(searchDetails);
    if (student) showResult(student);
}

// ==========================================
// SEARCH BUTTON
// ==========================================

document.getElementById("searchBtn").addEventListener("click", function () {
    const enteredRollNo = document.getElementById("rollNo").value.trim();
    const enteredMathAnswer = Number(document.getElementById("mathAnswer").value);
    const selectedInstitution = document.getElementById("institutionSelect").value.trim();
    const selectedClass = document.getElementById("classSelect").value.trim();

    if (!enteredRollNo) {
        alert("Please enter Roll No.");
        return;
    }

    if (!Number.isInteger(enteredMathAnswer) || enteredMathAnswer !== mathAnswer) {
        alert("Incorrect verification answer.");
        document.getElementById("mathAnswer").value = "";
        generateMathVerification();
        return;
    }

    const selectedSheetKey = getSelectedSheetKey();
    if (!selectedSheetKey) {
        alert("Result data for this institution and class is not available yet.");
        return;
    }

    if (!students.length) {
        alert("Student data is still loading. Please wait a moment.");
        return;
    }

    const searchDetails = {
        rollNo: enteredRollNo,
        institution: selectedInstitution,
        className: selectedClass
    };

    if (loadedSheetKey !== selectedSheetKey) {
        alert("Student data is still loading. Please wait a moment.");
        return;
    }

    const student = findStudent(searchDetails);

    if (!student) {
        alert("Student not found with this Institution, Class and Roll No.");
        return;
    }

    sessionStorage.setItem("pendingResultSearch", JSON.stringify(searchDetails));
    window.location.reload();
});

// ==========================================
// SHOW RESULT
// ==========================================

function getSubjectEntries(student) {
    const skipKeys = new Set([
        "institution",
        "class",
        "session",
        "info",
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
    const institution = sheetMetadata.institution || student.Institution || "AL-MUQADAS SCIENCE ACADEMY";
    const className = sheetMetadata.className || student.Class || "11th";
    const info = sheetMetadata.info || student.Info || "-";
    const maxMarks = Number(sheetMetadata.maxMarks || student.MaxMarksPerSubject);

    document.querySelector(".institution-name").textContent =
        institution.toUpperCase();

    document.querySelector(".result-title").textContent = "Provisional Result Intimation";
    document.querySelector(".result-subtitle").textContent =
        `${className} | ${info}`;

    document.getElementById("resultName").textContent = student["Name"] || "-";
    document.getElementById("resultRollNo").textContent = student["Student ID"] || student["Roll No"] || "-";
    document.getElementById("classPosition").textContent =
        student["Class Position"] || student["Position"] || student.Position || "-";
    document.getElementById("resultClass").textContent = className;
    document.getElementById("institutionName").textContent = institution;
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