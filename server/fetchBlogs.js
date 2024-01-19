"use server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

//schema
import User from "@/Schema/User";
import Blog from "@/Schema/Blog";
import Notification from "@/Schema/Notification";
import Comment from "@/Schema/Comment";

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
  console.log("Category : ", category);
  let result;
  let findQuery;
  if (route == "latest") {
    findQuery = { draft: false };
  } else if (route == "category") {
    findQuery = { draft: false, tags: category.tag };
  } else if (route == "searchByQuery") {
    findQuery = { draft: false, title: new RegExp(category.query, "i") };
  } else if (route == "notifications") {
    result = await allNotificationCount({
      token: category.user,
      filter: category.filter,
    });
  }

  if (route != "notifications") {
    result = await Blog.countDocuments(findQuery)
      .then((count) => {
        return { status: 200, totalDocs: count };
      })
      .catch((err) => {
        return {
          status: 500,
          message: "Can't connect to the server",
          error: err.message,
        };
      });
  }
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

//tokenVerify
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

export async function addComment({
  token,
  _id,
  comment,
  replying_to,
  blog_author,
  notification_id,
}) {
  let user_id;
  const tokenResult = await tokenVerify({ token });

  if ((tokenResult.status = 200)) {
    user_id = tokenResult.id;
  } else {
    console.log(tokenResult);
    return tokenResult;
  }

  if (!comment.length) {
    return {
      status: 500,
      message: "Write something to comment.",
      error: "Sorry, we cannot send empty message as comments.",
    };
  }

  //creating a comment doc
  let commentObj = {
    blog_id: _id,
    blog_author,
    comment,
    commented_by: user_id,
  };

  if (replying_to) {
    commentObj.parent = replying_to;
    commentObj.isReply = true;
  }

  const result = await new Comment(commentObj)
    .save()
    .then(async (commentFile) => {
      let { comment, commentedAt, children } = commentFile;

      await Blog.findByIdAndUpdate(
        { _id },
        {
          $push: { comments: commentFile._id },
          $inc: {
            "activity.total_comments": 1,
            "activity.total_parent_comments": replying_to ? 0 : 1,
          },
        }
      )
        .then(() => {
          console.log("New comment created.");
        })
        .catch((err) => {
          console.log(err.message);
        });

      let notificationObj = {
        type: replying_to ? "reply" : "comment",
        blog: _id,
        notification_for: blog_author,
        user: user_id,
        comment: commentFile._id,
      };

      if (replying_to) {
        notificationObj.replied_on_comment = replying_to;

        await Comment.findOneAndUpdate(
          { _id: replying_to },
          { $push: { children: commentFile._id } }
        ).then((replyingToCommentDoc) => {
          notificationObj.notification_for = replyingToCommentDoc.commented_by;
        });

        if (notification_id) {
          Notification.findOneAndUpdate(
            { _id: notification_id },
            { reply: commentFile._id }
          ).then((notification) => {
            console.log("Notification is updated...");
          });
        }
      }

      await new Notification(notificationObj)
        .save()
        .then((notification) => {
          console.log("new notification created");
        })
        .catch((err) => {
          console.error(err.message);
        });

      return {
        status: 200,
        comment,
        commentedAt,
        _id: commentFile._id,
        user_id,
        children,
      };
    });

  return result;
}

//fetching comments for a particular blog
export async function getBlogComments({ blog_id, skip }) {
  let maxLimit = 5;

  const result = await Comment.find({ blog_id, isReply: false })
    .populate(
      "commented_by",
      "personal_info.username personal_info.fullname personal_info.profile_img"
    )
    .lean()
    .skip(skip)
    .limit(maxLimit)
    .sort({ commentedAt: -1 })
    .then((comments) => {
      return { status: 200, comments };
    })
    .catch((err) => {
      console.log(err.message);
      return {
        status: 500,
        message: "Can't connect to the server",
        error: err.message,
      };
    });

  return result;
}

export async function getReplies({ _id, skip }) {
  let maxLimit = 5;

  const result = Comment.findOne({ _id })
    .populate({
      path: "children",
      options: {
        lean: true,
        limit: maxLimit,
        skip: skip,
        sort: { commentedAt: -1 },
      },
      populate: {
        path: "commented_by",
        option: { lean: true },
        select:
          "personal_info.profile_img personal_info.username personal_info.fullname",
      },
      select: "-blog_id -updatedAt",
    })
    .lean()
    .select("children")
    .then((doc) => {
      return { status: 200, replies: doc.children };
    })
    .catch((err) => {
      console.log(err.message);
      return {
        status: 500,
        message: "Can't connect to server",
        error: err.message,
      };
    });

  return result;
}

//delete comments functions
function deleteComments(_id) {
  Comment.findOneAndDelete({ _id })
    .then(async (comment) => {
      if (comment.parent) {
        Comment.findOneAndUpdate(
          { _id: comment.parent },
          { $pull: { children: _id } }
        )
          .then((data) => {
            console.log("COmment is deleted from parent");
          })
          .catch((err) => {
            console.log(err.message);
          });
      }

      await Notification.findOneAndDelete({ comment: _id }).then(
        (notification) => console.log("comment's notification is deleted")
      );

      await Notification.findOneAndUpdate(
        { reply: _id },
        { $unset: { reply: 1 } }
      ).then((notification) => console.log("reply's notification is deleted"));

      Blog.findOneAndUpdate(
        { _id: comment.blog_id },
        {
          $pull: { comments: _id },
          $inc: {
            "activity.total_comments": -1,
          },
          "activity.total_parent_comments": comment.parent ? 0 : -1,
        }
      ).then((blog) => {
        if (comment.children.length) {
          comment.children.map((replies) => {
            deleteComments(replies);
          });
        }
      });
    })
    .catch((err) => {
      console.log(err.message);
    });
}

//deleting comment with all of its replies
export async function deleteComment({ token, _id }) {
  let user_id;
  const tokenResult = await tokenVerify({ token });

  if (tokenResult.status == 200) {
    user_id = tokenResult.id;
  } else {
    console.log(tokenResult);
    return tokenResult;
  }

  const result = await Comment.findOne({ _id }).then((comment) => {
    if (user_id == comment.commented_by || user_id == comment.blog_author) {
      deleteComments(_id);
      return { status: 200, message: "The comment or message is deleted" };
    } else {
      return {
        status: 500,
        message: "You can't delete this comment or reply",
        error:
          "Only the author of the comment or reply or the author of the blog is allowed to delete.",
      };
    }
  });

  return result;
}

export async function newNotification({ token }) {
  let user_id;

  let tokenResult = await tokenVerify({ token });

  if (tokenResult.status == 200) {
    user_id = tokenResult.id;
  } else {
    console.log(tokenResult);
    return tokenResult;
  }

  const result = await Notification.exists({
    notification_for: user_id,
    seen: false,
    user: { $ne: user_id },
  })
    .then((response) => {
      if (response) {
        return { status: 200, new_notification_available: true };
      } else {
        return { status: 200, new_notification_available: false };
      }
    })
    .catch((err) => {
      console.error(err.message);
      return {
        status: 500,
        error: err.message,
        message: "Failed to see the number of notifications.",
      };
    });

  return result;
}

export async function getNotifications({
  token,
  page,
  filter,
  deletedDocCount,
}) {
  let user_id;
  let maxLimit = 10;

  let tokenResult = await tokenVerify({ token });

  if (tokenResult.status == 200) {
    user_id = tokenResult.id;
  } else {
    return tokenResult;
  }

  let findQuery = { notification_for: user_id, user: { $ne: user_id } };
  let skipDocs = (page - 1) * maxLimit;

  if (filter != "all") {
    findQuery.type = filter;
  }

  if (deletedDocCount) {
    skipDocs -= deletedDocCount;
  }

  const result = await Notification.find(findQuery)
    .skip(skipDocs)
    .limit(maxLimit)
    .populate("blog", "title blog_id")
    .lean()
    .populate(
      "user",
      "personal_info.fullname personal_info.username personal_info.profile_img"
    )
    .lean()
    .populate("comment", "comment")
    .lean()
    .populate("replied_on_comment", "comment")
    .lean()
    .populate("reply", "comment")
    .lean()
    .sort({ createdAt: -1 })
    .select("createdAt type seen reply ")
    .then((notifications) => {
      return { status: 200, notifications };
    })
    .catch((err) => {
      console.error(err.message);
      return {
        status: 500,
        error: err.message,
        message: "failed to get notifications data",
      };
    });

  console.log("result::::::::::::::::::::::");
  console.log(result);

  return result;
}

export async function allNotificationCount({ token, filter }) {
  let user_id;

  let tokenResult = await tokenVerify({ token });

  if (tokenResult.status == 200) {
    user_id = tokenResult.id;
  } else {
    return tokenResult;
  }

  let findQuery = { notification_for: user_id, user: { $ne: user_id } };

  if (filter != "all") {
    findQuery.type = filter;
  }

  const result = await Notification.countDocuments(findQuery)
    .then((count) => {
      return { status: 200, totalDocsKey: count };
    })
    .catch((err) => {
      console.error(err.message);
      return {
        status: 500,
        message: "Failed to get number of notifications",
        error: err.message,
      };
    });

  console.log("Notification counts:::::::::::::;;");
  console.log(result);

  return result;
}
