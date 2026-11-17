export function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || "").trim());
}

// Accepts Egyptian mobiles (01xxxxxxxxx) and international numbers.
export function isValidPhone(value) {
    const digits = String(value || "").replace(/[\s\-()]/g, "");
    return /^(\+?\d{8,15})$/.test(digits);
}

export function validateContactForm({ name, email, phone, message }) {
    const errors = {};

    if (!String(name || "").trim()) {
        errors.name = "Please enter your name.";
    }

    if (!isValidEmail(email)) {
        errors.email = "Please enter a valid email address.";
    }

    if (phone && !isValidPhone(phone)) {
        errors.phone = "Please enter a valid phone number.";
    }

    if (String(message || "").trim().length < 10) {
        errors.message = "Your message should be at least 10 characters.";
    }

    return errors;
}
