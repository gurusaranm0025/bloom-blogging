"use client";

import Logo from "@/components/Logo/Logo";
import Image from "next/image";
import maria from "@/public/maria_back.jpg";
import Input from "@/components/signMethod/Input";
import google from "@/public/google.svg";
import AnimationWrapper from "@/components/pageAnimation/AnimationWrapper";
import { credValidityCheck, googleAuth } from "@/server/signActions";
import { useContext, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import { storeInSession } from "@/common/session";
import { UserContext } from "@/common/ContextProvider";
import { useRouter } from "next/navigation";
import { authWithGoogle } from "@/common/firebase";

function SignMethodPage({ params }) {
  const router = useRouter();

  let {
    userAuth: { access_token },
    setUserAuth,
  } = useContext(UserContext);

  const [userCred, setUSerCreds] = useState({
    username: "",
    email: "",
    password: "",
  });

  async function signHandler(type = params.signMethod) {
    const credResult = await credValidityCheck({
      type: params.signMethod,
      username: userCred.username ? userCred.username : "none",
      email: userCred.email,
      password: userCred.password,
    });

    if (credResult.status != 200) console.log(credResult);

    if (credResult.status == 500) {
      toast.error("Sorry, an error occurred on our end");
      console.log(credResult.error);
    }

    //success
    if (credResult.status == 200) {
      toast.success("Success");
      storeInSession("user", JSON.stringify(credResult));
      setUserAuth(credResult);
    } else {
      toast.error(credResult.error);
    }
  }

  // access_token && router.push("/");

  function handleGoogleAuth(e) {
    e.preventDefault();
    authWithGoogle()
      .then(async (user) => {
        const credResult = await googleAuth((access_token = user.accessToken));
        if (credResult.status == 200) {
          storeInSession("user", JSON.stringify(credResult));
          setUserAuth(credResult);
        } else {
          toast.error(credResult.error);
        }
      })
      .catch((err) => {
        toast.error("Trouble logging through google");
        return console.log(err);
      });
  }
  return (
    <>
      {access_token ? (
        router.push("/")
      ) : (
        <AnimationWrapper className="h-full">
          <div className="flex h-full w-full">
            <Toaster />
            <a href="/">
              <Logo className="absolute mt-[10px] ml-[10px] md:mt-[1vh] md:ml-[2vw]" />
            </a>
            <div className="w-full md:w-[45vw] h-full flex items-center justify-center md:items-start">
              <form className="md:mt-[25vh] w-[80%] max-w-[400px] md:max-w-[450px]">
                <h2 className="font-rale">
                  {params.signMethod === "signin"
                    ? "WELCOME"
                    : "JOIN US TODAY!"}
                </h2>
                {params.signMethod === "signup" && (
                  <Input
                    type="text"
                    placeholder="Username"
                    name="username"
                    id="username"
                    icon="user"
                    onChange={(e) => {
                      setUSerCreds((curVal) => {
                        return { ...curVal, username: e.target.value };
                      });
                    }}
                  />
                )}
                <Input
                  type="text"
                  placeholder="Email"
                  name="email"
                  id="email"
                  icon="email"
                  onChange={(e) => {
                    setUSerCreds((curVal) => {
                      return { ...curVal, email: e.target.value };
                    });
                  }}
                />
                <Input
                  type="password"
                  placeholder="password"
                  name="password"
                  id="password"
                  icon="key"
                  onChange={(e) => {
                    setUSerCreds((curVal) => {
                      return { ...curVal, password: e.target.value };
                    });
                  }}
                />
                <button
                  className="btn-dark center mt-12 py-3 hover:text-black outline-none hover:outline-french-gray/30"
                  onClick={(e) => {
                    e.preventDefault();
                    signHandler();
                  }}
                >
                  {params.signMethod == "signin" ? "Sign In" : "Sign Up"}
                </button>

                <div className="relative items-center flex w-full gap-2 my-10 opacity-30 uppercase text-gunmetal font-semibold font-rale">
                  <hr className="w-1/2 border-black" />
                  or
                  <hr className="w-1/2 border-black" />
                </div>

                <button
                  className="center outline-none hover:outline-french-gray/30 text-md font-poppins relative btn-dark w-[90%]"
                  onClick={handleGoogleAuth}
                >
                  <Image
                    src={google}
                    className="w-[1.5rem] object-fill absolute bottom-0"
                    alt="Google-icon"
                  />
                  <span className="mx-9">Continue with Google</span>
                </button>

                {params.signMethod == "signin" ? (
                  <p className="mt-8 text-center w-full text-black">
                    Don't have an account?{" "}
                    <a
                      href="/account/signup"
                      className="text-gunmetal hover:underline duration-300 hover:text-black"
                    >
                      Join us today!
                    </a>{" "}
                  </p>
                ) : (
                  <p className="mt-8 text-center w-full text-black">
                    Already a user?{" "}
                    <a
                      href="/account/signin"
                      className="text-gunmetal hover:underline duration-300 hover:text-black"
                    >
                      Sign In.
                    </a>
                  </p>
                )}
              </form>
            </div>
            <div className="relative hidden md:block md:w-[55vw] h-full">
              <Image
                src={maria}
                className="absolute -z-10"
                alt="maria flower image"
              />
              <div className="absolute backdrop-blur-[3px] w-full h-full z-10"></div>
            </div>
          </div>
        </AnimationWrapper>
      )}
    </>
  );
}

export default SignMethodPage;