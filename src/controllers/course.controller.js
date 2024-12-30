import Course from "../models/course.model.js";
import AppError from "../utils/error.util.js";
import deleteFile from "../utils/deleteFile.util.js";
import cloudinary from "cloudinary";


// (A). createCourse:
const createCourse = async (req, res, next) => {
  try {
    const { title, description, category, createdBy } = req.body;

    // Validate required fields
    if (!title || !description || !category || !createdBy) {
      await deleteFile(`uploads/${req.file.filename}`);
      return next(new AppError("All fields are required", 400));
    }

    // Check for duplicate course title
    const existingCourse = await Course.findOne({ title: title.trim() }); // Ye user dwara provided "title" ko trim(text ke aage aur piche ke space ko remove karke) karke usike ke basis par DB me surche karega ki kya koi course pehle sehi isi naam se already avilable hai ya nahi useka state "existingCourse" variable me store kardega.

    if (existingCourse) {
      await deleteFile(`uploads/${req.file.filename}`); // This will delete the image-file from the server if dublicate course found in the Db.
      return next(new AppError("Course with this title already exists!", 400)); // error course already exist in Db.
    }

    // Create the course :---
    const course = await Course.create({
      title,
      description,
      category,
      createdBy,
      thumbnail: {
        public_id: "",
        secure_url: "",
      },
    });

    // Check if course creation failed
    if (!course) {
      return next(
        new AppError("Course could not be created, please try again!", 500) // Agar course creation failed hojaye to error throw kardo .
      );
    }

    // Handle thumbnail(image-of-course) upload if a file is provided
    if (req.file) {
      try {
        const result = await cloudinary.v2.uploader.upload(req.file.path, {
          folder: "lms", // Upload to 'lms' folder in Cloudinary
          chunk_size: 50000000, // 50 mb size
          resource_type: "image", // resource_type: "video" => If you want to want to upload video.
        });

        // Update course thumbnail details with Cloudinary response
        if (result) {
          course.thumbnail.public_id = result.public_id;
          course.thumbnail.secure_url = result.secure_url;

          // Save the updated course
          await course.save();

          // Remove the uploaded file from the local server
          if (req.file.filename) {
            await deleteFile(`uploads/${req.file.filename}`);
          }
        }
      } catch (error) {
        // Handle errors during Cloudinary upload
        if (req.file && req.file.filename) {
          await deleteFile(`uploads/${req.file.filename}`);
        }
        return next(
          new AppError(
            error.message ||
              "Thumbnail could not be uploaded, please try again!",
            500
          )
        );
      }
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: "Course created successfully!",
      course,
    });
  } catch (error) {
    // Proper error propagation to middleware
    return next(
      new AppError(
        error.message || "An error occurred while creating the course!",
        500
      )
    );
  }
};


// (B). getAllCourses: (sare courses ke lectures ko chor kar sare sare courses ko lado.)
const getAllCourses = async (req, res, next) => {
  try {
    // Fetch all courses, excluding 'lectures' field(Hame sirf courses ki details chahiye uske andar ke lectures ki detailes nahi chahiye,("lactures" nahi chahiye isiliye humlog ".select("-lectures")" kiyen hai.))
    const courses = await Course.find({}).select("-lectures");
    /* 
    (1). Course.find({}) => This retrieves all documents from the "Course" collection because the query object "{}" is 
empty, meaning "no filtering criteria are applied".
    (2). .select("-lectures") => This excludes the lectures field from the returned documents.
    */

    // If no courses are found, return a 500 error
    if (courses.length < 1) {
      return next(new AppError(`No courses found!`, 500));
    }

    // console.log("Total Courses : " , courses.length);
    // If courses are found, send them in the response
    res.status(200).json({
      success: true,
      message: "Successfully retrieved all courses!",
      totalCourses: courses.length,
      courses,
    });
  } catch (error) {
    console.error("Error fetching courses:", error);
    return next(
      new AppError("Unable to retrieve data. Please try again later.", 500)
    );
  }
};


// (C). updateCourse:(to-update-single-course) => Isme image-update karneka functionalaty baki hai.
const updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;

    // const course = await Course.findById(id);
    // console.log(course);

    const course = await Course.findByIdAndUpdate(
      id,
      {
        $set: req.body, // req.body me jo bhi aaye use update kardo.
      },
      {
        new: true, // iska use karnese ye Updated document ko return karega, nahito ye update honeke pehleka value return karega.
        runValidators: true,
      }
    );

    if (!course) {
      return next(new AppError("Course with given id does not exist", 500));
    }

    res.status(200).json({
      success: true,
      message: "Course updated successfully!",
      course,
    });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
};


// (D). removeCourse:(delete/remove single course by id)
const removeCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const course = await Course.findByIdAndDelete(id);

    if (!course) {
      return next(
        new AppError("Course does not exist with the provided id", 404) // Updated error message and status code
      );
    }

    console.log("Deleted course is:", course);

    // Delete thumbnail from Cloudinary
    if (course.thumbnail && course.thumbnail.public_id) {
      await cloudinary.v2.uploader.destroy(course.thumbnail.public_id);
      console.log("Cloudinary thumbnail deleted successfully!");
    }

    res.status(200).json({
      success: true,
      message: "Course deleted successfully!",
      course,
    });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
};


// (E). getLecturesByCourseId:(get all lectures by course id)
const getLecturesByCourseId = async function (req, res, next) {
  try {
    const { id } = req.params;
    // console.log(id); /* It will print the id of the course , jiska humlog lactures janna chahten hai. */

    const course = await Course.findById(id);
    // console.log(course);

    if (!course) {
      return next(new AppError("Invalid course id", 400));
    }

    res.status(200).json({
      success: true,
      message: "Course lectures fetched successfully!",
      lectures: course.lectures,
      NumberOfLactures: course.lectures.length,
    });
  } catch (error) {
    console.error("Error fetching course:", error.message);
    return next(
      new AppError(
        `Unable to retrieve course. Please try again later. > ${error.message}`,
        500
      )
    );
  }
};


// (F). addLecturesByCourseId:(add lactures by curse id)
const addLecturesByCourseId = async (req, res, next) => {
  const { title, description } = req.body;
  const { id } = req.params;

  let lectureData = {};

  if (!title || !description) {
    await deleteFile(`uploads/${req.file.filename}`);
    return next(new AppError("Title and Description are required", 400));
  }

  const course = await Course.findById(id);

  if (!course) {
    await deleteFile(`uploads/${req.file.filename}`);
    return next(new AppError("Invalid course id or course not found.", 400));
  }

  // Run only if user sends a file
  if (req.file) {
    try {
      const result = await cloudinary.v2.uploader.upload(req.file.path, {
        folder: "lms", // Save files in a folder named lms
        chunk_size: 50000000, // 50 mb size
        resource_type: "video", // resource_type: "image" => If you want to want to upload image.
      });

      // If success
      if (result) {
        // Set the public_id and secure_url in array
        lectureData.public_id = result.public_id;
        lectureData.secure_url = result.secure_url;
      }

      // After successful upload remove the file from local storage
      await deleteFile(`uploads/${req.file.filename}`);
    } catch (error) {
      // Empty the uploads directory without deleting the uploads directory
      await deleteFile(`uploads/${req.file.filename}`);

      // Send the error message
      return next(
        new AppError(
          JSON.stringify(error) || "File not uploaded, please try again",
          400
        )
      );
    }
  }

  course.lectures.push({
    title,
    description,
    lecture: lectureData,
  });

  course.numberOfLectures = course.lectures.length;

  // Save the course object
  await course.save();

  res.status(200).json({
    success: true,
    message: "Course lecture added successfully",
    course,
  });
};


// (G). removeLectureFromCourse(delete one lacture from the course.)
const removeLectureFromCourse = async (req, res, next) => {
  // Grabbing the courseId and lectureId from req.query
  const { courseId, lectureId } = req.query;

  console.log(courseId);

  // Checking if both courseId and lectureId are present
  if (!courseId) {
    return next(new AppError('Course ID is required', 400));
  }

  if (!lectureId) {
    return next(new AppError('Lecture ID is required', 400));
  }

  // Find the course using the courseId
  const course = await Course.findById(courseId);

  // If no course send custom message
  if (!course) {
    return next(new AppError('Invalid ID or Course does not exist.', 404));
  }

  // Find the index of the lecture using the lectureId
  const lectureIndex = course.lectures.findIndex(
    (lecture) => lecture._id.toString() === lectureId.toString()
  );

  // If returned index is -1 then send error as mentioned below
  if (lectureIndex === -1) {
    return next(new AppError('Lecture does not exist.', 404));
  }

  // Delete the lecture from cloudinary
  await cloudinary.v2.uploader.destroy(
    course.lectures[lectureIndex].lecture.public_id,
    {
      resource_type: 'video', /* ("video": for deleting the video.) or, ("image": for deleting the image.) */
    }
  );

  // Remove the lecture from the array
  course.lectures.splice(lectureIndex, 1);

  // update the number of lectures based on lectres array length
  course.numberOfLectures = course.lectures.length;

  // Save the course object
  await course.save();

  // Return response
  res.status(200).json({
    success: true,
    message: 'Course lecture removed successfully',
  });
};


export {
  getAllCourses,
  getLecturesByCourseId,
  createCourse,
  updateCourse,
  removeCourse,
  addLecturesByCourseId,
  removeLectureFromCourse,
};
