import Payment from "../models/Payment.model.js";
import AppError from "../utils/error.util.js";
import User from "../models/user.model.js";
import { razorpay } from '../server.js';
import crypto from "crypto";

// (1). getRazorpayApiKey :---
const getRazorpayApiKey = async (req, res, next) => {
  try {
    // Validate that the Razorpay API Key is available in environment variables
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;

    if (!razorpayKeyId) {
      console.error("Razorpay Key ID is not configured in the environment.");
      return next(new AppError("Razorpay API Key is not configured.", 500));
    }

    // Respond with the Razorpay API Key
    res.status(200).json({
      success: true,
      message: "Razorpay API key retrieved successfully.",
      key: razorpayKeyId,
    });
  } catch (error) {
    console.error("Error retrieving Razorpay API Key:", error.stack);
    return next(new AppError("Unable to get Razorpay API Key.", 500));
  }
};


/* (2). buySubscription : Isme dekhna hai ki user DataBase me exist karta hai ya nahi, agar karta hai to 
check karna hai wo kya "ADMIN" hai , aur agar "ADMIN" hai to error return kardo aur agar "USER" hai to 
uskeliye ek subscription create kardo. aur usse related data ko user_schema me save kardo. */
const buySubscription = async (req, res, next) => {
  try {
    const { id } = req.user;
    // console.log("Starting subscription process for userId:", id);

    // Fetch user from database
    const user = await User.findById(id);
    if (!user) {
      console.error("User not found.");
      return next(new AppError("Unauthorized, please login.", 404));
    }

    // console.log("(1). User found:", user);

    // Prevent admin from purchasing subscription
    if (user.role === "ADMIN") {
      console.error("Admin tried to purchase a subscription.");
      return next(new AppError("Admin cannot purchase a subscription.", 400));
    }
    

    // Ensure Razorpay plan ID is configured
    if (!process.env.RAZORPAY_PLAN_ID) {
      console.error("Razorpay plan ID not configured.");
      return next(new AppError("Razorpay plan ID is not configured.", 500));
    }
    
    // Create subscription using Razorpay
    const subscription = await razorpay.subscriptions.create({
      plan_id: process.env.RAZORPAY_PLAN_ID, // The unique plan ID
      customer_notify: 1, // 1 means razorpay will handle notifying the customer, 0 means we will not notify the customer
      total_count: 12, // 12 means it will charge every month for a 1-year sub.
    });
    // console.log(subscription);

    if (!subscription || !subscription.id) {
      console.error("Invalid subscription response from Razorpay.");
      throw new Error("Invalid subscription response from Razorpay.");
    }
    // console.log("Subscription created:", subscription);

    // Update user subscription data
    user.subscription = {
      id: subscription.id,
      // status: subscription.status,
      status: subscription.status === 'created' ? 'pending' : subscription.status,
    };

    await user.save();
    // console.log("User subscription saved:", user.subscription);

    // Return successful response
    return res.status(200).json({
      success: true,
      message: "Subscribed successfully.",
      subscription_id: subscription.id,
    });
  } catch (error) {
    console.error("Error while creating subscription:", error.message);
    return next(new AppError("Unable to create subscription.", 500));
  }
};


// (3). verifySubscription :---
const verifySubscription = async (req, res, next) => {
  try {
    const { id } = req.user;

    const {
      razorpay_payment_id,
      razorpay_signature,
      razorpay_subscription_id,
    } = req.body;

    // Find the user by ID
    const user = await User.findById(id);
    if (!user) {
      return next(new AppError("Unauthorized user.", 401));
    }

    const subscriptionId = user.subscription.id;
    /*
    NOTE:---
    Razorpay Signature Verification: Razorpay signature ko verify karne ke liye generatedSignature aur razorpay_signature ka comparison hota hai. razorpay_signature Razorpay ke response me aata hai, jabki generatedSignature hum khud generate karte hain Razorpay ke secret key aur payment/subscription data ka use karke. Agar dono signatures match karte hain, to verification successful hota hai.
*/
    // Generate signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_payment_id}|${subscriptionId}`)
      .digest("hex");

    // Verify signature
    if (generatedSignature !== razorpay_signature) {
      return next(new AppError("Payment not verified. Please try again.", 400));
    }

    // Create a payment record
    try {
      await Payment.create({
        razorpay_payment_id,
        razorpay_subscription_id,
        razorpay_signature,
      });
    } catch (err) {
      return next(new AppError(err.message, 500));
    }

    // Update subscription status
    user.subscription.status = "active";

    try {
      await user.save();
    } catch (err) {
      return next(
        new AppError("Failed to update user subscription status.", 500)
      );
    }

    // Send success response
    res.status(200).json({
      success: true,
      message: "Payment verified successfully!",
    });
  } catch (error) {
    console.log(error.message);
    return next(
      new AppError("An unexpected error occurred. Please try again later.", 500)
    );
  }
};

// (4). cancelSubscription: Agar user 14 din ke andar-andar subscription-cancel karta hai to use refund bhi milega aur subscription bhi cancel hojayega , aur agar 14 din ke baad subscription-cancel karega to use refund nahi milega magar subscription cancel hojayega.(Aur payment ke data ko data base se tabhi remove karenge jab humlogn ka "payment-successfully-refund" hojayega, nahito use remve(delete) nahi karenge kyunki further ye data future me kaam aasakta hai.)
const cancelSubscription = async (req, res, next) => {
  try {
    const { id } = req.user;
    const user = await User.findById(id);
    if (!user) {
      return next(new AppError("Unauthorized user.", 401));
    }

    if (user.role === "ADMIN") {
      return next(new AppError("Admin cannot cancel subscription", 400));
    }

    const subscriptionId = user.subscription.id;
    
    // Check the subscription status
    const subscriptionDetails = await razorpay.subscriptions.fetch(subscriptionId).catch(error => {
      console.error("Error fetching subscription details from Razorpay:", error);
      return next(new AppError("Error fetching subscription details.", 400));
    });

    if (!subscriptionDetails) {
      return next(new AppError("Subscription details not found on Razorpay.", 404));
    }

    if (subscriptionDetails.status === "cancelled") {
      return res.status(200).json({
        status: "success",
        message: "Subscription is already cancelled.",
      });
    }

    const cancelledSubscription = await razorpay.subscriptions.cancel(subscriptionId).catch(error => {
      console.error("Error cancelling subscription on Razorpay:", error);
      return next(new AppError(error.description || "Failed to cancel the subscription on Razorpay.", 400));
    });

    if (!cancelledSubscription) {
      return next(new AppError("Failed to cancel the subscription on Razorpay.", 500));
    }

    const payment = await Payment.findOne({ razorpay_subscription_id: subscriptionId });

    if (!payment) {
      return next(new AppError("Payment record not found.", 404));
    }

    const timeSinceSubscribed = Date.now() - payment.createdAt;
    const refundPeriod = 14 * 24 * 60 * 60 * 1000;

    if (timeSinceSubscribed >= refundPeriod) {
      user.subscription.id = undefined;
      user.subscription.status = cancelledSubscription.status;
      await user.save();
      return res.status(200).json({
        status: "success",
        message: "Subscription cancelled. Refund period has expired, you are not eligible for a refund.",
      });
    }

    await razorpay.payments.refund(payment.razorpay_payment_id, { speed: "optimum" }).catch(error => {
      console.error("Error processing refund:", error);
      return next(new AppError("Error processing refund.", 500));
    });

    user.subscription.id = undefined;
    user.subscription.status = "inactive";
    await user.save();
    await Payment.deleteOne({ _id: payment._id });

    return res.status(200).json({
      status: "success",
      message: "Subscription cancelled and refund processed successfully.",
    });
  } catch (error) {
    console.error("Error details:", error);
    return next(new AppError("Unable to cancel subscription.", 500));
  }
};


// (5). (Incomplete) :
const getAllPayments = async (req, res, next) => {
  try {
    const { count, skip } = req.query;

    // Find all subscriptions from razorpay
    const allPayments = await razorpay.subscriptions.all({
      count: count ? count : 10, // If count is sent then use that else default to 10
      skip: skip ? skip : 0, // // If skip is sent then use that else default to 0
    });

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const finalMonths = {
      January: 0,
      February: 0,
      March: 0,
      April: 0,
      May: 0,
      June: 0,
      July: 0,
      August: 0,
      September: 0,
      October: 0,
      November: 0,
      December: 0,
    };

    const monthlyWisePayments = allPayments.items.map((payment) => {
      // We are using payment.start_at which is in unix time, so we are converting it to Human readable format using Date()
      const monthsInNumbers = new Date(payment.start_at * 1000);

      return monthNames[monthsInNumbers.getMonth()];
    });

    monthlyWisePayments.map((month) => {
      Object.keys(finalMonths).forEach((objMonth) => {
        if (month === objMonth) {
          finalMonths[month] += 1;
        }
      });
    });

    const monthlySalesRecord = [];

    Object.keys(finalMonths).forEach((monthName) => {
      monthlySalesRecord.push(finalMonths[monthName]);
    });

    res.status(200).json({
      success: true,
      message: "All payments",
      allPayments,
      finalMonths,
      monthlySalesRecord,
    });
  } catch (error) {
    console.log(error.message);
    return next(new AppError("Unable to getAllPayments", 500));
  }
};

export {
  getRazorpayApiKey,
  buySubscription,
  verifySubscription,
  cancelSubscription,
  getAllPayments,
};
