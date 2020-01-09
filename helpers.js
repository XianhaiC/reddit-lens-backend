var functions = {}

functions.exists = (obj) => {
    return typeof obj !== "undefined" && obj !== null;
}

module.exports = functions
