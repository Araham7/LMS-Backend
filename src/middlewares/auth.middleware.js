import JWT from "jsonwebtoken";
import AppError from "../utils/error.util.js";
import User from "../models/user.model.js";

/* Agar request-ke-cookie-me-token(req.cookies.token) miljata hai to us token ko "JWT_SECRET" se check karenge ki valid hai ya nahi, agar user valid hai aur token expire nahi huwav hai to us token ke sare data ko "req.user" me daal diya jayega , aur user ko login maan liya jayega.*/
// (1). isLoggedIn:
const isLoggedIn = async (req, res, next) => {
  const token = (req.cookies && req.cookies.token) || null;

  if (!token) {
    return next(new AppError("Unauthenticated user, please login again!", 401));
  }

  /* If "process.env.JWT_SECRET" is the same as defined during token ganaraton then it will parse the origionel token data into ke-vlue pairs and store into "userDetailes". */
  try {
    // const payload = await JWT.verify(token, process.env.JWT_SECRET);
    // req.user = { id: payload.id, email: payload.email};
    // console.log(payload);

    /* "JWT.verify": This will automatically check the expiry date of the "token". */
    const userDetailes = await JWT.verify(token, process.env.JWT_SECRET);
    req.user = userDetailes; /* "userDetailes": Isme password ko chor karke user ka sara detailes hai. */
    // console.log(req.user);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token!",
    });
  }

  next();
};

/* "authorizedRoles" ko closer(Aysa-function-j-dusra-function-return-karta-ho) se banane ki kosis karna ok.*/
// (2). authorizedRoles:
const authorizedRoles = (...roles) => {
  return async (req, res, next) => {
    try {
      const currentUserRoles = req.user.role; // Assuming req.user exists and has a 'role' property
      // console.log(req.user.role);

      if (!roles.includes(currentUserRoles)) {
        return next(
          new AppError("You do not have permission to access this!", 403) // 403: Forbidden
        );
      }
      next(); // If the role matches, proceed to the next middleware/controller
    } catch (error) {
      next(error.message, 500); // Pass any errors to the error-handling middleware
    }
  };
};

/* authorizeSubscriber: Ye allow karega ki kis user ko course access karnediya dena chahiye. */
// (3). authorizeSubscriber:
const authorizeSubscriber = async (req, res, next) => {
  const { id } = req.user;
  const user = await User.findById(id)
  // const subscription = req.user.subscription;
  // const currentUserRole = req.user.role;

  const subscription = user.subscription;
const currentUserRole = user.role;
// console.log(user);


  if (currentUserRole !== "ADMIN" && subscription.status !== "active") {
    return next(new AppError("Please subscribe to access this route!", 403));
  }
  next();
};

export { 
  isLoggedIn, 
  authorizedRoles, 
  authorizeSubscriber 
};
