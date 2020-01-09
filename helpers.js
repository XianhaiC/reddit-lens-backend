var functions = {}

functions.exists = (obj) => {
    return typeof obj !== UNDEFINED && obj !== null;
}

module.exports = functions
