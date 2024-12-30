import { Router } from "express";


import { 
    register, 
    logIn, 
    logOut, 
    getProfile, 
    updateProfile, 
    deleteProfile , 
    forgotPassword , 
    resetPassword , 
    changePassword , 
    contactUs, 
    getAllUsers 
} from '../controllers/user.controller.js';
import { authorizedRoles, isLoggedIn } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/multer.middleware.js";


const router = Router();

// "/register" route me { upload.single('avatar') } middleware dene se humloag register middleware me "req.file" pa sakenge.
router.post("/register", upload.single('avatar') , register); // register route.
router.post("/login", logIn); // login route.
router.post("/logout", isLoggedIn, logOut); // logout route.
router.post("/contact", isLoggedIn , contactUs); // contact route (only LogIn user can ContactUs.)

/* delete profile */
router.route("/")
    .all(isLoggedIn) // Ye "middleware" iske baad me aanewale sare route me apply hoga.
    .delete(deleteProfile) // controller to deleteUser from Db and logOut user.

/* Update profile */
router.route("/update")
    .patch(
        isLoggedIn, 
        upload.single('avatar'), 
        updateProfile
    ); // controller to update existingUser detailes.


/* getProfile details */
router.route("/me")
    .get(
        isLoggedIn, 
        getProfile
    ) // controller to get "logedIn" user-detailes.


/* "getAllUsers" route */
router.route("/alluser")
    .get(
        isLoggedIn,
        authorizedRoles("ADMIN"),
        getAllUsers
    )

router.post("/forgot-password", forgotPassword); // "forget-password" route.
router.post("/reset-password/:resetToken", resetPassword); // "/reset-password/:resetToken" route.

/* "change-password": Here we are using "patch" method becouse we only want to change passord , without affecting the remaining field. */
router.route("/change-password")
                                .patch(
                                    isLoggedIn , 
                                    changePassword
                                );

export default router;


