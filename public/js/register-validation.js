document.addEventListener("DOMContentLoaded", () => {
    console.log("INSIDE");
    const password = document.getElementById("password");
    const password2 = document.getElementById("password2");
    const submitBtn = document.getElementById("register-btn");

    const pwRequirements = document.getElementById("pw-requirements");
    const pw2Requirements = document.getElementById("pw2-requirements");

    const reqLength = document.getElementById("req-length");
    const reqUpper = document.getElementById("req-upper");
    const reqLower = document.getElementById("req-lower");
    const reqNumber = document.getElementById("req-number");
    const reqSpecial = document.getElementById("req-special");

    pwRequirements.style.display = "none";
    submitBtn.disabled = true;
    passwordCheck = false;
    passwordCheck2 = false;
    password.addEventListener("input", () => {
        pwRequirements.style.display = "block";
        const value = password.value;

        //reqs
        let lenValid = toggle(reqLength, value.length >= 8);
        let upperValid = toggle(reqUpper, /[A-Z]/.test(value));
        let lowerValid = toggle(reqLower, /[a-z]/.test(value));
        let numberValid = toggle(reqNumber, /\d/.test(value));
        let specialValid = toggle(reqSpecial, /[^A-Za-z0-9]/.test(value));
        passwordCheck =
            lenValid && upperValid && lowerValid && numberValid && specialValid;
        if (passwordCheck) {
            pwRequirements.style.display = "none";
        }
        submitBtn.disabled = !(passwordCheck && passwordCheck2);
    });

    password2.addEventListener("input", () => {
        if (password2.value != password.value) {
            pw2Requirements.style.display = "block";
        } else {
            pw2Requirements.style.display = "none";
            passwordCheck2 = true;
        }
        submitBtn.disabled = !(passwordCheck && passwordCheck2);
    });

    const selects = document.querySelectorAll(".secq");
    selects.forEach((select) => {
        select.addEventListener("change", () => {
            // Get all selected values
            const selectedValues = Array.from(selects)
                .map((s) => s.value)
                .filter((v) => v !== "");

            selects.forEach((s) => {
                // Disable options that are already selected in other selects
                Array.from(s.options).forEach((option) => {
                    if (option.value === "" || s.value === option.value) {
                        option.disabled = false; // keep current selection enabled
                    } else if (selectedValues.includes(option.value)) {
                        option.disabled = true;
                    } else {
                        option.disabled = false;
                    }
                });
            });
        });
    });

    function toggle(element, condition) {
        if (condition) {
            element.classList.add("valid");
            element.classList.remove("invalid");
        } else {
            element.classList.add("invalid");
            element.classList.remove("valid");
        }

        return condition;
    }
});
