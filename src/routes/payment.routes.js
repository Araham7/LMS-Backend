import { Router } from 'express';
import { getRazorpayApiKey, buySubscription, verifySubscription, cancelSubscription, getAllPayments } from '../controllers/payment.controller.js';
import { authorizedRoles, isLoggedIn } from '../middlewares/auth.middleware.js';


const router = Router();


// (1). Route to getRazorpayApiKey :---
router
      .route('/razorpay-key')
      .get(
        isLoggedIn, 
        getRazorpayApiKey
      );
 

// (2). Route to Subscribe(buy) course :---
router
      .route("/subscribe")
      .post(
        isLoggedIn,
        buySubscription
      );


// (3). Route to verify-course-subscription :---
router
      .route("/verify")
      .post(
        isLoggedIn,
        verifySubscription
      );


// (4). Route to unsubscribe course subscription :---
router
      .route("/unsubscribe")
      .post(
        isLoggedIn,
        cancelSubscription
      );


// (5). Route to getAllPayments :---
router
      .route("/")
      .get(
        isLoggedIn, 
        authorizedRoles("ADMIN"),
        getAllPayments
      );


export default router;
