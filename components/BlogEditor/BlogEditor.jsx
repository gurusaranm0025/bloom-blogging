import { useContext } from "react";
import Logo from "../Logo/Logo";
import AnimationWrapper from "../pageAnimation/AnimationWrapper";
import ImageUpload from "./ImageUpload";
import { EditorContext } from "../Editor/EditorPage";
import toast, { Toaster } from "react-hot-toast";
import { UserContext } from "@/common/ContextProvider";
import { createBlog } from "@/server/publishBlog";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";

let CustomEditor = dynamic(() => import("./CustomEditor"), { ssr: false });

function BlogEditor() {
  const router = useRouter();
  let {
    blog,
    blog: { title, banner, content, tags, des },
    setBlog,
    setEditorState,
    textEditor,
    setTextEditor,
  } = useContext(EditorContext);

  let {
    userAuth: { access_token },
  } = useContext(UserContext);

  let { blog_id } = useParams();

  function handleTitleKeyDown(e) {
    if (e.keyCode == 13) e.preventDefault;
  }

  function TitleChangeHandler(e) {
    let titleInput = e.target;
    titleInput.style.height = "auto";
    titleInput.style.height = titleInput.scrollHeight + "px";
    setBlog({ ...blog, title: titleInput.value });
  }

  function PublishHandler() {
    if (!banner.length) {
      return toast.error("Upload a blog banner to publish it.");
    }

    if (!title.length) {
      toast.error("Give your blog a title to publish it..");
    }

    if (textEditor.isReady) {
      textEditor
        .save()
        .then((data) => {
          if (data.blocks.length) {
            setBlog({ ...blog, content: data });
            setEditorState("publish");
          } else {
            toast.error("Can't upload an empty blog.");
          }
        })
        .catch((err) => {
          console.log(err.message);
        });
    }
  }

  async function saveDraftHandler(e) {
    e.preventDefault();
    if (e.target.className.includes("disable")) return;

    const loadingToast = toast.loading("Publishing...");
    e.target.classList.add("disable");

    if (textEditor.isReady) {
      await textEditor.save().then(async (dataContent) => {
        let blogObj = {
          title,
          des,
          banner,
          content: dataContent,
          tags,
          draft: true,
        };

        const result = await createBlog(access_token, {
          ...blogObj,
          id: blog_id,
        }).catch((err) => {
          toast.error("failed");
          console.log(err.message);
        });

        console.log(result);

        toast.dismiss(loadingToast);
        e.target.classList.remove("disable");

        if (result.status == 500) {
          console.error(result.error);
          toast.error(result.message);
        } else {
          setTimeout(() => {
            router.push("/"), 500;
          });
          toast.success("Draft Saved");
        }
      });
    }
  }

  function handleInstance(instance) {
    setTextEditor(instance);
  }

  return (
    <>
      <Toaster />
      <nav className="navbar">
        <Logo />
        <p className="max-md:hidden text-back line-clamp-1 w-full">
          {title.length ? title : "New Blog"}
        </p>

        <div className="flex gap-4 ml-auto">
          <button className="btn-dark py-2" onClick={PublishHandler}>
            Publish
          </button>
          <button className="btn-light py-2" onClick={saveDraftHandler}>
            Save Draft
          </button>
        </div>
      </nav>

      <AnimationWrapper>
        <section>
          <div className="mx-auto max-w-[900px] w-full">
            <div className="relative aspect-video bg-white border-4 border-french-gray/70 hover:opacity-80 duration-200">
              <ImageUpload />
            </div>
            <textarea
              defaultValue={title}
              placeholder="Blog Title"
              className="text-4xl font-medium w-full h-20 outline-none resize-none mt-10 leading-tight placeholder:opacity-40"
              name=""
              id=""
              onKeyDown={handleTitleKeyDown}
              onChange={TitleChangeHandler}
            ></textarea>
            <hr className="w-full my-5 border-b border-cadet-gray opacity-30" />
            {CustomEditor ? (
              <CustomEditor
                data={Array.isArray(content) ? content[0] : content}
                handleInstance={handleInstance}
              />
            ) : (
              <span className="text-red-500 text-2xl font-noto">ERROR</span>
            )}
          </div>
        </section>
      </AnimationWrapper>
    </>
  );
}

export default BlogEditor;
