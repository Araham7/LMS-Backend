import cloudinary from "cloudinary";
import crypto from "crypto";

import User from "../models/user.model.js";
import AppError from "../utils/error.util.js";
import deleteFile from "../utils/deleteFile.util.js";
import sendEmail from "../utils/sendEmail.util.js";

import TelegramBot from "node-telegram-bot-api";

// constent for storing "cookieOptions" :
const cookieOptions = {
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  httpOnly: true,
  secure: false, // true
};


// Adding Teligram-Bot Detailes :---
const token = process.env.ARAHAM_BOT_TOKEN; // YOUR_API_TOKEN(Go to the ".env" file and replace).
const bot = new TelegramBot(token); // creating a new instance of the TelegramBot class, and passing the token (the bot's API token) as an argument to the constructor.
const userId = process.env.ARAHAM_CHAT_ID; // USER_CHAT_ID(Go to the ".env" file and replace)



// (1). cntroller : Below all codes for controllers ....

// (A). registor/signup : (NOTE: Image uploading is optional in server level.)
const register = async (req, res, next) => {
  try {
    const { fullName, email, password, confirmPassword } = req.body;
    // console.log(req.file); // Uncomment this for debugging purposes!

    // 1. Check for missing fields:
    if (!fullName || !email || !password || !confirmPassword) {
      // Remove the uploaded file if it exists
      if (req.file) {
        deleteFile(`uploads/${req.file.filename}`);
      }
      return next(new AppError("All fields are required 001!", 400));
    }

    // 2. Verify if passwords match:
    if (password !== confirmPassword) {
      // Remove the uploaded file if it exists
      if (req.file) {
        deleteFile(`uploads/${req.file.filename}`);
      }
      return next(
        new AppError("Password and Confirmed password don't match!", 400)
      );
    }

    // 3. Check if the user already exists:
    const userExists = await User.findOne({ email });
    if (userExists) {
      // Remove the uploaded file(i.e, image) if it exists
      if (req.file) {
        deleteFile(`uploads/${req.file.filename}`);
      }
      return next(new AppError("Email already exists!", 400));
    }

    // 4. Create the new user:
    const user = await User.create({
      fullName,
      email,
      password,
      avatar: {
        public_id: "",
        secure_url: "",
      },
    });

    // 5. Handle registration failure:
    if (!user) {
      // Remove the uploaded file if it user-exists in DataBase.
      if (req.file) {
        deleteFile(`uploads/${req.file.filename}`);
      }
      return next(
        new AppError("User registration failed, please try again!", 400)
      );
    }

    if (req.file) {
      try {
        /* 6. Upload the image to Cloudinary and store the result in "result" variable. */
        const result = await cloudinary.v2.uploader.upload(req.file.path, {
          folder: "lms", // Upload to 'lms' folder in Cloudinary.
          width: 250, // Set image width to 250 pixels.
          height: 250, // Set image height to 250 pixels.
          gravity: "face", // Crop the image to focus on the face.
          crop: "fill", // Fill the space around the face with the image.
        });

        /* 
            Agar image successfully upload hojaye to uske "public_id" aur "secure_url" ko respactively "user.avatar.public_id" aur "user.avatar.secure_url" save kardo.
             */
        if (result) {
          user.avatar.public_id = result.public_id;
          user.avatar.secure_url = result.secure_url;

          // Remove the uploaded file from the local server.
          deleteFile(`uploads/${req.file.filename}`);
        }
      } catch (error) {
        // Handle the error and remove the file from the local server if upload fails.
        deleteFile(`uploads/${req.file.filename}`);
        return next(
          new AppError(
            error.message || "File not uploaded, please try again!",
            500
          )
        );
      }
    }

    // 7. Save the model to the database:
    await user.save();

    // 8. Remove password from response:
    user.password = undefined; // removing password after saving the data.

    // 9. Generate a JWT token:
    const token = await user.generateJWTtoken();

    // 10. Set the token in a cookie:
    res.cookie("token", token, cookieOptions);

    // 11. Send a success response
    console.log({
      success: true,
      message: "User registered successfully!",
      // user,
    });

    res.status(200).json({
      success: true,
      message: "User registered successfully!",
      user,
    });
  } catch (err) {
    // Handle unexpected errors
    if (req.file) {
      deleteFile(`uploads/${req.file.filename}`);
    }
    return next(new AppError(`Something went wrong! > ${err.message}`));
  }
};


// (B). logIn :
const logIn = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Validate input fields
    if (!email || !password) {
      return next(new AppError("Every field is required!", 400));
    }

    // 2. Check if the user exists and select password field explicitly :
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return next(new AppError("Invalid email !", 400));
    }

    // 3. Validate password :
    const isPasswordCorrect = await user.comparePassword(password); // Assuming `comparePassword` is a method in your User model
    if (!isPasswordCorrect) {
      return next(new AppError("Wrong password!", 400));
    }

    // 4. Generate JWT token :
    const token = await user.generateJWTtoken();
    user.password = undefined; // Remove password from the response

    // 5. Set token in cookie :
    res.cookie("token", token, cookieOptions);

    // 6. Send response :
    res.status(200).json({
      success: true,
      message: "User logged in successfully!",
      user,
    });
  } catch (e) {
    return next(new AppError(`Something went wrong! > ${e.message}`, 500));
  }
};


// (C). logOut :
const logOut = async (req, res, next) => {
  try {
    res.cookie("token", null, {
      secure: true,
      maxAge: 0,
      httpOnly: true,
    });

    res.status(200).json({
      success: true,
      message: "User logged out successfully!",
    });
  } catch (error) {
    return next(new AppError(`Something went wrong! > ${error.message}`, 500));
  }
};


// (D). getProfile :
const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if(!user){
      return next(
        new AppError("No User Found with provided detailes !", 400)
      )
    }

    res.status(200).json({
      success: true,
      message: "User detailes!",
      user,
    });
  } catch (error) {
    return next(new AppError(`Something went wrong! > ${error.message}`, 500));
  }
};


// (E). updateProfile :
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      // Remove the uploaded file if the user doesn't exist
      if (req.file) deleteFile(`uploads/${req.file.filename}`);
      return next(new AppError("User not found", 404));
    }

    const oldAvatarPublicId = user.avatar ? user.avatar.public_id : null;

    if (req.file) {
      try {
        const result = await cloudinary.v2.uploader.upload(req.file.path, {
          folder: "lms",
          width: 250,
          height: 250,
          gravity: "face",
          crop: "fill",
        });

        if (result) {
          if (oldAvatarPublicId) {
            /* deleting old user's image from cloudinary. */
            await cloudinary.uploader.destroy(oldAvatarPublicId); 
          }

          user.avatar.public_id = result.public_id;
          user.avatar.secure_url = result.secure_url;
          deleteFile(`uploads/${req.file.filename}`);
        }
      } catch (error) {
        deleteFile(`uploads/${req.file.filename}`);
        return next(new AppError(error.message || "File upload failed", 500));
      }
    }
    

    Object.assign(user, req.body); // Update user fields

    await user.save(); // Trigger bcrypt password hashing if needed

    user.password = undefined; // Ensure password is not sent back in the response
    const token = await user.generateJWTtoken();

    res.cookie("token", token, cookieOptions);

    res.status(200).json({
      success: true,
      message: "User details updated successfully!",
      user,
    });
  } catch (error) {
    return next(new AppError(`Something went wrong! > ${error.message}`, 500));
  }
};


// (F). deleteProfile :
// (i). delete user field from database.
// (ii). delete user_avtar from cloudinary.
// (iii). delete user-cookie(user-token).
const deleteProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Find the user and delete their avatar image from cloudinary
    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    const deletedDbUser = await User.findByIdAndDelete(userId); // "deletedDbUser" me jis user ko humlog delet karenge uska details store rahega.
    const deletedImageResult = await cloudinary.uploader.destroy(user.avatar.public_id); // This will delete the image from the "cloudinary".

    // Check if both user and image deletion were successful if deleted then erase the 'token' from the cookie.
    if (deletedDbUser && deletedImageResult) {
      res.cookie("token", null, {
        secure: true,
        maxAge: 0,
        httpOnly: true,
      });
      return res.status(200).json({
        success: true,
        message: "User deleted and logged out successfully!",
      });
    } else {
      return next(new AppError("Failed to delete user or avatar image", 500));
    }
  } catch (error) {
    return next(
      new AppError(`Error while deleting user: ${error.message}`, 500)
    );
  }
};


// (G). forgotPassword : it will send the email with some forgotPasswordToken to provided registored email.
const forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError("Email is required!", 400));
  }

  try {
    // (1). Finding the user by email
    const user = await User.findOne({ email });

    if (!user) {
      return next(new AppError("Invalid credentials || Invalid user!", 400));
    }

    // (2). Generating password reset token and saving it to the user
    const resetToken = await user.generatePasswordResetToken();
    await user.save();

    // (3). Creating password reset URL
    const resetPasswordURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    // (4). Setting up email content
    const subject = "Password Reset Request";
    const message = `Please reset your password by clicking on this link: ${resetPasswordURL}`;

    // (5). Sending reset password email
    await sendEmail(email, subject, message);

    // (6). Sending successful response
    res.status(200).json({
      success: true,
      message: `Reset Password token has been sent to ${email} successfully!`,
    });
  } catch (error) {
    // (7). In case of an error, clear any existing reset token information from the user
    User.forgotPasswordToken = null;
    User.forgotPasswordExpiry = null;
    await User.save();

    // (8). Handling and passing the error to the next middleware
    next(new AppError(error.message || "Something went wrong!", 500));
  }
};


// (H). resetPasswrd :(reset-password is only possible if user gives the correct email in forgotPassword.)
const resetPassword = async (req, res, next) => {
  const { resetToken } = req.params;
  const { password } = req.body;

  try {
    // (1). Hash the reset token to match with the one stored in the database
    const forgotPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // (2). Find the user associated with the reset token and ensure it hasn't expired
    const user = await User.findOne({
      forgotPasswordToken,
      forgotPasswordExpiry: { $gt: Date.now() }, // yadi dataBase me upasthit "forgotPasswordExpiry" greter then ho tabhi "user" return karo.
    });

    if (!user) {
      return next(new AppError("Token is invalid, please try again!", 400));
    }

    // (3). Resetting the user's password
    user.password = password;

    // (4). Clear the reset token and expiry from the database after successful password reset
    user.forgotPasswordToken = null;
    user.forgotPasswordExpiry = null;

    // (5). Save the user to trigger password hashing using bcrypt
    await user.save();

    // (6). Sending response after successful password reset
    res.status(200).json({
      success: true,
      message: "Your password has been changed successfully!",
    });
  } catch (error) {
    // (7). Handling any unexpected errors
    next(
      new AppError(
        error.message || "Something went wrong during password reset.",
        500
      )
    );
  }
};


// (I). changePassword : (Password changing is only possible if the user is logged in.)
const changePassword = async (req, res, next) => {
  const { oldPassword, newPassword, confirmNewPassword } = req.body;
  const { id } = req.user;
  console.log({
    "req_user": req.user , 
    "req_body": req.body
  });
  // console.log(id);

  // (1). Throw error if all fields are not present
  if (!id || !oldPassword || !newPassword || !confirmNewPassword) {
    return next(new AppError("Every field is required!", 400));
  }

  try {
    // (2). Finding user in the database.
    // const user = await User.findOne({ email })
    const user = await User.findById(id).select("+password");

    // (3). Checking if the user exists or not.
    if (!user) {
      return next(new AppError("Invalid email!", 400));
    }

    // (4). Checking if the password given by the user is correct.
    const isPasswordCorrect = await user.comparePassword(oldPassword);
    if (!isPasswordCorrect) {
      return next(new AppError("Invalid password!", 400));
    }

    // (5). Checking if "newPassword" and "confirmNewPassword" match.
    if (newPassword !== confirmNewPassword) {
      return next(
        new AppError("New password and confirm password do not match!", 400)
      );
    }

    // (6). Setting the new password to the user password.
    user.password = newPassword;

    // (7). Saving the user so that the password will be hashed using bcrypt.
    await user.save();

    // (8). Removing Password from the user.
    user.password = undefined;

    // (9). Sending response after successful password change.
    res.status(200).json({
      success: true,
      message: "Password changed successfully!",
    });
  } catch (error) {
    return next(new AppError(`error > ${error.message}`, 400));
  }
};


// (J). contactUs : handalling form data and sending that data to the "Telegram-User". :--
const contactUs = async (req, res, next) => {
  try {
    // const contactUs_Form_Data_Received = req.body;
    let { name, email, message } = req.body;

const formattedMessage = `name: ${name}
email: ${email}
message: ${message.replace(/(\r\n|\n|\r)/gm, " ")}
`;

    console.log(formattedMessage); // Printing the FormData coming from the backend.

    // Function to Send Received formData to the Telegram :---
    const sendMessageToTelegramUser = async () => {
      try {
        const response = await bot.sendMessage(userId, formattedMessage); // Send the formatted message
        console.log("Message sent successfully:", response); // This will print the message('Message sent successfully:') and give the response.
      } catch (error) {
        console.error("Error sending message:", error); // If error occurred during sending message, it will print('Error sending message:') and also print the "error" that occurred.
      }
    };

    sendMessageToTelegramUser(); // Sending received FormData(i.e, formattedMessage ) to the dedicated telegram "User_Id".

    res.status(200).json({
      success: true,
      message: "The form has been successfully received and the data has been sent to Telegram!",
    });
  } catch (error) {
    return next(new AppError("Contact Us form Data not received!", 400));
  }
};


// (K). getAllUsers : We have create this route to list/print/show all users with to the admin.
const getAllUsers = async (req , res , next) => {
  try {
    const users = await User.find({});
    if(users.length === 0){
      return next (new AppError("No users Found !", 400)
      )
    }
    res.status(200).json({
      success: true,
      message: "Users found!",
      users,
    });
  } catch (error) {
    return next(new AppError(`Unable to get users! > ${error.message}`, 500));
  }
}


export {
  register,
  logIn,
  logOut,
  getProfile,
  updateProfile,
  deleteProfile,
  forgotPassword,
  resetPassword,
  changePassword,
  contactUs,
  getAllUsers,
};
