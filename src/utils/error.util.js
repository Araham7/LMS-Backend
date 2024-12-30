class AppError extends Error {
    constructor(mesasge , statusCode) {
        super(mesasge);

        this.statusCode = statusCode;

        Error.captureStackTrace(this , this.constructor);
    }
}

export default AppError;