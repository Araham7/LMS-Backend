import express, { json, urlencoded } from "express";
import cors from "cors";
import morgan from "morgan";

import cookieParser from "cookie-parser";
import connectToDb from "./config/Db_conn.js";
import userRoutes from "./routes/user.routes.js";
import courseRoutes from "./routes/course.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import errorMiddleware from "./middlewares/error.middleware.js";
import AppError from "./utils/error.util.js";

const app = express(); // creating instance of express()

// Connect to the database.
connectToDb();

// Middleware for parsing request bodies
app.use(json()); // Handling JSON request bodies.
app.use(urlencoded({ extended: true })); // Handling URL-encoded strings.

// Cross-Origin Resource Sharing (CORS) configuration
app.use(
  cors({
    origin: [process.env.CLIENT_URL],
    credentials: true,
  })
);
// console.log('Allowed origin:', process.env.CLIENT_URL);

// Middleware for parsing-cookies
app.use(cookieParser()); // Handling parsed cookies.

// Middleware for logging requests
app.use(morgan("dev")); // Logging requests in development format.



/* Route Handlers */

// (1). HOME route:
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    msg: "You are on the home page!",
  });
});

// (2). "/ping" route:
app.all("/ping", (req, res) => {
  res.status(200).send("Pong!"); // Responding with "Pong!" for any request method.
});

// (3). User route handling:
app.use("/api/v1/users", userRoutes); // Routing all user-related requests to userRoutes.

// (4). Course route handalling:
app.use("/api/v1/courses", courseRoutes);  // Routing all course-related requests to courseRoutes.

// (5). payments route handalling:
app.use('/api/v1/payments', paymentRoutes);

// (5). Handling all wrong routes:
app.use("*", (req, res , next) => {
    return next(new AppError("OOPS 404! , Page not found!" , 404));
});

// (6). Handling all errors:
app.use(errorMiddleware); // Applying error middleware for centralized error handling.

export default app; // Exporting the app for use in other modules.




