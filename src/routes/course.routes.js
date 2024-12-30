import { Router } from "express";

import { 
    getAllCourses, 
    getLecturesByCourseId, 
    createCourse, 
    updateCourse, 
    removeCourse, 
    addLecturesByCourseId, 
    removeLectureFromCourse
} from "../controllers/course.controller.js";

import { 
    authorizedRoles, 
    authorizeSubscriber, 
    isLoggedIn 
} from "../middlewares/auth.middleware.js";

import upload from "../middlewares/multer.middleware.js";


const router = Router();
 
router.route("/")
    .get(
        isLoggedIn,
        getAllCourses /* (1). Get all courses */
    )
    .post(
        isLoggedIn,
        authorizedRoles("ADMIN"),
        upload.single("thumbnail"),
        createCourse /* (2). create new course. */
    )
    .delete(
        isLoggedIn, 
        authorizedRoles('ADMIN'), 
        removeLectureFromCourse /* (3). delete any one Course lacture from the course. */
    );
    
    // Agar user "logIn" hoga tabhi use "Course ke andar ka lactures dekhne diya jayega" , nahito nahi dekhne diya jayega.
router.route("/:id")
    .get(
        isLoggedIn, 
        authorizeSubscriber,
        getLecturesByCourseId /* (4). get_all_Lactures by course_id. */
    ) 
    .put(
        isLoggedIn,
        authorizedRoles("ADMIN"),
        updateCourse /* (5). update_course(except_Image) by courseId.(Node ye lactoures ko modify nahi karega.)*/
    )
    .delete(
        isLoggedIn,
        authorizedRoles("ADMIN"),
        removeCourse // (6). remove(delete) by CourseId {remove/delete single course by id}.
    )
    .post(
        isLoggedIn,
        authorizedRoles("ADMIN"),
        upload.single("lecture"),
        addLecturesByCourseId
    );


export default router;

