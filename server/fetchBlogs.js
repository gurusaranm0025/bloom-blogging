"use server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

//schema
import User from "@/Schema/User";
import Blog from "@/Schema/Blog";
import Notification from "@/Schema/Notification";

mongoose.connect(process.env.DB_LOCATION, { autoIndex: true });

//function to get latest blogs from DB
export async function getLatestBlogs(page = 1) {
  let maxLimit = 5;

  const result = await Blog.find({ draft: false })
    .populate(
      "author",
      "personal_info.profile_img personal_info.fullname personal_info.username -_id"
    )
    .lean()
    .sort({ publishedAt: -1 })
    .select("blog_id title des banner tags activity publishedAt -_id")
    .skip(maxLimit * (page - 1))
    .limit(maxLimit)
    .then((blogs) => {
      return { status: 200, blogs: blogs };
    })
    .catch((err) => {
      return {
        status: 500,
        message: "Can't connect to the server",
        error: err.message,
      };
    });

  return result;
}

//latest blogs count
export async function blogsCount({ route, category }) {
  let findQuery;
  if (route == "latest") {
    findQuery = { draft: false };
  } else if (route == "category") {
    findQuery = { draft: false, tags: category.tag };
  } else if (route == "searchByQuery") {
    findQuery = { draft: false, title: new RegExp(category.query, "i") };
  }

  let result = await Blog.countDocuments(findQuery)
    .then((count) => {
      return { status: 200, totalDocs: count };
    })
    .catch((err) => {
      return {
        status: 500,
        message: "CAn't connect to the server",
        error: err.message,
      };
    });

  return result;
}

//function to get trending blogs
export async function getTrendingBlogs() {
  const result = await Blog.find({ draft: false })
    .populate(
      "author",
      "personal_info.profile_img personal_info.fullname personal_info.username -_id"
    )
    .lean()
    .sort({
      "activity.total_reads": -1,
      "activity.total_likes": -1,
      publishedAt: -1,
    })
    .select("blog_id title publishedAt -_id")
    .limit(5)
    .then((blogs) => {
      return { status: 200, blogs: blogs };
    })
    .catch((err) => {
      return {
        status: 500,
        message: "Can't connect to the server",
        error: err.message,
      };
    });

  return result;
}

//searching blogs
export async function searchBlogs({
  author,
  limit,
  query,
  tag,
  page = 1,
  eliminate_blog,
}) {
  let maxLimit = limit ? limit : 5;
  let findQuery;

  if (tag) {
    findQuery = {
      tags: tag,
      draft: false,
      blog_id: { $ne: eliminate_blog },
    };
  } else if (query) {
    findQuery = { draft: false, title: new RegExp(query, "i") };
  } else if (author) {
    findQuery = { draft: false, author: author };
  }

  const result = await Blog.find(findQuery)
    .populate(
      "author",
      "personal_info.profile_img personal_info.fullname personal_info.username -_id"
    )
    .lean()
    .sort({ publishedAt: -1 })
    .select("blog_id title des banner tags activity publishedAt -_id")
    .skip(maxLimit * (page - 1))
    .limit(maxLimit)
    .then((blogs) => {
      return { status: 200, blogs: blogs };
    })
    .catch((err) => {
      return {
        status: 500,
        message: "Can't connect to the server",
        error: err.message,
      };
    });

  return result;
}

//searching users in DB
export async function searchUsers({ query }) {
  const result = await User.find({
    "personal_info.username": new RegExp(query, "i"),
  })
    .limit(50)
    .select(
      "personal_info.username personal_info.fullname personal_info.profile_img -_id"
    )
    .then((users) => {
      return { status: 200, users };
    })
    .catch((err) => {
      return {
        status: 500,
        message: "Can't connect to the server",
        error: err.message,
      };
    });

  return result;
}

//getting details or profile of a particular user
export async function getUserProfile({ username }) {
  const result = await User.findOne({
    "personal_info.username": username,
  })
    .select("-personal_info.password -google_auth -updatedAt -blogs")
    .then((user) => {
      return { status: 200, user };
    })
    .catch((err) => {
      return {
        status: 500,
        message: "Error occurred while finding the user",
        error: err.message,
      };
    });

  return result;
}

//getting gull blog for reading it
export async function getBlog({ blog_id, mode, draft }) {
  let incrementalVal = mode != "edit" ? 1 : 0;

  const result = await Blog.findOneAndUpdate(
    { blog_id },
    { $inc: { "activity.total_reads": incrementalVal } }
  )
    .populate(
      "author",
      "personal_info.fullname personal_info.username personal_info.profile_img"
    )
    .lean()
    .select("title des content banner activity publishedAt blog_id tags")
    .then(async (blog) => {
      const readUpdateResult = await User.findOneAndUpdate(
        { "personal_info.username": blog.author.personal_info.username },
        { $inc: { "account_info.total_reads": incrementalVal } }
      )
        .then(() => {
          return { status: 200 };
        })
        .catch((err) => {
          return {
            status: 500,
            message: "Can't connect to the server",
            error: err.message,
          };
        });

      if (blog.draft && !draft) {
        return {
          status: 500,
          message: "You can't access drafted blogs",
          error:
            "You cannot access a drafted blog to edit by using this method",
        };
      }
      if (readUpdateResult.status == 200) {
        return { status: 200, blog };
      } else {
        return readUpdateResult;
      }
    })
    .catch((err) => {
      return {
        status: 500,
        message: "Can't connect to the server",
        error: err.message,
      };
    });

  return result;
}

export async function tokenVerify({ token }) {
  const tokenResult = jwt.verify(
    token,
    process.env.SECRET_ACCESS_KEY,
    (err, user) => {
      if (err) {
        return {
          status: 500,
          message: "Access token is invalid",
          error: err.message,
        };
      }
      return { status: 200, message: "Token is valid", id: user.id };
    }
  );

  return tokenResult;
}

//like blogs
export async function likeBlog({ token, _id, isLikedByUser }) {
  let user_id;

  const tokenResult = await tokenVerify({ token });

  // const tokenResult = jwt.verify(
  //   token,
  //   process.env.SECRET_ACCESS_KEY,
  //   (err, user) => {
  //     if (err) {
  //       return {
  //         status: 500,
  //         message: "Access token is invalid",
  //         error: err.message,
  //       };
  //     }
  //     return { status: 200, message: "Token is valid", id: user.id };
  //   }
  // );

  if ((tokenResult.status = 200)) {
    user_id = tokenResult.id;
  } else {
    console.log(tokenResult);
    return tokenResult;
  }

  let incrementalVal = !isLikedByUser ? 1 : -1;

  const result = await Blog.findOneAndUpdate(
    { _id },
    { $inc: { "activity.total_likes": incrementalVal } }
  ).then(async (blog) => {
    if (!isLikedByUser) {
      let like = new Notification({
        type: "like",
        blog: _id,
        notification_for: blog.author,
        user: user_id,
      });

      const likeNotificationResult = await like
        .save()
        .then((notification) => {
          return { status: 200, likedByUser: true };
        })
        .catch((err) => {
          return {
            status: 500,
            message: "Can't connect to the server",
            error: err.message,
          };
        });

      return likeNotificationResult;
    } else {
      const dislikeResult = await Notification.findOneAndDelete({
        user: user_id,
        blog: _id,
        type: "like",
      })
        .then((data) => {
          return { status: 200, likedByUser: false };
        })
        .catch((err) => {
          return {
            status: 500,
            message: "Can't connect to the server",
            error: err.message,
          };
        });

      return dislikeResult;
    }
  });

  return result;
}

//check if the post is liked by the user
export async function getIsLikedByUser({ token, _id }) {
  let user_id;
  const tokenResult = await tokenVerify({ token });

  if ((tokenResult.status = 200)) {
    user_id = tokenResult.id;
  } else {
    console.log(tokenResult);
    return tokenResult;
  }

  const result = await Notification.exists({
    user: user_id,
    type: "like",
    blog: _id,
  })
    .then((response) => {
      return { status: 200, result: response };
    })
    .catch((err) => {
      return {
        status: 500,
        message: "Can't connect to the server",
        error: err.message,
      };
    });

  return result;
}
