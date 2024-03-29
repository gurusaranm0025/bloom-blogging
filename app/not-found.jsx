import Logo from "@/components/Logo/Logo";
import pageNotFound from "@/public/404.svg";

function NotFound() {
  return (
    <>
      <section
        className="h-cover flex relative flex-col
   items-center gap-20 text-center "
      >
        <img
          src={pageNotFound.src}
          className="max-w-[30%] mt-[15%] object-cover select-none border-none"
          alt="Page-not-found"
        />

        <h1 className="text-4xl font-rale leading-7 font-medium ">
          Page not found
        </h1>
        <p className="text-cadet-gray leading-7 -mt-8 text-xl font-montserrat">
          The page you are looking for does not exists. Head back to{" "}
          <a
            href={"/"}
            className="text-black underline hover:text-rose-quartz duration-300"
          >
            home page
          </a>
        </p>

        <div className="mt-auto">
          <Logo className="select-none mx-auto block" />
          <p className="mt-5 text-black">
            Read exciting stories from all around the world.
          </p>
        </div>
      </section>
    </>
  );
}

export default NotFound;
